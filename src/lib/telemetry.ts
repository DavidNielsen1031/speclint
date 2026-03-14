// Usage telemetry — tracks API call metrics in Upstash Redis
import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'

// Source of the API request: browser UI, MCP tool call, or direct API usage
export type RequestSource = 'browser' | 'mcp' | 'api-direct' | 'healthcheck'

export interface UsageEvent {
  requestId: string
  timestamp: string
  model: string
  tier: string
  itemCount: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  latencyMs: number
  retried: boolean
  ip?: string
  source?: RequestSource
  /** License key of the customer making the request */
  licenseKey?: string
  /** Raw input items shown in Discord alerts — truncated for display */
  items?: string[]
  /** API endpoint that generated this event */
  endpoint?: 'lint' | 'refine' | 'discover' | 'plan' | 'rewrite'
  /** Completeness scores per item (post-LLM) */
  scores?: { title: string; completeness_score: number; agent_ready: boolean }[]
  /** Average completeness score across all items */
  averageScore?: number
  /** Number of items that passed the agent-ready gate */
  agentReadyCount?: number
  /** Verifiable lint receipt ID (SL-037) */
  lintId?: string
  /** Whether a prompt injection pattern was detected in the input (SEC-005) */
  injection_detected?: boolean
  /** Names of matched injection patterns (SEC-005) */
  injection_patterns?: string[]
}

/**
 * Infer the request source from HTTP headers.
 * Priority: explicit x-source header > user-agent sniffing > default api-direct
 */
export function detectSource(
  userAgent: string | null,
  xSource: string | null,
  xClient: string | null,
): RequestSource {
  // Explicit override — caller can set x-source: mcp | browser | api-direct | healthcheck
  if (xSource === 'healthcheck') return 'healthcheck'
  if (xSource === 'mcp' || xClient === 'mcp') return 'mcp'
  if (xSource === 'browser') return 'browser'
  if (xSource === 'api-direct') return 'api-direct'

  // User-agent sniffing
  const ua = userAgent?.toLowerCase() ?? ''
  if (ua.includes('mozilla/') || ua.includes('chrome/') || ua.includes('safari/')) return 'browser'
  if (ua.includes('anthropic') || ua.includes('claude') || ua.includes('mcp-')) return 'mcp'

  // No UA or non-browser UA → direct API call (scripts, curl, integrations)
  return 'api-direct'
}

// Model pricing per million tokens (USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
  'claude-haiku-4-5-20250414': { input: 1.00, output: 5.00 },
}

const DEFAULT_PRICING = { input: 1.00, output: 5.00 }

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
    return redis
  }
  return null
}

// Source display labels for Discord notifications
const SOURCE_LABELS: Record<string, string> = {
  'browser': '🌐 Website',
  'mcp': '🤖 MCP',
  'api-direct': '⚡ API',
}

const TIER_LABELS: Record<string, string> = {
  'free': '🆓 Free',
  'pro': '💎 Pro',
  'team': '👥 Team',
}

/**
 * Build a visual score bar using Unicode block characters.
 * 10 segments: ████████░░ = 80/100
 */
