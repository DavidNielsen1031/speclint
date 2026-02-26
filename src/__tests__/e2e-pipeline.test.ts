/**
 * E2E Pipeline Tests — Discover → Refine → Plan
 *
 * These tests validate the full 3-stage pipeline, ensuring output from each
 * stage correctly feeds into the next. All Claude API calls are mocked —
 * this tests data shape chaining, not actual AI output.
 *
 * Pipeline:
 *   POST /api/discover  — classify a raw item (SKIP | LIGHT_DISCOVERY | FULL_DISCOVERY)
 *   POST /api/refine    — refine items with optional discovery_context
 *   POST /api/plan      — pack refined items into execution queue
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// vi.hoisted runs before all imports — required to reference mock in vi.mock factory
const mockCreate = vi.hoisted(() => vi.fn())

import { POST as discoverPOST } from '@/app/api/discover/route'
import { POST as refinePOST } from '@/app/api/refine/route'
import { POST as planPOST } from '@/app/api/plan/route'

// ---- Mocks ----------------------------------------------------------------

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
  calculateCost: vi.fn().mockReturnValue(0.0005),
  detectSource: vi.fn().mockReturnValue('api-direct'),
}))

// ---- Stage mock responses -------------------------------------------------

const MOCK_DISCOVER_FULL = {
  content: [{
    type: 'text',
    text: JSON.stringify({
      classification: 'FULL_DISCOVERY',
      confidence: 0.91,
      rationale: 'Vague verb "add" with no defined success metric, no target user, and no stated outcome.',
      primary_signal: '"Add AI summaries" — solution-first with no problem or measurable outcome',
      questions: [
        {
          rank: 1,
          question: 'Which users are struggling to consume data today, and in what workflow context?',
          category: 'user_job',
          why_it_matters: 'Without knowing who needs summaries, we might build the wrong type of summary',
          fastest_validation: '1 user conversation',
        },
        {
          rank: 2,
          question: 'What does success look like — what metric changes when this works?',
          category: 'outcome',
          why_it_matters: 'No metric means we cannot determine when to ship',
          fastest_validation: 'data pull',
        },
        {
          rank: 3,
          question: 'What is the acceptable latency and cost per summary generation?',
          category: 'feasibility',
          why_it_matters: 'AI summaries on large datasets can be expensive and slow',
          fastest_validation: 'engineering spike',
        },
      ],
      assumptions: [
        {
          statement: 'We assume users are overwhelmed by data volume, not that the data is incorrect',
          type: 'desirability',
          risk: 'high',
          simple_test: 'Review 5 support tickets or user interviews for "too much data" patterns',
        },
        {
          statement: 'We assume summary latency under 3 seconds is acceptable to users',
          type: 'desirability',
          risk: 'medium',
          simple_test: 'Ask 2 users: "How long would you wait for an AI summary?"',
        },
        {
          statement: 'We assume the current data pipeline can support batch summarization without major refactoring',
          type: 'feasibility',
          risk: 'medium',
          simple_test: 'Engineering spike: attempt to summarize 10 sample records',
        },
      ],
    }),
  }],
  usage: { input_tokens: 420, output_tokens: 680 },
}

const MOCK_DISCOVER_SKIP = {
  content: [{
    type: 'text',
    text: JSON.stringify({
      classification: 'SKIP',
      confidence: 0.96,
      rationale: 'Clear bug report with explicit expected vs actual behavior and exact reproduction steps.',
      primary_signal: 'Expected: redirect to dashboard. Actual: 500 error. Reproduces 100% on email+password login.',
      questions: [],
      assumptions: [],
    }),
  }],
  usage: { input_tokens: 180, output_tokens: 120 },
}

const MOCK_REFINE_WITH_CONTEXT = {
  content: [{
    type: 'text',
    text: JSON.stringify([
      {
        title: 'Add AI-generated data summaries to the analytics dashboard',
        problem: 'Power users are overwhelmed by raw data volume on the analytics dashboard and need a way to quickly understand trends without reading every data point.',
        acceptanceCriteria: [
          'Summary is generated within 3 seconds for datasets up to 1,000 records',
          'Summary includes key trend, anomaly (if any), and recommended action',
          'Summary is accessible via a "Summarize" button on each data widget',
          'Summary cost is tracked per user per month and surfaced in the billing dashboard',
        ],
        estimate: 'M',
        priority: 'HIGH — directly reduces churn for power users who cite data overload as a pain point',
        tags: ['feature', 'ai', 'analytics'],
        assumptions: [
          'Assumes current data pipeline can stream records to Claude without a refactor (validate with spike)',
          'Assumes $0.002/summary is within acceptable cost tolerance — confirm with pricing team',
        ],
      },
    ]),
  }],
  usage: { input_tokens: 680, output_tokens: 420 },
}

const MOCK_REFINE_BUG = {
  content: [{
    type: 'text',
    text: JSON.stringify([
      {
        title: 'Fix 500 error on email+password login',
        problem: 'Users attempting to log in with email and password receive a 500 Internal Server Error instead of being redirected to the dashboard, causing a complete login failure.',
        acceptanceCriteria: [
          'Email+password login redirects to dashboard on success',
          'Invalid credentials return a 401 with a user-facing error message',
          'No 500 errors appear in server logs during normal login flow',
        ],
        estimate: 'S',
        priority: 'HIGH — complete login failure for email+password users',
        tags: ['bug', 'auth'],
        assumptions: [],
      },
    ]),
  }],
  usage: { input_tokens: 320, output_tokens: 280 },
}

const MOCK_PLAN_FULL = {
  content: [{
    type: 'text',
    text: JSON.stringify({
      sprint_goal: 'Restore reliable login and unblock power users with AI-driven data summaries',
      execution_queue: [
        {
          id: '1',
          title: 'Fix 500 error on email+password login',
          estimate: 'S',
          priority: 'HIGH — complete login failure for email+password users',
          tags: ['bug', 'auth'],
          rationale: 'Critical bug blocking all email+password users — highest priority, no dependencies, can start immediately',
          parallel_group: 1,
          depends_on: [],
        },
        {
          id: '2',
          title: 'Add AI-generated data summaries to the analytics dashboard',
          estimate: 'M',
          priority: 'HIGH — directly reduces churn for power users',
          tags: ['feature', 'ai', 'analytics'],
          rationale: 'High priority feature; independent of the login fix, can run in parallel',
          parallel_group: 1,
          depends_on: [],
        },
      ],
      deferred: [],
      fit_ratio: 1.0,
    }),
  }],
  usage: { input_tokens: 520, output_tokens: 380 },
}

const MOCK_PLAN_BUDGET_CONSTRAINED = {
  content: [{
    type: 'text',
    text: JSON.stringify({
      sprint_goal: 'Fix the critical login regression before anything else ships',
      execution_queue: [
        {
          id: '1',
          title: 'Fix 500 error on email+password login',
          estimate: 'S',
          priority: 'HIGH — complete login failure for email+password users',
          tags: ['bug', 'auth'],
          rationale: 'Highest priority item, fits within 1-item budget',
          parallel_group: 1,
          depends_on: [],
        },
      ],
      deferred: [
        {
          id: '2',
          title: 'Add AI-generated data summaries to the analytics dashboard',
          estimate: 'M',
          priority: 'HIGH — directly reduces churn for power users',
          tags: ['feature', 'ai', 'analytics'],
          rationale: 'Deferred — budget max_items: 1 exceeded',
          parallel_group: 2,
          depends_on: [],
        },
      ],
      fit_ratio: 0.5,
    }),
  }],
  usage: { input_tokens: 480, output_tokens: 310 },
}

// ---- Helpers ---------------------------------------------------------------

function makeDiscoverRequest(item: string, context?: string) {
  return new NextRequest('https://refinebacklog.com/api/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item, ...(context ? { context } : {}) }),
  })
}

function makeRefineRequest(
  items: string[],
  opts: { context?: string; discovery_context?: object; licenseKey?: string } = {}
) {
  return new NextRequest('https://refinebacklog.com/api/refine', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.licenseKey ? { 'x-license-key': opts.licenseKey } : {}),
    },
    body: JSON.stringify({
      items,
      ...(opts.context ? { context: opts.context } : {}),
      ...(opts.discovery_context ? { discovery_context: opts.discovery_context } : {}),
    }),
  })
}

function makePlanRequest(
  items: object[],
  opts: { budget?: object; goal_hint?: string; context?: string; licenseKey?: string } = {}
) {
  return new NextRequest('https://refinebacklog.com/api/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.licenseKey ? { 'x-license-key': opts.licenseKey } : {}),
    },
    body: JSON.stringify({
      items,
      ...(opts.budget ? { budget: opts.budget } : {}),
      ...(opts.goal_hint ? { goal_hint: opts.goal_hint } : {}),
      ...(opts.context ? { context: opts.context } : {}),
    }),
  })
}

// ---- Tests -----------------------------------------------------------------

describe('E2E Pipeline: Discover → Refine → Plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Full pipeline — vague item goes through all 3 stages
  it('e2e_full_pipeline — FULL_DISCOVERY item flows through all 3 stages', async () => {
    // Stage 1: Discover — vague item triggers FULL_DISCOVERY
    mockCreate.mockResolvedValueOnce(MOCK_DISCOVER_FULL)
    const discoverRes = await discoverPOST(makeDiscoverRequest(
      'Add AI summaries to user dashboard',
      'B2B analytics SaaS for data teams'
    ))
    expect(discoverRes.status).toBe(200)
    const discoverData = await discoverRes.json()
    expect(discoverData.classification).toBe('FULL_DISCOVERY')
    expect(discoverData.rationale).toBeTruthy()
    // Free tier: at most 1 question and 1 assumption
    expect(discoverData.questions.length).toBeLessThanOrEqual(1)

    // Stage 2: Refine — pass discovery_context to get sharper ACs
    mockCreate.mockResolvedValueOnce(MOCK_REFINE_WITH_CONTEXT)
    const refineRes = await refinePOST(makeRefineRequest(
      ['Add AI summaries to user dashboard'],
      {
        context: 'B2B analytics SaaS for data teams',
        discovery_context: {
          classification: discoverData.classification,
          rationale: discoverData.rationale,
          primary_signal: discoverData.primary_signal,
          questions: [], // free tier returned 0 or 1 questions
          assumptions: [],
        },
      }
    ))
    expect(refineRes.status).toBe(200)
    const refineData = await refineRes.json()
    expect(refineData.items).toHaveLength(1)
    const refinedItem = refineData.items[0]
    expect(refinedItem.title).toBeTruthy()
    expect(refinedItem.acceptanceCriteria.length).toBeGreaterThanOrEqual(2)
    expect(refinedItem.estimate).toMatch(/^(XS|S|M|L|XL)$/)
    expect(refinedItem.priority).toMatch(/^(HIGH|MEDIUM|LOW)/)

    // Stage 3: Plan — pack refined item into execution queue
    mockCreate.mockResolvedValueOnce(MOCK_PLAN_FULL)
    const planRes = await planPOST(makePlanRequest(
      [{ id: '2', title: refinedItem.title, estimate: refinedItem.estimate, priority: refinedItem.priority, tags: refinedItem.tags }],
      { context: 'B2B analytics SaaS for data teams' }
    ))
    expect(planRes.status).toBe(200)
    const planData = await planRes.json()
    expect(planData.sprint_goal).toBeTruthy()
    expect(typeof planData.sprint_goal).toBe('string')
    expect(planData.execution_queue.length).toBeGreaterThanOrEqual(1)
    expect(planData.execution_queue[0].title).toBeTruthy()
    expect(planData.execution_queue[0].rationale).toBeTruthy()
    expect(planData.fit_ratio).toBeGreaterThan(0)
    expect(planData._meta).toBeDefined()
    expect(planData._meta.tier).toBe('free')
  })

  // 2. SKIP path — bug report skips discovery, goes straight to refine → plan
  it('e2e_skip_path — clear bug report skips discovery, chains to refine and plan', async () => {
    // Stage 1: Discover — clear bug gets SKIP
    mockCreate.mockResolvedValueOnce(MOCK_DISCOVER_SKIP)
    const discoverRes = await discoverPOST(makeDiscoverRequest(
      'Login returns 500. Expected: redirect to dashboard. Actual: 500 Internal Server Error. Reproduces 100% on email+password login.'
    ))
    expect(discoverRes.status).toBe(200)
    const discoverData = await discoverRes.json()
    expect(discoverData.classification).toBe('SKIP')
    expect(discoverData.questions).toHaveLength(0)
    expect(discoverData.assumptions).toHaveLength(0)

    // SKIP means: proceed directly to refine WITHOUT discovery_context
    // Stage 2: Refine — no discovery_context needed
    mockCreate.mockResolvedValueOnce(MOCK_REFINE_BUG)
    const refineRes = await refinePOST(makeRefineRequest(
      ['Login returns 500 error on email+password']
    ))
    expect(refineRes.status).toBe(200)
    const refineData = await refineRes.json()
    expect(refineData.items).toHaveLength(1)
    expect(refineData.items[0].estimate).toBe('S')
    expect(refineData.items[0].tags).toContain('bug')

    // Stage 3: Plan — bug fix should be HIGH priority, in group 1
    mockCreate.mockResolvedValueOnce(MOCK_PLAN_FULL)
    const planRes = await planPOST(makePlanRequest([
      { title: refineData.items[0].title, estimate: refineData.items[0].estimate, priority: refineData.items[0].priority, tags: refineData.items[0].tags },
    ]))
    expect(planRes.status).toBe(200)
    const planData = await planRes.json()
    expect(planData.sprint_goal).toBeTruthy()
    expect(planData.execution_queue.length).toBeGreaterThanOrEqual(1)
    // Bug fix should be first (highest priority)
    expect(planData.execution_queue[0].priority).toMatch(/^HIGH/)
  })

  // 3. Budget constraint — max_items:1 returns exactly 1 item, rest deferred
  it('e2e_budget_constraint — plan with max_items:1 puts overflow in deferred', async () => {
    // Skip discover/refine stages, go straight to plan with 2 pre-refined items
    mockCreate.mockResolvedValueOnce(MOCK_PLAN_BUDGET_CONSTRAINED)
    const planRes = await planPOST(makePlanRequest(
      [
        { title: 'Fix 500 error on email+password login', estimate: 'S', priority: 'HIGH — login failure', tags: ['bug'] },
        { title: 'Add AI summaries to dashboard', estimate: 'M', priority: 'HIGH — power user churn', tags: ['feature'] },
      ],
      { budget: { max_items: 1 } }
    ))
    expect(planRes.status).toBe(200)
    const planData = await planRes.json()
    expect(planData.sprint_goal).toBeTruthy()
    expect(planData.execution_queue).toHaveLength(1)
    expect(planData.fit_ratio).toBeLessThan(1.0)
    expect(planData.fit_ratio).toBeCloseTo(0.5)
    // Free tier: _upgrade_hint should appear if items were deferred
    // (deferred itself is hidden on free tier)
    expect(planData._meta.tier).toBe('free')
  })

  // 4. Pro tier — dependency fields present in plan output
  it('e2e_pro_tier — plan response includes parallel_group and depends_on for Pro users', async () => {
    const { getLicenseData } = await import('@/lib/kv')
    vi.mocked(getLicenseData).mockResolvedValueOnce({ plan: 'pro', status: 'active', email: 'pro@example.com' })

    mockCreate.mockResolvedValueOnce(MOCK_PLAN_FULL)
    const planRes = await planPOST(makePlanRequest(
      [
        { title: 'Fix login bug', estimate: 'S', priority: 'HIGH — blocks login', tags: ['bug'] },
        { title: 'Add AI summaries', estimate: 'M', priority: 'HIGH — power user need', tags: ['feature'] },
      ],
      { licenseKey: 'pro-license-key-test' }
    ))
    expect(planRes.status).toBe(200)
    const planData = await planRes.json()
    expect(planData._meta.tier).toBe('pro')
    // Pro tier: parallel_group should be present
    const firstItem = planData.execution_queue[0]
    expect(firstItem.parallel_group).toBeDefined()
    expect(typeof firstItem.parallel_group).toBe('number')
    // Pro tier: depends_on should be present (even if empty array)
    expect(firstItem.depends_on).toBeDefined()
    expect(Array.isArray(firstItem.depends_on)).toBe(true)
    // Pro tier: deferred array should be present (even if empty)
    expect(planData.deferred).toBeDefined()
    expect(Array.isArray(planData.deferred)).toBe(true)
  })

  // 5. Context threads through all 3 stages without loss
  it('e2e_context_propagation — context passed at discover is usable at each downstream stage', async () => {
    const projectContext = 'B2B analytics SaaS for data science teams, 500 enterprise customers'

    // Stage 1
    mockCreate.mockResolvedValueOnce(MOCK_DISCOVER_FULL)
    const discoverRes = await discoverPOST(makeDiscoverRequest(
      'Improve report export',
      projectContext
    ))
    expect(discoverRes.status).toBe(200)
    const discoverData = await discoverRes.json()
    expect(discoverData.classification).toBeTruthy()

    // Stage 2 — context forwarded
    mockCreate.mockResolvedValueOnce(MOCK_REFINE_WITH_CONTEXT)
    const refineRes = await refinePOST(makeRefineRequest(
      ['Improve report export'],
      { context: projectContext }
    ))
    expect(refineRes.status).toBe(200)
    const refineData = await refineRes.json()
    expect(refineData.items.length).toBeGreaterThan(0)

    // Stage 3 — context forwarded, goal_hint provided
    mockCreate.mockResolvedValueOnce(MOCK_PLAN_FULL)
    const planRes = await planPOST(makePlanRequest(
      refineData.items.map((item: { title: string; estimate: string; priority: string; tags: string[] }, i: number) => ({
        id: String(i + 1),
        title: item.title,
        estimate: item.estimate,
        priority: item.priority,
        tags: item.tags,
      })),
      {
        context: projectContext,
        goal_hint: 'Unblock enterprise customers stuck on the export limitation',
      }
    ))
    expect(planRes.status).toBe(200)
    const planData = await planRes.json()
    expect(planData.sprint_goal).toBeTruthy()
    expect(planData.execution_queue.length).toBeGreaterThan(0)
    // _meta should be present at every stage
    expect(planData._meta).toBeDefined()
    expect(planData._meta.tier).toBe('free')
  })

  // 6. Invalid input at each stage returns 400 (pipeline error handling)
  it('e2e_error_handling — each stage correctly rejects empty/missing input', async () => {
    // Discover: missing item
    const badDiscover = await discoverPOST(
      new NextRequest('https://refinebacklog.com/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    )
    expect(badDiscover.status).toBe(400)
    const d = await badDiscover.json()
    expect(d.error).toContain('No backlog item provided')

    // Refine: empty items array
    const badRefine = await refinePOST(
      new NextRequest('https://refinebacklog.com/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] }),
      })
    )
    expect(badRefine.status).toBe(400)
    const r = await badRefine.json()
    expect(r.error).toContain('No backlog items provided')

    // Plan: missing items
    const badPlan = await planPOST(
      new NextRequest('https://refinebacklog.com/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    )
    expect(badPlan.status).toBe(400)
    const p = await badPlan.json()
    expect(p.error).toContain('No backlog items provided')
  })
})
