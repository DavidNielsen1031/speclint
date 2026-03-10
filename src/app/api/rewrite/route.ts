// /api/rewrite — Thin adapter that delegates to /api/refine with auto_rewrite: true
//
// This endpoint exists for backward compatibility. All rewrite logic now lives
// in /api/refine's auto_rewrite path. This adapter converts the rewrite-specific
// request shape (spec + gaps + score) into a refine request, then extracts the
// rewrite result from the refine response.
//
// Auth priority: Bearer > x-license-key > body (deprecated)

import { NextRequest, NextResponse } from 'next/server'
import { POST as refineHandler } from '@/app/api/refine/route'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      spec,
      gaps,
      score,
      codebase_context,
      breakdown,
      mode,
      target_agent,
      max_iterations,
    } = body

    // ─── Auth: resolve license key from 3 sources ───
    const authHeader = request.headers.get('authorization')
    const xLicenseKey = request.headers.get('x-license-key')
    let license_key: string | null = null
    if (authHeader?.startsWith('Bearer ')) {
      license_key = authHeader.slice(7)
    } else if (xLicenseKey) {
      license_key = xLicenseKey
    } else if (body.license_key && typeof body.license_key === 'string') {
      console.warn('[REWRITE] license_key in request body is deprecated; use Authorization: Bearer <key> header instead')
      license_key = body.license_key
    }

    if (!license_key || typeof license_key !== 'string') {
      return NextResponse.json(
        { error: 'A free license key is required for rewrites. Get one at https://speclint.ai/get-key — it takes 10 seconds.' },
        { status: 401 }
      )
    }

    if (license_key.length > 256) {
      return NextResponse.json({ error: 'Invalid license key format' }, { status: 400 })
    }

    // ─── Validate required rewrite inputs ───
    if (!spec || typeof spec !== 'string' || spec.trim() === '') {
      return NextResponse.json({ error: "'spec' is required and must be a non-empty string" }, { status: 400 })
    }
    if (!gaps || !Array.isArray(gaps) || gaps.length === 0) {
      return NextResponse.json({ error: "'gaps' is required and must be a non-empty array" }, { status: 400 })
    }
    if (score === undefined || score === null || typeof score !== 'number') {
      return NextResponse.json({ error: "'score' is required and must be a number" }, { status: 400 })
    }

    // ─── Validate optional params ───
    if (codebase_context !== undefined) {
      if (typeof codebase_context !== 'object' || codebase_context === null || Array.isArray(codebase_context)) {
        return NextResponse.json(
          { error: "'codebase_context' must be an object with optional stack, patterns, and constraints arrays" },
          { status: 400 }
        )
      }
      const { stack, patterns, constraints } = codebase_context
      if (stack !== undefined && (!Array.isArray(stack) || !stack.every((s: unknown) => typeof s === 'string'))) {
        return NextResponse.json({ error: "'codebase_context.stack' must be an array of strings" }, { status: 400 })
      }
      if (patterns !== undefined && (!Array.isArray(patterns) || !patterns.every((s: unknown) => typeof s === 'string'))) {
        return NextResponse.json({ error: "'codebase_context.patterns' must be an array of strings" }, { status: 400 })
      }
      if (constraints !== undefined && (!Array.isArray(constraints) || !constraints.every((s: unknown) => typeof s === 'string'))) {
        return NextResponse.json({ error: "'codebase_context.constraints' must be an array of strings" }, { status: 400 })
      }
    }

    if (mode !== undefined) {
      const { VALID_MODES } = await import('@/lib/rewrite-types')
      if (!VALID_MODES.includes(mode)) {
        return NextResponse.json({ error: `'mode' must be one of: ${VALID_MODES.join(', ')}` }, { status: 400 })
      }
    }

    if (target_agent !== undefined) {
      const { VALID_TARGET_AGENTS } = await import('@/lib/rewrite-types')
      if (!VALID_TARGET_AGENTS.includes(target_agent)) {
        return NextResponse.json({ error: `'target_agent' must be one of: ${VALID_TARGET_AGENTS.join(', ')}` }, { status: 400 })
      }
    }

    if (max_iterations !== undefined) {
      if (typeof max_iterations !== 'number' || !Number.isInteger(max_iterations) || max_iterations < 1 || max_iterations > 3) {
        return NextResponse.json({ error: "'max_iterations' must be an integer between 1 and 3" }, { status: 400 })
      }
    }

    // ─── Build refine request with auto_rewrite: true ───
    const refineBody = {
      items: [spec],
      preserve_structure: true,
      auto_rewrite: true,
      rewrite_mode: mode,
      target_agent,
      max_iterations,
      codebase_context,
      // Pass rewrite-specific metadata for the refine endpoint to use
      _rewrite_adapter: {
        gaps,
        score,
        breakdown,
      },
    }

    // Forward with license key as x-license-key header
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('x-license-key', license_key)
    headers.set('x-forwarded-endpoint', 'rewrite')

    const refineReq = new NextRequest(new URL('/api/refine', request.url), {
      method: 'POST',
      headers,
      body: JSON.stringify(refineBody),
    })

    const refineRes = await refineHandler(refineReq)
    const refineData = await refineRes.json()

    // If refine returned an error, pass it through
    if (!refineRes.ok) {
      return NextResponse.json(refineData, { status: refineRes.status })
    }

    // ─── Extract rewrite result from refine response ───
    const item = refineData.items?.[0]
    if (!item) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const rewriteResult = item.rewrite
    const tier = refineData._meta?.tier || 'free'

    // Build rate limit headers from refine response metadata
    const rlHeaders = new Headers()
    // Pass through any rate limit headers from refine
    const refineRlLimit = refineRes.headers.get('X-RateLimit-Limit')
    const refineRlRemaining = refineRes.headers.get('X-RateLimit-Remaining')
    if (refineRlLimit) rlHeaders.set('X-RateLimit-Limit', refineRlLimit)
    if (refineRlRemaining) rlHeaders.set('X-RateLimit-Remaining', refineRlRemaining)

    if (!rewriteResult) {
      // Item scored above threshold or rewrite failed — return score info
      return NextResponse.json({
        original: spec,
        rewritten: spec,
        changes: [],
        new_score: item.completeness_score,
        message: 'Spec already meets quality threshold; no rewrite needed.',
      }, { headers: rlHeaders })
    }

    // Free tier: return preview only
    if (tier === 'free') {
      // Build section-based preview
      const rewritten = rewriteResult.rewritten || ''
      const sectionBreaks = ['\n\n', '\n- ', '\n* ', '\n1.', '\n## ']
      let previewEnd = 500
      for (const br of sectionBreaks) {
        const idx = rewritten.indexOf(br, 150)
        if (idx > 0 && idx < previewEnd) {
          previewEnd = idx
          break
        }
      }
      if (previewEnd === 500) {
        const sentenceEnd = rewritten.lastIndexOf('. ', 500)
        if (sentenceEnd > 150) previewEnd = sentenceEnd + 1
      }

      return NextResponse.json({
        original: spec,
        preview: rewritten.slice(0, previewEnd).trim(),
        changes: rewriteResult.changes || [],
        new_score: rewriteResult.new_score,
        trajectory: rewriteResult.trajectory?.length > 0 ? rewriteResult.trajectory : undefined,
        upgrade_message: 'Full rewritten spec available on Solo plan ($29/mo)',
        upgrade_url: 'https://speclint.ai/pricing',
        tier: 'free',
      }, { headers: rlHeaders })
    }

    // Paid tier: full response
    const responseBody: Record<string, unknown> = {
      original: spec,
      rewritten: rewriteResult.rewritten,
      changes: rewriteResult.changes || [],
      new_score: rewriteResult.new_score,
    }

    if (rewriteResult.structured && tier !== 'lite') {
      responseBody.structured = rewriteResult.structured
    }

    if (rewriteResult.trajectory?.length > 0) {
      responseBody.trajectory = rewriteResult.trajectory
    }

    return NextResponse.json(responseBody, { headers: rlHeaders })
  } catch (err) {
    console.error('[REWRITE] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
