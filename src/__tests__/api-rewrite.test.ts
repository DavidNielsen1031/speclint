import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The rewrite adapter now delegates to /api/refine, which needs these mocks
vi.mock('@anthropic-ai/sdk', () => {
  const mockResponse = {
    content: [{
      type: 'text',
      text: JSON.stringify([{
        title: 'Fix Login Bug',
        problem: 'Users cannot log in with valid credentials.',
        acceptanceCriteria: ['Given valid credentials, when submitted, then user is logged in within 2 seconds'],
        estimate: 'S',
        priority: 'HIGH — blocks all users',
        tags: ['bug', 'auth'],
      }])
    }],
    usage: { input_tokens: 100, output_tokens: 200 },
  }
  // Rewrite LLM response (max_tokens=1024)
  const mockRewriteResponse = {
    content: [{
      type: 'text',
      text: JSON.stringify({
        rewritten: 'Improved spec with measurable outcomes and testable criteria.',
        changes: ['Added measurable outcome', 'Added testable acceptance criteria'],
      }),
    }],
    usage: { input_tokens: 150, output_tokens: 250 },
  }
  class MockAnthropic {
    messages = {
      create: vi.fn().mockImplementation(async (params: { max_tokens: number }) => {
        if (params.max_tokens === 1024) return mockRewriteResponse
        return mockResponse
      }),
    }
  }
  class APIError extends Error {}
  ;(MockAnthropic as unknown as Record<string, unknown>).APIError = APIError
  return { default: MockAnthropic, APIError }
})

vi.mock('@/lib/kv', () => ({
  getLicenseData: vi.fn().mockImplementation(async (key: string) => {
    if (key === 'pro-test-key') return { plan: 'pro', customerId: 'cus_pro', status: 'active' }
    return null
  }),
  checkRateLimitKV: vi.fn().mockResolvedValue({ count: 0, allowed: true }),
  isKvConnected: vi.fn(() => true),
  getSubscriptionByCustomer: vi.fn().mockResolvedValue(null),
  storeLintReceipt: vi.fn().mockResolvedValue(undefined),
  storeTrace: vi.fn().mockResolvedValue(undefined),
  getKV: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/telemetry', () => ({
  trackUsage: vi.fn().mockResolvedValue(undefined),
  calculateCost: vi.fn().mockReturnValue(0.001),
  detectSource: vi.fn().mockReturnValue('api'),
}))

vi.mock('@/lib/injection-monitor', () => ({
  detectInjection: vi.fn().mockReturnValue({ detected: false, patterns: [] }),
}))

import { POST } from '@/app/api/rewrite/route'

function makeRequest(body: object, headers: Record<string, string> = {}) {
  return new NextRequest('https://speclint.ai/api/rewrite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-license-key': 'pro-test-key',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/rewrite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns rewritten + changes + new_score for valid input', async () => {
    const res = await POST(makeRequest({
      spec: 'Fix the login button so users can log in.',
      gaps: ['has_measurable_outcome', 'has_testable_criteria'],
      score: 40,
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.rewritten).toBeDefined()
    expect(data.changes).toBeDefined()
    expect(Array.isArray(data.changes)).toBe(true)
    expect(data.new_score).toBeDefined()
    expect(typeof data.new_score).toBe('number')
  })

  it('returns 400 when spec is missing', async () => {
    const res = await POST(makeRequest({
      gaps: ['has_measurable_outcome'],
      score: 40,
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('spec')
  })

  it('returns 400 when gaps is missing', async () => {
    const res = await POST(makeRequest({
      spec: 'Fix the login button.',
      score: 40,
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('gaps')
  })

  it('returns 400 when gaps is empty array', async () => {
    const res = await POST(makeRequest({
      spec: 'Fix the login button.',
      gaps: [],
      score: 40,
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when score is missing', async () => {
    const res = await POST(makeRequest({
      spec: 'Fix the login button.',
      gaps: ['has_measurable_outcome'],
    }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('score')
  })

  it('returns 401 without license key', async () => {
    const req = new NextRequest('https://speclint.ai/api/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spec: 'test', gaps: ['has_measurable_outcome'], score: 40,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
