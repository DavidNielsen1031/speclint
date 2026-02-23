import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Why Your AI Backlog Tool Doesn't Know You're Building an iOS App — Refine Backlog",
  description: "Generic AI refinement tools treat every team the same. Refine Backlog now auto-detects your project context from AGENTS.md, package.json, README, and more — zero config.",
  keywords: ["AI backlog refinement","project context","iOS app","acceptance criteria","context-aware AI"],
  alternates: {
    canonical: "https://refinebacklog.com/blog/context-aware-refinement",
  },
}

const articleSchema = {"@context":"https://schema.org","@type":"Article","headline":"Why Your AI Backlog Tool Doesn't Know You're Building an iOS App","description":"Generic AI refinement tools treat every team the same. Refine Backlog now auto-detects your project context from AGENTS.md, package.json, README, and more — zero config.","author":{"@type":"Organization","name":"Perpetual Agility LLC"},"publisher":{"@type":"Organization","name":"Perpetual Agility LLC","url":"https://refinebacklog.com"},"datePublished":"2026-02-23","dateModified":"2026-02-23","mainEntityOfPage":"https://refinebacklog.com/blog/context-aware-refinement","image":"https://refinebacklog.com/og-image.png"}

const breadcrumbSchema = {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://refinebacklog.com"},{"@type":"ListItem","position":2,"name":"Blog","item":"https://refinebacklog.com/blog"},{"@type":"ListItem","position":3,"name":"Why Your AI Backlog Tool Doesn't Know You're Building an iOS App","item":"https://refinebacklog.com/blog/context-aware-refinement"}]}

export default function BlogPost() {
  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <article className="mx-auto max-w-3xl px-6 lg:px-8 py-24">
        <Link href="/blog" className="text-emerald-400 hover:underline text-sm mb-8 inline-block">
          ← Back to Blog
        </Link>

        <header className="mb-12">
          <p className="text-sm text-muted-foreground mb-4">February 23, 2026 · 6 min read</p>
          <h1 className="text-4xl font-bold font-space-grotesk mb-6 leading-tight">
            Why Your AI Backlog Tool Doesn&apos;t Know You&apos;re Building an iOS App
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Generic AI refinement treats every team the same. Solo founders get enterprise process. iOS apps get Android assumptions. Here&apos;s why that happens — and how we fixed it.
          </p>
        </header>

        <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-12">
          <p className="text-sm font-semibold text-emerald-400 mb-2">Key Takeaway</p>
          <p className="text-muted-foreground">
            Refine Backlog now auto-detects your project context from files already in your repo — AGENTS.md, package.json, README, Prisma schema, and more. Every refinement is shaped by your actual stack, team size, and constraints. Zero config required.
          </p>
        </div>

        <div className="prose prose-invert prose-emerald max-w-none space-y-6">

          <h2 className="text-2xl font-semibold mt-12 mb-4">The App Icon That Would Have Gotten Rejected</h2>
          <p className="text-muted-foreground leading-relaxed">
            We ran a backlog item through an AI refinement tool: <em>&ldquo;Design app icon.&rdquo;</em> Simple ticket. Should be easy. The AI came back with a polished set of acceptance criteria. One of them: <em>&ldquo;Export final icon as PNG with transparent background.&rdquo;</em>
          </p>
          <p className="text-muted-foreground leading-relaxed">
            That would have gotten the app rejected by Apple. iOS requires a 100% opaque icon background — transparent PNGs fail App Store review. It&apos;s not a minor edge case; it&apos;s day-one iOS knowledge. The AI had none of it, because the AI had no idea this was an iOS app.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            That&apos;s the real problem with generic AI refinement. The output was technically coherent. It just wasn&apos;t yours.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">The Context Problem</h2>
          <p className="text-muted-foreground leading-relaxed">
            Most AI backlog tools treat every team as the same abstract &ldquo;agile team.&rdquo; Feed them a ticket, get back a template. The template is correct in the same way a horoscope is correct — vague enough to apply to anyone, specific enough to feel useful.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Solo founders get acceptance criteria written for designated team members. Mobile teams get assumptions baked for web. B2B enterprise tools get suggestions tuned for consumer apps. It&apos;s not that the AI is wrong. It&apos;s that the AI is answering a different question than the one you actually have.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The gap is context. And the painful irony is that the context already exists — it&apos;s sitting in your repo. Your <code className="text-emerald-400">package.json</code> knows your stack. Your <code className="text-emerald-400">README.md</code> describes what you&apos;re building. Your <code className="text-emerald-400">AGENTS.md</code> or <code className="text-emerald-400">CLAUDE.md</code> describes how your team works. None of it was being used.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The right acceptance criteria for &ldquo;design app icon&rdquo; on an iOS app is not the same as the right acceptance criteria for an Android app, a web app, or a desktop tool. The AI knows how to write acceptance criteria. It just needs to know which kind to write.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">The Fix: Auto-Detection</h2>
          <p className="text-muted-foreground leading-relaxed">
            Refine Backlog now auto-detects your project context before every refinement. No setup. No new files to create. No config to maintain.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            When you run the CLI from your project directory, it reads context files in priority order:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">→</span><span><code className="text-emerald-400">AGENTS.md</code>, <code className="text-emerald-400">CLAUDE.md</code>, <code className="text-emerald-400">CODEX.md</code>, <code className="text-emerald-400">GEMINI.md</code> — AI instruction files</span></li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">→</span><span><code className="text-emerald-400">.github/copilot-instructions.md</code>, <code className="text-emerald-400">.windsurfrules</code> — IDE rules</span></li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">→</span><span><code className="text-emerald-400">llms.txt</code>, <code className="text-emerald-400">README.md</code> — project description</span></li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">→</span><span><code className="text-emerald-400">package.json</code> — name, description, top 8 dependencies</span></li>
            <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">→</span><span><code className="text-emerald-400">prisma/schema.prisma</code> — database schema hint</span></li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            It combines up to 700 characters of context and passes it with every refinement request. If you already pass <code className="text-emerald-400">--context</code>, auto-detection is skipped. You stay in control. The same auto-detection runs in the GitHub Action — every PR refinement is aware of your project. The website now has an optional context field too, for one-off sessions.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">Before and After: Same Ticket, Different Output</h2>
          <p className="text-muted-foreground leading-relaxed">
            Here&apos;s the same ticket refined twice — once with no context, once with iOS project context detected automatically:
          </p>

          <div className="rounded-xl border border-border/50 overflow-hidden mt-6 mb-6">
            <div className="bg-red-500/10 border-b border-border/50 px-4 py-2">
              <p className="text-sm font-semibold text-red-400">❌ Without context (generic AI output)</p>
            </div>
            <div className="px-4 py-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Ticket: &ldquo;Design app icon&rdquo;</p>
              <p className="text-sm text-muted-foreground font-medium mt-3">Acceptance Criteria:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Icon designed at 512×512px minimum resolution</li>
                <li>• Exported as PNG with <span className="text-red-400 font-medium">transparent background</span></li>
                <li>• Approved by design lead before handoff</li>
                <li>• Matches brand color palette</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 overflow-hidden mt-6 mb-6">
            <div className="bg-emerald-500/10 border-b border-border/50 px-4 py-2">
              <p className="text-sm font-semibold text-emerald-400">✅ With auto-detected iOS context</p>
            </div>
            <div className="px-4 py-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Ticket: &ldquo;Design app icon&rdquo;</p>
              <p className="text-sm text-muted-foreground font-medium mt-3">Acceptance Criteria:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Icon provided at all required iOS sizes (1024×1024 App Store, 60pt @2x/@3x, etc.)</li>
                <li>• Background is <span className="text-emerald-400 font-medium">100% opaque (no alpha channel)</span> — required for App Store submission</li>
                <li>• No text, photographs, or UI elements in the icon (App Store guidelines)</li>
                <li>• Reviewed against current App Store Review Guidelines section 4.5.6</li>
                <li>• Tested in Xcode simulator at all target device sizes</li>
              </ul>
            </div>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            Same ticket. Completely different output. The second set of criteria would pass App Store review. The first would not. The only difference is that the AI knew what it was building.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">How It Works</h2>
          <p className="text-muted-foreground leading-relaxed">
            Auto-detection reads files already committed to your repo. There is nothing new to create or configure. If you have a <code className="text-emerald-400">package.json</code>, it reads the name, description, and top dependencies. If you have a <code className="text-emerald-400">README.md</code>, it reads the first 300 characters. If you have <code className="text-emerald-400">AGENTS.md</code>, it starts there.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The context is capped at 700 characters — enough to tell the AI what kind of project this is, what stack you&apos;re on, and how your team works. Not enough to slow the request or bloat the prompt. It logs exactly what it found:
          </p>
          <div className="bg-card/50 rounded-lg border border-border/50 px-4 py-3 font-mono text-sm text-emerald-400/80">
            Auto-detected project context from: package.json, README.md (143 chars)
          </div>
          <p className="text-muted-foreground leading-relaxed mt-4">
            You can pass <code className="text-emerald-400">--no-auto-context</code> to disable it entirely, or <code className="text-emerald-400">--context &quot;your text here&quot;</code> to override with something more specific.
          </p>

          <h2 className="text-2xl font-semibold mt-12 mb-4">One Workflow File. Your Repo. Your Context.</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you&apos;re already using the Refine Backlog GitHub Action, you get this for free on your next run. If you haven&apos;t set it up yet, it&apos;s one workflow file:
          </p>

          <div className="bg-card/50 rounded-lg border border-border/50 px-4 py-4 font-mono text-sm text-muted-foreground overflow-x-auto">
            <p><span className="text-emerald-400">- uses:</span> DavidNielsen1031/refine-backlog-action@v1</p>
            <p className="ml-4"><span className="text-emerald-400">with:</span></p>
            <p className="ml-8"><span className="text-emerald-400">items:</span> <span className="text-yellow-400">{`"$\{{ github.event.issue.title }}"`}</span></p>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            Every issue opened in your repo gets refined with the context of your actual project. No manual prompting. No context to maintain. Your repo already has everything the AI needs — now it reads it.
          </p>

          <div className="mt-12 p-6 rounded-xl bg-card/30 border border-border/50 text-center">
            <p className="text-lg font-semibold mb-2">Ready to try context-aware refinement?</p>
            <p className="text-muted-foreground mb-6">
              Install the GitHub Action or run the CLI from your project directory. Your backlog items will finally sound like they came from your team.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/#refiner">
                <Button className="bg-emerald-500 hover:bg-emerald-600">
                  Try it now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline">
                  See pricing
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </article>
    </main>
  )
}
