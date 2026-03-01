const DIMENSIONS = [
  {
    key: "has_measurable_outcome",
    pts: 25,
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
    label: "No Vague Verbs",
    check: 'Title isn\'t "improve X" or "fix Y" with no specificity',
    fail: '"Improve user experience"',
    pass: '"Reduce checkout form from 6 fields to 3 fields"',
  },
  {
    key: "has_definition_of_done",
    pts: 10,
    label: "Definition of Done",
    check: "AC mentions specific state, value, or threshold",
    fail: '"Feature is complete when tests pass"',
    pass: '"PR merged, Lighthouse perf ≥ 95, Sentry error rate 0%"',
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
          <p className="text-zinc-400 max-w-2xl">
            &ldquo;The distance between Level 3 and Level 4 is the quality of the spec, not the quality of the model.&rdquo;
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

        <div className="mt-8 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-5 flex items-center justify-between">
          <div>
            <div className="text-emerald-400 font-mono text-sm">completeness_score ≥ 80</div>
            <div className="text-white font-semibold mt-1">Agent-ready threshold</div>
          </div>
          <div className="text-right">
            <div className="text-zinc-400 text-sm">Issues below 80 get a structured comment</div>
            <div className="text-zinc-500 text-xs mt-1 font-mono">listing exactly what&apos;s missing</div>
          </div>
        </div>
      </div>
    </section>
  )
}
