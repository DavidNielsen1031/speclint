"use client"

import { GitPullRequest, Sparkles, Bot } from "lucide-react"

const steps = [
  {
    icon: GitPullRequest,
    number: "1",
    title: "File a GitHub Issue",
    description: "Create an issue the way you normally would. Speclint works with your existing GitHub workflow — no new tools to learn.",
  },
  {
    icon: Sparkles,
    number: "2",
    title: "Speclint Scores It",
    description: "The GitHub Action fires on issues.opened. Speclint scores the spec 0-100, posts the refined version as a comment, and adds the agent_ready label when it passes.",
  },
  {
    icon: Bot,
    number: "3",
    title: "Agent Ships It",
    description: "Your AI coding agent (Cursor, Codex, Claude Code, Copilot) picks up the agent_ready spec and implements it. Good specs ship in one pass.",
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-section-title font-space-grotesk mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Install once. Gate your issues. Ship faster.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center relative">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <step.icon className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center justify-center">
                    {step.number}
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 -right-6 text-muted-foreground/30 text-3xl">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
