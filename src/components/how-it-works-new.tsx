export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Issue opens on GitHub",
      description: "A developer creates a GitHub issue. Before any agent touches it, the speclint-action fires automatically on issues.opened.",
      code: "on:\n  issues:\n    types: [opened]",
    },
    {
      number: "02",
      title: "Speclint scores the spec",
      description: "The issue body is evaluated across 5 dimensions. Each dimension maps to a real agent failure mode. The result is a completeness_score from 0–100.",
      code: '{\n  "completeness_score": 82,\n  "agent_ready": false,\n  "missing": ["has_definition_of_done"]\n}',
    },
    {
      number: "03",
      title: "Gate or label, you decide",
      description: "Below your threshold? Block the issue from entering the agent queue. Above it? Label it agent_ready: true and let Cursor, Codex, or Claude Code run.",
      code: 'if score >= 80:\n  label("agent_ready")\nelse:\n  comment("Spec incomplete")',
    },
  ]

  return (
    <section className="bg-[#0a0a0a] py-24 border-b border-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16">
          <p className="text-emerald-400 font-mono text-sm mb-3">// how it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Three steps. Zero guesswork.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="text-6xl font-bold text-[#1a1a1a] font-mono mb-4 select-none">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">{step.description}</p>
              <pre className="bg-[#111] border border-[#222] rounded px-4 py-3 text-xs text-emerald-300 font-mono overflow-x-auto">
                {step.code}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
