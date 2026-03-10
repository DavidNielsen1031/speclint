import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getDailySummary, getMonthlySummary } from '@/lib/telemetry'

// GET /api/telemetry?day=2026-02-17 or ?month=2026-02
// Protected by a simple admin key
export async function GET(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key') ?? ''
  const expected = process.env.ADMIN_API_KEY ?? ''
  const isValid = adminKey.length > 0 && expected.length > 0 &&
    adminKey.length === expected.length &&
    timingSafeEqual(Buffer.from(adminKey), Buffer.from(expected))
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const day = request.nextUrl.searchParams.get('day')
  const month = request.nextUrl.searchParams.get('month')

  if (day) {
    const summary = await getDailySummary(day)
    if (!summary) return NextResponse.json({ message: 'No data for this day' }, { status: 404 })
    return NextResponse.json({ day, ...summary })
  }

  if (month) {
    const summary = await getMonthlySummary(month)
    if (!summary) return NextResponse.json({ message: 'No data for this month' }, { status: 404 })
    return NextResponse.json({ month, ...summary })
  }

  // Default: today + this month
  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = today.slice(0, 7)

  const [dailySummary, monthlySummary] = await Promise.all([
    getDailySummary(today),
    getMonthlySummary(thisMonth),
  ])

  return NextResponse.json({
    today: dailySummary ?? { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, items: 0 },
    month: monthlySummary ?? { calls: 0, costUsd: 0 },
  })
}
