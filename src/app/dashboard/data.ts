// Server-side data fetcher for the dashboard — never imported by client components
import { Redis } from '@upstash/redis'
import { getLicenseDailyEvents, getAgentReadyStats } from '@/lib/telemetry'
import type { UsageEvent } from '@/lib/telemetry'

function getRedis(): Redis | null {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  }
  return null
}

/** Generate the last N day strings (YYYY-MM-DD), most recent last */
export function getLast30Days(): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export interface ScoreTrendPoint {
  day: string
  avgScore: number | null
  count: number
}

export interface AgentReadyPoint {
  day: string
  total: number
  ready: number
}

export interface CallVolumePoint {
  day: string
  calls: number
}

export interface SourceAttribution {
  browser: number
  mcp: number
  'api-direct': number
  healthcheck: number
}

export interface RecentEvent {
  requestId: string
  timestamp: string
  source: string | null
  score: number | null
  agentReady: boolean | null
  endpoint: string | null
  lintId: string | null
}

export interface DashboardData {
  scoreTrend: ScoreTrendPoint[]
  agentReadyFunnel: AgentReadyPoint[]
  callVolume: CallVolumePoint[]
  sourceAttribution: SourceAttribution
  stats: {
    totalLints: number
    avgScore: number | null
    agentReadyPct: number | null
    activeDays: number
  }
  /** Whether this data came from global (all keys) or per-license keys */
  isGlobal: boolean
  /** Whether the per-license data is empty (used to show "try it now" prompt) */
  perLicenseEmpty: boolean
}

export async function fetchDashboardData(
  licenseKey: string,
  { global: isGlobal = false }: { global?: boolean } = {},
): Promise<DashboardData> {
  const days = getLast30Days()
  const r = getRedis()

  // --- Chart 1: Score Trend ---
  let scoreTrend: ScoreTrendPoint[]

  if (isGlobal) {
    // Global mode: read all events from telemetry:daily:{day}
    scoreTrend = await Promise.all(
      days.map(async (day) => {
        if (!r) return { day, avgScore: null, count: 0 }
        try {
          // telemetry:daily:{day} is a Redis list of requestIds
          const requestIds = await r.lrange<string>(`telemetry:daily:${day}`, 0, -1)
          if (!requestIds.length) return { day, avgScore: null, count: 0 }

          const events = await Promise.all(
            requestIds.map(async (id) => {
              try {
                const raw = await r.get<string>(`telemetry:event:${id}`)
                if (!raw) return null
                const parsed: UsageEvent =
                  typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as UsageEvent)
                return parsed
              } catch {
                return null
              }
            })
          )

          const scores = events
            .filter((e): e is UsageEvent => e !== null && e.averageScore !== undefined)
            .map((e) => e.averageScore as number)

          if (!scores.length) return { day, avgScore: null, count: requestIds.length }

          const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
          return { day, avgScore: Math.round(avg), count: requestIds.length }
        } catch {
          return { day, avgScore: null, count: 0 }
        }
      })
    )
  } else {
    // Per-license mode (original behavior)
    scoreTrend = await Promise.all(
      days.map(async (day) => {
        const requestIds = await getLicenseDailyEvents(licenseKey, day)
        if (!requestIds.length || !r) return { day, avgScore: null, count: 0 }

        const events = await Promise.all(
          requestIds.map(async (id) => {
            try {
              const raw = await r.get<string>(`telemetry:event:${id}`)
              if (!raw) return null
              const parsed: UsageEvent =
                typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as UsageEvent)
              return parsed
            } catch {
              return null
            }
          })
        )

        const scores = events
          .filter((e): e is UsageEvent => e !== null && e.averageScore !== undefined)
          .map((e) => e.averageScore as number)

        if (!scores.length) return { day, avgScore: null, count: requestIds.length }

        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
        return { day, avgScore: Math.round(avg), count: requestIds.length }
      })
    )
  }

  // --- Chart 2: Agent-Ready Funnel (global keys, same regardless of toggle) ---
  const agentReadyFunnel: AgentReadyPoint[] = await Promise.all(
    days.map(async (day) => {
      const stats = await getAgentReadyStats(day)
      return { day, total: stats.total, ready: stats.ready }
    })
  )

  // --- Chart 3: Call Volume ---
  const callVolume: CallVolumePoint[] = await Promise.all(
    days.map(async (day) => {
      if (!r) return { day, calls: 0 }
      try {
        if (isGlobal) {
          // Global: use telemetry:calls:daily:{day}
          const calls = await r.get<number>(`telemetry:calls:daily:${day}`)
          return { day, calls: calls ?? 0 }
        } else {
          // Per-license: count events from license key list
          const requestIds = await getLicenseDailyEvents(licenseKey, day)
          return { day, calls: requestIds.length }
        }
      } catch {
        return { day, calls: 0 }
      }
    })
  )

  // --- Chart 4: Source Attribution (sum over 30 days) ---
  const sourceAttribution: SourceAttribution = { browser: 0, mcp: 0, 'api-direct': 0, healthcheck: 0 }
  if (r) {
    await Promise.all(
      days.map(async (day) => {
        const sources = ['browser', 'mcp', 'api-direct', 'healthcheck'] as const
        const counts = await Promise.all(
          sources.map((src) => r.get<number>(`telemetry:source:${src}:${day}`))
        )
        sources.forEach((src, i) => {
          sourceAttribution[src] += counts[i] ?? 0
        })
      })
    )
  }

  // --- Stats summary ---
  const totalLints = scoreTrend.reduce((sum, p) => sum + p.count, 0)
  const scoreDays = scoreTrend.filter((p) => p.avgScore !== null)
  const avgScore =
    scoreDays.length > 0
      ? Math.round(scoreDays.reduce((sum, p) => sum + (p.avgScore ?? 0), 0) / scoreDays.length)
      : null

  const totalReady = agentReadyFunnel.reduce((sum, p) => sum + p.ready, 0)
  const totalItems = agentReadyFunnel.reduce((sum, p) => sum + p.total, 0)
  const agentReadyPct = totalItems > 0 ? Math.round((totalReady / totalItems) * 100) : null

  const activeDays = callVolume.filter((p) => p.calls > 0).length

  // Determine if per-license data is empty (for "try it now" prompt)
  const perLicenseEmpty = !isGlobal && totalLints === 0

  return {
    scoreTrend,
    agentReadyFunnel,
    callVolume,
    sourceAttribution,
    stats: { totalLints, avgScore, agentReadyPct, activeDays },
    isGlobal,
    perLicenseEmpty,
  }
}

