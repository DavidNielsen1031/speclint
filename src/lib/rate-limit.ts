// Hybrid rate limiting: in-memory + optional KV persistence
import { checkRateLimitKV, getLicenseData, isKvConnected } from '@/lib/kv'

const TIER_LIMITS = {
  free: { maxItems: 5, maxRequestsPerDay: 3 },
  pro: { maxItems: 25, maxRequestsPerDay: Infinity },
  team: { maxItems: 50, maxRequestsPerDay: Infinity },
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

export async function checkRateLimit(ip: string, tier: PlanTier, prefix = 'ratelimit'): Promise<{ allowed: boolean; remaining: number; tier: PlanTier }> {
  const limits = TIER_LIMITS[tier]

  if (limits.maxRequestsPerDay === Infinity) {
    return { allowed: true, remaining: Infinity, tier }
  }

  try {
    const { count, allowed } = await checkRateLimitKV(ip, limits.maxRequestsPerDay, prefix)
    return { allowed, remaining: Math.max(0, limits.maxRequestsPerDay - count), tier }
  } catch (err) {
    console.error('[RATE_LIMIT] checkRateLimit failed:', err)
    // Fail-closed for free tier: deny request if Redis is unreachable
    // Fail-open for paid tiers to avoid disrupting paying customers
    if (tier === 'free') {
      console.error('[RATE_LIMIT] Free tier fail-closed: returning 429')
      return { allowed: false, remaining: 0, tier }
    }
    return { allowed: true, remaining: 1, tier }
  }
}

export function getMaxItems(tier: PlanTier): number {
  return TIER_LIMITS[tier].maxItems
}
