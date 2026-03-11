# Speclint

AI-powered spec linter for coding agents. Paste a backlog item, get a score (0–100) across 5 quality dimensions, structured rewrites, and acceptance criteria — so your AI coding agent actually builds the right thing.

## What it does

Takes rough backlog items like:
- "users keep saying login is broken"
- "dashboard loads slow"
- "need dark mode"

And returns:
- **Score (0–100)** across 5 dimensions: problem clarity, acceptance criteria, testability, complexity, measurable outcome
- **Structured rewrite** with a clear problem statement, ACs, size estimate, and tags
- **Changes list** — exactly what was improved and why
- **Score delta** — before vs. after

## Scoring Dimensions

| Dimension | What it checks |
|-----------|---------------|
| Problem Clarity | Is the user problem clearly stated? |
| Acceptance Criteria | Are ACs specific, testable, and complete? |
| Testability | Can an agent verify the outcome with concrete commands? |
| Complexity | Is the scope appropriate for one sprint? |
| Measurable Outcome | Can success be measured? |

## MCP Server

Use directly in Claude Desktop, Cursor, or any MCP-compatible client:

```bash
npx speclint-mcp
```

Or install globally:

```bash
npm install -g speclint-mcp
```

Configure in your MCP client:

```json
{
  "mcpServers": {
    "speclint": {
      "command": "npx",
      "args": ["speclint-mcp"],
      "env": { "SPECLINT_KEY": "your-license-key" }
    }
  }
}
```

Then ask Claude: *"Refine this spec before implementing: add user export to CSV"*

## GitHub Action

Lint specs automatically in CI. Trigger on issue open, PR creation, or manual dispatch:

```yaml
- uses: DavidNielsen1031/speclint-action@v1
  with:
    items: ${{ github.event.issue.title }}
    write-back: "true"
    gherkin: "true"
    key: ${{ secrets.SPECLINT_KEY }}
```

→ [GitHub Marketplace](https://github.com/marketplace/actions/speclint) · [Full docs + examples](https://github.com/DavidNielsen1031/speclint-action#readme)

## Claude Code / Codex / Coding Agents

Add Speclint as a quality gate in your agent workflow. Drop this into your project's `AGENTS.md` or `CLAUDE.md`:

```markdown
## Spec Quality Gate
Before implementing any task or issue, refine it through Speclint:
  npx speclint "the task description"
Only proceed if the completeness score is ≥ 70 (agent-ready).
Use the refined acceptance criteria and verification steps as your implementation checklist.
```

The CLI auto-detects project context from your repo (README, package.json, AGENTS.md, Prisma schema) so refined specs are tailored to your stack.

### Full agent workflow

```bash
# 1. Refine before building
npx speclint "Add Stripe webhook handler for subscription events" --format json

# 2. Pipe a whole backlog file
npx speclint --file backlog.txt --gherkin

# 3. Refine a GitHub issue title before implementation
npx speclint "$(gh issue view 42 --json title -q .title)"
```

### Why this matters for agents

Coding agents execute specs literally. Vague input → wasted tokens and wrong code. Speclint ensures every spec has:
- **Testable acceptance criteria** (action-verb format agents can verify)
- **Verification steps** (concrete commands: `curl`, `npm test`, "open page and check...")
- **Constraints and assumptions** (scope boundaries agents respect)
- **Size estimate** (agents can flag XL specs for decomposition)

A 30-second `npx speclint` call saves 10 minutes of agent thrashing on ambiguous requirements.

## API

### Lint a spec

```bash
curl -X POST https://speclint.ai/api/lint \
  -H "Content-Type: application/json" \
  -H "x-license-key: your-key" \
  -d '{"items": ["users keep saying login is broken", "dashboard loads slow"]}'
```

Legacy endpoint (`/api/refine`) still works — automatically redirects.

### Get a full rewrite

```bash
curl -X POST https://speclint.ai/api/rewrite \
  -H "Content-Type: application/json" \
  -H "x-license-key: your-key" \
  -d '{"spec": "dashboard loads slow", "codebase_context": "React + PostgreSQL"}'
```

Returns the full rewritten spec, a changes list, and score delta. Free tier gets a 250-char preview; Lite+ gets the full rewrite.

Full OpenAPI spec: [speclint.ai/openapi.yaml](https://speclint.ai/openapi.yaml)

Agent capabilities: [speclint.ai/llms.txt](https://speclint.ai/llms.txt)

## Agent Profiles (Solo+)

Target rewrites for your specific coding agent:

```bash
curl -X POST https://speclint.ai/api/rewrite \
  -H "x-license-key: your-key" \
  -d '{"spec": "...", "agent_profile": "cursor"}'
```

Supported: `cursor`, `codex`, `claude-code`

## Codebase Context (Solo+)

Pass your tech stack for stack-aware scoring and rewrites:

```bash
-d '{"spec": "...", "codebase_context": "Next.js 15 + Supabase + TypeScript"}'
```

## Key Info

Check your key tier and usage without burning a lint request:

```bash
curl https://speclint.ai/api/key-info \
  -H "x-license-key: your-key"
```

## Pricing

| Tier | Price | Lints | Rewrites | Notes |
|------|-------|-------|----------|-------|
| **Free** | $0 | 5 req/day · 5 items | 1 preview/day (250-char) | No signup required |
| **Lite** | $9/mo | Unlimited | 10 full/day | Changes list + score delta |
| **Solo** | $29/mo | Unlimited · 25 items | Unlimited | `codebase_context`, agent profiles |
| **Team** | $79/mo | Unlimited · 50 items | Unlimited + chains | Cross-spec context, dashboard, SLA |

Pass your license key via `x-license-key` header or the `SPECLINT_KEY` env var in the MCP server.

→ [Get a free key](https://speclint.ai) · [Pricing details](https://speclint.ai/pricing)

## Links

- [Website](https://speclint.ai)
- [Pricing](https://speclint.ai/pricing)
- [npm package](https://www.npmjs.com/package/speclint-mcp)
- [GitHub Action](https://github.com/marketplace/actions/speclint)

---
*Part of: [[products/speclint/BACKLOG|speclint Backlog]] · [[MEMORY|Memory]]*
