"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

const YAML_SNIPPET = `name: Speclint

on:
  issues:
    types: [opened, edited]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: speclint-ai/speclint-action@v1
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          speclint-api-key: \${{ secrets.SPECLINT_API_KEY }}
          min-score: 70          # block below this threshold
          fail-on-low-score: true`

export function GitHubActionSection() {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(YAML_SNIPPET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="github-action" className="bg-[#0a0a0a] py-24 border-b border-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left: copy */}
          <div>
            <p className="text-emerald-400 font-mono text-sm mb-3">// install in 2 minutes</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Add one YAML file.<br />It runs on every issue.
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-6">
              The GitHub Action fires automatically on <span className="text-white font-mono text-sm">issues.opened</span> and <span className="text-white font-mono text-sm">issues.edited</span>. Fix the spec, get instant feedback — no manual re-run needed.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Scores every spec in < 2s using the /api/lint endpoint",
                "Posts what's missing from the spec as a GitHub comment",
                "Auto re-lints on issue edits — fix the spec, get instant feedback",
                "Labels passing issues with agent_ready",
                "Optionally blocks merging with fail-on-low-score",
                "Works with Cursor, Codex, Claude Code — any agent",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                  <span className="text-emerald-400 mt-0.5 shrink-0">→</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <Button
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                onClick={() => window.location.href = '/get-key'}
              >
                Get API Key
              </Button>
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:border-zinc-500 font-mono text-sm"
                onClick={() => window.open('https://github.com/speclint-ai/speclint-action', '_blank')}
              >
                View on GitHub
              </Button>
            </div>

            {/* CLI callout */}
            <div className="mt-8 bg-[#111] border border-[#222] rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-2 font-mono">// or run from terminal</div>
              <div className="font-mono text-sm text-emerald-300">npx speclint lint --issue 142</div>
            </div>

            {/* OSS callout */}
            <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-500/10 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-500/20">MIT</span>
                <span className="text-white text-sm font-semibold">Open source</span>
              </div>
              <p className="text-zinc-400 text-xs">The scoring engine, CLI, and GitHub Action are open source. Audit the scoring logic at github.com/speclint-ai. Cloud features (rewrite, codebase_context, batch) are paid.</p>
            </div>
          </div>

          {/* Right: YAML */}
          <div className="relative">
            <div className="bg-[#0d0d0d] border border-[#222] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#222] bg-[#0a0a0a]">
                <span className="text-zinc-500 text-xs font-mono">.github/workflows/speclint.yml</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-zinc-500 hover:text-white"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="ml-1.5 text-xs">{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
              <pre className="p-5 text-xs text-zinc-300 font-mono overflow-x-auto leading-relaxed">
                {YAML_SNIPPET}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
