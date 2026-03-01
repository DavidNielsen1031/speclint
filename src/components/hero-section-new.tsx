"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const ISSUE_LINES = [
  { text: 'title: "Improve dashboard performance"', dim: true },
  { text: 'body: "The dashboard is slow. Make it faster."', dim: true },
  { text: 'labels: []', dim: true },
  { text: 'acceptance_criteria: null', dim: true },
]

const SCORED_LINES = [
  { text: 'title: "Dashboard P95 load time < 800ms"', dim: false },
  { text: 'body: "FCP > 3s on 4G. Target: LCP < 800ms, TTI < 1.5s."', dim: false },
  { text: 'labels: ["perf", "frontend", "Q2"]', dim: false },
  { text: 'acceptance_criteria:', dim: false },
  { text: '  - LCP measured via Lighthouse < 800ms', dim: false },
  { text: '  - No regressions on unit tests', dim: false },
]

const DIMENSIONS = [
  { key: "has_measurable_outcome", pts: 25, label: "Measurable outcome" },
  { key: "has_testable_criteria", pts: 25, label: "Testable criteria" },
  { key: "has_constraints", pts: 20, label: "Constraints present" },
  { key: "no_vague_verbs", pts: 20, label: "No vague verbs" },
  { key: "has_definition_of_done", pts: 10, label: "Definition of done" },
]

export function HeroSection() {
  const [phase, setPhase] = useState<"bad" | "scoring" | "scored">("bad")
  const [score, setScore] = useState(0)
  const [dimScores, setDimScores] = useState<number[]>([0, 0, 0, 0, 0])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("scoring"), 2000)
    const t2 = setTimeout(() => {
      setPhase("scored")
      const target = [25, 25, 20, 20, 10]
      target.forEach((pts, i) => {
        setTimeout(() => {
          setDimScores(prev => {
            const next = [...prev]
            next[i] = pts
            return next
          })
          setScore(prev => prev + pts)
        }, i * 180)
      })
    }, 3200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col justify-center bg-[#0a0a0a] border-b border-[#1a1a1a] overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <Badge className="mb-6 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs px-3 py-1">
              v1.0 — GitHub Action available
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-4">
              Better specs in.<br />
              <span className="text-emerald-400">Better code out.</span>
            </h1>
            <p className="text-lg text-zinc-400 mb-4 leading-relaxed max-w-lg">
              Your AI coding agents build exactly what you ask for. The problem is what you&apos;re asking for. Speclint is the quality gate that makes you write specs worth building.
            </p>
            <p className="text-base text-zinc-500 mb-5 font-mono">
              // Lint your specs before agents touch them
            </p>
            <p className="text-sm text-zinc-500 mb-10 font-mono">
              completeness_score: 85 → agent_ready: true
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-6 py-3 text-base"
                onClick={() => window.location.href = '/get-key'}
              >
                Get API Key — Free
              </Button>
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white px-6 py-3 text-base font-mono"
                onClick={() => document.getElementById('github-action')?.scrollIntoView({ behavior: 'smooth' })}
              >
                View GitHub Action ↓
              </Button>
            </div>
            <p className="mt-4 text-xs text-zinc-600 font-mono">No signup required · 5 lints/day free</p>
          </div>

          {/* Right: animated score visualization */}
          <div className="relative">
            <div className="bg-[#111111] border border-[#222] rounded-lg overflow-hidden font-mono text-sm shadow-2xl">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222] bg-[#0d0d0d]">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-zinc-600 text-xs">issue #142</span>
              </div>

              {/* Issue content */}
              <div className="p-4 space-y-1">
                {phase === "bad" && ISSUE_LINES.map((l, i) => (
                  <div key={i} className={`text-xs ${l.dim ? 'text-red-400/70' : 'text-zinc-300'}`}>
                    {l.text}
                  </div>
                ))}
                {phase === "scoring" && (
                  <div className="text-emerald-400 text-xs animate-pulse">
                    ⚙ running speclint…
                  </div>
                )}
                {phase === "scored" && SCORED_LINES.map((l, i) => (
                  <div key={i} className={`text-xs ${l.dim ? 'text-zinc-500' : 'text-emerald-300'} transition-all`}>
                    {l.text}
                  </div>
                ))}
              </div>

              {/* Score bar */}
              <div className="border-t border-[#222] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">completeness_score</span>
                  <span className={`text-lg font-bold font-mono ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {score}/100
                  </span>
                </div>
                <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${score}%` }}
                  />
                </div>
                {/* Dimension scores */}
                <div className="space-y-1.5 pt-1">
                  {DIMENSIONS.map((d, i) => (
                    <div key={d.key} className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600">{d.key}</span>
                      <span className={`text-[10px] font-mono ${dimScores[i] > 0 ? 'text-emerald-400' : 'text-zinc-700'}`}>
                        {dimScores[i]}/{d.pts}
                      </span>
                    </div>
                  ))}
                </div>
                {score === 100 && (
                  <div className="mt-2 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded px-3 py-2">
                    <span className="text-emerald-400 text-xs font-mono">✓ agent_ready: true</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
