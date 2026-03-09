import { HeroSection } from '@/components/hero-section-new'
import { HowItWorksSection } from '@/components/how-it-works-new'
import { ScoreBreakdownSection } from '@/components/score-breakdown-new'
import { RemediationSection } from '@/components/remediation-section-new'
import { SpecTesterSection } from '@/components/spec-tester'
import { CustomerZeroSection } from '@/components/customer-zero-new'
import { AgentPipelineSection } from '@/components/agent-pipeline-new'
import { GitHubActionSection } from '@/components/github-action-new'
import { PricingSection } from '@/components/pricing-section-new'
import { ForAIAgentsSection } from '@/components/for-ai-agents-new'
import { FAQSection } from '@/components/faq-section'
import { Footer } from '@/components/footer-new'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <HeroSection />
      <HowItWorksSection />
      <ScoreBreakdownSection />
      <RemediationSection />
      <SpecTesterSection />
      <CustomerZeroSection />
      <AgentPipelineSection />
      <GitHubActionSection />
      <PricingSection />
      <ForAIAgentsSection />
      <FAQSection />
      <Footer />
    </main>
  )
}
