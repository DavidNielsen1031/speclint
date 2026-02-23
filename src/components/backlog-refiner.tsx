"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Copy, CheckCircle2, AlertCircle, Download, Sparkles, ChevronDown } from "lucide-react"

interface RefinedItem {
  title: string
  problem: string
  acceptanceCriteria: string[]
  estimate: string
  priority: string
  tags: string[]
  assumptions?: string[]
  userStory?: string
}

function toGherkin(ac: string): string {
  const lower = ac.toLowerCase()
  if (lower.startsWith('given') || lower.startsWith('when') || lower.startsWith('then')) {
    return ac
  }
  return `Then ${ac.charAt(0).toLowerCase() + ac.slice(1)}`
}

export function BacklogGroomer() {
  const [input, setInput] = useState("")
  const [context, setContext] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<RefinedItem[]>([])
  const [error, setError] = useState("")
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [showGherkin, setShowGherkin] = useState(false)
  const [useUserStories, setUseUserStories] = useState(false)
  const [useGherkin, setUseGherkin] = useState(false)
  const [showContext, setShowContext] = useState(false)

  const handleGroom = async () => {
    if (!input.trim()) {
      setError("Please enter some backlog items")
      return
    }

    const items = input.split("\n").filter(line => line.trim())
    if (items.length > 5) {
      setError("Free tier limited to 5 items per request")
      return
    }

    setIsLoading(true)
    setError("")
    setResults([])

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => i.replace(/^[-*•]\s*/, "").trim()),
          context: context.trim() || undefined,
          useUserStories,
          useGherkin,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to refine backlog")
      setResults(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const copyMarkdown = async () => {
    const md = results.map(item => {
      const ac = item.acceptanceCriteria.map(c => `  - [ ] ${c}`).join("\n")
      const tags = item.tags.map(t => `\`${t}\``).join(", ")
      const assumptions = item.assumptions && item.assumptions.length > 0
        ? `\n\n**Assumptions/Open Questions:**\n${item.assumptions.map(a => `  - ❓ ${a}`).join("\n")}`
        : ''
      const userStory = item.userStory ? `\n**User Story:** ${item.userStory}` : ''
      return `## ${item.title}\n\n**Problem:** ${item.problem}${userStory}\n\n**Priority:** ${item.priority}\n**Estimate:** ${item.estimate}\n**Tags:** ${tags}\n\n**Acceptance Criteria:**\n${ac}${assumptions}`
    }).join("\n\n---\n\n")

    await navigator.clipboard.writeText(md)
    setCopySuccess("md")
    setTimeout(() => setCopySuccess(null), 2000)
  }

  const downloadCSV = () => {
    const headers = ["Title", "Problem", "Priority", "Estimate", "Tags", "Acceptance Criteria"]
    const rows = results.map(item => [
      `"${item.title}"`,
      `"${item.problem}"`,
      `"${item.priority}"`,
      item.estimate,
      `"${item.tags.join(", ")}"`,
      `"${item.acceptanceCriteria.join("; ")}"`,
    ])
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "refined-backlog.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const getPriorityColor = (priority: string) => {
    if (priority.startsWith("HIGH")) return "bg-red-500/10 text-red-400 border-red-500/20"
    if (priority.startsWith("MEDIUM")) return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
    return "bg-blue-500/10 text-blue-400 border-blue-500/20"
  }

  const getEstimateColor = (est: string) => {
    const colors: Record<string, string> = {
      XS: "bg-green-500/10 text-green-400 border-green-500/20",
      S: "bg-green-500/10 text-green-400 border-green-500/20",
      M: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      L: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      XL: "bg-red-500/10 text-red-400 border-red-500/20",
    }
    return colors[est] || "bg-gray-500/10 text-gray-400 border-gray-500/20"
  }

  return (
    <section id="refiner" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-section-title font-space-grotesk mb-4">
              Refine Your Backlog
            </h2>
            <p className="text-lg text-muted-foreground">
              Paste your messy backlog items below and watch AI transform them into structured, sprint-ready stories.
            </p>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl">Input Your Backlog</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={`Paste backlog items, one per line (max 5 for free tier)

Example:
- add dark mode
- fix login bug on mobile
- improve search performance
- add user onboarding flow
- update API docs`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[180px] resize-none"
                disabled={isLoading}
              />

              <div>
                <button
                  type="button"
                  onClick={() => setShowContext(!showContext)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showContext ? 'rotate-180' : ''}`} />
                  Project context (optional)
                  {context && !showContext && (
                    <span className="ml-1 text-xs text-emerald-400/70">✓ set</span>
                  )}
                </button>
                {showContext && (
                  <Textarea
                    placeholder={`e.g. iOS app, solo founder, React Native + RevenueCat\nor: B2B SaaS, 3-person team, Next.js + Stripe`}
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="mt-2 min-h-[72px] resize-none text-sm"
                    disabled={isLoading}
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useUserStories}
                    onChange={(e) => setUseUserStories(e.target.checked)}
                    className="rounded border-border accent-emerald-500"
                    disabled={isLoading}
                  />
                  Format as User Stories
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useGherkin}
                    onChange={(e) => setUseGherkin(e.target.checked)}
                    className="rounded border-border accent-emerald-500"
                    disabled={isLoading}
                  />
                  Gherkin Acceptance Criteria
                </label>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Free tier: up to 5 items per request
                </div>
                <Button
                  onClick={handleGroom}
                  disabled={isLoading || !input.trim()}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Refine My Backlog
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-8 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-emerald-400">
                    ✨ Refined Results ({results.length} items)
                  </h3>
                  </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyMarkdown}>
                    {copySuccess === "md" ? (
                      <><CheckCircle2 className="mr-2 h-4 w-4" /> Copied!</>
                    ) : (
                      <><Copy className="mr-2 h-4 w-4" /> Copy Markdown</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadCSV}>
                    <Download className="mr-2 h-4 w-4" /> Download CSV
                  </Button>
                </div>
              </div>

              {results.map((item, index) => (
                <Card key={index} className="border-border/50 bg-card/50 backdrop-blur">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <h4 className="font-semibold text-lg">{item.title}</h4>
                      <div className="flex gap-2 flex-shrink-0">
                        <Badge className={getPriorityColor(item.priority)}>
                          Priority: {item.priority.split(" — ")[0].charAt(0) + item.priority.split(" — ")[0].slice(1).toLowerCase()}
                        </Badge>
                        <Badge className={getEstimateColor(item.estimate)}>
                          Effort: {item.estimate}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      <span className="font-medium text-foreground">Problem:</span> {item.problem}
                    </p>

                    {item.userStory && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium text-foreground">User Story:</span> {item.userStory}
                      </p>
                    )}

                    {item.priority.includes(" — ") && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium text-foreground">Priority rationale:</span> {item.priority.split(" — ")[1]}
                      </p>
                    )}

                    <div className="mb-3">
                      <span className="text-sm font-medium">Acceptance Criteria:</span>
                      <ul className="mt-1 space-y-1">
                        {item.acceptanceCriteria.map((ac, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            {ac}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {item.assumptions && item.assumptions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <span className="text-xs font-medium text-muted-foreground/70">Needs clarification:</span>
                        <ul className="mt-1 space-y-0.5">
                          {item.assumptions.map((assumption, i) => (
                            <li key={i} className="text-xs text-muted-foreground/60 flex items-start gap-1.5">
                              <span className="text-yellow-400/60 mt-0.5">?</span>
                              {assumption}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {results.length > 0 && (
                <p className="text-xs text-muted-foreground/70 text-center mt-6 italic">
                  This is a first draft to accelerate refinement. Your team should review, debate, and adjust before sprint planning.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
