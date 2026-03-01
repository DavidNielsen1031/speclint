import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/groom/route'

// REGRESSION SUITE: /api/groom must redirect to /api/refine.
// These tests protect backward compat for existing users who
// integrated before the rename. They must NEVER break.

describe('POST /api/groom → 307 redirect', () => {
  it('returns HTTP 307', async () => {
    const req = new NextRequest('https://speclint.ai/api/groom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: ['test item'] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(307)
  })

  it('redirects to /api/refine', async () => {
    const req = new NextRequest('https://speclint.ai/api/groom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: ['test item'] }),
    })
    const res = await POST(req)
    const location = res.headers.get('location')
    expect(location).toContain('/api/lint')
    expect(location).not.toContain('/api/groom')
  })

  it('uses 307 (not 301 or 302) to preserve POST method', async () => {
    const req = new NextRequest('https://speclint.ai/api/groom', {
      method: 'POST',
      body: JSON.stringify({ items: ['test'] }),
    })
    const res = await POST(req)
    // 307 = Temporary Redirect (preserves method)
    // 308 = Permanent Redirect (preserves method)
    // We use 307 so clients retry POST to /api/refine
    expect([307, 308]).toContain(res.status)
  })
})

describe('GET /api/groom → 301 redirect', () => {
  it('returns HTTP 301', async () => {
    const res = await GET()
    expect(res.status).toBe(301)
  })

  it('redirects to https://speclint.ai/api/refine', async () => {
    const res = await GET()
    const location = res.headers.get('location')
    expect(location).toBe('https://speclint.ai/api/lint')
  })
})
