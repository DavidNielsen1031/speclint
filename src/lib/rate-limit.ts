// Hybrid rate limiting: in-memory + optional KV persistence
import { checkRateLimitKV, getLicenseData, isKvConnected } from '@/lib/kv'

const TIER_LIMITS = {
  free: { maxItems: 5, maxRequestsPerDay: 3, maxRewritesPerDay: 1 },
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

  // SK-INTERNAL keys are always team tier — hardcoded, no KV lookup needed.
  // This prevents transient Redis failures from downgrading internal keys to free tier.
  if (licenseKey.startsWith('SK-INTERNAL-')) {
    console.log(`[ENTITLEMENT] key=${maskKey(licenseKey)} tier=team source=prefix`)
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

export async function checkRateLimit(identifier: string, tier: PlanTier, prefix = 'ratelimit'): Promise<{ allowed: boolean; remaining: number; tier: PlanTier }> {
  const limits = TIER_LIMITS[tier]

  if (limits.maxRequestsPerDay === Infinity) {
    return { allowed: true, remaining: Infinity, tier }
  }

  try {
    const { count, allowed } = await checkRateLimitKV(identifier, limits.maxRequestsPerDay, prefix)
    return { allowed, remaining: Math.max(0, limits.maxRequestsPerDay - count), tier }
  } catch (err) {
    console.error('[RATE_LIMIT] checkRateLimit failed:', err)
    // Fail-closed for free tier: deny request if Redis is unreachable
    // Fail-open for paid tiers to avoid disrupting paying customers
    if (tier === 'free') {
      console.error('[RATE_LIMIT] Free tier fail-closed: returning 429')
      return { allowed: false, remaining: 0, tier }
    }
    return { allowed: true, remaining: -1, tier } // -1 signals KV unavailable, actual limit not enforced
  }
}

export function getMaxItems(tier: PlanTier): number {
  return TIER_LIMITS[tier].maxItems
}

export async function checkRewriteRateLimit(identifier: string, tier: PlanTier): Promise<{ allowed: boolean; remaining: number; tier: PlanTier }> {
  const limits = TIER_LIMITS[tier]
  const maxRewrites = limits.maxRewritesPerDay

  try {
    const { count, allowed } = await checkRateLimitKV(identifier, maxRewrites, 'ratelimit-rewrite')
    const remaining = Math.max(0, maxRewrites - count)

    // Soft warning at 80% of cap for paid tiers
    if (tier !== 'free' && count >= Math.floor(maxRewrites * 0.8) && count < maxRewrites) {
      console.warn(`[RATE_LIMIT] ${tier} tier at ${count}/${maxRewrites} rewrites (80%+ threshold)`)
    }

    return { allowed, remaining, tier }
  } catch (err) {
    console.error('[RATE_LIMIT] checkRewriteRateLimit failed:', err)
    if (tier === 'free') {
      return { allowed: false, remaining: 0, tier }
    }
    return { allowed: true, remaining: -1, tier } // -1 signals KV unavailable, actual limit not enforced
  }
}
