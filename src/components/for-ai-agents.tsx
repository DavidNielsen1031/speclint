const AGENTS = [
  { name: "Cursor", icon: "⊕" },
  { name: "Codex", icon: "◈" },
  { name: "Claude Code", icon: "◆" },
  { name: "Devin", icon: "◉" },
  { name: "Copilot", icon: "◇" },
]

const API_EXAMPLE = `POST https://speclint.ai/api/lint
x-license-key: sk_live_...
Content-Type: application/json

{
  "items": ["Fix mobile Safari login — users can't log in via Safari after the July deploy"],
  "auto_rewrite": false
}

// Response
{
  "items": [{
    "title": "Fix mobile Safari login failure",
    "problem": "Users cannot authenticate via Safari iOS after July deploy",
    "acceptanceCriteria": [
      "User can log in on Safari iOS 15+",
      "No JS console errors during auth flow"
    ],
    "tags": ["bug", "mobile", "auth"],
    "completeness_score": 65,
    "agent_ready": false,
    "breakdown": {
      "has_measurable_outcome": false,
      "has_testable_criteria": true,
      "has_constraints": true,
      "no_vague_verbs": true,
      "has_verification_steps": false
    },
    "missing": [
      "has_measurable_outcome",
      "has_verification_steps"
    ]
  }],
  "summary": { "average_score": 65, "agent_ready_count": 0, "total_count": 1 }
}`

export function ForAIAgentsSection() {
  return (
    <section className="bg-[#080808] py-24 border-b border-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left */}
          <div>
            <p className="text-emerald-400 font-mono text-sm mb-3">// for agents and orchestrators</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Built for agent pipelines.
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8">
              Speclint exposes a REST API, MCP server, and machine-readable contract — so you can wire it into any orchestration layer without custom parsing.
            </p>

            <div className="space-y-4 mb-8">
              {[
                {
                  label: "llms.txt compatible",
                  desc: "Speclint publishes a machine-readable API contract at /llms.txt for agent discovery",
                },
                {
                  label: "OpenAPI schema at /openapi.yaml",
                  desc: "Integrate with any orchestration layer in minutes",
                },
                {
                  label: "MCP server available",
                  desc: "Mount Speclint as a tool inside Claude Desktop, Cursor, or any MCP host. Tool name: speclint_lint.",
                },
              ].map((item) => (
                <div key={item.label} className="border-l-2 border-emerald-500/40 pl-4">
                  <div className="text-white text-sm font-semibold font-mono">{item.label}</div>
                  <div className="text-zinc-500 text-sm mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {AGENTS.map((a) => (
                <div key={a.name} className="flex items-center gap-1.5 bg-[#111] border border-[#222] rounded px-3 py-1.5">
                  <span className="text-emerald-400 text-xs">{a.icon}</span>
                  <span className="text-zinc-300 text-xs font-mono">{a.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: API response */}
          <div>
            <div className="bg-[#0d0d0d] border border-[#222] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[#222] bg-[#0a0a0a]">
                <span className="text-zinc-500 text-xs font-mono">POST /api/lint — response</span>
              </div>
              <pre className="p-5 text-xs text-zinc-300 font-mono overflow-x-auto leading-relaxed">
                {API_EXAMPLE}
              </pre>
            </div>
            {/* missing field callout */}
            <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
              <span className="text-emerald-400 text-sm shrink-0">↑</span>
              <div>
                <span className="text-emerald-400 font-mono text-xs font-semibold">missing</span>
                <span className="text-zinc-400 text-xs ml-2">— The missing array tells you exactly what&apos;s wrong — not just the score. Use it to route the spec to /api/rewrite or back to the author.</span>
              </div>
            </div>
            {/* /api/rewrite callout */}
            <div className="mt-4 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-400 font-mono text-xs font-semibold">/api/rewrite</span>
                <span className="bg-emerald-500/10 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-500/20">Lite · Solo · Team</span>
              </div>
              <p className="text-zinc-400 text-xs">Send any spec text directly to the rewrite endpoint — no lint result needed first. Response includes rewritten spec, changes list, new_score, and trajectory.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
