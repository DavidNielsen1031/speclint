import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, resolveUserTier } from '@/lib/rate-limit'
import { DiscoveryResultSchema, type DiscoveryResult } from '@/lib/schemas'
import { trackUsage, calculateCost, detectSource } from '@/lib/telemetry'
import { anthropic } from '@/lib/anthropic'

interface DiscoverRequest {
  item: string
  context?: string
}

const MODEL = 'claude-haiku-4-5'
const RATE_LIMIT_PREFIX = 'discover'

const DISCOVERY_PROMPT = `You are an expert product manager and discovery specialist. Your job is to classify a backlog item's discovery risk and generate the minimum set of questions needed to ensure the right thing gets built.

CLASSIFICATION RULES:

SKIP — item does NOT need discovery before refinement. Use when:
- Bug report with BOTH explicit expected behavior AND explicit actual behavior AND reproduction conditions described in the item text. A bare bug title like "fix bug", "fix login issue", "fix crash" with no description MUST be classified FULL_DISCOVERY — there is nothing to refine without knowing what's broken.
- Regression with a named version ("used to work before v2.1.3") AND a described symptom
- Small, localized change with no new user workflow (copy update, rename, logging) — but ONLY if the exact change is spelled out
- Has explicit acceptance criteria or testable conditions written in the item
- Known user behavior with clear implementation details, just needs execution

LIGHT_DISCOVERY — item needs 1-2 quick clarifications before refinement. Use when:
- Mostly clear but missing a success metric or key constraint
- Medium uncertainty; could be de-risked with a data pull, 1 user conversation, or short spike
- Solution-first framing with a clear implied problem
- DOMAIN-OBVIOUS FEATURES: common, well-understood feature categories where the user problem is universally recognised without needing a conversation. Examples: dark mode toggle, email/push notifications, CSV/PDF export, pagination, search, keyboard shortcuts, password reset, remember me, account deletion, two-factor auth, sorting/filtering lists, undo/redo. For these, classify LIGHT_DISCOVERY (not FULL) — the implied problem is self-evident from the feature category, and the gap is usually just a missing success metric or edge-case constraint.

FULL_DISCOVERY — item needs real discovery before any spec is written. Use when:
- Vague verbs: "improve", "optimize", "make better", "support", "streamline" with no metric
- Solution without stated problem or outcome ("Add AI summaries", "Build dashboard")
- Unclear target user or multiple conflicting stakeholders
- Enterprise/compliance/security language with hidden constraints
- Large scope with unclear feasibility ("rewrite", "migrate", "refactor")
- Any new workflow or monetization change

THE 7 CORE DISCOVERY QUESTIONS (use these as the foundation for your questions):
1. Who is the target user, and what job are they trying to get done in what context?
2. What business outcome are we trying to change, and how will we measure success?
3. What is the smallest behavior change needed from users for this to be valuable?
4. What are the top assumptions that must be true for this to work — and which is riskiest?
5. What is the fastest, cheapest way to test the riskiest assumption before building?
6. What constraints could kill this even if it's desirable (privacy, performance, dependencies, operational load)?
7. What are the acceptance criteria — what would make us say "this is done"?

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences:

For SKIP:
{
  "classification": "SKIP",
  "confidence": 0.92,
  "rationale": "1-2 sentences explaining why this is ready to refine",
  "primary_signal": "what in the text drove this classification",
  "questions": [],
  "assumptions": []
}

For LIGHT_DISCOVERY or FULL_DISCOVERY:
{
  "classification": "LIGHT_DISCOVERY",
  "confidence": 0.78,
  "rationale": "1-2 sentences explaining the risk",
  "primary_signal": "what in the text drove this classification",
  "questions": [
    {
      "rank": 1,
      "question": "specific question text",
      "category": "outcome | user_job | assumption | feasibility | risk | acceptance_criteria",
      "why_it_matters": "1 sentence on failure mode if unanswered",
      "fastest_validation": "data pull | 1 user conversation | prototype test | engineering spike | support ticket review | doc review"
    }
  ],
  "assumptions": [
    {
      "statement": "We assume that [specific belief that must be true]",
      "type": "desirability | viability | feasibility",
      "risk": "low | medium | high",
      "simple_test": "1 sentence on how to validate this assumption quickly"
    }
  ]
}

LIGHT_DISCOVERY: generate 3-5 questions, 2-3 assumptions
FULL_DISCOVERY: generate 5-7 questions, 3-5 assumptions

Be specific to the actual item text. Do not generate generic questions. Each question should reference something from the item description.`

