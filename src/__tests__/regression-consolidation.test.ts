/**
 * REGRESSION TEST SUITE — Pre-consolidation snapshot
 *
 * Captures every user-facing behavior before the refactor:
 * 1. /api/rewrite standalone endpoint (will become thin redirect)
 * 2. /api/refine with auto_rewrite (will absorb rewrite logic)
 * 3. /api/lint forwarding
 * 4. /api/groom redirect (will be removed)
 * 5. /api/key-info, /api/license, /api/retrieve-key (will merge into /api/key)
 * 6. Spec-tester component flow (lint → rewrite → single-call)
 *
 * After consolidation, these tests MUST still pass (some re-pointed to new routes).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Shared mocks ───

const mockLLMResponse = {
  content: [{
    type: 'text',
    text: JSON.stringify({
      rewritten: 'Improved spec: When user clicks login with valid credentials, the system authenticates within 2 seconds and redirects to dashboard. Verify via integration test.',
      changes: ['Improved specificity of acceptance criteria', 'Added measurable performance constraint'],
      structured: {
        title: 'Fix Login Authentication',
        problem: 'Login button fails silently for valid users',
        acceptanceCriteria: ['Given valid credentials, when submitted, then user is authenticated within 2s'],
        constraints: ['Must not break SSO flow'],
        verificationSteps: ['Run integration test suite', 'Verify session token is set'],
      },
    }),
  }],
  usage: { input_tokens: 150, output_tokens: 250 },
}

const mockRefineLLMResponse = {
  content: [{
    type: 'text',
    text: JSON.stringify([{
      title: 'Fix Login Bug',
      problem: 'Users cannot log in with valid credentials, causing 100% auth failure rate.',
      acceptanceCriteria: [
        'Given valid credentials, when user submits login form, then authentication succeeds within 2 seconds',
        'Verify session token is set in response cookies',
        'Ensure failed login returns specific error message, not generic 500',
      ],
      estimate: 'S',
      priority: 'HIGH — blocks all users from accessing the system',
      tags: ['bug', 'auth', 'critical'],
      assumptions: ['SSO integration is not affected'],
    }]),
  }],
  usage: { input_tokens: 100, output_tokens: 200 },
}

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: vi.fn().mockImplementation(async (params: { max_tokens: number }) => {
        // Route based on max_tokens: 1024 = rewrite, 4000 = refine
        if (params.max_tokens === 1024) return mockLLMResponse
        return mockRefineLLMResponse
      }),
    }
  }
  class APIError extends Error {}
  ;(MockAnthropic as unknown as Record<string, unknown>).APIError = APIError
  return { default: MockAnthropic, APIError }
})

vi.mock('@/lib/kv', () => ({
  getLicenseData: vi.fn().mockImplementation(async (key: string) => {
    if (key.startsWith('SK-FREE-')) return { plan: 'free', customerId: null, status: 'active' }
    if (key.startsWith('SK-INTERNAL-')) return { plan: 'team', customerId: null, status: 'active' }
    if (key === 'pro-test-key') return { plan: 'pro', customerId: 'cus_pro', status: 'active' }
    if (key === 'team-test-key') return { plan: 'team', customerId: 'cus_team', status: 'active' }
    if (key === 'lite-test-key') return { plan: 'lite', customerId: 'cus_lite', status: 'active' }
    if (key === 'revoked-key') return { plan: 'pro', customerId: 'cus_rev', status: 'canceled' }
    return null
  }),
  checkRateLimitKV: vi.fn().mockResolvedValue({ count: 0, allowed: true }),
  isKvConnected: vi.fn(() => true),
  getSubscriptionByCustomer: vi.fn().mockResolvedValue(null),
  getSubscriptionByEmail: vi.fn().mockResolvedValue(null),
  storeLintReceipt: vi.fn().mockResolvedValue(undefined),
  storeTrace: vi.fn().mockResolvedValue(undefined),
  getFreeKey: vi.fn().mockResolvedValue(null),
  setFreeKey: vi.fn().mockResolvedValue(undefined),
  getKeyUsageToday: vi.fn().mockResolvedValue(0),
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

// ═══════════════════════════════════════════════════════════════
// 1. /api/rewrite — Standalone Rewrite Endpoint
// ═══════════════════════════════════════════════════════════════

describe('REGRESSION: /api/rewrite standalone', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/rewrite/route')
    POST = mod.POST
  })

  function makeRewriteReq(body: object, headers: Record<string, string> = {}) {
    return new NextRequest('https://speclint.ai/api/rewrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer pro-test-key',
        ...headers,
      },
      body: JSON.stringify(body),
    })
  }

  // ─── Auth ───

  it('returns 401 when no license key provided', async () => {
    const req = new NextRequest('https://speclint.ai/api/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spec: 'test', gaps: ['x'], score: 40 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toContain('license key')
  })

  it('accepts Authorization: Bearer header', async () => {
    const res = await POST(makeRewriteReq({
      spec: 'Fix login', gaps: ['has_measurable_outcome'], score: 40,
    }, { 'Authorization': 'Bearer pro-test-key' }))
    expect(res.status).toBe(200)
  })

  it('accepts x-license-key header', async () => {
    const req = new NextRequest('https://speclint.ai/api/rewrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-license-key': 'pro-test-key',
      },
      body: JSON.stringify({ spec: 'Fix login', gaps: ['has_measurable_outcome'], score: 40 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('accepts deprecated license_key in body (with warning)', async () => {
    const req = new NextRequest('https://speclint.ai/api/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spec: 'Fix login', gaps: ['has_measurable_outcome'], score: 40,
        license_key: 'pro-test-key',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('rejects oversized license key (>256 chars)', async () => {
    const res = await POST(makeRewriteReq({
      spec: 'Fix login', gaps: ['x'], score: 40,
    }, { 'Authorization': `Bearer ${'A'.repeat(300)}` }))
    expect(res.status).toBe(400)
  })

  // ─── Input validation ───

  it('returns 400 when spec is missing', async () => {
    const res = await POST(makeRewriteReq({ gaps: ['x'], score: 40 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('spec')
  })

  it('returns 400 when gaps is missing', async () => {
    const res = await POST(makeRewriteReq({ spec: 'test', score: 40 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('gaps')
  })

  it('returns 400 when gaps is empty', async () => {
    const res = await POST(makeRewriteReq({ spec: 'test', gaps: [], score: 40 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when score is missing', async () => {
    const res = await POST(makeRewriteReq({ spec: 'test', gaps: ['x'] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('score')
  })

  it('validates codebase_context structure', async () => {
    const res = await POST(makeRewriteReq({
      spec: 'test', gaps: ['x'], score: 40,
      codebase_context: 'invalid-string',
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('codebase_context')
  })

  it('validates mode enum', async () => {
    const res = await POST(makeRewriteReq({
      spec: 'test', gaps: ['x'], score: 40,
      mode: 'invalid_mode',
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('mode')
  })

  it('validates target_agent enum', async () => {
    const res = await POST(makeRewriteReq({
      spec: 'test', gaps: ['x'], score: 40,
      target_agent: 'invalid_agent',
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('target_agent')
  })

  it('validates max_iterations range (1-3)', async () => {
    const res = await POST(makeRewriteReq({
      spec: 'test', gaps: ['x'], score: 40,
      max_iterations: 5,
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('max_iterations')
  })

  // ─── Tier gating ───

  it('Lite tier: blocks codebase_context with 403', async () => {
    const req = new NextRequest('https://speclint.ai/api/rewrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer lite-test-key',
      },
      body: JSON.stringify({
        spec: 'test', gaps: ['x'], score: 40,
        codebase_context: { stack: ['Next.js'] },
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    expect((await res.json()).upgrade_url).toBeDefined()
  })

  // ─── Response shape: paid tier ───

  it('paid tier: returns rewritten + changes + new_score', async () => {
    const res = await POST(makeRewriteReq({
      spec: 'Fix login', gaps: ['has_measurable_outcome'], score: 40,
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.rewritten).toBeDefined()
    expect(typeof data.rewritten).toBe('string')
    expect(data.changes).toBeDefined()
    expect(Array.isArray(data.changes)).toBe(true)
    expect(data.new_score).toBeDefined()
    expect(typeof data.new_score).toBe('number')
  })

  it('paid tier: returns structured output when available', async () => {
    const res = await POST(makeRewriteReq({
      spec: 'Fix login', gaps: ['has_measurable_outcome'], score: 40,
    }))
    const data = await res.json()
    expect(data.structured).toBeDefined()
    expect(data.structured.title).toBeDefined()
    expect(data.structured.acceptanceCriteria).toBeDefined()
    expect(Array.isArray(data.structured.acceptanceCriteria)).toBe(true)
  })

  // ─── Response shape: free tier ───

  it('free tier: returns preview + changes + new_score + upgrade message', async () => {
    const req = new NextRequest('https://speclint.ai/api/rewrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer SK-FREE-TEST123456',
      },
      body: JSON.stringify({
        spec: 'Fix login', gaps: ['has_measurable_outcome'], score: 40,
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.preview).toBeDefined()
    expect(data.rewritten).toBeUndefined() // NOT full text
    expect(data.changes).toBeDefined()
    expect(data.new_score).toBeDefined()
    expect(data.upgrade_message).toBeDefined()
    expect(data.tier).toBe('free')
  })

  // ─── Rate limit headers ───

  it('returns X-RateLimit-Limit and X-RateLimit-Remaining headers', async () => {
    const res = await POST(makeRewriteReq({
      spec: 'Fix login', gaps: ['has_measurable_outcome'], score: 40,
    }))
    expect(res.headers.get('X-RateLimit-Limit')).toBeDefined()
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. /api/refine — Core Lint + Auto-Rewrite
// ═══════════════════════════════════════════════════════════════

describe('REGRESSION: /api/refine core', () => {
  let POST: (req: NextRequest) => Promise<Response>
  let GET: () => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/refine/route')
    POST = mod.POST
    GET = mod.GET
  })

  function makeRefineReq(body: object, headers: Record<string, string> = {}) {
    return new NextRequest('https://speclint.ai/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  }

  // ─── Input validation ───

  it('returns 400 for missing items', async () => {
    const res = await POST(makeRefineReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty items', async () => {
    const res = await POST(makeRefineReq({ items: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when both items and issues provided', async () => {
    const res = await POST(makeRefineReq({
      items: ['test'],
      issues: [{ title: 'test', body: 'test' }],
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain("'items' or 'issues'")
  })

  it('returns 400 for oversized item', async () => {
    const res = await POST(makeRefineReq({ items: ['A'.repeat(10001)] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('maximum length')
  })

  it('returns 400 for too many items on free tier', async () => {
    const res = await POST(makeRefineReq({ items: Array(10).fill('item') }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Free tier is limited')
  })

  // ─── Response shape ───

  it('returns lint_id, items, scores, summary, _meta', async () => {
    const res = await POST(makeRefineReq({ items: ['Fix login'] }))
    expect(res.status).toBe(200)
    const data = await res.json()

    // lint_id
    expect(data.lint_id).toBeDefined()
    expect(data.lint_id).toMatch(/^spl_/)

    // items array
    expect(data.items).toBeDefined()
    expect(Array.isArray(data.items)).toBe(true)
    expect(data.items.length).toBeGreaterThan(0)

    // Each item has embedded score fields
    const item = data.items[0]
    expect(item.completeness_score).toBeDefined()
    expect(item.agent_ready).toBeDefined()
    expect(item.breakdown).toBeDefined()
    expect(item.lint_id).toBe(data.lint_id)

    // scores array
    expect(data.scores).toBeDefined()
    expect(data.scores.length).toBe(data.items.length)
    expect(data.scores[0].completeness_score).toBeDefined()
    expect(data.scores[0].agent_ready).toBeDefined()
    expect(data.scores[0].breakdown).toBeDefined()

    // summary
    expect(data.summary.average_score).toBeDefined()
    expect(data.summary.agent_ready_count).toBeDefined()
    expect(data.summary.total_count).toBe(data.items.length)

    // _meta
    expect(data._meta.requestId).toBeDefined()
    expect(data._meta.model).toBeDefined()
    expect(data._meta.tier).toBeDefined()
    expect(data._meta.latencyMs).toBeDefined()
  })

  it('issues format converts to items', async () => {
    const res = await POST(makeRefineReq({
      issues: [{ title: 'Bug', body: 'Login broken', labels: ['bug'] }],
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.items.length).toBe(1)
  })

  // ─── auto_rewrite ───

  it('auto_rewrite validation: rejects non-boolean', async () => {
    const res = await POST(makeRefineReq({
      items: ['Fix login'], auto_rewrite: 'yes',
    }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('auto_rewrite')
  })

  it('auto_rewrite validation: rejects invalid rewrite_mode', async () => {
    const res = await POST(makeRefineReq({
      items: ['Fix login'], auto_rewrite: true, rewrite_mode: 'invalid',
    }))
    expect(res.status).toBe(400)
  })

  it('auto_rewrite validation: rejects invalid target_agent', async () => {
    const res = await POST(makeRefineReq({
      items: ['Fix login'], auto_rewrite: true, target_agent: 'invalid',
    }))
    expect(res.status).toBe(400)
  })

  it('auto_rewrite validation: rejects out-of-range max_iterations', async () => {
    const res = await POST(makeRefineReq({
      items: ['Fix login'], auto_rewrite: true, max_iterations: 10,
    }))
    expect(res.status).toBe(400)
  })

  // ─── codebase_context ───

  it('codebase_context ignored on free tier', async () => {
    const res = await POST(makeRefineReq({
      items: ['Fix login'],
      codebase_context: { stack: ['Next.js'], patterns: [], constraints: [] },
    }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data._meta.codebase_context_used).toBe(false)
  })

  // ─── GET endpoint ───

  it('GET returns API description', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toBe('Speclint API')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. /api/lint — Forwarding Behavior
// ═══════════════════════════════════════════════════════════════

describe('REGRESSION: /api/lint forwarding', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/lint/route')
    POST = mod.POST
  })

  it('forwards to refine and returns valid response', async () => {
    const req = new NextRequest('https://speclint.ai/api/lint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: ['Fix login'] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.items).toBeDefined()
    expect(data.scores).toBeDefined()
  })

  it('preserves error responses from refine', async () => {
    const req = new NextRequest('https://speclint.ai/api/lint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. /api/key-info — Key Inspection
// ═══════════════════════════════════════════════════════════════

describe('REGRESSION: /api/key-info', () => {
  let GET: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/key-info/route')
    GET = mod.GET
  })

  it('returns 400 when x-license-key header is missing', async () => {
    const req = new NextRequest('https://speclint.ai/api/key-info', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 for unknown license key', async () => {
    const req = new NextRequest('https://speclint.ai/api/key-info', {
      method: 'GET',
      headers: { 'x-license-key': 'unknown-key-123' },
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns key info for valid pro key', async () => {
    const req = new NextRequest('https://speclint.ai/api/key-info', {
      method: 'GET',
      headers: { 'x-license-key': 'pro-test-key' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.key).toBeDefined() // masked key
    expect(data.tier).toBe('pro')
    expect(data.status).toBe('active')
    // Pro tier: remaining_today should be null (unlimited)
    expect(data.remaining_today).toBeNull()
  })

  it('returns remaining_today for free tier', async () => {
    const req = new NextRequest('https://speclint.ai/api/key-info', {
      method: 'GET',
      headers: { 'x-license-key': 'SK-FREE-TEST123456' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tier).toBe('free')
    expect(typeof data.remaining_today).toBe('number')
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. /api/retrieve-key — Key Recovery
// ═══════════════════════════════════════════════════════════════

describe('REGRESSION: /api/retrieve-key', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/retrieve-key/route')
    POST = mod.POST
  })

  it('returns 400 for missing email', async () => {
    const req = new NextRequest('https://speclint.ai/api/retrieve-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns found:false for unknown email (anti-enumeration)', async () => {
    const req = new NextRequest('https://speclint.ai/api/retrieve-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@test.com' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.found).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. Scoring Engine Invariants
// ═══════════════════════════════════════════════════════════════

describe('REGRESSION: Scoring invariants', () => {
  it('computeCompletenessScore returns 0-100 with breakdown', async () => {
    const { computeCompletenessScore } = await import('@/lib/scoring')
    const item = {
      title: 'Test',
      problem: 'Something is broken',
      acceptanceCriteria: ['Given X, when Y, then Z'],
      estimate: 'M' as const,
      priority: 'HIGH — test',
      tags: ['test'],
    }
    const result = computeCompletenessScore(item)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.breakdown).toBeDefined()
    expect(typeof result.breakdown.has_measurable_outcome).toBe('boolean')
    expect(typeof result.breakdown.has_testable_criteria).toBe('boolean')
    expect(typeof result.breakdown.has_constraints).toBe('boolean')
    expect(typeof result.breakdown.no_vague_verbs).toBe('boolean')
    expect(typeof result.breakdown.has_verification_steps).toBe('boolean')
  })

  it('isAgentReady returns true for score >= 70', async () => {
    const { isAgentReady } = await import('@/lib/scoring')
    expect(isAgentReady(70)).toBe(true)
    expect(isAgentReady(69)).toBe(false)
    expect(isAgentReady(100)).toBe(true)
    expect(isAgentReady(0)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Rate Limiting Invariants
// ═══════════════════════════════════════════════════════════════

describe('REGRESSION: Rate limit tier config', () => {
  it('getTierLimits returns correct limits for all tiers', async () => {
    const { getTierLimits } = await import('@/lib/rate-limit')
    
    const free = getTierLimits('free')
    expect(free.maxItems).toBe(5)
    expect(free.maxRewritesPerDay).toBe(1)

    const lite = getTierLimits('lite')
    expect(lite.maxItems).toBe(5)
    expect(lite.maxRewritesPerDay).toBe(10)

    const pro = getTierLimits('pro')
    expect(pro.maxItems).toBe(25)
    expect(pro.maxRewritesPerDay).toBe(500)

    const team = getTierLimits('team')
    expect(team.maxItems).toBe(50)
    expect(team.maxRewritesPerDay).toBe(1000)
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. Shared Rewrite Types/Prompt Invariants
// ═══════════════════════════════════════════════════════════════

describe('REGRESSION: Shared rewrite types', () => {
  it('VALID_TARGET_AGENTS contains expected values', async () => {
    const { VALID_TARGET_AGENTS } = await import('@/lib/rewrite-types')
    expect(VALID_TARGET_AGENTS).toContain('cursor')
    expect(VALID_TARGET_AGENTS).toContain('claude-code')
    expect(VALID_TARGET_AGENTS).toContain('codex')
    expect(VALID_TARGET_AGENTS).toContain('copilot')
    expect(VALID_TARGET_AGENTS).toContain('general')
  })

  it('VALID_MODES contains minimal and full', async () => {
    const { VALID_MODES } = await import('@/lib/rewrite-types')
    expect(VALID_MODES).toContain('minimal')
    expect(VALID_MODES).toContain('full')
  })

  it('buildSystemPrompt returns non-empty string', async () => {
    const { buildSystemPrompt } = await import('@/lib/rewrite-prompt')
    const prompt = buildSystemPrompt({})
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(100)
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. No "groom" references in responses
// ═══════════════════════════════════════════════════════════════

describe('REGRESSION: No "groom" terminology', () => {
  it('/api/refine response body has no "groom" references', async () => {
    const { POST } = await import('@/app/api/refine/route')
    const req = new NextRequest('https://speclint.ai/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: ['Fix login'] }),
    })
    const res = await POST(req)
    const text = await res.text()
    expect(text.toLowerCase()).not.toContain('groom')
  })

  it('/api/refine GET has no "groom" references', async () => {
    const { GET } = await import('@/app/api/refine/route')
    const res = await GET()
    const text = await res.text()
    expect(text.toLowerCase()).not.toContain('groom')
  })
})
