// KV storage with Upstash Redis — falls back to in-memory if KV not configured

import { Redis } from '@upstash/redis'

interface SubscriptionData {
  plan: 'lite' | 'pro' | 'team'
  status: 'active' | 'canceled'
  email?: string
  licenseKey: string
  subscriptionId: string
}

interface LicenseData {
  customerId: string
  plan: 'lite' | 'pro' | 'team'
  status: 'active' | 'canceled'
}

// In-memory fallback stores
const memSubs = new Map<string, SubscriptionData>()
const memLicenses = new Map<string, LicenseData>()
const memRateLimits = new Map<string, number>()

let kvStatusLogged = false
let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
    return redis
  }
  return null
}

function kvAvailable(): boolean {
  return !!getRedis()
}

export function isKvConnected(): boolean {
  return kvAvailable()
}

function logKvStatus() {
  if (!kvStatusLogged) {
    kvStatusLogged = true
    console.log(kvAvailable() ? 'KV: connected' : 'KV: fallback (in-memory)')
  }
}

// --- Subscription CRUD ---

export async function setSubscription(customerId: string, data: SubscriptionData): Promise<void> {
  logKvStatus()
  const r = getRedis()
  if (r) {
    try {
      await r.set(`sub:${customerId}`, JSON.stringify(data))
      await r.set(`license:${data.licenseKey}`, JSON.stringify({
        customerId,
        plan: data.plan,
        status: data.status,
      } satisfies LicenseData))
      // Email reverse lookup — lets customers retrieve their key by email
      if (data.email) {
        const emailKey = `email:${data.email.toLowerCase().trim()}:customerId`
        await r.set(emailKey, customerId)
      }
    } catch (err) {
      console.error('[KV] setSubscription failed, falling back to memory:', err)
      memSubs.set(customerId, data)
      memLicenses.set(data.licenseKey, { customerId, plan: data.plan, status: data.status })
    }
  } else {
    memSubs.set(customerId, data)
    memLicenses.set(data.licenseKey, { customerId, plan: data.plan, status: data.status })
  }
}

export async function getSubscriptionByEmail(email: string): Promise<SubscriptionData | null> {
  logKvStatus()
  const r = getRedis()
  const normalizedEmail = email.toLowerCase().trim()
  if (r) {
    try {
      const customerId = await r.get<string>(`email:${normalizedEmail}:customerId`)
      if (!customerId) return null
      return getSubscriptionByCustomer(typeof customerId === 'string' ? customerId : String(customerId))
    } catch (err) {
      console.error('[KV] getSubscriptionByEmail failed:', err)
      return null
    }
  }
  // Memory fallback: scan subscriptions for matching email
  for (const [, sub] of memSubs.entries()) {
    if (sub.email?.toLowerCase().trim() === normalizedEmail) return sub
  }
  return null
}

export async function getSubscriptionByCustomer(customerId: string): Promise<SubscriptionData | null> {
  logKvStatus()
  const r = getRedis()
  if (r) {
    try {
      const raw = await r.get<string>(`sub:${customerId}`)
      return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw as unknown as SubscriptionData) : null
    } catch (err) {
      console.error('[KV] getSubscriptionByCustomer failed:', err)
      return memSubs.get(customerId) ?? null
    }
  }
  return memSubs.get(customerId) ?? null
}

export async function getLicenseData(licenseKey: string): Promise<LicenseData | null> {
  // SK-INTERNAL keys are always team tier — not stored in Redis.
  // Returning a synthetic record prevents 401s at /api/traces, /api/key-info, etc.
  if (licenseKey.startsWith('SK-INTERNAL-')) {
    return { customerId: 'internal', plan: 'team', status: 'active' }
  }
  logKvStatus()
  const r = getRedis()
  if (r) {
    try {
      const raw = await r.get<string>(`license:${licenseKey}`)
      return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw as unknown as LicenseData) : null
    } catch (err) {
      console.error('[KV] getLicenseData failed:', err)
      return memLicenses.get(licenseKey) ?? null
    }
  }
  return memLicenses.get(licenseKey) ?? null
}