function parseClaudeJson(text: string): unknown {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const body: DiscoverRequest = await request.json()

    if (!body.item || typeof body.item !== 'string' || !body.item.trim()) {
      return NextResponse.json(
        { error: 'No backlog item provided. Send { item: string }' },
        { status: 400 }
      )
    }

    // Resolve tier from license key
    const licenseKey = request.headers.get('x-license-key')
    const tier = await resolveUserTier(licenseKey)

    // Rate limiting — separate `discover:` prefix from refine limits
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'
    const rateCheck = await checkRateLimit(ip, tier, RATE_LIMIT_PREFIX)

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Daily discovery limit reached on the free tier (3 requests/day). Upgrade to Pro for unlimited requests at $29/month.',
          upgrade: 'https://speclint.ai/pricing',
          tier: rateCheck.tier,
        },
        { status: 429 }
      )
    }

    const item = body.item.trim()
    const contextLine = body.context ? `\n\nProject context: ${body.context}` : ''

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `${DISCOVERY_PROMPT}${contextLine}\n\nBacklog item:\n${item}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse and validate
    let discoveryResult: DiscoveryResult
    let parsed: unknown
    try {
      parsed = parseClaudeJson(content.text)
    } catch {
      console.error('Failed to parse Claude response:', content.text)
      throw new Error('Failed to parse discovery results')
    }

    const validation = DiscoveryResultSchema.safeParse(parsed)
    if (validation.success) {
      discoveryResult = validation.data
    } else {
      // Retry once with correction prompt
      console.warn('Discovery validation failed, retrying:', validation.error.issues)
      const retryResponse = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          { role: 'user', content: `${DISCOVERY_PROMPT}${contextLine}\n\nBacklog item:\n${item}` },
          { role: 'assistant', content: content.text },
          {
            role: 'user',
            content: `Your response had validation errors: ${JSON.stringify(validation.error.issues)}. Fix and return valid JSON only. classification must be SKIP, LIGHT_DISCOVERY, or FULL_DISCOVERY. confidence must be 0-1. Return ONLY the JSON object.`,
          },
        ],
      })

      const retryContent = retryResponse.content[0]
      if (retryContent.type !== 'text') throw new Error('Retry failed')

      try {
        const retryParsed = parseClaudeJson(retryContent.text)
        const retryValidation = DiscoveryResultSchema.safeParse(retryParsed)
        if (retryValidation.success) {
          discoveryResult = retryValidation.data
        } else {
          console.error('Discovery retry validation also failed:', retryValidation.error.issues)
          return NextResponse.json(
            { error: 'AI output failed validation after retry', details: retryValidation.error.issues },
            { status: 502 }
          )
        }
      } catch {
        throw new Error('Failed to parse discovery retry response')
      }
    }

    // Tier gating: free tier gets classification + rationale only (1 question/assumption max)
    const isFreeTier = tier === 'free'
    const gatedResult: DiscoveryResult = isFreeTier
      ? {
          ...discoveryResult,
          questions: discoveryResult.questions.slice(0, 1).map(q => ({
            ...q,
            why_it_matters: discoveryResult.questions.length > 1
              ? `${q.why_it_matters} (${discoveryResult.questions.length - 1} more questions available on Pro)`
              : q.why_it_matters,
          })),
          assumptions: discoveryResult.assumptions.slice(0, 1).map(a => ({
            ...a,
            simple_test: discoveryResult.assumptions.length > 1
              ? `${a.simple_test} (${discoveryResult.assumptions.length - 1} more assumptions available on Pro — upgrade at https://speclint.ai/pricing)`
              : a.simple_test,
          })),
        }
      : discoveryResult

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
      itemCount: 1,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
      retried: !validation.success,
      ip,
      source,
      items: [item],
      endpoint: 'discover',
      licenseKey: licenseKey ?? undefined,
    }).catch(() => {})

    return NextResponse.json({
      ...gatedResult,
      _meta: {
        requestId,
        model: MODEL,
        inputTokens,
        outputTokens,
        costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
        latencyMs,
        tier,
      },
    }, { status: 200 })

  } catch (error) {
    console.error('Discover API Error:', error)

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
    message: 'Discovery Gate API',
    usage: 'POST /api/discover with { item: string, context?: string }',
    description: 'Classifies a backlog item\'s discovery risk before refinement (SKIP / LIGHT_DISCOVERY / FULL_DISCOVERY)',
    docs: 'https://speclint.ai/openapi.yaml',
  })
}
