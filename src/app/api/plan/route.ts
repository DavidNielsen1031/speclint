import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getMaxItems, resolveUserTier } from '@/lib/rate-limit'
import { SprintPlanSchema, type SprintPlan } from '@/lib/schemas'
import { trackUsage, calculateCost, detectSource } from '@/lib/telemetry'
import { anthropic } from '@/lib/anthropic'

interface PlanInputItem {
  id?: string
  title: string
  estimate?: string
  priority?: string
  tags?: string[]
}

interface PlanRequest {
  items: Array<string | PlanInputItem>
  budget?: {
    max_items?: number
    time_window?: string  // "1 week", "2 weeks", "1 sprint"
  }
  goal_hint?: string
  context?: string
}

const MODEL = 'claude-haiku-4-5'
const RATE_LIMIT_PREFIX = 'plan'

const PLANNING_PROMPT = `You are an expert technical lead and AI-native sprint planner. Your job is to pack refined backlog items into an optimal execution queue for a hybrid team (humans set direction, AI agents execute).

This is NOT a traditional Scrum sprint. The output is a machine-ready execution queue with dependency chains and parallelism signals.

SPRINT GOAL RULES:
- If goal_hint is provided, anchor the sprint_goal to it
- Otherwise infer from the highest-priority cluster
- One sentence, outcome-focused (what changes for users/system), NOT task-focused
- Bad: "Complete auth refactor and fix 3 bugs" (task list)
- Good: "Ship a reliable auth flow that unblocks the onboarding funnel" (outcome)

EXECUTION QUEUE RULES:
- Order by priority (HIGH first) then by dependencies (items with no deps come first)
- parallel_group: integer starting at 1. Items with the SAME integer have no dependencies between them and CAN run simultaneously.
- depends_on: array of IDs that must complete before this item starts (creates sequential order)
- Items with unresolved upstream dependencies get a higher parallel_group number
- Prefer XS/S items when budget is tight (maximize throughput over large items)
- rationale: why this item is in this position (1 sentence — mention priority, dependencies, or parallelism)

BUDGET RULES:
- T-shirt sizes in working days: XS=0.5, S=1, M=3, L=7, XL=14
- If budget.max_items set: include at most that many items in execution_queue
- If budget.time_window set: sum days until budget exceeded, remaining items go to deferred
  - "1 week" = 5 days, "2 weeks" = 10 days, "1 sprint" = 10 days
- If no budget: include all items (deferred will be empty)
- fit_ratio = count(execution_queue) / count(all_items)

Return ONLY valid JSON, no markdown fences:
{
  "sprint_goal": "...",
  "execution_queue": [
    {"id":"1","title":"...","estimate":"S","priority":"HIGH — ...","tags":["..."],"rationale":"...","parallel_group":1,"depends_on":[]},
    {"id":"2","title":"...","estimate":"M","priority":"MEDIUM — ...","tags":["..."],"rationale":"...","parallel_group":1,"depends_on":[]}
  ],
  "deferred": [],
  "fit_ratio": 1.0
}`

