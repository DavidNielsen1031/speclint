export function CustomerZeroSection() {
  return (
    <section className="bg-[#0a0a0a] py-24 border-b border-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16">
          <p className="text-emerald-400 font-mono text-sm mb-3">// dogfooding in production</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            We use Speclint to build Speclint.
          </h2>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">
            <span className="text-white font-medium">Customer Zero</span> — real data from our own pipeline.
            Every ticket we write goes through the linter. This is what that looks like.
          </p>
        </div>

        {/* Before / After Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* BEFORE */}
          <div className="rounded-lg border border-rose-900/50 bg-rose-950/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-rose-400 font-mono text-xs font-semibold uppercase tracking-wider">Before</span>
            </div>
            <pre className="font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap mb-4 bg-zinc-950/60 rounded p-4 border border-zinc-800">
{`Spec: "SL-026: Add persona scoring to /api/lint"

completeness_score: 50
agent_ready:        false ✗
Missing:            has_measurable_outcome`}
            </pre>
            <p className="text-zinc-500 text-sm leading-relaxed">
              No measurable outcome. The spec says <span className="text-zinc-300">WHAT</span> to build but not <span className="text-zinc-300">WHY</span> it matters.
            </p>
          </div>

          {/* AFTER */}
          <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-400 font-mono text-xs font-semibold uppercase tracking-wider">After</span>
            </div>
            <pre className="font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap mb-4 bg-zinc-950/60 rounded p-4 border border-zinc-800">
{`Spec: "SL-026: Reduce wasted agent token spend by 30%
       through persona-aware scoring"

completeness_score: 75
agent_ready:        true ✓
Gained:             has_measurable_outcome`}
            </pre>
            <p className="text-zinc-500 text-sm leading-relaxed">
              One rewrite. Two minutes. The spec now articulates the <span className="text-zinc-300">business outcome</span>, not just the feature.
            </p>
          </div>
        </div>

        {/* Behavior change insight */}
        <div className="mb-12 rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 max-w-3xl">
          <p className="text-zinc-300 leading-relaxed">
            Our orchestration agent — the AI that writes specs and dispatches coding agents — now writes specs differently because it knows they&apos;ll be scored. The quality gate didn&apos;t just catch bad specs. It changed how specs are written in the first place.{" "}
            <span className="text-white font-medium">That&apos;s the product.</span>
          </p>
        </div>

        {/* Punchline quote */}
        <blockquote className="border-l-2 border-emerald-500 pl-6 max-w-3xl">
          <p className="text-zinc-300 text-lg leading-relaxed italic">
            &ldquo;The rewrite forced us to answer: why does this feature matter? That&apos;s not a lint rule — that&apos;s product thinking. And it takes 2 minutes.&rdquo;
          </p>
          <cite className="mt-3 block text-zinc-500 text-sm not-italic font-mono">— David Nielsen, Speclint</cite>
        </blockquote>
      </div>
    </section>
  )
}
