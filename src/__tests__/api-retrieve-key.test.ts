import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/kv', () => ({
  getSubscriptionByEmail: vi.fn(),
  getSubscriptionByCustomer: vi.fn().mockResolvedValue(null),
  getLicenseData: vi.fn(),
  getKeyUsageToday: vi.fn().mockResolvedValue(0),
  checkRateLimitKV: vi.fn(),
  isKvConnected: vi.fn(() => false),
  setSubscription: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '@/app/api/retrieve-key/route'
import { getSubscriptionByEmail } from '@/lib/kv'

function makeRequest(body: object) {
  return new NextRequest('https://speclint.ai/api/retrieve-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/retrieve-key', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 for missing email', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid email', async () => {
    const res = await POST(makeRequest({ email: 'notanemail' }))
    expect(res.status).toBe(400)
  })

  it('returns found=false when no subscription exists', async () => {
    vi.mocked(getSubscriptionByEmail).mockResolvedValue(null)
    const res = await POST(makeRequest({ email: 'nobody@example.com' }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.found).toBe(false)
    // Must NOT leak whether the email exists (enumeration protection)
    expect(data.licenseKey).toBeUndefined()
  })

  it('returns found=false for canceled subscription', async () => {
    vi.mocked(getSubscriptionByEmail).mockResolvedValue({
      plan: 'pro', status: 'canceled', email: 'ex@example.com',
      licenseKey: 'rb_test', subscriptionId: 'sub_123'
    })
    const res = await POST(makeRequest({ email: 'ex@example.com' }))
    const data = await res.json()
    expect(data.found).toBe(false)
  })

  it('returns license key for active subscription', async () => {
    vi.mocked(getSubscriptionByEmail).mockResolvedValue({
      plan: 'pro', status: 'active', email: 'buyer@example.com',
      licenseKey: 'RB-PRO-TEST-1234', subscriptionId: 'sub_456'
    })
    const res = await POST(makeRequest({ email: 'buyer@example.com' }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.found).toBe(true)
    expect(data.licenseKey).toBe('RB-PRO-TEST-1234')
    expect(data.plan).toBe('pro')
  })

  // REGRESSION: email lookup must be case-insensitive
  it('REGRESSION: email lookup is case-insensitive', async () => {
    vi.mocked(getSubscriptionByEmail).mockResolvedValue({
      plan: 'team', status: 'active', email: 'Buyer@Example.com',
      licenseKey: 'RB-TEAM-TEST-5678', subscriptionId: 'sub_789'
    })
    const res = await POST(makeRequest({ email: 'BUYER@EXAMPLE.COM' }))
    const data = await res.json()
    expect(data.found).toBe(true)
    expect(data.licenseKey).toBe('RB-TEAM-TEST-5678')
  })
})