export async function cancelSubscriptionByCustomer(customerId: string): Promise<void> {
  logKvStatus()
  const sub = await getSubscriptionByCustomer(customerId)
  if (!sub) return
  sub.status = 'canceled'
  const r = getRedis()
  if (r) {
    try {
      await r.set(`sub:${customerId}`, JSON.stringify(sub))
      await r.set(`license:${sub.licenseKey}`, JSON.stringify({
        customerId,
        plan: sub.plan,
        status: 'canceled',
      } satisfies LicenseData))
    } catch (err) {
      console.error('[KV] cancelSubscriptionByCustomer failed:', err)
      memSubs.set(customerId, sub)
      memLicenses.set(sub.licenseKey, { customerId, plan: sub.plan, status: 'canceled' })
    }
  } else {
    memSubs.set(customerId, sub)
    memLicenses.set(sub.licenseKey, { customerId, plan: sub.plan, status: 'canceled' })
  }
}

export async function cancelSubscriptionById(subscriptionId: string): Promise<void> {
  const r = getRedis()
  if (!r) {
    for (const [cid, sub] of memSubs.entries()) {
      if (sub.subscriptionId === subscriptionId) {
        await cancelSubscriptionByCustomer(cid)
        return
      }
    }
    return
  }
  console.warn('cancelSubscriptionById with KV requires customer lookup — skipping')
}

// --- Rate Limiting (KV-backed) ---

export async function checkRateLimitKV(ip: string, limit: number, prefix = 'ratelimit'): Promise<{ count: number; allowed: boolean }> {
  logKvStatus()
  const today = new Date().toISOString().slice(0, 10)
  const key = `${prefix}:${ip}:${today}`
  const r = getRedis()

  if (r) {
    try {
      const count = await r.incr(key)
      if (count === 1) {
        await r.expire(key, 86400)
      }
      return { count, allowed: count <= limit }
    } catch (err) {
      console.error('[KV] checkRateLimitKV failed, using memory fallback:', err)
    }
  }

  const memKey = `${ip}:${today}`
  const current = (memRateLimits.get(memKey) ?? 0) + 1
  memRateLimits.set(memKey, current)
  return { count: current, allowed: current <= limit }
}

// --- Free Key CRUD ---

interface FreeKeyData {
  plan: 'free'
  email: string
  status: 'active'
  licenseKey: string
}

export async function setFreeKey(email: string, licenseKey: string): Promise<void> {
  logKvStatus()
  const normalizedEmail = email.toLowerCase().trim()
  const data: FreeKeyData = { plan: 'free', email: normalizedEmail, status: 'active', licenseKey }
  const r = getRedis()
  if (r) {
    try {
      await r.set(`free:${normalizedEmail}`, JSON.stringify(data))
      // Also store license lookup so rate-limit resolution works
      await r.set(`license:${licenseKey}`, JSON.stringify({
        customerId: normalizedEmail,
        plan: 'free',
        status: 'active',
      }))
    } catch (err) {
      console.error('[KV] setFreeKey failed:', err)
    }
  }
}

export async function getFreeKey(email: string): Promise<string | null> {
  logKvStatus()
  const normalizedEmail = email.toLowerCase().trim()
  const r = getRedis()
  if (r) {
    try {
      const raw = await r.get<string>(`free:${normalizedEmail}`)
      if (!raw) return null
      const data: FreeKeyData = typeof raw === 'string' ? JSON.parse(raw) : raw as unknown as FreeKeyData
      return data.licenseKey
    } catch (err) {
      console.error('[KV] getFreeKey failed:', err)
      return null
    }
  }
  return null
}

// --- Lint Receipts ---

export interface LintReceiptData {
  score: number
  breakdown: Record<string, boolean | string>
  title: string
  timestamp: string
  tier: string
  agent_ready: boolean
}

