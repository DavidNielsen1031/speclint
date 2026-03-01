# SL-043 — Dashboard Analytics Discovery Spike

**Date:** 2026-03-01  
**Status:** Discovery only — no implementation decisions made  
**Scope:** What analytics dashboard to build for Speclint, which tier it targets, and how to build it

---

## Current Data Inventory

### What's in Redis Right Now

Two source files define the full Redis schema: `src/lib/kv.ts` (identity/billing) and `src/lib/telemetry.ts` (usage tracking).

#### Identity & Billing Keys (`kv.ts`)

| Key Pattern | Shape | TTL | Notes |
|---|---|---|---|
| `sub:{customerId}` | `{ plan, status, email, licenseKey, subscriptionId }` | None (permanent) | Stripe customer ID as key |
| `license:{licenseKey}` | `{ customerId, plan, status }` | None | Forward lookup from key → customer |
| `email:{email}:customerId` | string (customerId) | None | Reverse lookup email → customer |
| `free:{email}` | `{ plan:'free', email, status, licenseKey }` | None | Free tier registrations |
| `lint:{lintId}` | `{ score, breakdown, title, timestamp, tier, agent_ready }` | 30 days | Individual lint receipts |
| `ratelimit:{ip}:{YYYY-MM-DD}` | integer (count) | 86400s (1 day) | Per-IP daily rate limit |
| `debug:ping` | string | None | Health check artifact, ephemeral |

#### Telemetry Keys (`telemetry.ts`)

| Key Pattern | Shape | TTL | Notes |
|---|---|---|---|
| `telemetry:event:{requestId}` | Full `UsageEvent` JSON | 90 days | Every API call, richest data |
| `telemetry:daily:{YYYY-MM-DD}` | list of requestIds | 90 days | Index of events per day |
| `telemetry:calls:daily:{YYYY-MM-DD}` | integer | 90 days | Call count |
| `telemetry:cost:daily:{YYYY-MM-DD}` | float (USD) | 90 days | Cost accumulator |
| `telemetry:tokens:daily:{YYYY-MM-DD}:input` | integer | 90 days | Input token count |
| `telemetry:tokens:daily:{YYYY-MM-DD}:output` | integer | 90 days | Output token count |
| `telemetry:items:daily:{YYYY-MM-DD}` | integer | 90 days | Backlog items processed |
| `telemetry:cost:monthly:{YYYY-MM}` | float (USD) | 365 days | Monthly cost roll-up |
| `telemetry:calls:monthly:{YYYY-MM}` | integer | 365 days | Monthly call roll-up |
| `telemetry:tier:{tier}:{YYYY-MM-DD}` | integer | 90 days | Calls by tier (free/pro/team) |
| `telemetry:source:{source}:{YYYY-MM-DD}` | integer | 90 days | Calls by source (browser/mcp/api-direct) |

#### UsageEvent Shape (the richest record we have)
```typescript
{
  requestId: string         // UUID
  timestamp: string         // ISO 8601
  model: string             // e.g. 'claude-haiku-4-5'
  tier: string              // free | pro | team
  itemCount: number         // backlog items in this call
  inputTokens: number
  outputTokens: number
  costUsd: number
  latencyMs: number
  retried: boolean
  ip?: string
  source?: 'browser' | 'mcp' | 'api-direct' | 'healthcheck'
  items?: string[]          // raw backlog item titles (truncated)
  endpoint?: 'lint' | 'refine' | 'discover' | 'plan' | 'rewrite'
  scores?: { title, completeness_score, agent_ready }[]
  averageScore?: number
  agentReadyCount?: number
  lintId?: string           // links to lint:* receipt
}
```

### What's Missing / What We'd Need to Start Storing

**Per-license usage history** — Right now there's no link between `telemetry:event:*` and a `licenseKey` or `customerId`. A dashboard for Jake (paying Team customer) would need to filter telemetry by his license. We'd need to add `licenseKey` to `UsageEvent` and store a per-license event index: `telemetry:license:{licenseKey}:daily:{YYYY-MM-DD}` → list of requestIds.

