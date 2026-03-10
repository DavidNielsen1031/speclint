// /api/key — Unified key management endpoint
//
// GET  /api/key                     → key info (via x-license-key header)
// POST /api/key { email }           → retrieve key by email
// GET  /api/key?session_id=cs_xxx   → license from Stripe checkout
//
// Replaces: /api/key-info, /api/retrieve-key, /api/license

import { NextRequest, NextResponse } from 'next/server'
import {
  getLicenseData,
  getKeyUsageToday,
  getSubscriptionByEmail,
  getSubscriptionByCustomer,
  setSubscription,
} from '@/lib/kv'

const FREE_DAILY_LIMIT = 3

function maskKey(key: string): string {
  if (key.length <= 10) return key.slice(0, 2) + '...' + key.slice(-4)
  return key.slice(0, 6) + '...' + key.slice(-4)
}

function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result.replace(/(.{4})/g, '$1-').slice(0, -1)
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')

  // ─── Stripe checkout session flow (was /api/license) ───
  if (sessionId) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    try {
      const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
        headers: { 'Authorization': `Bearer ${secretKey}` },
      })

      if (!res.ok) {
        console.error('[KEY] Stripe session lookup failed:', await res.json())
        return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
      }

      const session = await res.json()
      const customerId = session.customer as string | null

      if (!customerId) {
        return NextResponse.json({ status: 'pending' }, { status: 202 })
      }

      const sub = await getSubscriptionByCustomer(customerId)
      if (sub?.licenseKey) {
        return NextResponse.json({
          licenseKey: sub.licenseKey,
          plan: sub.plan,
          email: session.customer_details?.email ?? null,
        })
      }

      // Fast path: look up active subscription directly from Stripe
      try {
        const subsRes = await fetch(
          `https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}/subscriptions?status=active&limit=1`,
          { headers: { 'Authorization': `Bearer ${secretKey}` } },
        )

        if (subsRes.ok) {
          const subsData = await subsRes.json()
          const activeSub = subsData.data?.[0]

          if (activeSub) {
            const plan = (session.metadata?.plan as 'lite' | 'pro' | 'team') || 'pro'
            const licenseKey = generateLicenseKey()

            await setSubscription(customerId, {
              plan,
              status: 'active',
              email: session.customer_details?.email || undefined,
              licenseKey,
              subscriptionId: activeSub.id as string,
            })

            console.log(`[KEY] Fast-path license generated for customer=${customerId}`)

            return NextResponse.json({
              licenseKey,
              plan,
              email: session.customer_details?.email ?? null,
            })
          }
        }
      } catch (stripeErr) {
        console.error('[KEY] Fast-path Stripe lookup failed:', stripeErr)
      }

      return NextResponse.json({ status: 'pending' }, { status: 202 })
    } catch (error) {
      console.error('[KEY] Error retrieving license:', error)
      return NextResponse.json({ error: 'Failed to retrieve license key' }, { status: 500 })
    }
  }

  // ─── Key info flow (was /api/key-info) ───
  const licenseKey = request.headers.get('x-license-key')

  if (!licenseKey || licenseKey.trim() === '') {
    return NextResponse.json({ error: 'Missing x-license-key header' }, { status: 400 })
  }

  const data = await getLicenseData(licenseKey)
  if (!data) {
    return NextResponse.json({ error: 'Invalid license key' }, { status: 401 })
  }

  let remainingToday: number | null = null
  if ((data.plan as string) === 'free') {
    const usedToday = await getKeyUsageToday(licenseKey)
    remainingToday = Math.max(0, FREE_DAILY_LIMIT - usedToday)
  }

  return NextResponse.json({
    key: maskKey(licenseKey),
    tier: data.plan,
    status: data.status,
    remaining_today: remainingToday,
  })
}

// ─── Key recovery flow (was /api/retrieve-key) ───

export async function POST(request: NextRequest) {
  let email: string
  try {
    const body = await request.json()
    email = body.email?.trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  // Anti-enumeration delay
  await new Promise(r => setTimeout(r, 400 + Math.random() * 200))

  const sub = await getSubscriptionByEmail(email)

  if (!sub || sub.status !== 'active') {
    return NextResponse.json({
      message: "If that email has an active subscription, your license key has been displayed below. Check your Stripe receipt at billing.stripe.com if nothing shows here.",
      found: false,
    })
  }

  return NextResponse.json({
    message: "Found your subscription.",
    found: true,
    licenseKey: sub.licenseKey,
    plan: sub.plan,
  })
}
