# Speclint

Deterministic spec linter for AI coding agents. Score GitHub issues 0–100 across 5 dimensions before agents touch them — catch vague requirements, missing acceptance criteria, and untestable specs at the source.

## What it does

Scores issues like:
- "users keep saying login is broken"
- "dashboard loads slow"
- "need dark mode"

Across 5 dimensions:
- **Problem clarity** — Is the problem statement specific and observable?
- **Acceptance criteria** — Are there testable, concrete pass/fail conditions?
- **Scope definition** — Is the work bounded and decomposable?
- **Verification steps** — Can a CI agent prove it's done?
- **Testability** — Are edge cases and failure modes addressed?

Returns a 0–100 score with per-dimension breakdown, agent-readiness flag, and optional AI-powered rewrite suggestions.

## API

### Lint a spec

```bash
curl -X POST https://speclint.ai/api/lint \
  -H "Content-Type: application/json" \
  -d '{"items": ["users keep saying login is broken", "dashboard loads slow"]}'
```

With a license key:

```bash
curl -X POST https://speclint.ai/api/lint \
  -H "Content-Type: application/json" \
  -H "x-license-key: SK-YOUR-KEY" \
  -d '{"items": ["users keep saying login is broken"]}'
```

Example response:

```json
{
  "results": [{
    "item": "users keep saying login is broken",
    "score": 32,
    "agent_ready": false,
    "dimensions": {
      "problem_clarity": 20,
      "acceptance_criteria": 10,
      "scope_definition": 45,
      "verification_steps": 30,
      "testability": 55
    },
    "rewrite_preview": "**Problem:** Users cannot log in to the application..."
  }]
}
```

### Rewrite a spec (Lite tier and above)

```bash
curl -X POST https://speclint.ai/api/rewrite \
  -H "Content-Type: application/json" \
  -H "x-license-key: SK-YOUR-KEY" \
  -d '{
    "item": "dashboard loads slow",
    "target_agent": "claude",
    "rewrite_mode": "full"
  }'
```

Example response:

```json
{
  "rewritten": "**Problem:** The dashboard takes >3s to load on standard connections...",
  "structured": {
    "title": "Optimize dashboard load time to <1s on 4G",
    "problem": "The main dashboard takes 3-8s to load, causing 40% of users to abandon before seeing data.",
    "acceptance_criteria": [
      "Dashboard LCP < 1s on 4G (Lighthouse throttling preset)",
      "First contentful paint < 500ms",
      "All chart data visible within 2s without skeleton loaders"
    ],
    "verification_steps": [
      "Run Lighthouse CI in --preset=perf mode",
      "Assert LCP < 1000ms in CI",
      "Load dashboard with network throttled to 4G in Playwright test"
    ]
  },
  "score_before": 28,
  "score_after": 91,
  "score_delta": 63
}
```

Full OpenAPI spec: [speclint.ai/openapi.yaml](https://speclint.ai/openapi.yaml)

Agent capabilities: [speclint.ai/llms.txt](https://speclint.ai/llms.txt)

## CLI

Install and run from your terminal:

```bash
npx @speclint/cli lint "dashboard loads slow"
```

Or install globally:

```bash
npm install -g @speclint/cli
speclint lint "dashboard loads slow"
speclint rewrite "dashboard loads slow" --key SK-YOUR-KEY
speclint batch issues.txt --key SK-YOUR-KEY
```

Set your key once via env: `export SPECLINT_KEY=SK-YOUR-KEY`

## MCP Server

Use `speclint-mcp` directly in Claude Desktop, Cursor, or any MCP-compatible client:

```json
{
  "mcpServers": {
    "speclint": {
      "command": "npx",
      "args": ["speclint-mcp"],
      "env": { "SPECLINT_KEY": "SK-YOUR-KEY" }
    }
  }
}
```

This gives your AI assistant a `lint_spec` tool it can call automatically before writing code.

## GitHub Action

Lint specs automatically in CI. Trigger on issue open, manual dispatch, or any GitHub event.

```yaml
- uses: DavidNielsen1031/speclint-action@v1
  with:
    items: ${{ github.event.issue.title }}
    write-back: "true"
    gherkin: "true"
    key: ${{ secrets.SPECLINT_KEY }}
```

Posts the score + rewrite suggestions as a comment on the issue.

→ [GitHub Marketplace](https://github.com/marketplace/actions/speclint) · [Full docs + examples](https://github.com/DavidNielsen1031/speclint-action#readme)

## Pricing

| Tier | Price | Items/req | Rewrites/day | Keys |
|------|-------|-----------|--------------|------|
| **Free** | $0 | 5 | 1 preview | 1 |
| **Lite** | $9/mo | 5 | 10 full | 1 |
| **Solo** | $29/mo | 25 | 500 full | 1 |
| **Team** | $79/mo | 50 | 1,000 full | Unlimited |

- **Free:** No signup required. Get a free key to track usage. Rewrite previews are 250 chars.
- **Lite:** Full rewrites (complete rewritten spec + structured fields + score delta). Unlimited lint requests.
- **Solo:** 25 items per batch, 500 rewrites/day, `codebase_context` field for stack-aware scoring.
- **Team:** 50 items per batch, 1,000 rewrites/day, multi-seat. For teams where bad specs cost real money.

Pass your license key via `x-license-key` header, `SPECLINT_KEY` env var, or the MCP server config.

## Links

- [Website](https://speclint.ai)
- [Pricing](https://speclint.ai/pricing)
- [Dashboard](https://speclint.ai/dashboard)
- [npm: @speclint/cli](https://www.npmjs.com/package/@speclint/cli)
- [npm: speclint-mcp](https://www.npmjs.com/package/speclint-mcp)
- [GitHub Action](https://github.com/marketplace/actions/speclint)
