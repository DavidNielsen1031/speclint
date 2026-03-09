import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { setSubscription, cancelSubscriptionByCustomer, getSubscriptionByCustomer } from '@/lib/kv'

async function sendLicenseEmail(params: {
  to: string
  plan: 'lite' | 'pro' | 'team'
  licenseKey: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@perpetualagility.com'
  if (!apiKey) {
    console.error('[EMAIL] RESEND_API_KEY not configured — skipping license email')
    return
  }

  const planLabel = params.plan === 'team' ? 'Team' : params.plan === 'pro' ? 'Pro' : 'Lite'
  const planPrice = params.plan === 'team' ? '$79/month' : params.plan === 'pro' ? '$29/month' : '$9/month'
  const itemLimit = params.plan === 'team' ? '50 specs per request' : params.plan === 'pro' ? '25 specs per request' : '5 specs per request'
  const keyCount = params.plan === 'team' ? '5 license keys' : '1 license key'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
  <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">You're on Speclint ${planLabel} ✅</h1>
  <p style="color: #666; margin-bottom: 32px;">${planPrice} · ${itemLimit} · ${keyCount}</p>

  <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
    <p style="font-size: 12px; color: #888; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Your License Key</p>
    <code style="font-size: 18px; font-weight: 700; letter-spacing: 0.1em; color: #1a1a1a;">${params.licenseKey}</code>
    <p style="font-size: 12px; color: #888; margin: 12px 0 0 0;">Keep this safe — you'll need it to authenticate API calls and MCP access.</p>
  </div>

  <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">Get started in 30 seconds</h2>

  <p style="font-size: 14px; margin-bottom: 8px;"><strong>Option 1 — API (curl / scripts / CI)</strong></p>
  <pre style="background: #1a1a1a; color: #e5e5e5; padding: 16px; border-radius: 6px; font-size: 13px; overflow-x: auto;">curl -X POST https://speclint.ai/api/lint \\
  -H "Content-Type: application/json" \\
  -H "x-license-key: ${params.licenseKey}" \\
  -d '{"item": "As a user, I want to..."}'</pre>

  <p style="font-size: 14px; margin-top: 24px; margin-bottom: 8px;"><strong>Option 2 — MCP (Claude Desktop)</strong></p>
  <pre style="background: #1a1a1a; color: #e5e5e5; padding: 16px; border-radius: 6px; font-size: 13px; overflow-x: auto;">{
  "mcpServers": {
    "speclint": {
      "command": "npx",
      "args": ["-y", "speclint-mcp"],
      "env": {
        "SPECLINT_KEY": "${params.licenseKey}"
      }
    }
  }
}</pre>

  <div style="border-top: 1px solid #e5e5e5; margin-top: 40px; padding-top: 24px;">
    <p style="font-size: 13px; color: #888; margin: 0;">
      Questions? Reply to this email or check <a href="https://speclint.ai" style="color: #1a1a1a;">speclint.ai</a>.<br>
      Built by <a href="https://perpetualagility.com" style="color: #1a1a1a;">Perpetual Agility</a>.
    </p>
  </div>
</body>
</html>`

  const text = `You're on Speclint ${planLabel}

Your license key: ${params.licenseKey}

Get started:
  curl -X POST https://speclint.ai/api/lint \\
    -H "x-license-key: ${params.licenseKey}" \\
    -H "Content-Type: application/json" \\
    -d '{"item": "As a user, I want to..."}'

Questions? Reply to this email or visit https://speclint.ai`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Speclint <${fromEmail}>`,
        to: [params.to],
        reply_to: fromEmail,
        subject: `Your Speclint ${planLabel} license key`,
        html,
        text,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[EMAIL] Resend error:', JSON.stringify(data))
    } else {
      console.log(`[EMAIL] License key email sent to ${params.to} via Resend id=${data.id}`)
    }
  } catch (err) {
    console.error('[EMAIL] Failed to send via Resend:', err)
  }
}

async function notifyTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID || '1656378684'
  if (!token) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    })
  } catch {
    // Non-blocking — never let notification failure affect webhook response
  }
}

async function notifyDiscord(message: string): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN
  const channelId = process.env.DISCORD_RB_CHANNEL_ID || '1477742404244209786' // #speclint-notifications
  if (!token) return
  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DiscordBot (https://openclaw.ai, 1.0)',
      },
      body: JSON.stringify({ content: message }),
    })
  } catch {
    // Non-blocking
  }
}

