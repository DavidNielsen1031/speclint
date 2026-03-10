import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service — Speclint",
  description: "Terms of Service for Speclint. Plain English, no legalese.",
  alternates: {
    canonical: "https://speclint.ai/terms",
  },
}

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl px-6 lg:px-8 py-24">
        <Link href="/" className="text-emerald-400 hover:underline text-sm mb-8 inline-block">
          ← Back to Speclint
        </Link>

        <header className="mb-12">
          <p className="text-sm text-muted-foreground mb-4">Effective February 17, 2026</p>
          <h1 className="text-4xl font-bold font-space-grotesk mb-6 leading-tight">
            Terms of Service
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Plain English terms for using Speclint. Operated by Perpetual Agility LLC.
          </p>
        </header>

        <div className="prose prose-invert prose-emerald max-w-none space-y-6">
          <h2 className="text-2xl font-semibold mt-12 mb-4">What This Service Does</h2>
          <p className="text-muted-foreground leading-relaxed">
            Speclint is an AI-powered spec linting tool that scores and improves specifications for AI coding agents. It is a productivity tool, not a substitute for professional product management judgment.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Acceptable Use</h2>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Do</strong> use Speclint for product backlog items: feature requests, bug reports, user stories, and technical tasks.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Do NOT submit:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Personally identifiable information (PII)</li>
            <li>Protected health information (PHI)</li>
            <li>Financial account numbers</li>
            <li>Passwords, credentials, or API keys</li>
            <li>Classified or government-restricted data</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Do not use the service to generate harmful, illegal, or deceptive content. Do not attempt to circumvent rate limits or abuse the API.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">AI Output Disclaimer</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Refinement output is AI-generated and may contain errors, inaccuracies, or inappropriate suggestions</li>
            <li>You are responsible for reviewing all output before use</li>
            <li>We make no guarantees about sprint outcomes, velocity improvements, or business results</li>
            <li>AI estimates (T-shirt sizes) are suggestions, not commitments</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Payments &amp; Subscriptions</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Paid plans are billed monthly via Stripe</li>
            <li>You can cancel anytime — cancellation takes effect at the end of the current billing period</li>
            <li>No refunds for partial months (standard SaaS policy)</li>
            <li>We reserve the right to change pricing with 30 days notice</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Service Availability</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>We aim for high availability but do not guarantee uptime</li>
            <li>The service depends on third-party providers (Anthropic, Vercel, Upstash)</li>
            <li>We are not liable for downtime caused by third-party outages</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Limitation of Liability</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Speclint is provided &ldquo;as is&rdquo; without warranties of any kind</li>
            <li>We are not liable for any damages arising from use of the service</li>
            <li>Our total liability is limited to the amount you paid us in the 12 months preceding the claim</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Termination</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>We may terminate accounts that violate these terms</li>
            <li>You may stop using the service at any time</li>
            <li>On termination, your subscription data is deleted within 30 days</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These terms are governed by the laws of the State of Minnesota, United States.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            Email: <a href="mailto:support@speclint.ai" className="text-emerald-400 hover:underline">support@speclint.ai</a>
          </p>
        </div>
      </article>
    </main>
  )
}