function parseClaudeJson(text: string): unknown {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  try {
    const body: PlanRequest = await request.json()

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'No backlog items provided. Send { items: Array<string | PlanInputItem> }' },
        { status: 400 }
      )
    }

    // Resolve tier from license key
    const licenseKey = request.headers.get('x-license-key')
    const tier = await resolveUserTier(licenseKey)

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'
    const rateCheck = await checkRateLimit(ip, tier, RATE_LIMIT_PREFIX)

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Daily planning limit reached on the free tier (3 requests/day). Upgrade to Pro for unlimited requests at $29/month.',
          upgrade: 'https://speclint.ai/pricing',
          tier: rateCheck.tier,
        },
        { status: 429 }
      )
    }

    const maxItems = getMaxItems(tier)
    const { items } = body

    if (items.length > maxItems) {
      const upgradeMsg = tier === 'free'
        ? `Free tier is limited to ${maxItems} items per request. Upgrade to Pro ($29/mo) for 25 items or Team ($79/mo) for 50 items. Get a license key at https://speclint.ai/pricing and pass it via the x-license-key header.`
        : `${tier} tier is limited to ${maxItems} items per request. You sent ${items.length}.`
      return NextResponse.json(
        {
          error: upgradeMsg,
          upgrade: tier === 'free' ? 'https://speclint.ai/pricing' : undefined,
          tier,
          itemsReceived: items.length,
          itemsAllowed: maxItems,
        },
        { status: 400 }
      )
    }

    // Normalize items to a consistent format
    const normalizedItems = items.map((item, i) => {
      if (typeof item === 'string') {
        return { id: String(i + 1), title: item }
      }
      return { ...item, id: item.id ?? String(i + 1) }
    })

    // Build the prompt
    let userPrompt = PLANNING_PROMPT

    if (body.context) {
      userPrompt += `\n\nProject context: ${body.context}`
    }

    if (body.goal_hint) {
      userPrompt += `\n\nSprint goal hint from product owner: ${body.goal_hint}`
    }

    if (body.budget) {
      const budgetParts: string[] = []
      if (body.budget.max_items) {
        budgetParts.push(`Maximum items in sprint: ${body.budget.max_items}`)
      }
      if (body.budget.time_window) {
        budgetParts.push(`Sprint time window: ${body.budget.time_window}`)
      }
      if (budgetParts.length > 0) {
        userPrompt += `\n\nBudget constraints:\n${budgetParts.join('\n')}`
      }
    }

    userPrompt += `\n\nBacklog items to plan:\n${JSON.stringify(normalizedItems, null, 2)}`

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse and validate
    let plan: SprintPlan
    let parsed: unknown
    try {
      parsed = parseClaudeJson(content.text)
    } catch {
      console.error('Failed to parse Claude response:', content.text)
      throw new Error('Failed to parse sprint plan results')
    }

    const validation = SprintPlanSchema.safeParse(parsed)
    if (validation.success) {
      plan = validation.data
    } else {
      // Retry once with correction prompt
      console.warn('Sprint plan validation failed, retrying:', validation.error.issues)
      const retryResponse = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: content.text },
          {
            role: 'user',
            content: `Your response had validation errors: ${JSON.stringify(validation.error.issues)}. Fix and return valid JSON only. sprint_goal must be a non-empty string. execution_queue must have at least 1 item. fit_ratio must be 0-1. Return ONLY the JSON object.`,
          },
        ],
      })

      const retryContent = retryResponse.content[0]
      if (retryContent.type !== 'text') throw new Error('Retry failed')

      try {
        const retryParsed = parseClaudeJson(retryContent.text)
        const retryValidation = SprintPlanSchema.safeParse(retryParsed)
        if (retryValidation.success) {
          plan = retryValidation.data
        } else {
          console.error('Sprint plan retry validation also failed:', retryValidation.error.issues)
          return NextResponse.json(
            { error: 'AI output failed validation after retry', details: retryValidation.error.issues },
            { status: 502 }
          )
        }
      } catch {
        throw new Error('Failed to parse sprint plan retry response')
      }
    }

    // Tier gating: free tier strips dependency mapping fields
    const isFreeTier = tier === 'free'
    const gatedPlan = isFreeTier
      ? {
          sprint_goal: plan.sprint_goal,
          execution_queue: plan.execution_queue.map(item => ({
            id: item.id,
            title: item.title,
            estimate: item.estimate,
            priority: item.priority,
            tags: item.tags,
            rationale: item.rationale,
            // Strip parallel_group and depends_on for free tier
          })),
          fit_ratio: plan.fit_ratio,
          // No deferred for free tier — but hint if items were deferred
          ...(plan.deferred && plan.deferred.length > 0 ? {
            _upgrade_hint: `${plan.deferred.length} item(s) deferred. Upgrade to Pro for full dependency mapping and deferred queue at https://speclint.ai/pricing`
          } : {})
        }
      : plan

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
      itemCount: normalizedItems.length,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
      retried: !validation.success,
      ip,
      source,
      items: normalizedItems.map(i => i.title),
      endpoint: 'plan',
      licenseKey: licenseKey ?? undefined,
    }).catch(() => {})

    return NextResponse.json({
      ...gatedPlan,
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
    console.error('Plan API Error:', error)

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
    message: 'Sprint Planner API',
    usage: 'POST /api/plan with { items, budget?, goal_hint?, context? }',
    description: 'AI-native sprint execution router — packs refined items into an ordered queue with dependency chains and parallel groups',
    docs: 'https://speclint.ai/openapi.yaml',
  })
}
