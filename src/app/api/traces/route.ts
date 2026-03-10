import { NextRequest, NextResponse } from 'next/server'
import { getTraces, getLicenseData } from '@/lib/kv'

/**
 * GET /api/traces
 *
 * Internal eval endpoint — returns full trace data for a given date.
 * Requires a valid pro/team license key via x-license-key header.
 *
 * Query params:
 *   ?date=YYYY-MM-DD  (defaults to today)
 *   ?limit=N          (defaults to 50, max 200)
 */
export async function GET(request: NextRequest) {
  // Auth: require valid pro/team license key
  const licenseKey = request.headers.get('x-license-key')
  if (!licenseKey) {
    return NextResponse.json({ error: 'Missing x-license-key header' }, { status: 401 })
  }

  // Restrict to internal key only — no external user (even pro/team) should read all traces
  if (!process.env.INTERNAL_API_KEY || licenseKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Traces endpoint restricted to internal use' }, { status: 403 })
  }

  const licenseData = await getLicenseData(licenseKey)
  const validPlans: string[] = ['pro', 'team']
  if (!licenseData || licenseData.status !== 'active' || !validPlans.includes(licenseData.plan)) {
    return NextResponse.json(
      { error: 'A valid pro or team license key is required to access traces' },
      { status: 403 }
    )
  }

  // Parse query params
  const { searchParams } = request.nextUrl
  const today = new Date().toISOString().slice(0, 10)
  const date = searchParams.get('date') ?? today
  const limitParam = parseInt(searchParams.get('limit') ?? '50', 10)
  const limit = isNaN(limitParam) ? 50 : Math.min(Math.max(1, limitParam), 200)

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  const traces = await getTraces(date, limit)

  return NextResponse.json({
    traces,
    count: traces.length,
    date,
  })
}