export async function storeLintReceipt(lintId: string, data: LintReceiptData): Promise<void> {
  const r = getRedis()
  if (!r) return
  await r.set(`lint:${lintId}`, JSON.stringify(data), { ex: 30 * 24 * 3600 }) // 30 day TTL
}

export async function getLintReceipt(lintId: string): Promise<LintReceiptData | null> {
  const r = getRedis()
  if (!r) return null
  try {
    const raw = await r.get<string>(`lint:${lintId}`)
    if (!raw) return null
    return typeof raw === 'string' ? JSON.parse(raw) : raw as unknown as LintReceiptData
  } catch (err) {
    console.error('[KV] getLintReceipt failed:', err)
    return null
  }
}

// --- Full Trace Storage (SL-060) ---

export interface TraceData {
  traceId: string          // = requestId (UUID)
  lintId: string           // "spl_" + 8 chars
  timestamp: string        // ISO 8601
  tier: string
  endpoint: string
  inputItems: string[]     // raw input specs (truncated at 2000 chars each)
  refinedOutput: object[]  // full LLM output (RefinedItem array)
  scores: { title: string; completeness_score: number; agent_ready: boolean; breakdown: Record<string, boolean | string> }[]
  averageScore: number
  agentReadyCount: number
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
}

const MAX_TRACES_PER_DAY = 500
const TRACE_TTL_SECONDS = 30 * 24 * 3600 // 30 days

function traceKey(date: string): string {
  return `traces:${date}`
}

/**
 * Store a full trace for eval analysis.
 * Fire-and-forget safe — catch errors externally with .catch(() => {})
 */
export async function storeTrace(data: TraceData): Promise<void> {
  const r = getRedis()
  if (!r) return

  const date = data.timestamp.slice(0, 10) // YYYY-MM-DD
  const key = traceKey(date)

  try {
    // Check daily cap
    const count = await r.llen(key)
    if (count >= MAX_TRACES_PER_DAY) return

    const serialized = JSON.stringify(data)
    const newCount = await r.rpush(key, serialized)

    // Set TTL only on first push
    if (newCount === 1) {
      await r.expire(key, TRACE_TTL_SECONDS)
    }
  } catch (err) {
    console.error('[KV] storeTrace failed:', err)
  }
}

/**
 * Fetch traces for a given date (YYYY-MM-DD).
 * Used for eval analysis.
 */
export async function getTraces(date: string, limit = 50): Promise<TraceData[]> {
  const r = getRedis()
  if (!r) return []

  const clampedLimit = Math.min(limit, 200)
  const key = traceKey(date)

  try {
    const raw = await r.lrange(key, 0, clampedLimit - 1)
    return raw.map(item => {
      if (typeof item === 'string') return JSON.parse(item) as TraceData
      return item as unknown as TraceData
    })
  } catch (err) {
    console.error('[KV] getTraces failed:', err)
    return []
  }
}

// --- Debug / Diagnostic ---

/**
 * Read how many times a license key has been used today.
 * Uses the per-license telemetry list: telemetry:license:{key}:daily:{YYYY-MM-DD}
 * Returns 0 if KV is not connected or the key has never been used today.
 */
export async function getKeyUsageToday(licenseKey: string): Promise<number> {
  const r = getRedis()
  if (!r) return 0
  const today = new Date().toISOString().slice(0, 10)
  try {
    const count = await r.llen(`telemetry:license:${licenseKey}:daily:${today}`)
    return count ?? 0
  } catch (err) {
    console.error('[KV] getKeyUsageToday failed:', err)
    return 0
  }
}

export async function debugKvRoundTrip(): Promise<{ kvConnected: boolean; sampleReadWriteWorking: boolean }> {
  const r = getRedis()
  if (!r) {
    return { kvConnected: false, sampleReadWriteWorking: false }
  }
  try {
    await r.set('debug:ping', 'pong')
    const val = await r.get<string>('debug:ping')
    return { kvConnected: true, sampleReadWriteWorking: val === 'pong' }
  } catch (err) {
    console.error('[KV] debug round-trip failed:', err)
    return { kvConnected: true, sampleReadWriteWorking: false }
  }
}