**Team member attribution** — Team tier implies multiple users. We have no concept of "seats" or sub-users. Would need either a seat management model or just email-level attribution within a team org.

**Trend history beyond 90 days** — Telemetry events expire at 90 days. Monthly aggregates survive 365 days but lose per-call detail. Score trend charts over time are fine within 90 days; anything longer needs extended TTLs or a cold store strategy.

**Endpoint-level breakdown** — `endpoint` field exists in UsageEvent but no aggregate key tracks it (e.g., `telemetry:endpoint:lint:daily:{day}`). We'd need to add these to `trackUsage()` to power endpoint-specific charts.

**Persona / tag coverage** — No data on which "persona" (Jake/Maya/Sam buyer type) or which spec category generated each lint. This would require app-level tagging at lint time.

**Pass rate over time** — `agent_ready` boolean is in both `LintReceiptData` and `UsageEvent.scores[]`, but not aggregated. We'd need: `telemetry:agent_ready_count:daily:{day}` and `telemetry:agent_ready_total:daily:{day}`.

**Score histogram** — Individual scores stored in events but no per-day percentile/distribution aggregate. Would need to compute from event list or store bucketed counters.

---

## Dashboard Feature Options (Ranked by Value)

### Feature 1: Score Trend Line
**What it shows:** Average lint score over time (7d / 30d / 90d), with pass/fail rate overlay  
**Who cares:** Jake (firm owner wanting to see team quality improving over time)  
**Effort:** S — data already in `telemetry:event:*`, just needs a read path + chart  
**Data dependency:** Requires linking events to licenseKey. Add `licenseKey` to `UsageEvent`. ✅ low lift  
**Value prop:** "Your specs improved 23 points since onboarding." This is the headline Team ROI story.

---

### Feature 2: Call Volume + Usage Heatmap
**What it shows:** When your team uses Speclint (days of week, time of day), total calls, items linted  
**Who cares:** Jake (usage justification / seat utilization), Maya (knows when team is using it)  
**Effort:** S — aggregate keys already exist, heatmap is a well-supported chart type  
**Data dependency:** None new — `telemetry:calls:daily:*` and event timestamps already present  
**Value prop:** "Your team lints most on Tuesday mornings." Builds sticky habit awareness.

---

### Feature 3: Endpoint Breakdown
**What it shows:** Which Speclint endpoints the team uses (lint vs refine vs discover vs plan vs rewrite), and how much each costs  
**Who cares:** Sam (technical buyer, wants to understand integration ROI); Jake (cost allocation)  
**Effort:** S — add 5 aggregate keys to `trackUsage()`, display as pie/bar chart  
**Data dependency:** Need to add `telemetry:endpoint:{ep}:daily:{day}` counters (not stored today)  
**Value prop:** "Your MCP integration is handling 70% of volume." Validates agent-native adoption.

---

### Feature 4: Per-Item Score History
**What it shows:** For a given spec title (exact match or fuzzy), score trend every time it was linted  
**Who cares:** Maya (spec author — wants to see if her doc is getting better)  
**Effort:** M — requires item-level indexing by title or hash. No such index today. Need to add `telemetry:item:{titleHash}:events` list.  
**Data dependency:** New indexing in `trackUsage()`, search/lookup UI  
**Value prop:** "You've linted 'Sprint Planning Spec' 8 times. It went from 42 → 81."

---

