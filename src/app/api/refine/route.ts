import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getMaxItems, resolveUserTier } from '@/lib/rate-limit'
import { RefinedItemsSchema, type RefinedItem } from '@/lib/schemas'
import { trackUsage, calculateCost, detectSource } from '@/lib/telemetry'
import { computeCompletenessScore, isAgentReady } from '@/lib/scoring'
import { storeLintReceipt } from '@/lib/kv'
import { anthropic } from '@/lib/anthropic'

interface IssueInput {
  title: string
  body: string
  labels?: string[]
}

interface PersonaInput {
  role: string
  cares_about: string[]
  doesnt_care_about: string[]
}

interface RefineRequest {
  items?: string[]
  issues?: IssueInput[]
  context?: string
  useUserStories?: boolean
  useGherkin?: boolean
  preserve_structure?: boolean
  persona?: PersonaInput
  discovery_context?: {
    classification: string
    rationale: string
    primary_signal: string
    questions: Array<{ rank: number; question: string; category: string; why_it_matters: string }>
    assumptions: Array<{ statement: string; type: string; risk: string }>
  }
  codebase_context?: {
    stack: string[]
    patterns: string[]
    constraints: string[]
    repo_url?: string
  }
}

const MODEL = 'claude-haiku-4-5'

const REFINEMENT_PROMPT = `You are an expert product manager and scrum master. Transform messy backlog items into well-structured, actionable work items.

For each item, provide:
1. **title**: Clean, actionable title
2. **problem**: Why this matters — the problem statement (1-2 sentences)
3. **acceptanceCriteria**: Array of 2-4 testable acceptance criteria
4. **estimate**: T-shirt size: XS (< 1 day), S (1-2 days), M (3-5 days), L (1-2 weeks), XL (2+ weeks)
5. **priority**: "HIGH", "MEDIUM", or "LOW" with a brief rationale in format "LEVEL — rationale"
6. **tags**: Array of 1-3 suggested labels/categories (e.g., "bug", "feature", "security", "ux", "performance", "tech-debt")
7. **assumptions**: Array of 0-2 assumptions or open questions that should be clarified before implementation (optional — only include if genuinely ambiguous)

Be opinionated. Make realistic estimates.

Return ONLY a valid JSON array, no markdown fences or explanation:
[{"title":"...","problem":"...","acceptanceCriteria":["..."],"estimate":"M","priority":"HIGH — rationale","tags":["bug"],"assumptions":["Assumes export is for current view only, not historical data"]}]`

