import { NextRequest, NextResponse } from 'next/server'
import { getSubscriptionByCustomer, setSubscription } from '@/lib/kv'

/**
 * GET /api/license?session_id=cs_xxx
 *
 * Returns the license key for a completed Stripe checkout session.
 * Called by the success page to display the key to the customer.
 * Returns 202 if the webhook hasn't fired yet (caller should retry).
 *
 * Fast path: if the checkout session has a customer with an active subscription
 * but no license key in KV yet, we generate one immediately rather than waiting
 * for the webhook to fire (avoids 40s+ timeout on Vercel cold starts).
 */

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

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  try {
    // Retrieve the Stripe checkout session
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('[LICENSE] Stripe session lookup failed:', err)
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
    }

    const session = await res.json()
    const customerId = session.customer as string | null

    if (!customerId) {
      // Webhook hasn't fired yet — tell the client to retry
      return NextResponse.json({ status: 'pending' }, { status: 202 })
    }

    // Check KV first — if key already exists, return it immediately
    const sub = await getSubscriptionByCustomer(customerId)

    if (sub?.licenseKey) {
      return NextResponse.json({
        licenseKey: sub.licenseKey,
        plan: sub.plan,
        email: session.customer_details?.email ?? null,
      })
    }

    // Fast path: look up active subscription directly from Stripe
    // This covers the case where the webhook hasn't fired yet (cold start, retry delay)
    try {
      const subsRes = await fetch(
        `https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}/subscriptions?status=active&limit=1`,
        {
          headers: { 'Authorization': `Bearer ${secretKey}` },
        }
      )

      if (subsRes.ok) {
        const subsData = await subsRes.json()
        const activeSub = subsData.data?.[0]

        if (activeSub) {
          // Active subscription found but no license key yet — generate one now
          const plan = (session.metadata?.plan as 'pro' | 'team') || 'pro'
          const licenseKey = generateLicenseKey()

          await setSubscription(customerId, {
            plan,
            status: 'active',
            email: session.customer_details?.email || undefined,
            licenseKey,
            subscriptionId: activeSub.id as string,
          })

          console.log(`[LICENSE] Fast-path license generated for customer=${customerId} licenseKey=${licenseKey}`)

          return NextResponse.json({
            licenseKey,
            plan,
            email: session.customer_details?.email ?? null,
          })
        }
      }
    } catch (stripeErr) {
      console.error('[LICENSE] Fast-path Stripe subscription lookup failed:', stripeErr)
      // Fall through to 202 — webhook will handle it
    }

    // No active subscription yet — webhook hasn't fired
    return NextResponse.json({ status: 'pending' }, { status: 202 })
  } catch (error) {
    console.error('[LICENSE] Error retrieving license key:', error)
    return NextResponse.json({ error: 'Failed to retrieve license key' }, { status: 500 })
  }
}