function buildScoreBar(score: number): string {
  const filled = Math.round(score / 10)
  const empty = 10 - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

/**
 * Fire a usage notification to Discord. Non-blocking, never throws.
 * Format optimized for signal density — lead with what matters (specs + scores).
 */
async function notifyDiscord(event: UsageEvent): Promise<void> {
  // Suppress healthcheck pings — they're internal noise, not real usage
  if (event.source === 'healthcheck') return

  const botToken = process.env.DISCORD_BOT_TOKEN
  const channelId = process.env.DISCORD_RB_CHANNEL_ID
  if (!botToken || !channelId) return

  try {
    const source = SOURCE_LABELS[event.source ?? ''] ?? event.source ?? 'Unknown'
    const latencySec = (event.latencyMs / 1000).toFixed(1)
    const slowFlag = event.latencyMs > 5000 ? ' ⚠️' : ''

    const ENDPOINT_SHORT: Record<string, string> = {
      'lint': '/lint',
      'refine': '/refine',
      'discover': '/discover',
      'plan': '/plan',
      'rewrite': '/rewrite',
    }
    const ep = event.endpoint ? ENDPOINT_SHORT[event.endpoint] ?? event.endpoint : ''

    // Detect organic vs internal traffic
    const INTERNAL_KEY_PREFIX = 'SK-INTERNAL'
    const isInternal = event.licenseKey?.startsWith(INTERNAL_KEY_PREFIX) ||
      (event.source as string) === 'healthcheck'
    const isOrganic = !isInternal

    // Compact header: endpoint · source · items · latency · cost
    const headerParts = [
      ep ? `**${ep}**` : null,
      source,
      `${event.itemCount} item${event.itemCount !== 1 ? 's' : ''}`,
      `${latencySec}s${slowFlag}`,
      `$${event.costUsd.toFixed(4)}`,
    ].filter(Boolean)

    const lines: string[] = []

    // 🚀 ORGANIC USER BANNER — make it impossible to miss
    if (isOrganic) {
      lines.push('# 🚀 ORGANIC USER')
      lines.push('')
    }

    // Score bar — the hero element, visually distinct
    if (event.averageScore !== undefined && event.averageScore !== null) {
      const scoreEmoji = event.averageScore >= 70 ? '✅' : event.averageScore >= 40 ? '⚠️' : '❌'
      const readyText = event.agentReadyCount !== undefined
        ? `${event.agentReadyCount}/${event.itemCount} agent-ready`
        : ''
      // Use a code block for the score to make it pop
      const bar = buildScoreBar(event.averageScore)
      lines.push(`${scoreEmoji} **${event.averageScore}/100** ${bar}  ${readyText}`)
    }

    // Metadata line — subdued, compact
    lines.push(`\`${headerParts.join('  ·  ')}\``)

    // Input items inside a quote block for visual grouping
    if (event.items && event.items.length > 0) {
      const MAX_ITEM_LEN = 65
      const MAX_SHOW = 5
      const shown = event.items.slice(0, MAX_SHOW)
      const overflow = event.items.length - MAX_SHOW

      lines.push('') // breathing room before items

      shown.forEach((item, i) => {
        const truncated = item.length > MAX_ITEM_LEN ? item.slice(0, MAX_ITEM_LEN) + '…' : item
        const itemScore = event.scores?.[i]
        if (itemScore) {
          const badge = itemScore.agent_ready ? '✅' : '⚠️'
          lines.push(`> ${badge} **${itemScore.completeness_score}** — ${truncated}`)
        } else {
          lines.push(`> ${truncated}`)
        }
      })
      if (overflow > 0) {
        lines.push(`> *…+${overflow} more*`)
      }
    }

    // Lint receipt ID — verifiable proof of lint
    if (event.lintId) {
      lines.push(`-# 🔖 Receipt: \`${event.lintId}\` · verify: speclint.ai/api/verify?id=${event.lintId}`)
    }

    // Daily totals — faint footer
    const dailyContext = await getDailyRunningTotal(event.timestamp.slice(0, 10))
    if (dailyContext) {
      lines.push(``) // space before footer
      lines.push(`-# 📊 Today: ${dailyContext.calls} calls · $${dailyContext.costUsd.toFixed(4)}`)
    }

    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: lines.join('\n') }),
    })
  } catch {
    // Non-blocking — never let notification failures affect the API
  }
}

/**
 * Quick Redis fetch for daily running totals (used in notifications).
 */
async function getDailyRunningTotal(day: string): Promise<{ calls: number; costUsd: number } | null> {
  const r = getRedis()
  if (!r) return null
  try {
    const [calls, costUsd] = await Promise.all([
      r.get<number>(`telemetry:calls:daily:${day}`),
      r.get<number>(`telemetry:cost:daily:${day}`),
    ])
    if (!calls) return null
    return { calls: calls ?? 0, costUsd: costUsd ?? 0 }
  } catch {
    return null
  }
}

/**
 * Hash a raw IP address for privacy-safe storage.
 * Uses HMAC-SHA256 with an optional salt from environment.
 */
