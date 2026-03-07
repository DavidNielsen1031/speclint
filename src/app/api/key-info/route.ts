import { NextRequest, NextResponse } from 'next/server'
import { getLicenseData, getKeyUsageToday } from '@/lib/kv'

const FREE_DAILY_LIMIT = 3

/**
 * Mask a license key: show first 6 chars + "..." + last 4 chars.
 * e.g. "SK-INTERNAL-8157AD2B79F752B4004593BE" → "SK-INT...93BE"
 */
function maskKey(key: string): string {
  if (key.length <= 10) return key.slice(0, 2) + '...' + key.slice(-4)
  return key.slice(0, 6) + '...' + key.slice(-4)
}

/**
 * GET /api/key-info
 *
 * Lightweight key verification endpoint — does NOT call the Claude API,
 * decrement any rate limit counter, or create telemetry events.
 *
 * Headers:
 *   x-license-key  Required. The license key to inspect.
 *
 * Responses:
 *   200  { key, tier, status, remaining_today }
 *   400  Missing x-license-key header
 *   401  Invalid license key
 */
export async function GET(request: NextRequest) {
  const licenseKey = request.headers.get('x-license-key')

  if (!licenseKey || licenseKey.trim() === '') {
    return NextResponse.json({ error: 'Missing x-license-key header' }, { status: 400 })
  }

  // getLicenseData handles all key types (SK-INTERNAL-, SK-FREE-, paid keys)
  // by looking up license:{key} in Redis (or in-memory fallback)
  const data = await getLicenseData(licenseKey)

  if (!data) {
    return NextResponse.json({ error: 'Invalid license key' }, { status: 401 })
  }

  // remaining_today: only meaningful for free tier (3 req/day cap)
  // Pro/team tiers are unlimited — return null
  let remainingToday: number | null = null
  if (data.plan === 'free') {
    const usedToday = await getKeyUsageToday(licenseKey)
    remainingToday = Math.max(0, FREE_DAILY_LIMIT - usedToday)
  }

  return NextResponse.json({
    key: maskKey(licenseKey),
    tier: data.plan,
    status: data.status,
    remaining_today: remainingToday,
  })
}
