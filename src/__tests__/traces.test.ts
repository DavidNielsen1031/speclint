/**
 * traces.test.ts — Tests for SL-060 trace storage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { TraceData } from '@/lib/kv'

// Shared mock method holders — defined before vi.mock factory runs
const mockMethods = {
  rpush: vi.fn(),
  llen: vi.fn(),
  expire: vi.fn(),
  lrange: vi.fn(),
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  incr: vi.fn().mockResolvedValue(1),
}

// Mock Redis — must use a regular function or class (not arrow) to support `new`
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function MockRedis(this: unknown) {
    Object.assign(this as object, mockMethods)
  }),
}))

// Set env so getRedis() returns a Redis instance
vi.stubEnv('KV_REST_API_URL', 'https://mock-redis.upstash.io')
vi.stubEnv('KV_REST_API_TOKEN', 'mock-token')

// Partially mock @/lib/kv — spread actual so storeTrace/getTraces use real impl
// but override getLicenseData for route auth tests
vi.mock('@/lib/kv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/kv')>()
  return {
    ...actual,
    getLicenseData: vi.fn(),
  }
})

import { storeTrace, getTraces } from '@/lib/kv'

// ---

const sampleTrace: TraceData = {
  traceId: '550e8400-e29b-41d4-a716-446655440000',
  lintId: 'spl_abcd1234',
  timestamp: '2024-03-07T03:00:00.000Z',
  tier: 'pro',
  endpoint: 'refine',
  inputItems: ['Fix login bug', 'Add dark mode'],
  refinedOutput: [
    {
      title: 'Fix Login Bug',
      problem: 'Users cannot log in.',
      acceptanceCriteria: ['Given valid creds, when submitted, then logged in'],
      estimate: 'S',
      priority: 'HIGH — blocks all users',
      tags: ['bug'],
    },
  ],
  scores: [
    {
      title: 'Fix Login Bug',
      completeness_score: 85,
      agent_ready: true,
      breakdown: { hasProblem: true, hasAC: true, hasEstimate: true },
    },
  ],
  averageScore: 85,
  agentReadyCount: 1,
  model: 'claude-haiku-4-5',
  inputTokens: 100,
  outputTokens: 200,
  latencyMs: 1234,
}

// --- storeTrace unit tests ---

describe('storeTrace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore default return values cleared by clearAllMocks
    mockMethods.get.mockResolvedValue(null)
    mockMethods.set.mockResolvedValue('OK')
    mockMethods.incr.mockResolvedValue(1)
  })

  it('serializes trace data and calls rpush with correct key', async () => {
    mockMethods.llen.mockResolvedValue(0)
    mockMethods.rpush.mockResolvedValue(1)
    mockMethods.expire.mockResolvedValue(1)

    await storeTrace(sampleTrace)

    expect(mockMethods.llen).toHaveBeenCalledWith('traces:2024-03-07')
    expect(mockMethods.rpush).toHaveBeenCalledWith(
      'traces:2024-03-07',
      JSON.stringify(sampleTrace),
    )
  })

  it('sets 30-day TTL on first push (count === 1)', async () => {
    mockMethods.llen.mockResolvedValue(0)
    mockMethods.rpush.mockResolvedValue(1)
    mockMethods.expire.mockResolvedValue(1)

    await storeTrace(sampleTrace)

    expect(mockMethods.expire).toHaveBeenCalledWith('traces:2024-03-07', 30 * 24 * 3600)
  })

  it('does NOT set TTL on subsequent pushes', async () => {
    mockMethods.llen.mockResolvedValue(10)
    mockMethods.rpush.mockResolvedValue(11)

    await storeTrace(sampleTrace)

    expect(mockMethods.expire).not.toHaveBeenCalled()
  })

  it('skips push when daily cap (500) is reached', async () => {
    mockMethods.llen.mockResolvedValue(500)

    await storeTrace(sampleTrace)

    expect(mockMethods.rpush).not.toHaveBeenCalled()
  })

  it('stores pre-truncated inputItems (caller truncates at 2000)', async () => {
    const longItem = 'x'.repeat(2000)
    const trace: TraceData = { ...sampleTrace, inputItems: [longItem] }

    mockMethods.llen.mockResolvedValue(0)
    mockMethods.rpush.mockResolvedValue(1)
    mockMethods.expire.mockResolvedValue(1)

    await storeTrace(trace)

    const storedArg = mockMethods.rpush.mock.calls[0][1] as string
    const stored: TraceData = JSON.parse(storedArg)
    expect(stored.inputItems[0].length).toBe(2000)
  })

  it('handles Redis errors gracefully without throwing', async () => {
    mockMethods.llen.mockRejectedValue(new Error('Redis connection failed'))

    await expect(storeTrace(sampleTrace)).resolves.toBeUndefined()
  })
})

// --- getTraces unit tests ---

describe('getTraces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMethods.get.mockResolvedValue(null)
    mockMethods.set.mockResolvedValue('OK')
  })

  it('fetches traces from the correct key', async () => {
    const serialized = JSON.stringify(sampleTrace)
    mockMethods.lrange.mockResolvedValue([serialized])

    const result = await getTraces('2024-03-07', 10)

    expect(mockMethods.lrange).toHaveBeenCalledWith('traces:2024-03-07', 0, 9)
    expect(result).toHaveLength(1)
    expect(result[0].traceId).toBe(sampleTrace.traceId)
  })

  it('respects limit and clamps to max 200', async () => {
    mockMethods.lrange.mockResolvedValue([])

    await getTraces('2024-03-07', 999)

    expect(mockMethods.lrange).toHaveBeenCalledWith('traces:2024-03-07', 0, 199)
  })

  it('defaults limit to 50', async () => {
    mockMethods.lrange.mockResolvedValue([])

    await getTraces('2024-03-07')

    expect(mockMethods.lrange).toHaveBeenCalledWith('traces:2024-03-07', 0, 49)
  })

  it('returns empty array on Redis error', async () => {
    mockMethods.lrange.mockRejectedValue(new Error('Redis down'))

    const result = await getTraces('2024-03-07')

    expect(result).toEqual([])
  })

  it('parses multiple traces correctly', async () => {
    const trace2: TraceData = { ...sampleTrace, traceId: 'other-uuid', lintId: 'spl_zzzz9999' }
    mockMethods.lrange.mockResolvedValue([JSON.stringify(sampleTrace), JSON.stringify(trace2)])

    const result = await getTraces('2024-03-07', 50)

    expect(result).toHaveLength(2)
    expect(result[0].traceId).toBe(sampleTrace.traceId)
    expect(result[1].traceId).toBe('other-uuid')
  })
})

// --- /api/traces route tests ---

describe('GET /api/traces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMethods.get.mockResolvedValue(null)
    mockMethods.set.mockResolvedValue('OK')
  })

  function makeReq(headers: Record<string, string> = {}, search = '') {
    return new NextRequest(`https://speclint.ai/api/traces${search}`, {
      method: 'GET',
      headers,
    })
  }

  it('returns 401 when x-license-key is missing', async () => {
    const { GET } = await import('@/app/api/traces/route')
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toContain('Missing x-license-key')
  })

  it('returns 403 for free tier key', async () => {
    const { getLicenseData } = await import('@/lib/kv')
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'cust_1', plan: 'free', status: 'active' })

    const { GET } = await import('@/app/api/traces/route')
    const res = await GET(makeReq({ 'x-license-key': 'SK-FREE-abc' }))
    expect(res.status).toBe(403)
  })

  it('returns 403 for invalid/missing key in KV', async () => {
    const { getLicenseData } = await import('@/lib/kv')
    vi.mocked(getLicenseData).mockResolvedValue(null)

    const { GET } = await import('@/app/api/traces/route')
    const res = await GET(makeReq({ 'x-license-key': 'SK-INVALID' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for invalid date format', async () => {
    const { getLicenseData } = await import('@/lib/kv')
    const internalKey = 'SK-INTERNAL-TEST-KEY'
    vi.stubEnv('INTERNAL_API_KEY', internalKey)
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'cust_pro', plan: 'pro', status: 'active' })

    const { GET } = await import('@/app/api/traces/route')
    const res = await GET(makeReq({ 'x-license-key': internalKey }, '?date=not-a-date'))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Invalid date format')
    vi.unstubAllEnvs()
  })

  it('returns traces for valid pro key', async () => {
    const { getLicenseData } = await import('@/lib/kv')
    const internalKey = 'SK-INTERNAL-TEST-KEY'
    vi.stubEnv('INTERNAL_API_KEY', internalKey)
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'cust_pro', plan: 'pro', status: 'active' })
    mockMethods.lrange.mockResolvedValue([JSON.stringify(sampleTrace)])

    const { GET } = await import('@/app/api/traces/route')
    const res = await GET(makeReq({ 'x-license-key': internalKey }, '?date=2024-03-07&limit=10'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.traces).toHaveLength(1)
    expect(data.count).toBe(1)
    expect(data.date).toBe('2024-03-07')
    vi.unstubAllEnvs()
  })

  it('returns traces for valid team key', async () => {
    const { getLicenseData } = await import('@/lib/kv')
    const internalKey = 'SK-INTERNAL-TEST-KEY'
    vi.stubEnv('INTERNAL_API_KEY', internalKey)
    vi.mocked(getLicenseData).mockResolvedValue({ customerId: 'cust_team', plan: 'team', status: 'active' })
    mockMethods.lrange.mockResolvedValue([])

    const { GET } = await import('@/app/api/traces/route')
    const res = await GET(makeReq({ 'x-license-key': internalKey }, '?date=2024-03-07'))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.traces).toEqual([])
    expect(data.count).toBe(0)
    vi.unstubAllEnvs()
  })
})
