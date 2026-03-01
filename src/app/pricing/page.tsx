import { Metadata } from "next"
import { PricingSection } from "@/components/pricing-section-new"

export const metadata: Metadata = {
  title: "Pricing — Speclint",
  description: "Start free, upgrade when you need more. No hidden fees, cancel anytime. Free tier requires no API key.",
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="pt-24 pb-4 text-center px-6">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-white">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Start free — no signup required. Upgrade when you need more volume.
          No long-term contracts, cancel anytime.
        </p>
      </div>

      <PricingSection />

      <div className="py-16 text-center px-6 border-t border-[#1a1a1a]">
        <p className="text-zinc-500 text-sm">
          Questions about pricing?{" "}
          <a href="mailto:support@speclint.ai" className="text-emerald-400 hover:underline">
            support@speclint.ai
          </a>
        </p>
      </div>
    </main>
  )
}
