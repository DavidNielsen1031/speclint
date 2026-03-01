import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/rewrite/route'

vi.mock('@anthropic-ai/sdk', () => {
  const mockResponse = {
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
    messages = { create: vi.fn().mockResolvedValue(mockResponse) }
  }
  class APIError extends Error {}
  return { default: MockAnthropic, APIError }
})

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, tier: 'free' }),
  resolveUserTier: vi.fn().mockResolvedValue('pro'), // pro tier so we get full response
}))

vi.mock('@/lib/telemetry', () => ({
  trackUsage: vi.fn().mockResolvedValue(undefined),
  calculateCost: vi.fn().mockReturnValue(0.001),
  detectSource: vi.fn().mockReturnValue('api'),
}))

// Mock global fetch for re-lint call inside rewrite route
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    items: [{ completeness_score: 80 }],
    scores: [{ completeness_score: 80 }],
  }),
} as Response)

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
    // Restore fetch mock after clearAllMocks
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ completeness_score: 80 }],
        scores: [{ completeness_score: 80 }],
      }),
    } as Response)
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
})
