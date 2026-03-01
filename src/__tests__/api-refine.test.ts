import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/refine/route'

// Mock all external dependencies
vi.mock('@anthropic-ai/sdk', () => {
  const mockResponse = {
    content: [{
      type: 'text',
      text: JSON.stringify([{
        title: 'Fix Login Bug',
        problem: 'Users cannot log in with valid credentials.',
        acceptanceCriteria: ['Given valid credentials, when submitted, then user is logged in'],
        estimate: 'S',
        priority: 'HIGH — blocks all users',
        tags: ['bug', 'auth'],
      }])
    }],
    usage: { input_tokens: 100, output_tokens: 200 },
  }
  class MockAnthropic {
    messages = { create: vi.fn().mockResolvedValue(mockResponse) }
  }
  class APIError extends Error {}
  return { default: MockAnthropic, APIError }
})

vi.mock('@/lib/kv', () => ({
  getLicenseData: vi.fn().mockResolvedValue(null),
  checkRateLimitKV: vi.fn().mockResolvedValue({ count: 0, allowed: true }),
  isKvConnected: vi.fn(() => false),
  getSubscriptionByCustomer: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/telemetry', () => ({
  trackUsage: vi.fn().mockResolvedValue(undefined),
  calculateCost: vi.fn().mockReturnValue(0.001),
  detectSource: vi.fn().mockReturnValue('api'),
}))

