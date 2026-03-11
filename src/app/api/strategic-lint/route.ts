import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, resolveUserTier } from '@/lib/rate-limit'
import { StrategicLintResultSchema, type StrategicLintResult } from '@/lib/strategic-schemas'
import { trackUsage, calculateCost, detectSource } from '@/lib/telemetry'
import { anthropic } from '@/lib/anthropic'
import { getClientIp } from '@/lib/ip'
import { corsOptions, CORS_HEADERS } from '@/lib/cors'

export { corsOptions as OPTIONS }

interface StrategicLintRequest {
  item: string
  context?: string // industry, product domain, team size, etc.
  discovery_answers?: Record<string, string> // answers to discovery questions
  current_workflow?: string // how users solve this today
  evidence?: string // customer quotes, support tickets, usage data
}

const MODEL = 'claude-haiku-4-5'
const RATE_LIMIT_PREFIX = 'strategic'

const STRATEGIC_LINT_PROMPT = `You are a ruthlessly honest product strategist. Your job is to stress-test whether a feature spec solves a REAL problem worth solving — not just whether it's well-written.

You will:
1. Generate 2-3 synthetic personas who would encounter this feature in real life
2. Simulate each persona's honest reaction
3. Run strategic bug checks
4. Score the spec's strategic soundness (not structural quality — that's a separate tool)

PERSONA GENERATION RULES:
- Personas must be SPECIFIC to the domain/industry, not generic ("Enterprise PM Sarah" is banned)
- Include at least one skeptic — someone who would NOT want this feature
- Ground personas in daily reality: what tools they use, what frustrates them, what their actual workflow looks like
- If context about the industry/users was provided, USE IT to make personas realistic
- If no context was provided, infer the most likely domain from the spec and be transparent about assumptions

PERSONA REACTION RULES:
- Reactions must be in the persona's voice — how they'd actually talk about this
- "would_use" must be honest — if the feature doesn't solve their real problem, say no
- "actual_problem" may differ from what the spec describes — that's the whole point
- "workaround" is critical — if they already have a good workaround, the feature has low value
- Be specific, not generic. "This would save me time" is banned. "I currently copy 47 invoice line items into a spreadsheet every Monday morning" is good.

STRATEGIC BUG CHECKS — evaluate each honestly:

1. "so_what" — Does this spec articulate WHY this matters to the business? Not just what it does, but what happens if you DON'T build it? If the cost of inaction is low, that's a bug.

2. "duplicate_effort" — Does this feature already exist in competing products, internal tools, or even elsewhere in the same product? Is the team about to build something they could buy/integrate?

3. "scope_creep" — Is this actually 2-3 features pretending to be one? Does it serve multiple user segments with different needs? Could it be split into independent bets?

4. "unvalidated_assumption" — What must be TRUE for this to work that hasn't been validated? "Users want this" is an assumption. "Users will change their workflow for this" is a bigger one. Flag the riskiest unvalidated assumption.

5. "build_vs_buy" — Is custom implementation justified, or is this a commodity feature available via API/library/existing tool? What's the opportunity cost?

6. "irreversibility" — Does this introduce new data models, API contracts, pricing tiers, or public commitments that are hard to undo? High irreversibility + low evidence = blocker.

7. "no_evidence" — Is there ANY cited evidence that real users want this? Customer quotes, support tickets, usage data, churn reasons? If zero evidence is provided, flag it.

SEVERITY RULES:
- "info" — worth noting but not blocking
- "warning" — should be addressed before building but not a showstopper
- "blocker" — do NOT build this until this is resolved

SCORING (0-100):
- 90-100: Clear problem, evidence of demand, personas would use it, no strategic bugs
- 70-89: Decent problem, some gaps in evidence or persona alignment
- 50-69: Problem is vague or unvalidated, significant strategic concerns
- 30-49: Multiple blockers, weak evidence, personas skeptical
- 0-29: No clear problem, no evidence, building this would be waste

RECOMMENDATION:
- "ready_to_build" — Strategic green light, proceed to spec refinement
- "refine_problem" — The problem statement needs sharpening before building
- "validate_first" — Run a specific test/experiment before committing engineering time
- "split_scope" — Too many things at once, break into smaller independent bets
- "reconsider" — Fundamental strategic concerns, step back and rethink

OUTPUT: Return ONLY valid JSON matching this structure:
{
  "strategic_score": number,
  "summary": "string",
  "personas": [{ "name": "string", "role": "string", "context": "string", "primary_goal": "string", "frustrations": ["string"] }],
  "reactions": [{ "persona_name": "string", "would_use": boolean, "enthusiasm": "excited|interested|indifferent|skeptical|opposed", "reaction": "string", "actual_problem": "string", "workaround": "string|null", "dealbreaker": "string|null" }],
  "strategic_bugs": [{ "check": "so_what|duplicate_effort|scope_creep|unvalidated_assumption|build_vs_buy|irreversibility|no_evidence", "severity": "info|warning|blocker", "finding": "string", "suggestion": "string" }],
  "recommendation": "ready_to_build|refine_problem|validate_first|split_scope|reconsider",
  "next_step": "string"
}`

