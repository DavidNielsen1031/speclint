const AGENTS = [
  { name: "Cursor", icon: "⊕" },
  { name: "Codex", icon: "◈" },
  { name: "Claude Code", icon: "◆" },
  { name: "Devin", icon: "◉" },
  { name: "Copilot", icon: "◇" },
]

const API_EXAMPLE = `POST https://speclint.ai/api/lint
Authorization: Bearer sk_live_...
Content-Type: application/json

{
  "issue": {
    "title": "Add CSV export to reports",
    "body": "Users want to export report data...",
    "labels": ["feature", "reports"]
  }
}

// Response
{
  "completeness_score": 62,
  "agent_ready": false,
  "dimensions": {
    "has_measurable_outcome": 25,
    "has_testable_criteria": 12,
    "has_constraints": 15,
    "no_vague_verbs": 10,
    "has_definition_of_done": 0
  },
  "missing": [
    "has_definition_of_done",
    "has_testable_criteria (partial)"
  ],
  "suggestion": "Add: which report types, max rows, file format..."
}`

export function ForAIAgentsSection() {
  return (
    <section className="bg-[#080808] py-24 border-b border-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left */}
          <div>
            <p className="text-emerald-400 font-mono text-sm mb-3">// built for the agent era</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              The spec quality layer your agent pipeline is missing.
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-8">
              AI coding agents are only as good as what you give them. The model isn&apos;t the bottleneck — the spec is. Speclint sits at the front of your pipeline, before any token is spent, to verify the input is worth running.
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
                  desc: "Mount Speclint as a tool inside Claude Desktop, Cursor, or any MCP host",
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
          </div>
        </div>
      </div>
    </section>
  )
}
