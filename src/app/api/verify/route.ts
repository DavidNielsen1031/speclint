import { NextRequest, NextResponse } from 'next/server'
import { getLintReceipt } from '@/lib/kv'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter. Usage: GET /api/verify?id=spl_xxxxxxxx' }, { status: 400 })
  }

  if (!id.startsWith('spl_')) {
    return NextResponse.json({ error: 'Invalid lint_id format. Expected spl_xxxxxxxx' }, { status: 400 })
  }

  const receipt = await getLintReceipt(id)

  if (!receipt) {
    return NextResponse.json({ error: 'Lint receipt not found' }, { status: 404 })
  }

  return NextResponse.json({
    lint_id: id,
    score: receipt.score,
    breakdown: receipt.breakdown,
    title: receipt.title,
    timestamp: receipt.timestamp,
    tier: receipt.tier,
    agent_ready: receipt.agent_ready,
  })
}
