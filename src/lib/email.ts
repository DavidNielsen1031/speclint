// Shared email utilities — used by webhook and fast-path key creation

export type PaidPlan = 'lite' | 'pro' | 'team'

export const VALID_PLANS: PaidPlan[] = ['lite', 'pro', 'team']

export const PLAN_DETAILS: Record<PaidPlan, { label: string; price: string; itemLimit: string; rewriteLimit: string; keyCount: string }> = {
  lite:  { label: 'Lite',  price: '$9/month',  itemLimit: '5 specs per request',  rewriteLimit: '10 rewrites/day', keyCount: '1 license key' },
  pro:   { label: 'Pro',   price: '$29/month', itemLimit: '25 specs per request', rewriteLimit: 'Unlimited rewrites', keyCount: '1 license key' },
  team:  { label: 'Team',  price: '$79/month', itemLimit: '50 specs per request', rewriteLimit: 'Unlimited rewrites', keyCount: '5 license keys' },
}

export async function sendLicenseEmail(params: {
  to: string
  plan: PaidPlan
  licenseKey: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@perpetualagility.com'
  if (!apiKey) {
    console.error('[EMAIL] RESEND_API_KEY not configured — skipping license email')
    return
  }

  const details = PLAN_DETAILS[params.plan]
  const planLabel = details.label
  const planPrice = details.price
  const itemLimit = details.itemLimit
  const keyCount = details.keyCount

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
  <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">You're on Speclint ${planLabel} ✅</h1>
  <p style="color: #666; margin-bottom: 32px;">${planPrice} · ${itemLimit} · ${details.rewriteLimit} · ${keyCount}</p>

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

  const text = `You're on Speclint ${planLabel} (${planPrice} · ${details.rewriteLimit})

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
