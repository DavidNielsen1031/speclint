export function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-[#1a1a1a] py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid sm:grid-cols-3 gap-8 mb-10">
          <div>
            <div className="font-mono font-bold text-white text-lg mb-2">speclint</div>
            <p className="text-zinc-500 text-sm">
              Lint your tickets before agents touch them.
            </p>
          </div>
          <div>
            <div className="text-zinc-400 text-xs uppercase tracking-wider font-mono mb-4">Product</div>
            <ul className="space-y-2">
              {[
                { label: "/api/lint docs", href: "/openapi.yaml" },
                { label: "GitHub Action", href: "https://github.com/speclint-ai/speclint-action" },
                { label: "npx speclint", href: "#" },
                { label: "llms.txt", href: "/llms.txt" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-zinc-500 hover:text-zinc-300 text-sm font-mono transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-zinc-400 text-xs uppercase tracking-wider font-mono mb-4">Legal</div>
            <ul className="space-y-2">
              {[
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "support@speclint.ai", href: "mailto:support@speclint.ai" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-zinc-500 hover:text-zinc-300 text-sm font-mono transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-[#1a1a1a] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-zinc-600 text-xs font-mono">
            © {new Date().getFullYear()} Perpetual Agility LLC — All rights reserved
          </p>
          <p className="text-zinc-700 text-xs font-mono">
            completeness_score: 100 · agent_ready: true
          </p>
        </div>
      </div>
    </footer>
  )
}
