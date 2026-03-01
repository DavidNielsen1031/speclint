// /api/lint — canonical Speclint endpoint
// /api/refine is kept as a backward-compatible alias
import { POST as refineHandler, GET } from '@/app/api/refine/route'
import { NextRequest } from 'next/server'

export { GET }

export async function POST(request: NextRequest) {
  // Read body first (stream can only be consumed once), then reconstruct request
  // with x-forwarded-endpoint so telemetry records 'lint' not 'refine'
  const body = await request.text()
  const headers = new Headers(request.headers)
  headers.set('x-forwarded-endpoint', 'lint')
  const newReq = new NextRequest(new URL(request.url), {
    method: 'POST',
    headers,
    body,
  })
  return refineHandler(newReq)
}
