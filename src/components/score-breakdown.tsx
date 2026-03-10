const DIMENSIONS = [
  {
    key: "has_measurable_outcome",
    pts: 20,
    label: "Measurable Outcome",
    check: "Problem contains an observable, quantifiable outcome",
    fail: '"The login is slow"',
    pass: '"Login P95 < 200ms under 1k concurrent users"',
  },
  {
    key: "has_testable_criteria",
    pts: 25,
    label: "Testable Criteria",
    check: "≥2 acceptance criteria with action verbs",
    fail: '"Works correctly on all browsers"',
    pass: '"Loads in Chrome 120+, Firefox 122+, passes axe-core audit"',
  },
  {
    key: "has_constraints",
    pts: 20,
    label: "Constraints Present",
    check: "Tags, tech assumptions, or explicit scope limits",
    fail: '"Add a filter to the table"',
    pass: '"Filter by status. No backend changes. Uses existing FilterBar component."',
  },
  {
    key: "no_vague_verbs",
    pts: 20,
    label: "Specific Title",
    check: 'Title doesn\'t use "improve X" or "fix Y" without specificity',
    fail: '"Improve user experience"',
    pass: '"Reduce checkout form from 6 fields to 3 fields"',
  },
  {
    key: "has_verification_steps",
    pts: 15,
    label: "Verification Steps",
    check: "Spec describes how you'll prove the implementation works",
    fail: '"Merge PR and close the ticket"',
    pass: '"Run npx playwright test checkout.spec.ts — all 12 assertions must pass"',
  },
]

export function ScoreBreakdownSection() {
  return (
    <section className="bg-[#080808] py-24 border-b border-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16">
          <p className="text-emerald-400 font-mono text-sm mb-3">// scoring rubric</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Five dimensions. 100 points.
          </h2>
          <p className="text-zinc-500 font-mono text-sm mb-3">
            Each dimension maps to a specific agent failure mode. Fix the dimension, fix the failure.
          </p>
        </div>

        <div className="space-y-4">
          {DIMENSIONS.map((dim) => (
            <div
              key={dim.key}
              className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-5 grid sm:grid-cols-[200px_1fr_1fr] gap-4 items-start hover:border-emerald-500/20 transition-colors"
            >
              {/* Key + pts */}
              <div>
                <div className="font-mono text-xs text-emerald-400 mb-1">{dim.key}</div>
                <div className="text-2xl font-bold text-white">{dim.pts}<span className="text-zinc-600 text-sm font-normal"> pts</span></div>
                <div className="text-xs text-zinc-500 mt-1">{dim.label}</div>
              </div>

              {/* Check */}
              <div>
                <div className="text-xs text-zinc-600 uppercase tracking-wider mb-2 font-mono">check</div>
                <p className="text-sm text-zinc-300">{dim.check}</p>
              </div>

              {/* Pass/Fail examples */}
              <div className="space-y-2">
                <div className="text-xs text-zinc-600 uppercase tracking-wider mb-2 font-mono">examples</div>
                <div className="bg-red-500/5 border border-red-500/20 rounded px-3 py-2">
                  <span className="text-red-400 text-[10px] font-mono mr-2">✗</span>
                  <span className="text-xs text-zinc-400 font-mono">{dim.fail}</span>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded px-3 py-2">
                  <span className="text-emerald-400 text-[10px] font-mono mr-2">✓</span>
                  <span className="text-xs text-zinc-400 font-mono">{dim.pass}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Codebase context callout — Pro/Team */}
        <div className="mt-8 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-white text-sm font-semibold">Codebase-aware scoring</div>
            <span className="bg-emerald-500/10 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-500/20">
              Solo / Team
            </span>
          </div>
          <p className="text-zinc-500 text-xs mb-4">
            Pass <span className="font-mono text-zinc-400">codebase_context</span> to get ACs that reference your actual stack — not generic patterns.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-red-500/5 border border-red-500/20 rounded px-4 py-3">
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">without context</div>
              <div className="text-xs text-zinc-400 font-mono">{`AC: "Use a caching layer"`}</div>
              <div className="text-[10px] text-zinc-600 mt-1">Generic. Could mean anything.</div>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded px-4 py-3">
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider mb-2">with codebase_context</div>
              <div className="text-xs text-zinc-400 font-mono">{`AC: "Use Redis via the existing CacheService class, not a new caching layer"`}</div>
              <div className="text-[10px] text-emerald-600 mt-1">Specific. Agent can act on this.</div>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-5 flex items-center justify-between">
          <div>
            <div className="text-emerald-400 font-mono text-sm">completeness_score ≥ 70</div>
            <div className="text-white font-semibold mt-1">Agent-ready threshold</div>
          </div>
          <div className="text-right">
            <div className="text-zinc-400 text-sm">Issues below 70 get a structured comment listing exactly what&apos;s missing</div>
            <div className="text-zinc-500 text-xs mt-1 font-mono">and a rewritten version, if you want it</div>
          </div>
        </div>
      </div>
    </section>
  )
}
