import { HeroSection } from '@/components/hero-section-new'
import { HowItWorksSection } from '@/components/how-it-works-new'
import { ScoreBreakdownSection } from '@/components/score-breakdown-new'
import { GitHubActionSection } from '@/components/github-action-new'
import { PricingSection } from '@/components/pricing-section-new'
import { ForAIAgentsSection } from '@/components/for-ai-agents-new'
import { Footer } from '@/components/footer-new'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <HeroSection />
      <HowItWorksSection />
      <ScoreBreakdownSection />
      <GitHubActionSection />
      <PricingSection />
      <ForAIAgentsSection />
      <Footer />
    </main>
  )
}
