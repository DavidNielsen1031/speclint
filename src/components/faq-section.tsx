'use client'
import { useState } from 'react'

const faqs = [
  {
    q: "What does Speclint actually score?",
    a: "The completeness_score (0–100) evaluates your spec across 5 dimensions: has_measurable_outcome (20pts), has_testable_criteria (25pts), has_constraints (20pts), no_vague_verbs (20pts), and has_verification_steps (15pts). A score of 70 or above means the spec is agent-ready."
  },
  {
    q: "Is this free?",
    a: "The scoring engine, CLI (npx speclint), and GitHub Action are MIT open source — free forever. The cloud API has a free tier: 5 lints/day, 1 rewrite preview per day, no credit card required. Paid plans: Lite ($9/mo) for full rewrites, Solo ($29/mo) for unlimited rewrites + codebase_context, Team ($79/mo) for batch operations + cross-spec context."
  },
  {
    q: "Can't I just use ChatGPT to improve my specs?",
    a: "ChatGPT makes specs sound better. Speclint makes specs work better. The difference is measurable: Speclint scores each spec on 5 defined dimensions, rewrites only the failing parts, then re-scores to prove improvement. ChatGPT doesn't score, can't gate your CI pipeline, and optimizes for coherent prose rather than agent task completion. The other difference: Speclint integrates with GitHub Issues natively. ChatGPT is a conversation. One runs in your workflow; the other interrupts it."
  },
  {
    q: "How do I integrate with GitHub?",
    a: "Add the Speclint GitHub Action to .github/workflows/speclint.yml. It fires on issues.opened and issues.edited — no other configuration needed. Setup takes under 2 minutes."
  },
  {
    q: "Does it work with Cursor, Codex, and Claude Code?",
    a: "Speclint works upstream of any coding agent. It scores and rewrites your spec before any agent sees it. The quality improvement applies regardless of which agent you use — Cursor, Codex, Claude Code, GitHub Copilot, Windsurf, or anything else."
  },
  {
    q: "Can I use it without GitHub?",
    a: "Yes. POST to /api/lint with your spec text as JSON. Works with any CI/CD pipeline, issue tracker (Linear, Jira, Notion), or custom agent orchestrator. There's also /api/rewrite for standalone rewriting without a lint step."
  },
  {
    q: "What's the difference between Lite and Solo?",
    a: "Lite ($9/mo) gives you full rewrite text (not previews) with 10 rewrites/day — the right choice if you want the rewrite capability without the codebase-aware scoring. Solo ($29/mo) adds codebase_context scoring (specs evaluated against your actual stack), agent profiles (rewrites targeted for Cursor vs Codex vs Claude Code), structured output, and unlimited rewrites."
  },
  {
    q: "How is this different from just writing better tickets?",
    a: "Most devs know they should write better tickets. Speclint automates the enforcement: catches what you miss when you're moving fast, gives you a consistent standard across your whole team, integrates directly into the issue workflow, and rewrites the spec for you when you don't have time to figure out what's missing. It's not a training course. It's a linter that runs in CI."
  },
  {
    q: "What is agent_ready?",
    a: "agent_ready: true is the label applied to GitHub issues that score ≥ 70. It's how your coding agent knows a spec is worth picking up. You can configure the threshold in the GitHub Action YAML (min-score: 70 is the default)."
  },
  {
    q: "Is my spec data stored?",
    a: "Specs submitted via the free web tester are not stored. Specs submitted via the API are processed in memory and not logged or retained. See /privacy for the full policy."
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