function hashIp(rawIp: string): string {
  return createHash('sha256')
    .update(rawIp + (process.env.IP_SALT || 'speclint'))
    .digest('hex')
    .slice(0, 16)
}

export async function trackUsage(event: UsageEvent): Promise<void> {
  // Hash IP before any storage or notification (PII protection)
  if (event.ip && !event.ip.startsWith('fp:')) {
    event = { ...event, ip: hashIp(event.ip) }
  }

  // Truncate stored items aggressively (500 chars max) to limit PII exposure
  if (event.items) {
    event = { ...event, items: event.items.map(i => i.slice(0, 500)) }
  }

  // Fire Discord notification immediately (non-blocking)
  notifyDiscord(event).catch(() => {})

  const r = getRedis()
  if (!r) {
    console.log('[telemetry]', JSON.stringify(event))
    return
  }

  try {
    const day = event.timestamp.slice(0, 10) // YYYY-MM-DD
    const month = event.timestamp.slice(0, 7) // YYYY-MM

    // Store individual event (keep 90 days)
    const eventKey = `telemetry:event:${event.requestId}`
    await r.set(eventKey, JSON.stringify(event), { ex: 90 * 86400 })

    // Push to daily list
    await r.lpush(`telemetry:daily:${day}`, event.requestId)
    await r.expire(`telemetry:daily:${day}`, 90 * 86400)

    // Increment daily aggregates
    await r.incrbyfloat(`telemetry:cost:daily:${day}`, event.costUsd)
    await r.expire(`telemetry:cost:daily:${day}`, 90 * 86400)
    await r.incrby(`telemetry:calls:daily:${day}`, 1)
    await r.expire(`telemetry:calls:daily:${day}`, 90 * 86400)
    await r.incrby(`telemetry:tokens:daily:${day}:input`, event.inputTokens)
    await r.expire(`telemetry:tokens:daily:${day}:input`, 90 * 86400)
    await r.incrby(`telemetry:tokens:daily:${day}:output`, event.outputTokens)
    await r.expire(`telemetry:tokens:daily:${day}:output`, 90 * 86400)
    await r.incrby(`telemetry:items:daily:${day}`, event.itemCount)
    await r.expire(`telemetry:items:daily:${day}`, 90 * 86400)

    // Monthly aggregates
    await r.incrbyfloat(`telemetry:cost:monthly:${month}`, event.costUsd)
    await r.expire(`telemetry:cost:monthly:${month}`, 365 * 86400)
    await r.incrby(`telemetry:calls:monthly:${month}`, 1)
    await r.expire(`telemetry:calls:monthly:${month}`, 365 * 86400)

    // Tier tracking
    await r.incrby(`telemetry:tier:${event.tier}:${day}`, 1)
    await r.expire(`telemetry:tier:${event.tier}:${day}`, 90 * 86400)

    // Source tracking (browser | mcp | api-direct)
    if (event.source) {
      await r.incrby(`telemetry:source:${event.source}:${day}`, 1)
      await r.expire(`telemetry:source:${event.source}:${day}`, 90 * 86400)
    }

    const NINETY_DAYS = 7776000

    // Per-license index
    if (event.licenseKey) {
      const licenseListKey = `telemetry:license:${event.licenseKey}:daily:${day}`
      await r.lpush(licenseListKey, event.requestId)
      await r.expire(licenseListKey, NINETY_DAYS)
    }

    // Agent-ready counters
    const agentReadyCount = event.agentReadyCount ?? 0
    const agentReadyCountKey = `telemetry:agent_ready_count:daily:${day}`
    const agentReadyTotalKey = `telemetry:agent_ready_total:daily:${day}`
    await r.incrby(agentReadyCountKey, agentReadyCount)
    await r.expire(agentReadyCountKey, NINETY_DAYS)
    await r.incrby(agentReadyTotalKey, event.itemCount)
    await r.expire(agentReadyTotalKey, NINETY_DAYS)

    // Endpoint counter
    if (event.endpoint) {
      const endpointKey = `telemetry:endpoint:${event.endpoint}:daily:${day}`
      await r.incrby(endpointKey, 1)
      await r.expire(endpointKey, NINETY_DAYS)
    }

  } catch (err) {
    console.error('[telemetry] Failed to track usage:', err)
    // Non-blocking — don't let telemetry failures break the API
  }
}

