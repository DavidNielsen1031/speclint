# Speclint

AI-powered backlog refinement. Paste messy backlog items, get structured user stories with problem statements, acceptance criteria, size estimates, and priority — ready for your sprint.

## What it does

Takes rough backlog items like:
- "users keep saying login is broken"
- "dashboard loads slow"
- "need dark mode"

And returns structured user stories with:
- Clear title and problem statement
- Acceptance criteria
- Priority and size estimate
- Tags and assumptions

## MCP Server

Use directly in Claude Desktop or any MCP-compatible client:

```bash
npx speclint-mcp
```

Or install via npm:

```bash
npm install -g speclint-mcp
```

## GitHub Action

Refine your backlog automatically in CI. Trigger on issue open, manual dispatch, or any GitHub event.

```yaml
- uses: DavidNielsen1031/speclint-action@v1
  with:
    items: ${{ github.event.issue.title }}
    write-back: "true"
    gherkin: "true"
    key: ${{ secrets.SPECLINT_KEY }}
```

→ [GitHub Marketplace](https://github.com/marketplace/actions/speclint) · [Full docs + examples](https://github.com/DavidNielsen1031/speclint-action#readme)

## API

Direct REST API for scripts, automations, and pipelines:

```bash
curl -X POST https://speclint.ai/api/refine \
  -H "Content-Type: application/json" \
  -d '{"items": ["users keep saying login is broken", "dashboard loads slow"]}'
```

Full OpenAPI spec: [speclint.ai/openapi.yaml](https://speclint.ai/openapi.yaml)

Agent capabilities: [speclint.ai/llms.txt](https://speclint.ai/llms.txt)

## Pricing

- **Free:** 5 items/request, 3 requests/day — no signup required
- **Pro ($9/mo):** 25 items/request, unlimited requests
- **Team ($29/mo):** 50 items/request, unlimited requests

Pass your license key via `x-license-key` header or the MCP server config.

## Links

- [Website](https://speclint.ai)
- [Pricing](https://speclint.ai/pricing)
- [npm package](https://www.npmjs.com/package/speclint-mcp)

---
*Part of: [[products/speclint/BACKLOG|speclint Backlog]] · [[MEMORY|Memory]]*
