'use client'
import { useState } from 'react'

const faqs = [
  {
    q: "What is Speclint?",
    a: "Speclint is a spec quality gate for AI-native development teams. It scores every GitHub issue from 0-100 before your AI coding agent (Cursor, Codex, Claude Code, Copilot) sees it. Bad specs produce broken code. Good specs ship in one pass."
  },
  {
    q: "How does Speclint work with AI coding agents?",
    a: "Speclint sits between your issue tracker and your coding agent. When you file a GitHub issue, Speclint scores it for completeness, adds acceptance criteria, and flags gaps. Your agent only gets specs that score above your threshold (we recommend 70+)."
  },
  {
    q: "Is Speclint free?",
    a: "Yes, Speclint has a free tier: 5 items per request, 3 requests per day, no credit card required. Solo ($29/month) and Team ($79/month) plans unlock unlimited requests, larger batch sizes, and advanced features like codebase context."
  },
  {
    q: "Does Speclint work with Cursor, Codex, and Claude Code?",
    a: "Speclint works with any AI coding agent. It refines your specs before the agent touches them, so the quality improvement applies regardless of which agent you use — Cursor, Codex, Claude Code, GitHub Copilot, Windsurf, or any other."
  },
  {
    q: "How do I integrate Speclint with GitHub?",
    a: "Add the Speclint GitHub Action to your repository. It automatically scores new issues when they're opened and adds the completeness score, acceptance criteria, and implementation context as a comment. Setup takes under 2 minutes."
  },
  {
    q: "What does the completeness score measure?",
    a: "The 0-100 score evaluates: problem clarity, acceptance criteria, edge cases, context completeness, and implementation readiness. A score of 70+ means the spec is agent-ready — an AI coding agent can implement it without guessing."
  },
  {
    q: "Can I use Speclint via API without GitHub?",
    a: "Yes, Speclint has a REST API at speclint.ai/api/lint. Send a POST request with your issues as JSON and get back scored, refined specs. Works with any CI/CD pipeline, issue tracker, or custom tooling."
  },
  {
    q: "How is Speclint different from just writing better tickets?",
    a: "Most developers know they should write better specs but don't have time. Speclint automates the quality gate — it catches what you miss, adds acceptance criteria you forgot, and ensures consistency across your entire backlog. It's a linter for specs, not a training course."
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-zinc-800/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-5 flex items-start justify-between gap-4 group"
      >
        <span className="text-zinc-200 font-medium text-sm group-hover:text-white transition-colors">{q}</span>
        <span className="text-zinc-500 text-lg shrink-0 mt-0.5">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <p className="text-zinc-400 text-sm leading-relaxed pb-5 pr-8">{a}</p>
      )}
    </div>
  )
}

export function FAQSection() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
              "@type": "Question",
              "name": faq.q,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.a,
              },
            })),
          }),
        }}
      />
      <section className="py-20 px-6 bg-zinc-950 border-t border-zinc-800/30">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2 font-mono">FAQ</h2>
          <p className="text-zinc-500 text-center text-sm mb-10">Common questions about Speclint</p>
          <div>
            {faqs.map(faq => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
