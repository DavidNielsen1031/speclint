export function CustomerZeroSection() {
  return (
    <section className="bg-[#0a0a0a] py-24 border-b border-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16">
          <p className="text-emerald-400 font-mono text-sm mb-3">// we use it on ourselves</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Every ticket we write goes through Speclint.
          </h2>
          <p className="text-zinc-400 max-w-2xl leading-relaxed">
            This is what that looks like — dogfooding data from our own pipeline.
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
              The spec describes the feature (WHAT) but not why it matters (business outcome). An agent would build the right code in the wrong direction.
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
              One rewrite. Two minutes. Now the spec has a measurable outcome the agent can optimize for — not just a feature to implement.
            </p>
          </div>
        </div>

        {/* Behavior change insight */}
        <div className="mb-12 rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 max-w-3xl">
          <p className="text-zinc-300 leading-relaxed">
            The quality gate didn&apos;t just catch bad specs. Our orchestration agent now writes specs differently because it knows they&apos;ll be scored. That&apos;s the compounding effect: the gate changes the behavior upstream of the gate.
          </p>
        </div>

        {/* Punchline quote */}
        <blockquote className="border-l-2 border-emerald-500 pl-6 max-w-3xl">
          <p className="text-zinc-300 text-lg leading-relaxed italic">
            &ldquo;Writing for Speclint&apos;s linter forced us to answer: why does this feature matter? That&apos;s not a linting rule — that&apos;s product thinking.&rdquo;
          </p>
          <cite className="mt-3 block text-zinc-500 text-sm not-italic font-mono">— David Nielsen, Speclint (founder; these are our own specs)</cite>
        </blockquote>
      </div>
    </section>
  )
}
