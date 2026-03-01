import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/checkout/route'

// Mock Stripe API calls via global fetch
const mockStripeSession = {
  id: 'cs_test_mock123',
  url: 'https://checkout.stripe.com/pay/cs_test_mock123',
}

function setupFetchMock(ok = true, data = mockStripeSession) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    json: async () => ok ? data : { error: { message: 'Stripe error' } },
  } as Response)
}

function makeRequest(body: object) {
  return new NextRequest('https://speclint.ai/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'https://speclint.ai' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set required env vars for checkout route
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
    process.env.STRIPE_PRO_PRICE_ID = 'price_test_pro'
    process.env.STRIPE_TEAM_PRICE_ID = 'price_test_team'
    setupFetchMock()
  })

  it('creates Stripe checkout session for plan: pro', async () => {
    const res = await POST(makeRequest({ plan: 'pro' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.url).toContain('checkout.stripe.com')
    expect(data.sessionId).toBe('cs_test_mock123')
  })

  it('creates Stripe checkout session for plan: team', async () => {
    const res = await POST(makeRequest({ plan: 'team' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.url).toBeDefined()
  })

  it('returns 400 for invalid plan', async () => {
    const res = await POST(makeRequest({ plan: 'enterprise' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('returns 400 when plan is missing', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })
})
