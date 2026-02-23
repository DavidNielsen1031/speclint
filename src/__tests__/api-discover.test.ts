import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// vi.hoisted runs before all imports — required to reference mock in vi.mock factory
const mockCreate = vi.hoisted(() => vi.fn())

import { POST, GET } from '@/app/api/discover/route'
import { DiscoveryResultSchema } from '@/lib/schemas'

// ---- Mocks ----------------------------------------------------------------

const MOCK_SKIP = {
  content: [{
    type: 'text',
    text: JSON.stringify({
      classification: 'SKIP',
      confidence: 0.94,
      rationale: 'Clear bug report with explicit expected vs actual behavior and reproduction steps.',
      primary_signal: 'Expected: login succeeds. Actual: 500 error returned.',
      questions: [],
      assumptions: [],
    }),
  }],
  usage: { input_tokens: 200, output_tokens: 150 },
}

const MOCK_FULL_DISCOVERY = {
  content: [{
    type: 'text',
    text: JSON.stringify({
      classification: 'FULL_DISCOVERY',
      confidence: 0.91,
      rationale: 'Vague verb "improve" with no metric, no target user, and no stated outcome.',
      primary_signal: '"improve the dashboard" with no measurable success criteria',
      questions: [
        {
          rank: 1,
          question: 'What specific data do users fail to find in the current dashboard?',
          category: 'user_job',
          why_it_matters: 'Without knowing what is broken, we might add the wrong visualizations',
          fastest_validation: 'support ticket review',
        },
        {
          rank: 2,
          question: 'How will we measure whether the dashboard improvement is successful?',
          category: 'outcome',
          why_it_matters: 'No metric means we cannot determine when this is done',
          fastest_validation: 'data pull',
        },
        {
          rank: 3,
          question: 'Which user segment is most affected by the current dashboard limitations?',
          category: 'user_job',
          why_it_matters: 'Different user segments may need completely different solutions',
          fastest_validation: '1 user conversation',
        },
        {
          rank: 4,
          question: 'What are the technical constraints around adding new dashboard widgets?',
          category: 'feasibility',
          why_it_matters: 'Frontend performance could be degraded by additional chart rendering',
          fastest_validation: 'engineering spike',
        },
        {
          rank: 5,
          question: 'What does "done" look like — what specific behavior change in users would signal success?',
          category: 'acceptance_criteria',
          why_it_matters: 'Without an acceptance criterion we cannot close this ticket',
          fastest_validation: '1 user conversation',
        },
      ],
      assumptions: [
        {
          statement: 'We assume that users fail to find data they need, not that the data is missing entirely',
          type: 'desirability',
          risk: 'high',
          simple_test: 'Review 5 support tickets for dashboard-related confusion',
        },
        {
          statement: 'We assume that adding more data to the dashboard will improve task completion rates',
          type: 'desirability',
          risk: 'medium',
          simple_test: 'Run a 30-minute usability test on 2 users',
        },
        {
          statement: 'We assume the current dashboard tech stack supports the planned visualizations without a rewrite',
          type: 'feasibility',
          risk: 'medium',
          simple_test: 'Engineering spike: prototype one new chart type',
        },
      ],
    }),
  }],
  usage: { input_tokens: 350, output_tokens: 480 },
}

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockCreate }
  }
  class APIError extends Error {}
  return { default: MockAnthropic, APIError }
})

vi.mock('@/lib/kv', () => ({
  getLicenseData: vi.fn().mockResolvedValue(null),
  checkRateLimitKV: vi.fn().mockResolvedValue({ count: 1, allowed: true }),
  isKvConnected: vi.fn(() => false),
}))

vi.mock('@/lib/telemetry', () => ({
  trackUsage: vi.fn().mockResolvedValue(undefined),
  calculateCost: vi.fn().mockReturnValue(0.0004),
  detectSource: vi.fn().mockReturnValue('api-direct'),
}))

// ---- Helpers ---------------------------------------------------------------

