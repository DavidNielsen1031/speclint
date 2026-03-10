"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check } from "lucide-react"

const PLANS = [
  {
    name: "Free",
    price: 0,
    per: null,
    description: "Kick the tires. No credit card.",
    features: [
      "5 lints/day",
      "All 5 scoring dimensions",
      "JSON response via /api/lint",
      "1 rewrite preview/day (250-char preview + score delta)",
      "No signup required — or get a free key to track usage",
      "Community support",
    ],
    cta: "Lint your first spec",
    highlighted: false,
  },
  {
    name: "Lite",
    price: 9,
    per: "/mo",
    description: "When you want the full rewrite, not just the preview.",
    features: [
      "Everything in Free",
      "10 full rewrites/day (complete rewritten spec, not preview)",
      "Changes list + score improvement per rewrite",
      "API access with license key",
      "Email support",
    ],
    cta: "Start Lite",
    highlighted: false,
  },
  {
    name: "Solo",
    price: 29,
    per: "/mo",
    description: "For devs running agents daily.",
    features: [
      "Unlimited lints + rewrites",
      "Full rewrite text with structured output",
      "codebase_context scoring (spec scored against your actual stack)",
      "Agent profiles (target rewrites for Cursor, Codex, Claude Code)",
      "25 issues per batch request",
      "Priority support",
    ],
    cta: "Start Solo",
    highlighted: true,
  },
  {
    name: "Team",
    price: 79,
    per: "/mo",
    description: "For teams where bad specs cost real money.",
    features: [
      "Everything in Solo",
      "50 issues per batch request",
      "Rewrite chain (iterative refinement across multiple passes)",
      "Cross-spec context (score specs relative to your existing backlog)",
      "Team analytics dashboard (coming soon)",
      "SLA + dedicated support",
    ],
    cta: "Start Team",
    highlighted: false,
  },
]

export function PricingSection() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleCheckout = async (plan: "lite" | "pro" | "team") => {
    setLoadingPlan(plan)
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await response.json()
      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Failed to create checkout session")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      alert("Something went wrong. Please try again or contact support@speclint.ai")
    } finally {
      setLoadingPlan(null)
    }
  }

  const handleClick = (planName: string) => {
    if (planName === "Free") {
      window.location.href = "/get-key"
    } else if (planName === "Lite") {
      handleCheckout("lite")
    } else if (planName === "Solo") {
      handleCheckout("pro")
    } else {
      handleCheckout("team")
    }
  }

  return (
    <section className="bg-[#0a0a0a] py-24 border-b border-[#1a1a1a]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16">
          <p className="text-emerald-400 font-mono text-sm mb-3">// pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Pay for what you use. Cancel anytime.
          </h2>
          <p className="text-zinc-400 max-w-xl">
            If your team runs coding agents, a bad spec costs more than any of these plans. The math is simple.
          </p>
          <p className="text-zinc-500 text-sm mt-3 font-mono">
            Scoring engine, CLI, and GitHub Action are free and open source. Cloud features are where the paid plans start.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {PLANS.map((plan) => (
            <div key={plan.name} className="flex flex-col">
              {/* Mobile-only "Most Popular" label before Solo card */}
              {plan.name === "Solo" && (
                <div className="block sm:hidden text-center text-emerald-400 text-xs font-mono font-semibold mb-2">
                  ↓ Most Popular
                </div>
              )}
            <div
              className={`relative rounded-lg border p-6 flex flex-col flex-1 ${
                plan.highlighted
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-[#222] bg-[#0f0f0f]"
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-6 bg-emerald-500 text-black text-xs font-semibold px-3">
                  Most Popular
                </Badge>
              )}

              <div className="mb-6">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-white font-mono">${plan.price}</span>
                  {plan.per && <span className="text-zinc-500 text-sm">{plan.per}</span>}
                </div>
                <div className="text-white font-semibold text-lg">{plan.name}</div>
                <div className="text-zinc-500 text-sm mt-1">{plan.description}</div>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full font-semibold ${
                  plan.highlighted
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                    : "bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#333]"
                }`}
                onClick={() => handleClick(plan.name)}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === (plan.name === "Lite" ? "lite" : plan.name === "Solo" ? "pro" : plan.name === "Team" ? "team" : null) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {plan.cta}
              </Button>
            </div>
            </div>
          ))}
        </div>

        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-6 grid sm:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-emerald-400 font-mono text-xl font-bold">$0</div>
            <div className="text-zinc-400 text-sm mt-1">to start today</div>
          </div>
          <div>
            <div className="text-white font-mono text-xl font-bold">≤ 2s</div>
            <div className="text-zinc-400 text-sm mt-1">per lint response</div>
          </div>
          <div>
            <div className="text-white font-mono text-xl font-bold">MIT</div>
            <div className="text-zinc-400 text-sm mt-1">open source scoring engine</div>
          </div>
        </div>

        <div className="mt-8 bg-[#0f0f0f] border border-[#1e1e1e] rounded-lg p-6 text-center">
          <p className="text-white font-semibold mb-2">Buying for a team?</p>
          <p className="text-zinc-400 text-sm mb-4">Team plan includes batch linting, cross-spec context, and an analytics dashboard (coming soon). No per-seat pricing, ever.</p>
          <Button
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
            onClick={() => handleClick("Team")}
          >
            Start Team Trial →
          </Button>
        </div>
      </div>
    </section>
  )
}
