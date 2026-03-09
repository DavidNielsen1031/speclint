import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan } = body

    if (!plan || !['lite', 'pro', 'team'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const priceId = plan === 'lite'
      ? process.env.STRIPE_LITE_PRICE_ID
      : plan === 'pro'
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_TEAM_PRICE_ID

    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey || !priceId) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const origin = request.headers.get('origin') || 'https://speclint.ai'

    // Use raw fetch to Stripe API
    const params = new URLSearchParams()
    params.append('mode', 'subscription')
    params.append('line_items[0][price]', priceId)
    params.append('line_items[0][quantity]', '1')
    params.append('success_url', `${origin}/success?session_id={CHECKOUT_SESSION_ID}`)
    params.append('cancel_url', `${origin}?canceled=true`)
    params.append('allow_promotion_codes', 'true')
    params.append('metadata[plan]', plan)

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Stripe API error:', data)
      return NextResponse.json(
        { error: data.error?.message || 'Stripe error' },
        { status: res.status }
      )
    }

    return NextResponse.json({ url: data.url, sessionId: data.id })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Stripe Checkout API',
    plans: { lite: '$9/month', pro: '$29/month', team: '$79/month' },
  })
}