function makeRequest(body: object, headers: Record<string, string> = {}) {
  return new NextRequest('https://refinebacklog.com/api/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

// ---- Tests -----------------------------------------------------------------

describe('POST /api/discover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue(MOCK_SKIP) // safe default
  })

  // 1. Rejects empty item
  it('test_discover_rejects_empty_item — returns 400 for missing item', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('No backlog item provided')
  })

  it('test_discover_rejects_empty_item — returns 400 for empty string item', async () => {
    const res = await POST(makeRequest({ item: '' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('No backlog item provided')
  })

  it('test_discover_rejects_empty_item — returns 400 for whitespace-only item', async () => {
    const res = await POST(makeRequest({ item: '   \t\n  ' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('No backlog item provided')
  })

  // 2. Classifies bug report as SKIP
  it('test_discover_skips_bug_report — clear bug report returns SKIP classification', async () => {
    mockCreate.mockResolvedValue(MOCK_SKIP)

    const res = await POST(makeRequest({
      item: 'Login returns 500 error. Expected: user is logged in. Actual: 500 Internal Server Error. Reproduces 100% when email contains a + character.',
    }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.classification).toBe('SKIP')
    expect(data.questions).toHaveLength(0)
    expect(data.assumptions).toHaveLength(0)
    expect(data.confidence).toBeGreaterThan(0)
    expect(data._meta).toBeDefined()
    expect(data._meta.tier).toBe('free')
  })

  // 3. Classifies vague item as FULL_DISCOVERY
  it('test_discover_flags_vague_item — "improve the dashboard" returns FULL_DISCOVERY', async () => {
    mockCreate.mockResolvedValue(MOCK_FULL_DISCOVERY)

    const res = await POST(makeRequest({ item: 'improve the dashboard' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.classification).toBe('FULL_DISCOVERY')
    expect(data.rationale).toBeTruthy()
    expect(data.primary_signal).toBeTruthy()
    // Free tier: truncated to 1 question, 1 assumption
    expect(data.questions.length).toBeLessThanOrEqual(1)
    expect(data.assumptions.length).toBeLessThanOrEqual(1)
  })

  // 4. DiscoveryResultSchema validates all three classification types
  it('test_discover_validates_output_schema — SKIP passes schema validation', () => {
    const skipResult = {
      classification: 'SKIP',
      confidence: 0.92,
      rationale: 'Clear bug report with explicit expected vs actual behavior.',
      primary_signal: 'Explicit expected vs actual behavior stated',
      questions: [],
      assumptions: [],
    }
    const result = DiscoveryResultSchema.safeParse(skipResult)
    expect(result.success).toBe(true)
  })

  it('test_discover_validates_output_schema — LIGHT_DISCOVERY passes schema validation', () => {
    const lightResult = {
      classification: 'LIGHT_DISCOVERY',
      confidence: 0.75,
      rationale: 'Mostly clear but missing a success metric.',
      primary_signal: 'Solution-first framing with implied problem',
      questions: [
        {
          rank: 1,
          question: 'What metric will define success for this feature?',
          category: 'outcome',
          why_it_matters: 'Without a metric we cannot determine when to ship',
          fastest_validation: 'data pull',
        },
      ],
      assumptions: [
        {
          statement: 'We assume that users want a faster export, not a different format',
          type: 'desirability',
          risk: 'medium',
          simple_test: 'Ask 2 users what format they need exports in',
        },
      ],
    }
    const result = DiscoveryResultSchema.safeParse(lightResult)
    expect(result.success).toBe(true)
  })

  it('test_discover_validates_output_schema — FULL_DISCOVERY passes schema validation', () => {
    const fullResult = {
      classification: 'FULL_DISCOVERY',
      confidence: 0.88,
      rationale: 'Vague verb with no metric, no target user.',
      primary_signal: '"improve" with no measurable outcome',
      questions: [
        {
          rank: 1,
          question: 'Who is the target user?',
          category: 'user_job',
          why_it_matters: 'Different users need different solutions',
          fastest_validation: '1 user conversation',
        },
        {
          rank: 2,
          question: 'What is the success metric?',
          category: 'outcome',
          why_it_matters: 'No metric means we cannot close this ticket',
          fastest_validation: 'data pull',
        },
      ],
      assumptions: [
        {
          statement: 'We assume users are failing to find existing data',
          type: 'desirability',
          risk: 'high',
          simple_test: 'Review support tickets',
        },
        {
          statement: 'We assume the current tech stack supports the planned changes',
          type: 'feasibility',
          risk: 'medium',
          simple_test: 'Engineering spike of 1 day',
        },
      ],
    }
    const result = DiscoveryResultSchema.safeParse(fullResult)
    expect(result.success).toBe(true)
  })

  it('test_discover_validates_output_schema — invalid classification fails schema validation', () => {
    const badResult = {
      classification: 'UNKNOWN',
      confidence: 1.5, // also invalid — > 1
      rationale: '',
      primary_signal: '',
      questions: [],
      assumptions: [],
    }
    const result = DiscoveryResultSchema.safeParse(badResult)
    expect(result.success).toBe(false)
  })

  // 5. Free tier truncates output to 1 question and 1 assumption
  it('test_discover_free_tier_truncates_output — free tier gets max 1 question and 1 assumption', async () => {
    mockCreate.mockResolvedValue(MOCK_FULL_DISCOVERY)

    // No license key = free tier
    const res = await POST(makeRequest({ item: 'improve the dashboard' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data._meta.tier).toBe('free')
    expect(data.questions.length).toBeLessThanOrEqual(1)
    expect(data.assumptions.length).toBeLessThanOrEqual(1)
    // Should still have the classification and rationale
    expect(data.classification).toBe('FULL_DISCOVERY')
    expect(data.rationale).toBeTruthy()
    // Upgrade prompt should appear in the truncated item
    if (data.questions.length === 1) {
      expect(data.questions[0].why_it_matters).toContain('more questions available on Pro')
    }
    if (data.assumptions.length === 1) {
      expect(data.assumptions[0].simple_test).toContain('more assumptions available on Pro')
    }
  })

  // GET endpoint
  it('GET /api/discover returns API info', async () => {
    const req = new NextRequest('https://refinebacklog.com/api/discover', { method: 'GET' })
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toContain('Discovery')
  })
})