### Feature 5: Team Seat Usage
**What it shows:** Which team members (by email/API key) are using Speclint and how often  
**Who cares:** Jake (seat utilization — are people using what he's paying for?)  
**Effort:** L — requires seat management model. No concept of "team member" exists today.  
**Data dependency:** New data model: org → seats → email/keys. Significant schema work.  
**Value prop:** "3 of 5 seats active this month." Classic SaaS team management feature.

---

### Feature 6: Cost Attribution / ROI Calculator
**What it shows:** Estimated LLM cost per call, monthly total, cost per spec linted  
**Who cares:** Sam (technical buyer evaluating ROI vs rolling their own)  
**Effort:** M — cost data is stored in telemetry, just needs a display layer + "vs building yourself" framing  
**Data dependency:** Existing data is sufficient for cost charts  
**Value prop:** "You linted 847 items this month for $0.32 in API cost."

---

### Feature 7: Agent-Ready Funnel
**What it shows:** Of all items linted, what % cleared the agent-ready gate? How does that change over time?  
**Who cares:** Jake (business outcome — "are my specs actually getting agent-ready?")  
**Effort:** S–M — `agent_ready` is in events but needs daily aggregate counters added  
**Data dependency:** Add `telemetry:agent_ready_count:daily:{day}` and `telemetry:items:daily:{day}` (items already tracked)  
**Value prop:** "68% of your specs are agent-ready, up from 31% last month." The most compelling Team ROI story.

---

### Feature 8: Source Attribution (Browser vs MCP vs API)
**What it shows:** How is the team accessing Speclint? UI, Claude Desktop MCP, or direct API  
**Who cares:** Sam (technical integrator — knows his team's integration is working)  
**Effort:** XS — `telemetry:source:*` keys already exist  
**Data dependency:** None — already tracked  
**Value prop:** Validates "you're getting ROI from the agent-native integration you set up."

---

## Tech Options

### Option A: Next.js Pages in Existing Speclint App
**Approach:** Add `/dashboard` route to `speclint` repo using Next.js server components. Fetch Redis directly in server actions. Charts via Recharts or Tremor (React chart libraries).

**Pros:**
- Zero new infrastructure — same Vercel project, same Redis, same auth flow
- License key auth is already in place — dashboard is just a protected page
- Server components mean no client-side Redis exposure
- Recharts is lightweight (~150KB); Tremor adds pre-built stat card components
- Fastest path to shipped: ~3–5 days for MVP

**Cons:**
- Upstash free tier has 10,000 commands/day limit — dashboard reads add to that budget (each chart = multiple Redis reads)
- No real-time updates without SSE or polling
- Redis isn't optimized for analytics queries — time-range queries require scanning list keys

**Cost:** $0 additional. Upstash free tier is likely sufficient for MVP traffic.

---

### Option B: Separate Dashboard App (Vercel, Shared Redis)
**Approach:** New Next.js app (`dashboard.speclint.ai`) deployed as a separate Vercel project, reading from the same Upstash Redis instance via shared env vars.

**Pros:**
- Clean separation — dashboard has its own deploy pipeline, feature flags, team access
- Could be gated behind a different auth (e.g., magic link email, not license key)
- Easier to open-source or white-label later

**Cons:**
- More infra overhead: new Vercel project, new domain, additional env var management
- Shares same Redis — same command budget concern as Option A
- Doubles cold start surface area
- Auth duplication — need to re-implement license validation in second app

**Cost:** $0 on Vercel hobby/pro. Vercel Pro is $20/mo if David upgrades (already on Pro for main app?). No additional Redis cost.

---

### Option C: Third-Party Analytics (PostHog, Mixpanel) with Custom Events
**Approach:** Instrument the API to fire custom events to PostHog or Mixpanel on every lint call. Dashboard lives in their hosted UI. No custom dashboard code.

**Pros:**
- Zero dashboard UI code to write — PostHog/Mixpanel have rich built-in dashboards
- Funnel analysis, retention, user paths out of the box
- PostHog is open-source and has a generous free tier (1M events/mo)
- Session replay, feature flags, A/B testing all available if wanted later

**Cons:**
- Per-customer dashboard (Jake wants to see *his* data) requires either: (1) creating a PostHog project per customer, or (2) building a filtered view layer anyway → negates the no-code advantage
- Privacy concern: backlog item titles (spec names) leave your infra and go to PostHog
- Mixpanel at scale gets expensive fast ($28/mo+ for meaningful usage)
- Customer-facing dashboard isn't what these tools are designed for — they're for internal product analytics

**Cost:** PostHog free tier ($0 for <1M events/mo). Mixpanel free tier (20M events/mo but limited features).

**Verdict on Option C:** Great for *internal* product analytics (tracking Speclint's own growth, funnel analysis). Not the right tool for a *customer-facing* "your team's usage" dashboard. Use PostHog for internal analytics AND build Option A for customer-facing.

---

## Recommended MVP

### Features for v1
Build these in order:

1. **Score Trend Line** (Feature 1) — the headline ROI story  
2. **Agent-Ready Funnel** (Feature 7) — business outcome framing  
3. **Call Volume + Usage Heatmap** (Feature 2) — usage justification  
4. **Source Attribution** (Feature 8) — validates MCP/API adoption; zero data work needed  

Skip for v1: Per-item score history, Team Seat Usage, Cost Attribution. These are v2.

### Tech Option
**Option A: Next.js pages in existing app.**  
Fast, zero infra cost, auth already exists. Recharts for charts (already likely in deps or trivially added). Tremor for stat cards.

Dashboard route: `/dashboard` — protected by license key middleware (same as existing `/api` auth).

### Data Work Required First (2–3 hours)
Before building the UI, add to `trackUsage()` in `telemetry.ts`:
1. Add `licenseKey` field to `UsageEvent` interface and populate it in the lint/refine route handlers
2. Add `telemetry:license:{licenseKey}:daily:{YYYY-MM-DD}` list push (mirrors the daily list but scoped to customer)
3. Add `telemetry:agent_ready_count:daily:{day}` and `telemetry:agent_ready_total:daily:{day}` counters
4. Add `telemetry:endpoint:{ep}:daily:{day}` counter (optional for v1 but cheap to add now)

### Estimated Build Time
- Data instrumentation: 2–3 hours  
- Redis read functions for dashboard: 2–3 hours  
- Next.js dashboard page + auth gating: 1–2 hours  
- Charts (Recharts): 3–4 hours  
- Polish + responsive layout: 2 hours  

**Total: ~12–15 hours of implementation.** Reasonable for a 2-day sprint.

### Where Dashboard Lives in the Tier Model
The dashboard should be a **Team tier exclusive** feature. This directly justifies the $79/mo price vs $29/mo Pro:

| Feature | Free | Pro | Team |
|---|---|---|---|
| Lint receipts (30 days) | ✅ | ✅ | ✅ |
| API access | ❌ | ✅ | ✅ |
| MCP integration | ❌ | ✅ | ✅ |
| **Analytics Dashboard** | ❌ | ❌ | **✅** |
| Team seat management | ❌ | ❌ | v2 |

---

## Open Questions for David

1. **Who sees the dashboard?** Is it just the license key holder (Jake), or does Team tier mean multiple people login? This determines whether we need a "team member" model or can just use the single license key for auth.

2. **Dashboard URL?** Options: `speclint.ai/dashboard` (simplest), `dashboard.speclint.ai` (cleaner branding but more infra). Which do you prefer?

3. **PostHog for internal analytics?** Even if the customer dashboard is Option A, do you want PostHog instrumented for internal product analytics (your view of all customers, funnels, retention)? I'd recommend yes — it's free and zero-effort to add.

4. **Upstash plan?** Free tier is 10K commands/day. A dashboard with 5 charts × 5 Redis reads per chart = 25 reads per page load. At current traffic this is fine, but worth monitoring. Do you want to upgrade Upstash to the $10/mo Pay-As-You-Go plan proactively?

5. **Score history retention?** Telemetry events expire at 90 days. Do you want to extend this (would need Upstash paid plan for more storage), or is 90 days sufficient for trend charts?

6. **Backlog item title privacy?** Items[] in `UsageEvent` contain raw spec titles. These are stored in Redis today. If we surface them in a dashboard, are there any customer privacy concerns we need to address? (Relevant if considering Option C / PostHog.)

7. **Timeline priority?** Is this a "build it before the next Team customer conversion" or "build it as a pull for Team upgrades from Pro"? Affects whether we instrument data now and ship dashboard later, or sprint the whole thing at once.
