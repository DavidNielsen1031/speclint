'use client'

import { useState, useCallback } from 'react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LintBreakdown {
  has_measurable_outcome: boolean
  has_testable_criteria: boolean
  has_constraints: boolean
  no_vague_verbs: boolean
  has_definition_of_done: boolean
  has_verification_steps: boolean
  has_review_gate: boolean
  complexity_note?: string
}

interface LintResult {
  score: number
  breakdown: LintBreakdown
  agent_ready: boolean
}

interface RewriteResult {
  rewritten?: string
  changes?: string[]
  new_score?: number
  preview?: string
  upgrade_message?: string
  upgrade_url?: string
  tier?: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DIMENSIONS: { key: keyof LintBreakdown; label: string; points: number }[] = [
  { key: 'has_testable_criteria', label: 'Testable criteria', points: 25 },
  { key: 'has_measurable_outcome', label: 'Measurable outcome', points: 20 },
  { key: 'has_constraints', label: 'Constraints / scope', points: 20 },
  { key: 'no_vague_verbs', label: 'Specific title', points: 20 },
  { key: 'has_verification_steps', label: 'Verification steps', points: 15 },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function scoreColor(score: number) {
  if (score < 50) return 'text-red-500'
  if (score < 70) return 'text-yellow-500'
  return 'text-emerald-400'
}

function scoreTrackClass(score: number) {
  if (score < 50) return 'stroke-red-500'
  if (score < 70) return 'stroke-yellow-500'
  return 'stroke-emerald-500'
}

const CIRCUMFERENCE = 2 * Math.PI * 42

function animateCounter(
  from: number,
  to: number,
  setter: (n: number) => void,
  duration = 800,
) {
  const start = performance.now()
  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
    setter(Math.round(from + (to - from) * eased))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SpecTesterSection() {
  const [specText, setSpecText] = useState('')
  const [linting, setLinting] = useState(false)
  const [lintResult, setLintResult] = useState<LintResult | null>(null)
  const [rewriting, setRewriting] = useState(false)
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null)
  const [displayScore, setDisplayScore] = useState(0)
  const [newDisplayScore, setNewDisplayScore] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  /* ---------- Lint ---------- */
  const handleLint = useCallback(async () => {
    if (!specText.trim()) return
    setError(null)
    setLinting(true)
    setLintResult(null)
    setRewriteResult(null)
    setDisplayScore(0)

    try {
      const res = await fetch('/api/lint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [specText], preserve_structure: true }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Lint failed (${res.status})`)
      }

      const data = await res.json()
      const item = data.items?.[0]
      if (!item) throw new Error('No lint results returned')

      const result: LintResult = {
        score: item.completeness_score,
        breakdown: item.breakdown,
        agent_ready: item.agent_ready,
      }
      setLintResult(result)
      animateCounter(0, result.score, setDisplayScore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLinting(false)
    }
  }, [specText])

  /* ---------- Rewrite ---------- */
  const handleRewrite = useCallback(async () => {
    if (!lintResult) return
    setError(null)
    setRewriting(true)

    const gaps = DIMENSIONS
      .filter((d) => !lintResult.breakdown[d.key])
      .map((d) => d.key)

    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec: specText, gaps, score: lintResult.score }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Rewrite failed (${res.status})`)
      }

      const data: RewriteResult = await res.json()
      setRewriteResult(data)

      if (data.new_score !== undefined) {
        animateCounter(lintResult.score, data.new_score, setNewDisplayScore)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setRewriting(false)
    }
  }, [lintResult, specText])

  /* ---------- Copy ---------- */
  const handleCopy = useCallback(async () => {
    if (!rewriteResult?.rewritten) return
    await navigator.clipboard.writeText(rewriteResult.rewritten)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [rewriteResult])

  const showFixIt =
    lintResult &&
    lintResult.score < 70 &&
    DIMENSIONS.some((d) => !lintResult.breakdown[d.key])

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <section id="try-it" className="bg-[#0a0a0a] py-24 border-b border-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <p className="text-emerald-400 font-mono text-sm mb-3">
            // try it yourself
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Paste a spec. See the score.
          </h2>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">
            Drop in any GitHub issue, ticket, or spec text. Speclint scores it
            instantly —{' '}
            <span className="text-white">and can fix it for you.</span>
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* ---- LEFT: Input ---- */}
          <div className="flex flex-col gap-4">
            <textarea
              value={specText}
              onChange={(e) => setSpecText(e.target.value)}
              placeholder={'Paste your spec, ticket, or issue text here…'}
              className="w-full h-64 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-4 text-sm text-zinc-200 placeholder:text-zinc-600 font-mono resize-none focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button
              onClick={handleLint}
              disabled={linting || !specText.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-white text-black font-semibold text-sm rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {linting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Linting…
                </span>
              ) : (
                'Lint it'
              )}
            </button>
          </div>

          {/* ---- RIGHT: Results ---- */}
          <div className="flex flex-col gap-4">
            {/* Loading */}
            {linting && (
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-8 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  <span className="text-zinc-400 text-sm">
                    Analyzing your spec…
                  </span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Lint results */}
            {lintResult && !linting && (
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-6">
                {/* Score + agent_ready */}
                <div className="flex items-center gap-6 mb-6">
                  {/* Circular progress */}
                  <div className="relative w-24 h-24 shrink-0">
                    <svg
                      className="w-24 h-24 -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="#1e1e1e"
                        strokeWidth="6"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        className={scoreTrackClass(lintResult.score)}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={
                          CIRCUMFERENCE * (1 - displayScore / 100)
                        }
                        style={{
                          transition: 'stroke-dashoffset 0.8s ease-out',
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className={`font-mono text-2xl font-bold ${scoreColor(lintResult.score)}`}
                      >
                        {displayScore}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">
                        Completeness Score
                      </span>
                      {lintResult.agent_ready && (
                        <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full">
                          agent_ready
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-500 text-xs">
                      {lintResult.score >= 70
                        ? 'This spec is ready for agent consumption.'
                        : 'This spec needs work before agents can reliably implement it.'}
                    </p>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-2 mb-6">
                  {DIMENSIONS.map((d) => {
                    const passed = lintResult.breakdown[d.key] as boolean
                    return (
                      <div key={d.key} className="flex items-center gap-3">
                        <span
                          className={`text-sm ${passed ? 'text-emerald-400' : 'text-red-500'}`}
                        >
                          {passed ? '✓' : '✗'}
                        </span>
                        <span
                          className={`text-sm ${passed ? 'text-zinc-300' : 'text-zinc-400'}`}
                        >
                          {d.label}
                        </span>
                        <span className="text-zinc-600 text-xs font-mono ml-auto">
                          {passed ? d.points : 0}/{d.points}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Fix it button */}
                {showFixIt && !rewriteResult && (
                  <button
                    onClick={handleRewrite}
                    disabled={rewriting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {rewriting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Rewriting…
                      </span>
                    ) : (
                      'Fix it ✨'
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Rewrite loading */}
            {rewriting && (
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-8 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  <span className="text-zinc-400 text-sm">
                    AI is rewriting your spec…
                  </span>
                </div>
              </div>
            )}

            {/* Rewrite results */}
            {rewriteResult && !rewriting && (
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-6">
                {/* Free tier: preview + blur */}
                {rewriteResult.tier === 'free' ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-white font-semibold text-sm">
                        Rewritten Spec
                      </span>
                      <span className="bg-zinc-800 text-zinc-400 font-mono text-[10px] px-2 py-0.5 rounded">
                        preview
                      </span>
                    </div>
                    <div className="relative overflow-hidden">
                      <pre className="bg-[#111] border border-[#222] rounded-lg p-4 text-xs text-emerald-300 font-mono whitespace-pre-wrap leading-relaxed">
                        {rewriteResult.preview}
                        <span
                          className="select-none"
                          style={{ filter: 'blur(4px)' }}
                        >
                          {
                            ' The remaining content of this rewritten spec is available on the Solo plan. It includes fully rewritten acceptance criteria, constraints, verification steps, and a measurable outcome tied to your original intent…'
                          }
                        </span>
                      </pre>
                    </div>
                    <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 text-center">
                      <p className="text-zinc-300 text-sm mb-2">
                        {rewriteResult.upgrade_message}
                      </p>
                      <a
                        href={rewriteResult.upgrade_url}
                        className="inline-block px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm rounded-lg hover:brightness-110 transition-all"
                      >
                        Upgrade to unlock full rewrites →
                      </a>
                    </div>
                  </div>
                ) : (
                  /* Paid tier: full rewrite */
                  <div>
                    {/* Before → After scores */}
                    {rewriteResult.new_score !== undefined && lintResult && (
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-xs font-mono">
                            before
                          </span>
                          <span
                            className={`font-mono text-lg font-bold ${scoreColor(lintResult.score)}`}
                          >
                            {lintResult.score}
                          </span>
                        </div>
                        <span className="text-zinc-600">→</span>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-xs font-mono">
                            after
                          </span>
                          <span
                            className={`font-mono text-lg font-bold ${scoreColor(rewriteResult.new_score)}`}
                          >
                            {newDisplayScore}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Changes list */}
                    {rewriteResult.changes && rewriteResult.changes.length > 0 && (
                      <div className="mb-4">
                        <span className="text-zinc-500 text-xs font-mono block mb-2">
                          changes
                        </span>
                        <ul className="space-y-1">
                          {rewriteResult.changes.map((change, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-zinc-300"
                            >
                              <span className="text-emerald-400 mt-0.5">+</span>
                              {change}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Rewritten spec */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-zinc-500 text-xs font-mono">
                          rewritten spec
                        </span>
                        <button
                          onClick={handleCopy}
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-mono"
                        >
                          {copied ? '✓ copied' : 'copy'}
                        </button>
                      </div>
                      <pre className="bg-[#111] border border-[#222] rounded-lg p-4 text-xs text-emerald-300 font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                        {rewriteResult.rewritten}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!lintResult && !linting && !error && (
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] border-dashed rounded-lg p-8 flex items-center justify-center min-h-[256px]">
                <p className="text-zinc-600 text-sm text-center">
                  Paste a spec on the left and click{' '}
                  <span className="text-zinc-400 font-semibold">Lint it</span>{' '}
                  to see the score
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
