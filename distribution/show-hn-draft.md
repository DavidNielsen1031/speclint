# Title
Show HN: Speclint — Lint your specs before AI agents build from them

# URL
https://speclint.ai

# Comment (paste this as the first comment)

Speclint is a linter for natural-language specs and product requirements. You give it a spec; it scores it across dimensions like ambiguity, missing acceptance criteria, untestable requirements, and scope creep — then returns structured feedback before you hand it to an AI coding agent.

The premise: AI agents build exactly what the spec says, not what you meant. A vague requirement like "make it fast" or "the user should be able to filter" produces vague code regardless of which model you use. Garbage in, garbage out — but the garbage is invisible until you're three sprints deep. Speclint makes spec quality a measurable, fixable thing.

**Try it free:**
```
npx speclint lint "your spec text here"
```
Or grab a free API key at https://speclint.ai/get-key. There's also a GitHub Action on the Marketplace if you want spec linting in CI.

**Tech:** Next.js, Claude Haiku for scoring, Upstash Redis, Vercel.

**Honest stage:** Early. We have 2 paying users. The scoring rubric is opinionated — it reflects how we think about spec quality, not some objective standard. We're actively refining it and welcome pushback.

**Pricing:** Free tier (limited runs), Solo $29/mo, Team $79/mo.

**Build-in-public angle:** We use Speclint to lint our own specs while building Speclint. It's caught real issues. Write-up here: https://speclint.ai/blog/dogfooding

Looking for feedback on the scoring dimensions, false positives, and whether the CLI UX makes sense. What makes a spec "good enough" for your workflow?
