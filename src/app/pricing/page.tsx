import { Metadata } from "next"
import { PricingSection } from "@/components/pricing-section"
import { FAQSection } from "@/components/faq-section"

export const metadata: Metadata = {
  title: "Pricing — Speclint",
  description: "Start free, upgrade when you need more. No hidden fees, cancel anytime. Free tier requires no API key.",
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="pt-24 pb-4 text-center px-6">
        <h1 className="text-4xl sm:text-5xl font-bold font-space-grotesk tracking-tight mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Start free — no signup required. Upgrade when you need more volume.
          No long-term contracts, cancel anytime.
        </p>
      </div>

      {/* Pricing Cards */}
      <PricingSection />

      {/* FAQ */}
      <FAQSection />

      {/* Bottom CTA */}
      <div className="py-16 text-center px-6 border-t border-border/30">
        <p className="text-muted-foreground text-sm">
          Questions about pricing?{" "}
          <a
            href="mailto:support@speclint.ai"
            className="text-emerald-400 hover:underline"
          >
            support@speclint.ai
          </a>
        </p>
      </div>
    </main>
  )
}
