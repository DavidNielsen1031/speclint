import { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Blog — Refine Backlog",
  description: "Tips, best practices, and insights on backlog refinement, sprint planning, and product management. Learn how AI-powered tools can save your team hours every sprint.",
  alternates: {
    canonical: "https://refinebacklog.com/blog",
  },
}

const posts = [
  {
    slug: "jira-backlog-management-tips",
    title: "Jira Backlog Management: 8 Tips to Keep Your Board Clean",
    description: "Master Jira backlog management with 8 practical tips: hierarchy, bulk editing, epics, cleanup, labels, and API integration strategies.",
    date: "2026-02-28",
    readTime: "7 min read",
    tags: ["Jira","Backlog Refinement"],
  },

  {
    slug: "definition-of-ready-checklist-15-items",
    title: "The 15-Item Definition of Ready Checklist Every Scrum Team Needs",
    description: "A complete Definition of Ready checklist with 15 items covering user stories, acceptance criteria, dependencies, and estimability. Copy this template for your next sprint planning session.",
    date: "2026-02-28",
    readTime: "8 min read",
    tags: ["Definition of Ready","Sprint Planning"],
  },

  {
    slug: "sprint-velocity-how-to-improve",
    title: "Why Your Sprint Velocity Is Inconsistent (And How to Fix It)",
    description: "Sprint velocity fluctuates due to poor backlog refinement, scope creep, and unclear DoD. Learn how to stabilize it with better prep.",
    date: "2026-02-27",
    readTime: "7 min read",
    tags: ["Sprint Planning","Team Velocity"],
  },

  {
    slug: "gherkin-acceptance-criteria-examples",
    title: "Gherkin Acceptance Criteria: Examples and Best Practices for Agile Teams",
    description: "Learn Gherkin acceptance criteria with 10+ real examples using Given/When/Then. Best practices and when to use Gherkin for agile teams.",
    date: "2026-02-26",
    readTime: "7 min read",
    tags: ["Acceptance Criteria","BDD"],
  },

  {
    slug: "story-points-vs-hours",
    title: "Story Points vs Hours: Which Estimation Method Is Actually Better?",
    description: "Compare story points vs hours estimation. Learn which method works best for velocity tracking, billing, and why t-shirt sizing might be your best bet.",
    date: "2026-02-26",
    readTime: "7 min read",
    tags: ["Estimation","Agile"],
  },

  {
    slug: "product-backlog-prioritization-frameworks",
    title: "5 Product Backlog Prioritization Frameworks (And When to Use Each)",
    description: "Compare MoSCoW, RICE, WSJF, Kano, and effort-vs-impact. Learn which product backlog prioritization framework fits your team size and stage.",
    date: "2026-02-25",
    readTime: "7 min read",
    tags: ["Prioritization","Product Management"],
  },

  {
    slug: "how-to-break-down-epics-into-user-stories",
    title: "How to Break Down Epics Into Sprint-Ready User Stories",
    description: "Learn vertical slicing to break down epics into sprint-ready user stories. Real examples and techniques for better backlog refinement.",
    date: "2026-02-24",
    readTime: "7 min read",
    tags: ["User Stories","Agile"],
  },

  {
    slug: "refine-backlog-vs-jira-vs-linear",
    title: "Refine Backlog vs Jira vs Linear: Which Tool Actually Improves Backlog Quality?",
    description: "Jira and Linear organize your backlog. Refine Backlog improves it. An honest comparison of what each tool does — and which one solves the requirement quality problem.",
    date: "2026-02-27",
    readTime: "8 min read",
    tags: ["Comparison", "Jira", "Linear", "AI"],
  },
  {
    slug: "context-aware-refinement",
    title: "Why Your AI Backlog Tool Doesn't Know You're Building an iOS App",
    description: "Generic AI refinement treats every team the same. Refine Backlog now auto-detects your project context from AGENTS.md, package.json, README, and more — zero config.",
    date: "2026-02-23",
    readTime: "6 min read",
    tags: ["AI", "Context", "GitHub Action"],
  },
  {
    slug: "definition-of-ready-checklist",
    title: "Definition of Ready: The Checklist Your Team Needs Before Sprint Planning",
    description: "Learn what Definition of Ready in Scrum is, why it matters more than Definition of Done, and get a practical DoR checklist your team can use today.",
    date: "2026-02-21",
    readTime: "7 min read",
    tags: ["Scrum","Sprint Planning"],
  },

  {
    slug: "how-to-write-acceptance-criteria",
    title: "How to Write Acceptance Criteria That Actually Work",
    description: "Learn to write acceptance criteria that prevent sprint rework. Master Given/When/Then, testability, and avoid 7 common mistakes.",
    date: "2026-02-20",
    readTime: "7 min read",
    tags: ["Acceptance Criteria","User Stories"],
  },

  {
    slug: "backlog-refinement-vs-grooming",
    title: "Backlog Refinement vs Grooming: What's the Difference?",
    description: "Learn why Scrum dropped 'grooming' in 2013 and what backlog refinement really means. Best practices for running refinement sessions.",
    date: "2026-02-20",
    readTime: "7 min read",
    tags: ["Backlog Refinement","Scrum"],
  },

  {
    slug: "backlog-refinement-template",
    title: "Backlog Refinement Template: The Complete Guide for Product Teams",
    description: "A practical backlog refinement template with examples, common mistakes to avoid, and tips for structuring your refinement sessions.",
    date: "2026-02-17",
    readTime: "8 min read",
    tags: ["Backlog Refinement", "Templates"],
  },
  {
    slug: "how-to-write-user-stories-with-ai",
    title: "How to Write User Stories with AI: A Practical Guide",
    description: "Learn how to use AI to write better user stories faster. Practical tips for prompting, reviewing, and refining AI-generated stories.",
    date: "2026-02-17",
    readTime: "7 min read",
    tags: ["AI", "User Stories"],
  },
  {
    slug: "why-sprint-planning-fails",
    title: "Why Your Sprint Planning Fails Before It Starts: The Backlog Refinement Problem",
    description: "Most sprint planning failures trace back to poor backlog refinement. Learn why unclear user stories and messy product backlogs derail your sprints.",
    date: "2026-02-17",
    readTime: "5 min read",
    tags: ["Sprint Planning", "Backlog Refinement"],
  },
  {
    slug: "vague-requirements-to-clear-user-stories",
    title: "From Vague Requirements to Clear User Stories in 30 Seconds",
    description: "See how AI transforms messy, vague requirements into clean user stories with acceptance criteria and INVEST scoring — before and after examples included.",
    date: "2026-02-17",
    readTime: "6 min read",
    tags: ["User Stories", "AI"],
  },
  {
    slug: "hidden-cost-bad-backlog-items",
    title: "The Hidden Cost of Bad Backlog Items: How Unclear Requirements Slow Your Team",
    description: "Unclear backlog items cost teams 10+ hours per sprint in wasted meetings, rework, and context-switching. Learn to quantify the cost and fix it.",
    date: "2026-02-17",
    readTime: "6 min read",
    tags: ["Agile", "Team Velocity"],
  },
  {
    slug: "clean-up-messy-backlog-5-minutes",
    title: "How to Clean Up a Messy Product Backlog in 5 Minutes",
    description: "Your backlog has 200+ items and nobody knows what half of them mean. Here's how to fix that fast.",
    date: "2026-02-16",
    readTime: "5 min read",
    tags: ["Backlog Refinement", "Productivity"],
  },
  {
    slug: "ai-powered-backlog-refinement",
    title: "AI-Powered Backlog Refinement: Save Hours of Sprint Planning",
    description: "How AI is changing the way product teams prepare for sprints — and why manual refinement is becoming obsolete.",
    date: "2026-02-15",
    readTime: "6 min read",
    tags: ["AI", "Sprint Planning"],
  },
  {
    slug: "backlog-refinement-best-practices",
    title: "The Product Manager's Guide to Backlog Refinement Best Practices",
    description: "Everything you need to run effective refinement sessions, from preparation to prioritization frameworks.",
    date: "2026-02-14",
    readTime: "7 min read",
    tags: ["Best Practices", "Product Management"],
  },
]

export default function BlogIndex() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 lg:px-8 py-24">
        <div className="mb-16">
          <Link href="/" className="text-emerald-400 hover:underline text-sm mb-4 inline-block">
            ← Back to Refine Backlog
          </Link>
          <h1 className="text-4xl font-bold font-space-grotesk mb-4">Blog</h1>
          <p className="text-lg text-muted-foreground">
            Practical advice on backlog refinement, sprint planning, and shipping better products.
          </p>
        </div>

        <div className="space-y-6">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="border-border/50 bg-card/30 backdrop-blur hover:bg-card/50 transition-all duration-300 group cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm text-muted-foreground">{post.date}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-sm text-muted-foreground">{post.readTime}</span>
                  </div>
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-emerald-400 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground mb-4">{post.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                    <span className="text-emerald-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read more <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
