// Hybrid rate limiting: in-memory + optional KV persistence
import { checkRateLimitKV, getLicenseData, isKvConnected } from '@/lib/kv'

// In-memory rate limit backstop when KV is unavailable
const inMemoryCounter = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS_FALLBACK = 500 // hard ceiling per IP per day

function checkInMemoryFallback(ip: string): boolean {
  const now = Date.now()
  const key = `fallback:${ip}`
  const entry = inMemoryCounter.get(key)
  if (!entry || now > entry.resetAt) {
    inMemoryCounter.set(key, { count: 1, resetAt: now + 86400000 })
    return true
  }
  entry.count++
  return entry.count <= MAX_REQUESTS_FALLBACK
}

const TIER_LIMITS = {
  free: { maxItems: 5, maxRequestsPerDay: 5, maxRewritesPerDay: 1 },
  lite: { maxItems: 5, maxRequestsPerDay: Infinity, maxRewritesPerDay: 10 },
  pro: { maxItems: 25, maxRequestsPerDay: Infinity, maxRewritesPerDay: 500 },
  team: { maxItems: 50, maxRequestsPerDay: Infinity, maxRewritesPerDay: 1000 },
} as const

export type PlanTier = keyof typeof TIER_LIMITS

export function getTierLimits(tier: PlanTier) {
  return TIER_LIMITS[tier]
}

function maskKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '...' + key.slice(-4)
}

export async function resolveUserTier(licenseKey?: string | null): Promise<PlanTier> {
  if (!licenseKey) {
    console.log(`[ENTITLEMENT] key=none tier=free source=default`)
    return 'free'
  }

  // SK-FREE keys are always free tier — no KV lookup needed
  if (licenseKey.startsWith('SK-FREE-')) {
    console.log(`[ENTITLEMENT] key=${maskKey(licenseKey)} tier=free source=prefix`)
    return 'free'
  }

  // Internal keys must match the INTERNAL_API_KEY env var exactly.

  if (process.env.INTERNAL_API_KEY && licenseKey === process.env.INTERNAL_API_KEY) {
    console.log(`[ENTITLEMENT] key=${maskKey(licenseKey)} tier=team source=internal`)
    return 'team'
  }

  try {
    const data = await getLicenseData(licenseKey)
    if (data && data.status === 'active') {
      const source = isKvConnected() ? 'kv' : 'memory'
      const tier = data.plan as PlanTier
      console.log(`[ENTITLEMENT] key=${maskKey(licenseKey)} tier=${tier} source=${source}`)
      return tier
    }
    console.log(`[ENTITLEMENT] key=${maskKey(licenseKey)} tier=free source=${isKvConnected() ? 'kv' : 'memory'} reason=${data ? 'inactive' : 'not_found'}`)
    return 'free'
  } catch (err) {
    console.error(`[ENTITLEMENT] key=${maskKey(licenseKey)} tier=free source=default error=`, err)
    return 'free'
  }
}

export async function checkRateLimit(identifier: string, tier: PlanTier, prefix = 'ratelimit'): Promise<{ allowed: boolean; remaining: number; tier: PlanTier; limit: number; reset: number }> {
  const limits = TIER_LIMITS[tier]
  const nowReset = Math.floor(Date.now() / 1000) + 86400

  if (limits.maxRequestsPerDay === Infinity) {
    return { allowed: true, remaining: Infinity, tier, limit: Infinity, reset: nowReset }
  }

  try {
    const { count, allowed, limit, reset } = await checkRateLimitKV(identifier, limits.maxRequestsPerDay, prefix)
    return { allowed, remaining: Math.max(0, limits.maxRequestsPerDay - count), tier, limit, reset }
  } catch (err) {
    console.error('[RATE_LIMIT] checkRateLimit failed:', err)
    // Fail-closed for free tier: deny request if Redis is unreachable
    // Fail-open for paid tiers, but apply in-memory backstop to prevent abuse
    if (tier === 'free') {
      console.error('[RATE_LIMIT] Free tier fail-closed: returning 429')
      return { allowed: false, remaining: 0, tier, limit: limits.maxRequestsPerDay, reset: nowReset }
    }
    const backstopAllowed = checkInMemoryFallback(identifier)
    if (!backstopAllowed) {
      console.warn(`[RATE_LIMIT] In-memory backstop triggered for ${tier} identifier=${identifier}`)
    }
    return { allowed: backstopAllowed, remaining: -1, tier, limit: limits.maxRequestsPerDay, reset: nowReset } // -1 signals KV unavailable
  }
}

export function getMaxItems(tier: PlanTier): number {
  return TIER_LIMITS[tier].maxItems
}

export async function checkRewriteRateLimit(identifier: string, tier: PlanTier): Promise<{ allowed: boolean; remaining: number; tier: PlanTier; limit: number; reset: number }> {
  const limits = TIER_LIMITS[tier]
  const maxRewrites = limits.maxRewritesPerDay
  const nowReset = Math.floor(Date.now() / 1000) + 86400

  try {
    const { count, allowed, limit, reset } = await checkRateLimitKV(identifier, maxRewrites, 'ratelimit-rewrite')
    const remaining = Math.max(0, maxRewrites - count)

    // Soft warning at 80% of cap for paid tiers
    if (tier !== 'free' && count >= Math.floor(maxRewrites * 0.8) && count < maxRewrites) {
      console.warn(`[RATE_LIMIT] ${tier} tier at ${count}/${maxRewrites} rewrites (80%+ threshold)`)
    }

    return { allowed, remaining, tier, limit, reset }
  } catch (err) {
    console.error('[RATE_LIMIT] checkRewriteRateLimit failed:', err)
    if (tier === 'free') {
      return { allowed: false, remaining: 0, tier, limit: maxRewrites, reset: nowReset }
    }
    const backstopAllowed = checkInMemoryFallback(identifier)
    if (!backstopAllowed) {
      console.warn(`[RATE_LIMIT] In-memory backstop triggered (rewrite) for ${tier} identifier=${identifier}`)
    }
    return { allowed: backstopAllowed, remaining: -1, tier, limit: maxRewrites, reset: nowReset } // -1 signals KV unavailable
  }
}

export async function checkFreeRewriteRateLimit(ip: string): Promise<{ allowed: boolean }> {
  const nowReset = Math.floor(Date.now() / 1000) + 86400
  try {
    const { allowed } = await checkRateLimitKV(ip, 1, 'free-rewrite')
    return { allowed }
  } catch (err) {
    console.error('[RATE_LIMIT] checkFreeRewriteRateLimit failed:', err)
    return { allowed: false } // fail-closed
  }
}
