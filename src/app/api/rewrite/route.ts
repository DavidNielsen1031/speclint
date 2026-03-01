// /api/rewrite — AI-assisted spec rewrite endpoint (SL-027)
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, resolveUserTier } from '@/lib/rate-limit'
import { trackUsage } from '@/lib/telemetry'
import { anthropic } from '@/lib/anthropic'

const MODEL = 'claude-haiku-4-5'

const SYSTEM_PROMPT = `You are a spec improvement assistant. You will receive a specification that scored poorly on a quality lint, along with the specific gaps that were identified.

Your job is to REWRITE the spec to address each gap while preserving the developer's original intent and voice. Do not replace the spec — enhance it by adding the missing elements.

For each gap, add concrete, specific content:
- "has_measurable_outcome": Add a quantifiable business outcome to the problem statement
- "has_testable_criteria": Add 2+ acceptance criteria starting with action verbs (Verify, Confirm, Validate, Check, Assert)
- "has_constraints": Add technical constraints, scope limits, or assumptions
- "no_vague_verbs": Make the title specific — replace "improve X" with what specifically changes
- "has_definition_of_done": Add specific states, values, or thresholds that define completion

Return ONLY valid JSON, no markdown fences:
{
  "rewritten": "the full improved spec text",
  "changes": ["Description of change 1", "Description of change 2"]
}`

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const body = await request.json()
    const { spec, gaps, score } = body

    // Validate input
    if (!spec || typeof spec !== 'string' || spec.trim() === '') {
      return NextResponse.json({ error: "'spec' is required and must be a non-empty string" }, { status: 400 })
    }
    if (!gaps || !Array.isArray(gaps) || gaps.length === 0) {
      return NextResponse.json({ error: "'gaps' is required and must be a non-empty array" }, { status: 400 })
    }
    if (score === undefined || score === null || typeof score !== 'number') {
      return NextResponse.json({ error: "'score' is required and must be a number" }, { status: 400 })
    }

    // Resolve tier from license key
    const licenseKey = request.headers.get('x-license-key')
    const tier = await resolveUserTier(licenseKey)

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'
    const rateCheck = await checkRateLimit(ip, tier, 'ratelimit-rewrite')

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Daily request limit reached on the free tier (3 requests/day). Upgrade to Solo for unlimited requests at $29/month.',
          upgrade: 'https://speclint.ai/pricing',
          tier: rateCheck.tier,
        },
        { status: 429 }
      )
    }

    // Call LLM to generate rewrite
    const userMessage = `Original spec:\n${spec}\n\nGaps to address:\n${gaps.join('\n')}\n\nOriginal score: ${score}/100`

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    let rewritten: string
    let changes: string[]

    try {
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(cleaned)
      rewritten = parsed.rewritten ?? ''
      changes = parsed.changes ?? []
    } catch {
      return NextResponse.json({ error: 'Failed to parse LLM response' }, { status: 500 })
    }

    const latencyMs = Date.now() - startTime

    // Free tier: preview only
    if (tier === 'free') {
      await trackUsage({
        requestId,
        timestamp: new Date().toISOString(),
        model: MODEL,
        tier,
        itemCount: 1,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        costUsd: 0,
        latencyMs,
        retried: false,
        ip,
        endpoint: 'rewrite',
      })

      return NextResponse.json({
        original: spec,
        preview: rewritten.slice(0, 100),
        upgrade_message: 'Full AI-assisted rewrite available on Solo plan ($29/mo)',
        upgrade_url: 'https://speclint.ai/pricing',
        tier: 'free',
      })
    }

    // Solo/Team tier: re-lint the rewritten spec to get new_score
    let newScore = score
    try {
      const origin = new URL(request.url).origin
      const lintResponse = await fetch(`${origin}/api/lint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(licenseKey ? { 'x-license-key': licenseKey } : {}),
        },
        body: JSON.stringify({ items: [rewritten], preserve_structure: true }),
      })

      if (lintResponse.ok) {
        const lintData = await lintResponse.json()
        // Extract score from lint response
        const items = lintData.items ?? lintData.refined ?? []
        if (items.length > 0 && items[0].completeness_score !== undefined) {
          newScore = items[0].completeness_score
        } else if (lintData.averageScore !== undefined) {
          newScore = lintData.averageScore
        }
      }
    } catch (err) {
      console.error('[REWRITE] Re-lint failed, using original score:', err)
    }

    await trackUsage({
      requestId,
      timestamp: new Date().toISOString(),
      model: MODEL,
      tier,
      itemCount: 1,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      costUsd: 0,
      latencyMs,
      retried: false,
      ip,
      endpoint: 'rewrite',
    })

    return NextResponse.json({
      original: spec,
      rewritten,
      changes,
      new_score: newScore,
    })
  } catch (err) {
    console.error('[REWRITE] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