function makeRequest(body: object, headers: Record<string, string> = {}) {
  return new NextRequest('https://refinebacklog.com/api/refine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/refine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for missing items', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('No backlog items provided')
  })

  it('returns 400 for empty items array', async () => {
    const res = await POST(makeRequest({ items: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-array items', async () => {
    const res = await POST(makeRequest({ items: 'fix login bug' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when all items are whitespace', async () => {
    const res = await POST(makeRequest({ items: ['   ', '\t', ''] }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('All items were empty')
  })

  it('returns 400 with upgrade message when free tier exceeds item limit', async () => {
    const tooManyItems = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`)
    const res = await POST(makeRequest({ items: tooManyItems }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Free tier is limited')
    expect(data.upgrade).toBe('https://refinebacklog.com/pricing')
  })

  it('returns 200 with refined items on valid request', async () => {
    const res = await POST(makeRequest({ items: ['Fix login bug'] }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.items).toBeDefined()
    expect(Array.isArray(data.items)).toBe(true)
    expect(data.items.length).toBeGreaterThan(0)
    expect(data._meta).toBeDefined()
    expect(data._meta.tier).toBe('free')
  })

  it('response contains _meta with required fields', async () => {
    const res = await POST(makeRequest({ items: ['Fix login bug'] }))
    const data = await res.json()
    expect(data._meta).toHaveProperty('requestId')
    expect(data._meta).toHaveProperty('model')
    expect(data._meta).toHaveProperty('latencyMs')
    expect(data._meta).toHaveProperty('tier')
  })

  // REGRESSION: Response must not contain any "groom" references in response body
  it('REGRESSION: response body contains no "groom" references', async () => {
    const res = await POST(makeRequest({ items: ['Fix login bug'] }))
    const text = await res.text()
    expect(text.toLowerCase()).not.toContain('groom')
  })

  // REGRESSION: Response must not contain legacy endpoint hints
  it('REGRESSION: response body does not mention /api/groom', async () => {
    const res = await POST(makeRequest({ items: ['Fix login bug'] }))
    const data = await res.json()
    expect(JSON.stringify(data)).not.toContain('/api/groom')
  })
})

describe('GET /api/refine', () => {
  it('returns API description', async () => {
    const req = new NextRequest('https://refinebacklog.com/api/refine', { method: 'GET' })
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBe('Speclint API')
    expect(data.usage).toContain('/api/refine')
  })

  // REGRESSION: GET response must not mention /api/groom
  it('REGRESSION: GET response does not mention /api/groom', async () => {
    const res = await GET()
    const data = await res.json()
    expect(JSON.stringify(data)).not.toContain('groom')
    expect(JSON.stringify(data)).not.toContain('/api/groom')
  })

  // REGRESSION: GET response must not mention "legacy" endpoint
  it('REGRESSION: GET response does not mention legacy endpoint note', async () => {
    const res = await GET()
    const data = await res.json()
    expect(JSON.stringify(data)).not.toContain('legacy')
  })
})

describe('Scoring fields in response', () => {
  it('includes scores array and summary in response', async () => {
    const res = await POST(makeRequest({ items: ['Fix login bug'] }))
    expect(res.status).toBe(200)
    const data = await res.json()

    // scores array
    expect(data.scores).toBeDefined()
    expect(Array.isArray(data.scores)).toBe(true)
    expect(data.scores.length).toBe(data.items.length)

    const score = data.scores[0]
    expect(score).toHaveProperty('title')
    expect(score).toHaveProperty('completeness_score')
    expect(score).toHaveProperty('agent_ready')
    expect(score).toHaveProperty('breakdown')
    expect(typeof score.completeness_score).toBe('number')
    expect(score.completeness_score).toBeGreaterThanOrEqual(0)
    expect(score.completeness_score).toBeLessThanOrEqual(100)
    expect(typeof score.agent_ready).toBe('boolean')

    // breakdown keys
    expect(score.breakdown).toHaveProperty('has_measurable_outcome')
    expect(score.breakdown).toHaveProperty('has_testable_criteria')
    expect(score.breakdown).toHaveProperty('has_constraints')
    expect(score.breakdown).toHaveProperty('no_vague_verbs')
    expect(score.breakdown).toHaveProperty('has_definition_of_done')

    // summary
    expect(data.summary).toBeDefined()
    expect(data.summary).toHaveProperty('average_score')
    expect(data.summary).toHaveProperty('agent_ready_count')
    expect(data.summary).toHaveProperty('total_count')
    expect(data.summary.total_count).toBe(data.items.length)
    expect(typeof data.summary.average_score).toBe('number')
    expect(typeof data.summary.agent_ready_count).toBe('number')
  })

  it('summary.agent_ready_count matches scores where agent_ready is true', async () => {
    const res = await POST(makeRequest({ items: ['Fix login bug'] }))
    const data = await res.json()
    const expectedCount = data.scores.filter((s: { agent_ready: boolean }) => s.agent_ready).length
    expect(data.summary.agent_ready_count).toBe(expectedCount)
  })
})

describe('codebase_context parameter', () => {
  it('ignores codebase_context for free tier — no error, codebase_context_used is false', async () => {
    const res = await POST(makeRequest({
      items: ['Fix login bug'],
      codebase_context: {
        stack: ['Next.js', 'TypeScript', 'Upstash Redis'],
        patterns: ['REST API', 'JWT auth'],
        constraints: ['No breaking API changes'],
      },
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data._meta.codebase_context_used).toBe(false)
  })

  it('sets codebase_context_used: true for pro tier when codebase_context is provided', async () => {
    const { getLicenseData } = await import('@/lib/kv')
    vi.mocked(getLicenseData).mockResolvedValueOnce({
      plan: 'pro',
      customerId: 'cus_test',
      status: 'active',
    })

    const res = await POST(makeRequest(
      {
        items: ['Fix login bug'],
        codebase_context: {
          stack: ['Next.js', 'TypeScript', 'Upstash Redis'],
          patterns: ['REST API', 'JWT auth'],
          constraints: ['No breaking API changes'],
        },
      },
      { 'x-license-key': 'pro-license-key' }
    ))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data._meta.codebase_context_used).toBe(true)
  })
})

describe('Rate limiting behavior', () => {
  it('returns 429 when rate limit is exceeded', async () => {
    const { checkRateLimitKV } = await import('@/lib/kv')
    vi.mocked(checkRateLimitKV).mockResolvedValueOnce({ count: 3, allowed: false })

    const res = await POST(makeRequest({ items: ['Fix login bug'] }))
    expect(res.status).toBe(429)
    const data = await res.json()
    expect(data.error).toContain('Daily request limit reached')
    expect(data.upgrade).toBe('https://refinebacklog.com/pricing')
  })
})