function parseClaudeJson(text: string): unknown {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 })
    }

    const body: StrategicLintRequest = await request.json()

    if (!body.item || typeof body.item !== 'string' || !body.item.trim()) {
      return NextResponse.json(
        { error: 'No spec provided. Send { item: string, context?: string, discovery_answers?: object }' },
        { status: 400 }
      )
    }

    const licenseKey = request.headers.get('x-license-key')
    const tier = await resolveUserTier(licenseKey)
    const ip = getClientIp(request)
    const rateCheck = await checkRateLimit(ip, tier, RATE_LIMIT_PREFIX)

    const rateLimitHeaders = {
      'X-RateLimit-Limit': String(rateCheck.limit === Infinity ? 'unlimited' : rateCheck.limit),
      'X-RateLimit-Remaining': String(rateCheck.remaining === Infinity ? 'unlimited' : Math.max(0, rateCheck.remaining)),
      'X-RateLimit-Reset': String(rateCheck.reset),
      ...CORS_HEADERS,
    }

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Daily strategic lint limit reached. Upgrade for unlimited — Solo at $29/mo or Team at $79/mo.',
          upgrade: 'https://speclint.ai/pricing',
          tier: rateCheck.tier,
        },
        { status: 429, headers: rateLimitHeaders }
      )
    }

    // Build the user message with all available context
    const parts: string[] = [`Backlog item / feature spec:\n${body.item.trim()}`]

    if (body.context) {
      parts.push(`\nProduct/domain context:\n${body.context}`)
    }

    if (body.current_workflow) {
      parts.push(`\nHow users solve this today:\n${body.current_workflow}`)
    }

    if (body.evidence) {
      parts.push(`\nEvidence of demand (customer quotes, tickets, data):\n${body.evidence}`)
    }

    if (body.discovery_answers && Object.keys(body.discovery_answers).length > 0) {
      const answersText = Object.entries(body.discovery_answers)
        .map(([q, a]) => `Q: ${q}\nA: ${a}`)
        .join('\n\n')
      parts.push(`\nDiscovery question answers:\n${answersText}`)
    }

    const userMessage = parts.join('\n\n---\n\n')

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      temperature: 0.4,
      messages: [
        {
          role: 'user',
          content: `${STRATEGIC_LINT_PROMPT}\n\n${userMessage}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    let result: StrategicLintResult
    let parsed: unknown
    try {
      parsed = parseClaudeJson(content.text)
    } catch (parseErr) {
      console.error('Failed to parse strategic lint response. Raw text:', content.text.slice(0, 500))
      console.error('Parse error:', parseErr)
      // Try extracting JSON from within the text
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch {
          throw new Error('Failed to parse strategic lint results')
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to parse strategic lint results', debug_snippet: content.text.slice(0, 300) },
          { status: 502, headers: { ...CORS_HEADERS } }
        )
      }
    }

    const validation = StrategicLintResultSchema.safeParse(parsed)
    if (validation.success) {
      result = validation.data
    } else {
      // Retry once
      console.warn('Strategic lint validation failed, retrying:', validation.error.issues)
      const retryResponse = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4000,
        temperature: 0.2,
        messages: [
          { role: 'user', content: `${STRATEGIC_LINT_PROMPT}\n\n${userMessage}` },
          { role: 'assistant', content: content.text },
          {
            role: 'user',
            content: `Your response had validation errors: ${JSON.stringify(validation.error.issues)}. Fix and return valid JSON only.`,
          },
        ],
      })

      const retryContent = retryResponse.content[0]
      if (retryContent.type !== 'text') throw new Error('Retry failed')

      try {
        const retryParsed = parseClaudeJson(retryContent.text)
        const retryValidation = StrategicLintResultSchema.safeParse(retryParsed)
        if (retryValidation.success) {
          result = retryValidation.data
        } else {
          console.error('Strategic lint retry also failed:', retryValidation.error.issues)
          return NextResponse.json(
            { error: 'AI output failed validation after retry', details: retryValidation.error.issues },
            { status: 502 }
          )
        }
      } catch {
        throw new Error('Failed to parse strategic lint retry response')
      }
    }

    // Tier gating: free tier gets summary + score + recommendation only (1 persona, 1 bug max)
    const isFreeTier = tier === 'free'
    const gatedResult = isFreeTier
      ? {
          ...result,
          personas: result.personas.slice(0, 1),
          reactions: result.reactions.slice(0, 1),
          strategic_bugs: result.strategic_bugs.slice(0, 2),
          _upgrade_note: `${result.personas.length - 1} more personas, ${Math.max(0, result.reactions.length - 1)} more reactions, and ${Math.max(0, result.strategic_bugs.length - 2)} more strategic checks available on Solo ($29/mo) or Team ($79/mo).`,
        }
      : result

    // Track usage
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
      items: [body.item],
      endpoint: 'strategic-lint',
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
    }, { status: 200, headers: rateLimitHeaders })

  } catch (error) {
    console.error('Strategic Lint API Error:', error)

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
    message: 'Strategic Lint API — Are you building the right thing?',
    usage: 'POST /api/strategic-lint with { item: string, context?: string, discovery_answers?: object, current_workflow?: string, evidence?: string }',
    description: 'Generates synthetic personas, simulates their reactions, and checks for strategic bugs in your spec before you build.',
    flow: '1. POST /api/discover → get questions. 2. Answer them. 3. POST /api/strategic-lint with answers → get strategic assessment.',
    docs: 'https://speclint.ai/openapi.yaml',
  })
}
