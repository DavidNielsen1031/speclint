import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock KV before importing route
vi.mock('@/lib/kv', () => ({
  getSubscriptionByCustomer: vi.fn(),
  getSubscriptionByEmail: vi.fn().mockResolvedValue(null),
  getLicenseData: vi.fn(),
  getKeyUsageToday: vi.fn().mockResolvedValue(0),
  checkRateLimitKV: vi.fn(),
  isKvConnected: vi.fn(() => false),
  setSubscription: vi.fn().mockResolvedValue(undefined),
}))

// Mock global fetch for Stripe API calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { GET } from '@/app/api/license/route'
import { getSubscriptionByCustomer } from '@/lib/kv'

function makeRequest(sessionId?: string) {
  const url = sessionId
    ? `https://speclint.ai/api/license?session_id=${sessionId}`
    : 'https://speclint.ai/api/license'
  return new NextRequest(url, { method: 'GET' })
}

describe('GET /api/license', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  })

  it('falls through to key-info when session_id is missing', async () => {
    // Without session_id, the unified /api/key endpoint handles as key-info
    // which requires x-license-key header
    const res = await GET(makeRequest())
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Missing x-license-key header')
  })

  it('returns 400 when Stripe session lookup fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'No such session' } }),
    })
    const res = await GET(makeRequest('cs_test_invalid'))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid session')
  })

  it('returns 202 pending when customer ID is null (webhook not fired yet)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ customer: null, customer_details: { email: 'test@example.com' } }),
    })
    const res = await GET(makeRequest('cs_test_pending'))
    expect(res.status).toBe(202)
    const data = await res.json()
    expect(data.status).toBe('pending')
  })

  it('returns 202 pending when subscription not found in KV yet', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ customer: 'cus_123', customer_details: { email: 'test@example.com' } }),
    })
    vi.mocked(getSubscriptionByCustomer).mockResolvedValueOnce(null)

    const res = await GET(makeRequest('cs_test_slow_webhook'))
    expect(res.status).toBe(202)
    const data = await res.json()
    expect(data.status).toBe('pending')
  })

  it('returns 200 with license key when everything is found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ customer: 'cus_123', customer_details: { email: 'buyer@example.com' } }),
    })
    vi.mocked(getSubscriptionByCustomer).mockResolvedValueOnce({
      customerId: 'cus_123',
      licenseKey: 'rb_live_abc123xyz',
      plan: 'pro',
      status: 'active',
    })

    const res = await GET(makeRequest('cs_test_success'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.licenseKey).toBe('rb_live_abc123xyz')
    expect(data.plan).toBe('pro')
    expect(data.email).toBe('buyer@example.com')
  })

  it('returns 500 on unexpected errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'))
    const res = await GET(makeRequest('cs_test_error'))
    expect(res.status).toBe(500)
  })
})
