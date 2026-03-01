import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getMaxItems, resolveUserTier } from '@/lib/rate-limit'
import { RefinedItemsSchema, type RefinedItem } from '@/lib/schemas'
import { trackUsage, calculateCost, detectSource } from '@/lib/telemetry'
import { computeCompletenessScore, isAgentReady } from '@/lib/scoring'

interface RefineRequest {
  items: string[]
  context?: string
  useUserStories?: boolean
  useGherkin?: boolean
  discovery_context?: {
    classification: string
    rationale: string
    primary_signal: string
    questions: Array<{ rank: number; question: string; category: string; why_it_matters: string }>
    assumptions: Array<{ statement: string; type: string; risk: string }>
  }
}

const MODEL = 'claude-haiku-4-5'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'No backlog items provided. Send { items: string[] }' }, { status: 400 })
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
          error: 'Daily request limit reached on the free tier (3 requests/day). Upgrade to Pro for unlimited requests at $9/month.',
          upgrade: 'https://refinebacklog.com/pricing',
          tier: rateCheck.tier,
        },
        { status: 429 }
      )
    }

    const maxItems = getMaxItems(tier)
    const cleanItems = body.items.filter(i => i.trim())

    if (cleanItems.length === 0) {
      return NextResponse.json({ error: 'All items were empty' }, { status: 400 })
    }

    if (cleanItems.length > maxItems) {
      const upgradeMsg = tier === 'free'
        ? `Free tier is limited to ${maxItems} items per request. Upgrade to Pro ($9/mo) for 25 items or Team ($29/mo) for 50 items. Get a license key at https://refinebacklog.com/pricing and pass it via the x-license-key header.`
        : `${tier} tier is limited to ${maxItems} items per request. You sent ${cleanItems.length}.`
      return NextResponse.json(
        {
          error: upgradeMsg,
          upgrade: tier === 'free' ? 'https://refinebacklog.com/pricing' : undefined,
          tier,
          itemsReceived: cleanItems.length,
          itemsAllowed: maxItems,
        },
        { status: 400 }
      )
    }

    const items = cleanItems.slice(0, maxItems)
    const contextLine = body.context ? `\n\nProject context: ${body.context}` : ''
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

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `${REFINEMENT_PROMPT}${contextLine}${userStoryLine}${gherkinLine}${discoveryLine}\n\nBacklog items:\n${itemsList}`
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
          { role: 'user', content: `${REFINEMENT_PROMPT}${contextLine}${userStoryLine}${gherkinLine}${discoveryLine}\n\nBacklog items:\n${itemsList}` },
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
      endpoint: 'refine',
    }).catch(() => {}) // fire-and-forget

    // Compute completeness scores (deterministic, post-LLM)
    const scores = refinedItems.map(item => {
      const { score, breakdown } = computeCompletenessScore(item)
      return {
        title: item.title,
        completeness_score: score,
        agent_ready: isAgentReady(score),
        breakdown,
      }
    })

    const totalCount = scores.length
    const agentReadyCount = scores.filter(s => s.agent_ready).length
    const averageScore = totalCount > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.completeness_score, 0) / totalCount)
      : 0

    return NextResponse.json({
      items: refinedItems,
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
    message: 'Refine Backlog API',
    usage: 'POST /api/refine with { items: string[], context?: string }',
    limit: '5 items per request (free tier), 25 (Pro), 50 (Team)',
    docs: 'https://refinebacklog.com/openapi.yaml',
  })
}
