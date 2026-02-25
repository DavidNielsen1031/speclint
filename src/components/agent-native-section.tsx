import Link from "next/link"
import { FileText, Code2, Zap } from "lucide-react"

const agentSurfaces = [
  {
    icon: FileText,
    label: "llms.txt",
    description:
      "LLM-readable manifest. AI agents discover what this API does before calling it.",
    code: "GET https://refinebacklog.com/llms.txt",
    href: "/llms.txt",
    cta: "View llms.txt →",
    external: false,
  },
  {
    icon: Code2,
    label: "OpenAPI Spec",
    description:
      "Machine-readable API spec. Plug into any OpenAPI-compatible tool, agent, or code generator.",
    code: "GET https://refinebacklog.com/openapi.yaml",
    href: "/openapi.yaml",
    cta: "View spec →",
    external: false,
  },
  {
    icon: Zap,
    label: "REST API",
    description:
      "Direct programmatic access. Call from any script, agent, GitHub Action, or CI pipeline with a license key.",
    code: "POST https://refinebacklog.com/api/refine",
    href: "/pricing",
    cta: "Get API key →",
    external: false,
  },
]

export function AgentNativeSection() {
  return (
    <section className="py-20 px-6 border-t border-border/30">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-emerald-400 mb-3">
            Agent-Native
          </span>
          <h2 className="text-3xl font-bold font-space-grotesk mb-3">
            Built to Be Called by AI
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Refine Backlog isn&apos;t just a web app — it&apos;s an API-first service
            designed for agents, scripts, and pipelines. Every surface is
            machine-readable from day one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agentSurfaces.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="rounded-xl border border-border/50 bg-card/50 p-6 flex flex-col gap-4 hover:border-emerald-500/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="font-semibold">{item.label}</span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>

                <code className="text-xs bg-black/30 border border-border/40 rounded-md px-3 py-2 text-emerald-300 font-mono block overflow-x-auto">
                  {item.code}
                </code>

                <Link
                  href={item.href}
                  className="text-sm text-emerald-400 hover:underline mt-auto"
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                >
                  {item.cta}
                </Link>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Need programmatic access?{" "}
          <Link href="/pricing" className="text-emerald-400 hover:underline">
            Get a license key →
          </Link>
        </p>
      </div>
    </section>
  )
}
