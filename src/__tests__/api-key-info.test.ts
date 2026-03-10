import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/kv', () => ({
  getLicenseData: vi.fn(),
  getKeyUsageToday: vi.fn().mockResolvedValue(0),
  getSubscriptionByCustomer: vi.fn().mockResolvedValue(null),
  getSubscriptionByEmail: vi.fn().mockResolvedValue(null),
  setSubscription: vi.fn().mockResolvedValue(undefined),
}))

import { GET } from '@/app/api/key-info/route'
import { getLicenseData, getKeyUsageToday } from '@/lib/kv'

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest('https://speclint.ai/api/key-info', {
    method: 'GET',
    headers,
  })
}

describe('GET /api/key-info', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getKeyUsageToday).mockResolvedValue(0)
  })

  // --- Input validation ---

  it('returns 400 when x-license-key header is missing', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/missing x-license-key/i)
  })

  it('returns 400 when x-license-key header is empty string', async () => {
    const res = await GET(makeRequest({ 'x-license-key': '' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/missing x-license-key/i)
  })

  // --- Invalid key ---

  it('returns 401 for unknown key', async () => {
    vi.mocked(getLicenseData).mockResolvedValue(null)
    const res = await GET(makeRequest({ 'x-license-key': 'INVALID-KEY' }))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toMatch(/invalid license key/i)
  })

  // --- Valid paid key (team) ---

  it('returns 200 with tier=team and null remaining_today for team key', async () => {
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'cus_123', plan: 'team', status: 'active' })
    const res = await GET(makeRequest({ 'x-license-key': 'SK-INTERNAL-8157AD2B79F752B4004593BE' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tier).toBe('team')
    expect(data.status).toBe('active')
    expect(data.remaining_today).toBeNull()
  })

  it('returns 200 with tier=pro and null remaining_today for pro key', async () => {
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'cus_456', plan: 'pro', status: 'active' })
    const res = await GET(makeRequest({ 'x-license-key': 'SK-PRO-TESTKEY-1234' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tier).toBe('pro')
    expect(data.remaining_today).toBeNull()
    // getKeyUsageToday must NOT be called for paid tiers
    expect(vi.mocked(getKeyUsageToday)).not.toHaveBeenCalled()
  })

  // --- Valid free key ---

  it('returns 200 with tier=free and remaining_today=3 when unused today', async () => {
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'user@example.com', plan: 'free', status: 'active' })
    vi.mocked(getKeyUsageToday).mockResolvedValue(0)
    const res = await GET(makeRequest({ 'x-license-key': 'SK-FREE-ABCDEF1234' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tier).toBe('free')
    expect(data.remaining_today).toBe(3)
  })

  it('returns remaining_today=1 when 2 calls used today for free key', async () => {
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'user@example.com', plan: 'free', status: 'active' })
    vi.mocked(getKeyUsageToday).mockResolvedValue(2)
    const res = await GET(makeRequest({ 'x-license-key': 'SK-FREE-ABCDEF1234' }))
    const data = await res.json()
    expect(data.remaining_today).toBe(1)
  })

  it('returns remaining_today=0 when daily limit exhausted for free key', async () => {
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'user@example.com', plan: 'free', status: 'active' })
    vi.mocked(getKeyUsageToday).mockResolvedValue(5) // over limit
    const res = await GET(makeRequest({ 'x-license-key': 'SK-FREE-ABCDEF1234' }))
    const data = await res.json()
    expect(data.remaining_today).toBe(0) // clamps at 0, never negative
  })

  // --- Key masking ---

  it('masks the key in the response (first 6 + last 4)', async () => {
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'cus_123', plan: 'team', status: 'active' })
    const res = await GET(makeRequest({ 'x-license-key': 'SK-INTERNAL-8157AD2B79F752B4004593BE' }))
    const data = await res.json()
    // "SK-INTERNAL-8157AD2B79F752B4004593BE" → first 6 = "SK-INT", last 4 = "93BE"
    expect(data.key).toBe('SK-INT...93BE')
    // Raw key must not be present in the response
    expect(data.key).not.toBe('SK-INTERNAL-8157AD2B79F752B4004593BE')
  })

  // --- Canceled key ---

  it('returns status=canceled for a canceled subscription', async () => {
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'cus_789', plan: 'pro', status: 'canceled' })
    const res = await GET(makeRequest({ 'x-license-key': 'SK-PRO-CANCELED-9999' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('canceled')
    expect(data.tier).toBe('pro')
  })

  // --- No LLM / no side effects ---

  it('does not call getKeyUsageToday for team tier', async () => {
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'cus_123', plan: 'team', status: 'active' })
    await GET(makeRequest({ 'x-license-key': 'SK-INTERNAL-ANYTHING' }))
    expect(vi.mocked(getKeyUsageToday)).not.toHaveBeenCalled()
  })

  it('calls getKeyUsageToday with the exact license key for free tier', async () => {
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'user@example.com', plan: 'free', status: 'active' })
    vi.mocked(getKeyUsageToday).mockResolvedValue(1)
    await GET(makeRequest({ 'x-license-key': 'SK-FREE-MYKEY-0001' }))
    expect(vi.mocked(getKeyUsageToday)).toHaveBeenCalledWith('SK-FREE-MYKEY-0001')
  })
})
