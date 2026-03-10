export function RemediationSection() {
  const steps = [
    {
      number: "01",
      title: "Spec scores low",
      description: (
        <>
          Speclint posts a structured comment on the GitHub issue: what dimension failed, why it
          failed, and a concrete suggestion for what to add. Not &apos;improve this&apos; —
          specific text you can paste.
        </>
      ),
      code: 'comment: "Missing: has_verification_steps\nsuggestion: Add a section like:\n  Verification: run `npx playwright test auth.spec.ts`\n  All 8 assertions must pass before PR is merged."',
    },
    {
      number: "02",
      title: "Request a rewrite",
      description: (
        <>
          Click &apos;Fix it&apos; in the spec tester, or pass{" "}
          <span className="font-mono text-emerald-400 text-xs">auto_rewrite: true</span> to{" "}
          <span className="font-mono text-emerald-400 text-xs">/api/lint</span>. Speclint
          rewrites only the failing parts — it doesn&apos;t touch what already works.
        </>
      ),
      code: 'POST /api/lint\n{\n  "items": ["your spec text"],\n  "auto_rewrite": true\n}',
    },
    {
      number: "03",
      title: "Auto re-lint",
      description: (
        <>
          The action fires on{" "}
          <span className="font-mono text-emerald-400 text-xs">issues.edited</span> too — your
          fix is scored automatically. No manual re-run, no waiting for CI.
        </>
      ),
      code: "on:\n  issues:\n    types: [opened, edited]  # ← fires on every edit",
    },
    {
      number: "04",
      title: "Spec passes",
      description: (
        <>
          Issue gets labeled{" "}
          <span className="font-mono text-emerald-400 text-xs">agent_ready</span> and enters
          the queue. Your coding agent picks it up. Total time from fail to agent_ready: under 5
          minutes.
        </>
      ),
      code: 'label("agent_ready: true")\n// Cursor, Codex, Claude Code\n// now have a spec worth running',
    },
  ]

  return (
    <section className="bg-[#0a0a0a] py-24 border-b border-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16">
          <p className="text-emerald-400 font-mono text-sm mb-3">// when a spec fails</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Flag it. Fix it. Ship it.
          </h2>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">
            A bad spec isn&apos;t a dead end — it&apos;s a 2-minute edit. Speclint tells you
            exactly what&apos;s missing. Then it rewrites the spec if you want it to.
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {/* Connector line between steps (not on last) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-emerald-500/30 to-transparent z-10 translate-x-3" />
              )}
              <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-5 h-full hover:border-emerald-500/20 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <span className="text-emerald-400 font-mono text-xs font-bold">{step.number}</span>
                  </div>
                </div>
                <h3 className="text-white font-semibold text-sm mb-2">{step.title}</h3>
                <p className="text-zinc-400 text-xs leading-relaxed mb-4">{step.description}</p>
                <pre className="bg-[#111] border border-[#222] rounded px-3 py-2 text-[10px] text-emerald-300 font-mono overflow-x-auto leading-relaxed">
                  {step.code}
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* Loop indicator */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-[#1a1a1a]" />
          <div className="flex items-center gap-2 text-zinc-600 text-xs font-mono">
            <span className="text-emerald-500">↺</span>
            <span>loop until agent_ready: true</span>
          </div>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
        </div>

        {/* Standalone rewrite API — live now */}
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] border-l-2 border-l-emerald-500 rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 shrink-0 text-2xl">
            🔧
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="text-white text-sm font-semibold">Standalone rewrite API — live now</div>
              <span className="text-zinc-500 text-xs font-mono">Lite · Solo · Team</span>
            </div>
            <div className="text-zinc-400 text-xs mt-0.5">
              You don&apos;t need a lint first. Send any spec text to{' '}
              <span className="font-mono text-emerald-400">/api/rewrite</span> and get back a
              rewritten spec, a list of changes, and the new score.
            </div>
          </div>
          <a
            href="#try-it"
            className="shrink-0 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-xs rounded-lg hover:brightness-110 transition-all"
          >
            Try it above ↑
          </a>
        </div>
      </div>
    </section>
  )
}