function parseClaudeJson(text: string): unknown {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const body: RefineRequest = await request.json()

    // Validate input format
    const hasItems = body.items && Array.isArray(body.items) && body.items.length > 0
    const hasIssues = body.issues && Array.isArray(body.issues) && body.issues.length > 0

    if (hasItems && hasIssues) {
      return NextResponse.json({ error: "Send either 'items' or 'issues', not both" }, { status: 400 })
    }

    if (!hasItems && !hasIssues) {
      return NextResponse.json({ error: 'No backlog items provided. Send { items: string[] } or { issues: [{ title, body, labels? }] }' }, { status: 400 })
    }

    // Convert issues to items string array if issues format was provided
    if (hasIssues && body.issues) {
      body.items = body.issues.map(issue =>
        `Title: ${issue.title}\n\nBody: ${issue.body}\n\nLabels: ${issue.labels?.join(', ') || 'none'}`
      )
    }

    // Resolve tier from license key
    const licenseKey = request.headers.get('x-license-key')
    const tier = await resolveUserTier(licenseKey)

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'
    const rateCheck = await checkRateLimit(ip, tier)

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Daily request limit reached on the free tier (3 requests/day). Upgrade to Pro for unlimited requests at $29/month.',
          upgrade: 'https://speclint.ai/pricing',
          tier: rateCheck.tier,
        },
        { status: 429 }
      )
    }

    const maxItems = getMaxItems(tier)
    const MAX_ITEM_LENGTH = 10000 // 10K chars per item — prevents token abuse
    const cleanItems = (body.items ?? []).filter(i => i.trim())

    if (cleanItems.length === 0) {
      return NextResponse.json({ error: 'All items were empty' }, { status: 400 })
    }

    // SEC-004: Input size validation
    const oversizedItem = cleanItems.find(i => i.length > MAX_ITEM_LENGTH)
    if (oversizedItem) {
      return NextResponse.json(
        { error: `Item exceeds maximum length of ${MAX_ITEM_LENGTH} characters. Trim your spec or split into multiple items.` },
        { status: 400 }
      )
    }

    if (cleanItems.length > maxItems) {
      const upgradeMsg = tier === 'free'
        ? `Free tier is limited to ${maxItems} items per request. Upgrade to Pro ($29/mo) for 25 items or Team ($79/mo) for 50 items. Get a license key at https://speclint.ai/pricing and pass it via the x-license-key header.`
        : `${tier} tier is limited to ${maxItems} items per request. You sent ${cleanItems.length}.`
      return NextResponse.json(
        {
          error: upgradeMsg,
          upgrade: tier === 'free' ? 'https://speclint.ai/pricing' : undefined,
          tier,
          itemsReceived: cleanItems.length,
          itemsAllowed: maxItems,
        },
        { status: 400 }
      )
    }

    const items = cleanItems.slice(0, maxItems)
    const contextLine = body.context ? `\n\nProject context: ${body.context}` : ''
    const isPaidTier = tier === 'pro' || tier === 'team'
    const codebaseContextUsed = isPaidTier && !!body.codebase_context
    let codebaseContextLine = ''
    if (codebaseContextUsed && body.codebase_context) {
      const { stack, patterns, constraints } = body.codebase_context
      codebaseContextLine = `\n\nCODEBASE CONTEXT (write acceptance criteria that reference this tech stack specifically — not generic):\nStack: ${stack.join(', ')}\nPatterns: ${patterns.join(', ')}\nConstraints: ${constraints.join(', ')}\n\nIMPORTANT: Each acceptance criterion must reference at least one specific technology from the stack above. Write ACs like: "Given the Next.js API route, when..." not generic "Given the system, when..."`
    }
    const userStoryLine = body.useUserStories ? `\n\nIMPORTANT: Keep the "title" field as a short, clean one-liner (e.g., "Fix Session Timeout Authentication Bug"). Add a SEPARATE field called "userStory" with the full user story in "As a [role], I want [goal], so that [benefit]" format. The title must NOT be a user story.` : ''
    const gherkinLine = body.useGherkin ? `\n\nIMPORTANT: Write ALL acceptance criteria in Gherkin format using Given/When/Then syntax. Each criterion must start with "Given", "When", or "Then".` : ''
    let discoveryLine = ''
    if (body.discovery_context) {
      const dc = body.discovery_context
      const qBlock = dc.questions.map(q => `  Q${q.rank}. ${q.question} (${q.category}) — risk if skipped: ${q.why_it_matters}`).join('\n')
      const aBlock = dc.assumptions.map(a => `  - [${a.risk.toUpperCase()} RISK] ${a.statement}`).join('\n')
      discoveryLine = `\n\nDISCOVERY CONTEXT (this item went through a discovery gate before refinement — use this to write sharper, more targeted acceptance criteria):\nClassification: ${dc.classification}\nRationale: ${dc.rationale}\nPrimary signal: ${dc.primary_signal}\n${dc.questions.length > 0 ? `\nKey questions identified:\n${qBlock}` : ''}${dc.assumptions.length > 0 ? `\nKey assumptions:\n${aBlock}` : ''}\n\nIMPORTANT: Use the discovery questions and assumptions above to write MORE SPECIFIC acceptance criteria. Each discovery question should inform at least one AC. Each high-risk assumption should appear in the "assumptions" field of the refined item.`
    }
    const itemsList = items.map((item, i) => `${i + 1}. ${item}`).join('\n')
    const preserveStructureLine = body.preserve_structure
      ? `\n\nIMPORTANT: Score each input as a SINGLE item. Do NOT split, decompose, or restructure the input. Each string in the items array is already a complete specification — refine and score it as one item, even if it contains multiple acceptance criteria or sub-tasks. Return exactly one JSON object per input string.`
      : ''

    const personaEnabled = isPaidTier && !!body.persona
    let personaLine = ''
    if (personaEnabled && body.persona) {
      const persona = body.persona
      personaLine = `\n\nPERSONA SCORING:\nYou are also evaluating how well each spec aligns with this target user persona:\n- Role: ${persona.role}\n- Cares about: ${persona.cares_about.join(', ')}\n- Does NOT care about: ${persona.doesnt_care_about.join(', ')}\n\nFor each item, also include in your JSON response:\n- "persona_alignment": number 0-100 scored as: concern_coverage (50pts: how many cares_about items are addressed in the ACs or problem), anti_concern_avoidance (25pts: spec does NOT focus on doesnt_care_about items), role_appropriate_language (25pts: spec references context relevant to the persona's role)\n- "persona_gaps": string[] listing which cares_about items are NOT addressed in the spec`
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `${REFINEMENT_PROMPT}${contextLine}${codebaseContextLine}${userStoryLine}${gherkinLine}${discoveryLine}${preserveStructureLine}${personaLine}\n\nBacklog items:\n${itemsList}`
        }
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse and validate
    let refinedItems: RefinedItem[]
    let parsed: unknown
    try {
      parsed = parseClaudeJson(content.text)
    } catch {
      console.error('Failed to parse Claude response:', content.text)
      throw new Error('Failed to parse refinement results')
    }

    const validation = RefinedItemsSchema.safeParse(parsed)
    if (validation.success) {
      refinedItems = validation.data
    } else {
      // Retry once with correction prompt
      console.warn('Validation failed, retrying:', validation.error.issues)
      const retryResponse = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          { role: 'user', content: `${REFINEMENT_PROMPT}${contextLine}${codebaseContextLine}${userStoryLine}${gherkinLine}${discoveryLine}${preserveStructureLine}${personaLine}\n\nBacklog items:\n${itemsList}` },
          { role: 'assistant', content: content.text },
          { role: 'user', content: `Your response had validation errors: ${JSON.stringify(validation.error.issues)}. Fix and return valid JSON array. Priority must be "HIGH — rationale", "MEDIUM — rationale", or "LOW — rationale". Estimate must be XS/S/M/L/XL. Return ONLY the JSON array.` }
        ],
      })

      const retryContent = retryResponse.content[0]
      if (retryContent.type !== 'text') throw new Error('Retry failed')

      try {
        const retryParsed = parseClaudeJson(retryContent.text)
        const retryValidation = RefinedItemsSchema.safeParse(retryParsed)
        if (retryValidation.success) {
          refinedItems = retryValidation.data
        } else {
          console.error('Retry validation also failed:', retryValidation.error.issues)
          return NextResponse.json(
            { error: 'AI output failed validation after retry', details: retryValidation.error.issues },
            { status: 502 }
          )
        }
      } catch {
        throw new Error('Failed to parse retry response')
      }
    }

    // Track usage telemetry (non-blocking)
    const inputTokens = response.usage?.input_tokens ?? 0
    const outputTokens = response.usage?.output_tokens ?? 0
    const costUsd = calculateCost(MODEL, inputTokens, outputTokens)
    const latencyMs = Date.now() - startTime

    const source = detectSource(
      request.headers.get('user-agent'),
      request.headers.get('x-source'),
      request.headers.get('x-client'),
    )

    const resolvedEndpoint = (['lint', 'refine', 'discover', 'plan'].includes(request.headers.get('x-forwarded-endpoint') ?? '') ? request.headers.get('x-forwarded-endpoint') : (request.nextUrl.pathname.split('/').pop() ?? 'refine')) as 'lint' | 'refine' | 'discover' | 'plan'

    // Compute completeness scores (deterministic, post-LLM)
    const scores = refinedItems.map(item => {
      const { score, breakdown } = computeCompletenessScore(item)
      // Extract persona fields from LLM output (if persona was provided and paid tier)
      let personaAlignment: number | null = null
      let personaGaps: string[] | null = null
      if (personaEnabled) {
        const pa = (item as Record<string, unknown>).persona_alignment
        const pg = (item as Record<string, unknown>).persona_gaps
        personaAlignment = typeof pa === 'number' ? pa : null
        personaGaps = Array.isArray(pg) ? pg : null
      }
      // Gate agent_ready on persona when present
      let agentReady: boolean
      if (personaEnabled && typeof personaAlignment === 'number') {
        agentReady = score >= 70 && personaAlignment >= 60
      } else {
        agentReady = isAgentReady(score)
      }
      return {
        title: item.title,
        completeness_score: score,
        agent_ready: agentReady,
        breakdown,
        persona_alignment: personaAlignment,
        persona_gaps: personaGaps,
      }
    })

    const totalCount = scores.length
    const agentReadyCount = scores.filter(s => s.agent_ready).length
    const averageScore = totalCount > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.completeness_score, 0) / totalCount)
      : 0

    // Handle free tier with persona — strip persona scoring, add upgrade message
    const freeWithPersona = tier === 'free' && !!body.persona
    const upgradeMessage = freeWithPersona
      ? 'Persona scoring available on Solo plan ($29/mo)'
      : undefined

    // Embed score fields into each item (SL-028)
    // Generate lint_id before building itemsWithScores so it can be embedded per item
    const lintId = 'spl_' + crypto.randomUUID().replace(/-/g, '').slice(0, 8)

    const itemsWithScores = refinedItems.map((item, i) => ({
      ...item,
      lint_id: lintId,
      completeness_score: scores[i].completeness_score,
      agent_ready: scores[i].agent_ready,
      breakdown: scores[i].breakdown,
      persona_alignment: freeWithPersona ? null : scores[i].persona_alignment ?? null,
      persona_gaps: freeWithPersona ? null : scores[i].persona_gaps ?? null,
    }))

    // Store lint receipt (SL-037)
    const firstScore = scores[0]
    if (firstScore) {
      storeLintReceipt(lintId, {
        score: firstScore.completeness_score,
        breakdown: firstScore.breakdown,
        title: firstScore.title,
        timestamp: new Date().toISOString(),
        tier,
        agent_ready: firstScore.agent_ready,
      }).catch(() => {}) // fire-and-forget
    }

    // Fire telemetry AFTER scores are computed so notifications include them
    trackUsage({
      requestId,
      timestamp: new Date().toISOString(),
      model: MODEL,
      tier,
      itemCount: items.length,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
      retried: !validation.success,
      ip: ip,
      source,
      items,
      endpoint: resolvedEndpoint,
      scores: scores.map(s => ({
        title: s.title,
        completeness_score: s.completeness_score,
        agent_ready: s.agent_ready,
      })),
      averageScore,
      agentReadyCount,
      lintId,
    }).catch(() => {}) // fire-and-forget

    return NextResponse.json({
      lint_id: lintId,
      items: itemsWithScores,
      ...(upgradeMessage ? { upgrade_message: upgradeMessage } : {}),
      scores,
      summary: {
        average_score: averageScore,
        agent_ready_count: agentReadyCount,
        total_count: totalCount,
      },
      _meta: {
        requestId,
        model: MODEL,
        inputTokens,
        outputTokens,
        costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
        latencyMs,
        promptVersion: '1.0',
        tier,
        codebase_context_used: codebaseContextUsed,
      }
    }, { status: 200 })

  } catch (error) {
    console.error('API Error:', error)

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: 'AI service temporarily unavailable' }, { status: 503 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Speclint API',
    usage: 'POST /api/refine with { items: string[], context?: string, codebase_context?: string }',
    limit: '5 items per request (free tier), 25 (Pro), 50 (Team)',
    docs: 'https://speclint.ai/openapi.yaml',
  })
}
