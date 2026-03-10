import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/issue-free-key/route'

// Mock KV so we don't need a real Redis connection
const kvStore = new Map<string, string>()

vi.mock('@/lib/kv', () => ({
  getFreeKey: vi.fn(async (email: string) => kvStore.get(email) ?? null),
  setFreeKey: vi.fn(async (email: string, key: string) => { kvStore.set(email, key) }),
  checkRateLimitKV: vi.fn().mockResolvedValue({ count: 0, allowed: true }),
  getKV: vi.fn().mockResolvedValue(null),
}))

function makeRequest(body: object) {
  return new NextRequest('https://speclint.ai/api/issue-free-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/issue-free-key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    kvStore.clear()
  })

  it('returns licenseKey and plan: free for valid email', async () => {
    const res = await POST(makeRequest({ email: 'test@example.com' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.licenseKey).toMatch(/^SK-FREE-/)
    expect(data.plan).toBe('free')
  })

  it('returns 400 for invalid email (no @)', async () => {
    const res = await POST(makeRequest({ email: 'notanemail' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  it('returns 400 for missing email', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns same key for same email (idempotent)', async () => {
    const res1 = await POST(makeRequest({ email: 'repeat@example.com' }))
    expect(res1.status).toBe(200)
    const data1 = await res1.json()

    const res2 = await POST(makeRequest({ email: 'repeat@example.com' }))
    expect(res2.status).toBe(200)
    const data2 = await res2.json()

    expect(data1.licenseKey).toBe(data2.licenseKey)
    expect(data2.isNew).toBe(false)
  })
})
