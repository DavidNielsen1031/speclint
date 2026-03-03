'use client'

import type { RecentEvent } from './data'

// Source display labels matching existing dashboard conventions
const SOURCE_LABELS: Record<string, string> = {
  browser: 'Browser',
  mcp: 'MCP',
  'api-direct': 'API',
  healthcheck: 'Healthcheck',
}

/** Return a human-readable relative time string, e.g. "2h ago", "just now" */
function relativeTime(timestamp: string): string {
  const then = new Date(timestamp).getTime()
  const now = Date.now()
  const diffMs = now - then

  if (diffMs < 0) return 'just now'

  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return `${sec}s ago`

  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`

  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`

  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

/** Score badge — green ≥70, yellow 50–69, red <50 */
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-zinc-600 font-mono text-xs">—</span>
  }

  let colorClass: string
  if (score >= 70) {
    colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  } else if (score >= 50) {
    colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  } else {
    colorClass = 'text-red-400 bg-red-500/10 border-red-500/30'
  }

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold border ${colorClass}`}
    >
      {score}
    </span>
  )
}

/** Agent-ready indicator */
function AgentReadyBadge({ agentReady }: { agentReady: boolean | null }) {
  if (agentReady === null) return <span className="text-zinc-600 text-xs font-mono">—</span>
  return (
    <span className="text-base leading-none" aria-label={agentReady ? 'Agent ready' : 'Not agent ready'}>
      {agentReady ? '✅' : '❌'}
    </span>
  )
}

const EMPTY_STATE_CURL = `curl -X POST https://speclint.ai/api/lint \\
  -H 'Content-Type: application/json' \\
  -H 'x-license-key: YOUR_KEY' \\
  -d '{"items":["As a user I want to log in"]}'`

interface ActivityFeedProps {
  events: RecentEvent[]
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <p className="text-zinc-400 text-sm font-mono mb-1">
          No lint activity yet — make your first API call
        </p>
        <pre className="text-emerald-400 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 mt-3 overflow-x-auto whitespace-pre-wrap break-all">
          {EMPTY_STATE_CURL}
        </pre>
        <p className="text-zinc-600 text-xs font-mono mt-3">
          Events appear here within seconds of each API call.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_100px_80px_80px] gap-4 px-5 py-3 border-b border-zinc-800 text-zinc-500 text-xs font-mono uppercase tracking-wider">
        <span>Time</span>
        <span>Source</span>
        <span>Score</span>
        <span>Agent Ready</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-zinc-800/60">
        {events.map((event) => (
          <a
            key={event.requestId}
            href={`/api/verify?id=${event.requestId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="grid grid-cols-[1fr_100px_80px_80px] gap-4 px-5 py-3 items-center hover:bg-zinc-800/40 transition-colors group"
          >
            {/* Time */}
            <span className="text-zinc-300 text-xs font-mono group-hover:text-white transition-colors">
              {relativeTime(event.timestamp)}
            </span>

            {/* Source */}
            <span className="text-zinc-400 text-xs font-mono truncate">
              {event.source ? (SOURCE_LABELS[event.source] ?? event.source) : '—'}
            </span>

            {/* Score */}
            <span>
              <ScoreBadge score={event.score} />
            </span>

            {/* Agent Ready */}
            <span>
              <AgentReadyBadge agentReady={event.agentReady} />
            </span>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-zinc-800 text-zinc-600 text-xs font-mono">
        Showing {events.length} recent event{events.length !== 1 ? 's' : ''} · click any row to verify
      </div>
    </div>
  )
}
