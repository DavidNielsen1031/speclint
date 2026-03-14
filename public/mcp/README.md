# Speclint MCP Server

Use Speclint directly inside Claude Desktop, Cursor, or any MCP-compatible client.
Tell your AI to lint your specs and it calls the API automatically — no copy-paste required.

## What it does

Exposes a single tool: `speclint`

Give it a list of specs or GitHub issues. Get back structured work items with:
- Clean, actionable titles
- Problem statements
- Acceptance criteria (2-4 per item)
- T-shirt size estimates (XS/S/M/L/XL)
- Priorities with rationale
- Tags
- Clarifying assumptions (when needed)
- `completeness_score` (0-100) and `agent_ready` signal for each item

## Quick Start

### Option 1: npx (no install)

```bash
npx speclint-mcp
```

### Option 2: Local build

```bash
cd mcp
npm install
npm run build
node dist/server.js
```

## Claude Desktop Setup

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

**Free tier** (3 requests/day, 5 items):
```json
{
  "mcpServers": {
    "speclint": {
      "command": "npx",
      "args": ["-y", "speclint-mcp"]
    }
  }
}
```

**Pro/Team** (unlimited requests, 25–50 items) — add your license key:
```json
{
  "mcpServers": {
    "speclint": {
      "command": "npx",
      "args": ["-y", "speclint-mcp"],
      "env": {
        "SPECLINT_KEY": "your-license-key-here"
      }
    }
  }
}
```

Get a license key at [speclint.ai/pricing](https://speclint.ai/pricing).

With a license key (Pro/Team tier):

```json
{
  "mcpServers": {
    "speclint": {
      "command": "npx",
      "args": ["speclint-mcp"],
      "env": {
        "REFINE_LICENSE_KEY": "your-license-key-here"
      }
    }
  }
}
```

Restart Claude Desktop. You'll see "speclint" in the tools list.

## Cursor Setup

Add to your Cursor MCP config (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "speclint": {
      "command": "npx",
      "args": ["speclint-mcp"]
    }
  }
}
```

## Usage Examples

Once configured, just talk to your AI naturally:

> "Lint these specs: fix login bug, add CSV export, improve dashboard load time"

> "Take these 10 stories and run them through Speclint. Context: we're building a B2B SaaS for HR teams."

> "Refine this backlog item as a user story with Gherkin acceptance criteria: users need to reset their password"

## Rate Limits

| Tier | Items per request | Price |
|------|-------------------|-------|
| Free | 5 | $0 — no key needed |
| Pro  | 25 | $29/month |
| Team | 50 | $79/month |

Get a license key at [speclint.ai/pricing](https://speclint.ai/pricing)

## API Reference

Full API docs: [speclint.ai/llms.txt](https://speclint.ai/llms.txt)  
OpenAPI spec: [speclint.ai/openapi.yaml](https://speclint.ai/openapi.yaml)