/**
 * Fetch the most recent lint events for the activity feed.
 * Scans the last 7 days to collect up to `limit` events.
 * - global=true → reads all events from telemetry:daily:{day}
 * - global=false → filters by licenseKey from telemetry:license:{licenseKey}:daily:{day}
 */
export async function getRecentLintEvents(
  licenseKey?: string,
  global: boolean = false,
  limit: number = 20,
): Promise<RecentEvent[]> {
  const r = getRedis()
  if (!r) return []

  // Build the last 7 day strings (YYYY-MM-DD), most recent first
  const now = new Date()
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }

  // Collect request IDs across all 7 days
  const allIds: string[] = []
  for (const day of days) {
    if (allIds.length >= limit * 3) break
    try {
      const key = global
        ? `telemetry:daily:${day}`
        : `telemetry:license:${licenseKey}:daily:${day}`
      const ids = await r.lrange<string>(key, 0, limit * 3 - 1)
      allIds.push(...((ids ?? []) as string[]))
    } catch {
      // continue on error
    }
  }

  if (!allIds.length) return []

  // Fetch full event data for each ID
  const events = await Promise.all(
    allIds.slice(0, limit * 3).map(async (id) => {
      try {
        const raw = await r.get<string>(`telemetry:event:${id}`)
        if (!raw) return null
        const parsed: UsageEvent =
          typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as UsageEvent)

        // Filter by licenseKey when not in global mode
        if (!global && licenseKey && parsed.licenseKey !== licenseKey) return null

        let agentReady: boolean | null = null
        if (parsed.agentReadyCount !== undefined && parsed.itemCount > 0) {
          agentReady = parsed.agentReadyCount >= parsed.itemCount
        }

        const event: RecentEvent = {
          requestId: parsed.requestId,
          timestamp: parsed.timestamp,
          source: parsed.source ?? null,
          score: parsed.averageScore ?? null,
          agentReady,
          endpoint: parsed.endpoint ?? null,
          lintId: parsed.lintId ?? null,
        }
        return event
      } catch {
        return null
      }
    })
  )

  // Sort by timestamp descending and trim to limit
  return (events.filter(Boolean) as RecentEvent[])
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
}

/**
 * Fetch the most recent lint events for the activity feed.
 * Scans today + yesterday to collect up to `limit` events.
 */
export async function fetchRecentEvents(
  global: boolean,
  licenseKey: string,
  limit: number = 20,
): Promise<RecentEvent[]> {
  const r = getRedis()
  if (!r) return []

  // Build today + yesterday as YYYY-MM-DD
  const now = new Date()
  const days: string[] = []
  for (let i = 0; i <= 1; i++) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }

  // Collect request IDs from both days (fetch extra to allow for sorting/dedup)
  const allIds: string[] = []
  for (const day of days) {
    if (allIds.length >= limit * 2) break
    try {
      const key = global
        ? `telemetry:daily:${day}`
        : `telemetry:license:${licenseKey}:daily:${day}`
      const ids = await r.lrange<string>(key, 0, limit * 2 - 1)
      allIds.push(...((ids ?? []) as string[]))
    } catch {
      // continue on error
    }
  }

  if (!allIds.length) return []

  // Fetch each event's full data
  const maybeEvents: Array<RecentEvent | null> = await Promise.all(
    allIds.slice(0, limit * 2).map(async (id): Promise<RecentEvent | null> => {
      try {
        const raw = await r.get<string>(`telemetry:event:${id}`)
        if (!raw) return null
        const parsed: UsageEvent =
          typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as UsageEvent)

        // Determine agent-ready: all items passed the gate
        let agentReady: boolean | null = null
        if (parsed.agentReadyCount !== undefined && parsed.itemCount > 0) {
          agentReady = parsed.agentReadyCount >= parsed.itemCount
        }

        const event: RecentEvent = {
          requestId: parsed.requestId,
          timestamp: parsed.timestamp,
          source: parsed.source ?? null,
          score: parsed.averageScore ?? null,
          agentReady,
          endpoint: parsed.endpoint ?? null,
          lintId: parsed.lintId ?? null,
        }
        return event
      } catch {
        return null
      }
    })
  )

  // Sort by timestamp descending and trim to limit
  const results: RecentEvent[] = []
  for (const e of maybeEvents) {
    if (e !== null) results.push(e)
  }
  return results
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
}
