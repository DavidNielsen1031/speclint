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

### Rewrite a spec (paid tiers)

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

Returns the rewritten spec, structured fields (title, problem, ACs, verification steps), and score delta.

Full OpenAPI spec: [speclint.ai/openapi.yaml](https://speclint.ai/openapi.yaml)

Agent capabilities: [speclint.ai/llms.txt](https://speclint.ai/llms.txt)

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

## MCP Server

Use directly in Claude Desktop, Cursor, or any MCP-compatible client:

```bash
npx @speclint/cli
```

Or install globally:

```bash
npm install -g @speclint/cli
```

## Pricing

| Tier | Price | Items/req | Rewrites/day | Keys |
|------|-------|-----------|--------------|------|
| **Free** | $0 | 5 | 1 preview | 1 |
| **Lite** | $9/mo | 5 | 10 full | 1 |
| **Solo** | $29/mo | 25 | 500 full | 1 |
| **Team** | $79/mo | 50 | 1,000 full | Unlimited |

- **Free:** No signup required. Or get a free key to track your usage.
- **Lite:** Full rewrites instead of 250-char previews. Unlimited lint requests.
- **Solo:** 25 items per batch, 500 rewrites/day. For active dev workflows.
- **Team:** 50 items per batch, 1,000 rewrites/day, multi-seat. For teams where bad specs cost real money.

Pass your license key via `x-license-key` header or the MCP server config.

## Links

- [Website](https://speclint.ai)
- [Pricing](https://speclint.ai/pricing)
- [Dashboard](https://speclint.ai/dashboard)
- [npm: @speclint/cli](https://www.npmjs.com/package/@speclint/cli)
- [npm: speclint-mcp](https://www.npmjs.com/package/speclint-mcp)
- [GitHub Action](https://github.com/marketplace/actions/speclint)