function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result.replace(/(.{4})/g, '$1-').slice(0, -1)
}

export async function POST(request: NextRequest) {
  // Check STRIPE_SECRET_KEY first
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[WEBHOOK] STRIPE_SECRET_KEY is not configured')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!endpointSecret || endpointSecret === 'whsec_placeholder') {
    console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET not configured — rejecting request. Signature verification is mandatory.')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let stripe: Stripe
  try {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  } catch (err) {
    console.error('[WEBHOOK] Failed to initialize Stripe SDK:', err)
    return NextResponse.json({ error: 'Stripe initialization failed' }, { status: 500 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    console.error('[WEBHOOK] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const eventType = event.type
  let customerId = 'unknown'

  try {
    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        customerId = (session.customer as string) || 'unknown'

        if (session.mode === 'subscription' && session.subscription && session.customer) {
          const plan = (session.metadata?.plan as 'lite' | 'pro' | 'team') || 'pro'

          // Idempotency check — license/route.ts may have already created a key on fast path
          const existing = await getSubscriptionByCustomer(customerId)
          if (existing?.licenseKey) {
            console.log(`[WEBHOOK] key already exists for customer ${customerId}, skipping`)
            break
          }

          const licenseKey = generateLicenseKey()

          try {
            await setSubscription(customerId, {
              plan,
              status: 'active',
              email: session.customer_details?.email || undefined,
              licenseKey,
              subscriptionId: session.subscription as string,
            })
            console.log(`[WEBHOOK] event=${eventType} customer=${customerId} result=success licenseKey=${licenseKey}`)

            // 📧 Email license key to customer via Resend (fire and forget)
            const email = session.customer_details?.email ?? 'unknown'
            if (email !== 'unknown') {
              sendLicenseEmail({ to: email, plan, licenseKey }).catch(() => {})
            }

            // 💰 Notify David on Telegram + Discord (fire and forget)
            const planLabel = plan === 'team' ? 'Team $79/mo' : plan === 'pro' ? 'Pro $29/mo' : 'Lite $9/mo'
            const telegramMsg =
              `💰 <b>New Speclint subscriber!</b>\n\n` +
              `📧 ${email}\n` +
              `📦 ${planLabel}\n` +
              `🔑 ${licenseKey}\n` +
              `👤 ${customerId}`
            const discordMsg =
              `💰 **New Speclint subscriber!**\n\n` +
              `📧 ${email}\n` +
              `📦 ${planLabel}\n` +
              `🔑 \`${licenseKey}\`\n` +
              `👤 ${customerId}`
            notifyTelegram(telegramMsg).catch(() => {})
            notifyDiscord(discordMsg).catch(() => {})

          } catch (kvErr) {
            console.error(`[WEBHOOK] event=${eventType} customer=${customerId} result=fail kvError=`, kvErr)
            // Still return 200 to Stripe
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        customerId = subscription.customer as string

        try {
          const existing = await getSubscriptionByCustomer(customerId)
          if (existing) {
            const newStatus = subscription.status === 'active' ? 'active' : 'canceled'
            existing.status = newStatus as 'active' | 'canceled'
            await setSubscription(customerId, existing)
            console.log(`[WEBHOOK] event=${eventType} customer=${customerId} result=success status=${newStatus}`)
          } else {
            console.log(`[WEBHOOK] event=${eventType} customer=${customerId} result=skip reason=no_existing_subscription`)
          }
        } catch (kvErr) {
          console.error(`[WEBHOOK] event=${eventType} customer=${customerId} result=fail kvError=`, kvErr)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        customerId = subscription.customer as string
        try {
          await cancelSubscriptionByCustomer(customerId)
          console.log(`[WEBHOOK] event=${eventType} customer=${customerId} result=success`)
        } catch (kvErr) {
          console.error(`[WEBHOOK] event=${eventType} customer=${customerId} result=fail kvError=`, kvErr)
        }
        break
      }

      default:
        console.log(`[WEBHOOK] event=${eventType} customer=${customerId} result=unhandled`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`[WEBHOOK] event=${eventType} customer=${customerId} result=fail error=`, error)
    // Always return 200 to Stripe to prevent retry loops
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Stripe Webhook Endpoint',
    events: ['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted']
  })
}
