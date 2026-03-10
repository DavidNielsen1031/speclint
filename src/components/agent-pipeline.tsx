export function AgentPipelineSection() {
  const withoutSteps = [
    { label: "Issue filed", time: "0 min" },
    { label: "Agent picks it up", time: "5 min" },
    { label: "Builds wrong thing", time: "2 hrs" },
    { label: "Dev reviews, rejects", time: "30 min" },
    { label: "Rework + rebuild", time: "4+ hrs" },
  ]

  const withSteps = [
    { label: "Issue filed", time: "0 min" },
    { label: "Speclint scores it", time: "2 sec" },
    { label: "Dev adds context", time: "2 min" },
    { label: "Agent builds right thing", time: "15 min" },
  ]

  return (
    <section className="bg-[#0a0a0a] py-24 border-b border-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16">
          <p className="text-emerald-400 font-mono text-sm mb-3">// the real bottleneck</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            The spec is the bottleneck. Not the model.
          </h2>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">
            AI rework is expensive because agents work from incomplete specs. A quality gate at the input changes everything downstream.
          </p>
        </div>

        {/* Pipeline comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-14">
          {/* WITHOUT SPECLINT */}
          <div className="rounded-lg border border-rose-900/50 bg-rose-950/10 p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-rose-400 font-mono text-xs font-semibold uppercase tracking-wider">Without Speclint</span>
              <span className="ml-auto text-rose-400 font-mono text-xs font-bold">4+ hours / feature</span>
            </div>
            <div className="space-y-0">
              {withoutSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full border border-rose-800 bg-rose-950 flex items-center justify-center text-rose-400 text-xs font-mono font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    {i < withoutSteps.length - 1 && (
                      <div className="w-px h-8 bg-rose-900/40 mt-1" />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="text-zinc-300 text-sm font-medium">{step.label}</p>
                    <p className="text-rose-400/70 text-xs font-mono">{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WITH SPECLINT */}
          <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/10 p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-400 font-mono text-xs font-semibold uppercase tracking-wider">With Speclint</span>
              <span className="ml-auto text-emerald-400 font-mono text-xs font-bold">~15 minutes / feature</span>
            </div>
            <div className="space-y-0">
              {withSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full border border-emerald-800 bg-emerald-950 flex items-center justify-center text-emerald-400 text-xs font-mono font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    {i < withSteps.length - 1 && (
                      <div className="w-px h-8 bg-emerald-900/40 mt-1" />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="text-zinc-300 text-sm font-medium">{step.label}</p>
                    <p className="text-emerald-400/70 text-xs font-mono">{step.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quote */}
        <blockquote className="border-l-2 border-emerald-500 pl-6 max-w-3xl">
          <p className="text-zinc-300 text-lg leading-relaxed italic">
            &ldquo;We spent weeks debugging agent rework before realizing the specs were the problem. $29/month on spec quality eliminated most of that rework.&rdquo;
          </p>
          <cite className="mt-3 block text-zinc-500 text-sm not-italic font-mono">— David Nielsen, Speclint (dogfooding our own product)</cite>
        </blockquote>
      </div>
    </section>
  )
}