export async function getDailySummary(day: string): Promise<{
  calls: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  items: number
  bySource: { browser: number; mcp: number; apiDirect: number }
} | null> {
  const r = getRedis()
  if (!r) return null

  try {
    const [calls, inputTokens, outputTokens, costUsd, items, srcBrowser, srcMcp, srcApiDirect] = await Promise.all([
      r.get<number>(`telemetry:calls:daily:${day}`),
      r.get<number>(`telemetry:tokens:daily:${day}:input`),
      r.get<number>(`telemetry:tokens:daily:${day}:output`),
      r.get<number>(`telemetry:cost:daily:${day}`),
      r.get<number>(`telemetry:items:daily:${day}`),
      r.get<number>(`telemetry:source:browser:${day}`),
      r.get<number>(`telemetry:source:mcp:${day}`),
      r.get<number>(`telemetry:source:api-direct:${day}`),
    ])

    if (!calls) return null

    return {
      calls: calls ?? 0,
      inputTokens: inputTokens ?? 0,
      outputTokens: outputTokens ?? 0,
      costUsd: costUsd ?? 0,
      items: items ?? 0,
      bySource: {
        browser: srcBrowser ?? 0,
        mcp: srcMcp ?? 0,
        apiDirect: srcApiDirect ?? 0,
      },
    }
  } catch (err) {
    console.error('[telemetry] getDailySummary failed:', err)
    return null
  }
}

export async function getMonthlySummary(month: string): Promise<{
  calls: number
  costUsd: number
} | null> {
  const r = getRedis()
  if (!r) return null

  try {
    const [calls, costUsd] = await Promise.all([
      r.get<number>(`telemetry:calls:monthly:${month}`),
      r.get<number>(`telemetry:cost:monthly:${month}`),
    ])

    if (!calls) return null
    return { calls: calls ?? 0, costUsd: costUsd ?? 0 }
  } catch (err) {
    console.error('[telemetry] getMonthlySummary failed:', err)
    return null
  }
}

/**
 * Get all request IDs associated with a license key on a given day.
 * Used by the dashboard to filter telemetry by customer.
 */
export async function getLicenseDailyEvents(licenseKey: string, day: string): Promise<string[]> {
  const r = getRedis()
  if (!r) return []
  try {
    const results = await r.lrange(`telemetry:license:${licenseKey}:daily:${day}`, 0, -1)
    return (results ?? []) as string[]
  } catch (err) {
    console.error('[telemetry] getLicenseDailyEvents failed:', err)
    return []
  }
}

/**
 * Get agent-ready counts for a given day.
 * ready = number of items that passed the agent-ready gate
 * total = total items processed
 */
export async function getAgentReadyStats(day: string): Promise<{ ready: number; total: number }> {
  const r = getRedis()
  if (!r) return { ready: 0, total: 0 }
  try {
    const [ready, total] = await Promise.all([
      r.get<number>(`telemetry:agent_ready_count:daily:${day}`),
      r.get<number>(`telemetry:agent_ready_total:daily:${day}`),
    ])
    return { ready: ready ?? 0, total: total ?? 0 }
  } catch (err) {
    console.error('[telemetry] getAgentReadyStats failed:', err)
    return { ready: 0, total: 0 }
  }
}

/**
 * Get per-endpoint call counts for a given day.
 * Returns a map of endpoint name → call count.
 */
export async function getEndpointStats(day: string): Promise<Record<string, number>> {
  const r = getRedis()
  if (!r) return {}
  try {
    const endpoints = ['lint', 'refine', 'discover', 'plan', 'rewrite'] as const
    const counts = await Promise.all(
      endpoints.map(ep => r.get<number>(`telemetry:endpoint:${ep}:daily:${day}`))
    )
    const result: Record<string, number> = {}
    endpoints.forEach((ep, i) => {
      const count = counts[i] ?? 0
      if (count > 0) result[ep] = count
    })
    return result
  } catch (err) {
    console.error('[telemetry] getEndpointStats failed:', err)
    return {}
  }
}
