---
title: "We Ran 180 AI Coding Experiments and Killed Our Own Product"
date: "2026-03-14"
author: "David Nielsen"
slug: "180-experiments-killed-our-product"
description: "We built Speclint to make specs agent-ready. Then we ran 180 controlled experiments and discovered AI coding agents don't need what we were selling. Here's the data, the findings, and why we're sunsetting the product."
---

In February, I built [Speclint](https://speclint.ai) — a tool that lints backlog specs to make them "agent-ready" for AI coding tools like Claude Code, Codex, and Cursor. The pitch was simple: better specs → better AI output.

I was confident enough to open-source it, post it on Show HN, launch an X thread, and submit it to every AI directory I could find.

Then I ran the experiment that killed it.

## The Setup

I wanted to prove that Speclint-refined specs produce better code from AI agents. So I designed a controlled experiment:

- **20 coding tasks** across 4 categories (API endpoints, data processing, infrastructure, integrations)
- **3 spec quality tiers** for each task:
  - **Tier A (Vague):** ~15 words. "Add pagination to GET /api/items."
  - **Tier B (Detailed):** ~160 words. Hand-crafted specs with acceptance criteria, error handling, edge cases.
  - **Tier C (Speclint-refined):** Tier A run through the Speclint API — structured with acceptance criteria, verification steps, assumptions, and priority.
- **3 runs per combination** — 180 total agent runs
- **Claude Sonnet 4** as the coding agent for all runs
- **Same scaffold** for each task (Express.js + TypeScript, strict mode, tests pre-configured)
- **10-minute timeout** per agent

Each agent got a fresh project directory, read the scaffold, implemented the spec, wrote tests, and had to pass `tsc --noEmit` + `npm test` to count as a success. No human intervention.

## The Results

**Tier A (Vague):** 52 success, 7 timeout, 1 failed — **86.7% success rate**

**Tier B (Detailed):** 46 success, 13 timeout, 1 failed — **76.7% success rate**

**Tier C (Speclint):** 45 success, 15 timeout, 0 failed — **75.0% success rate**

Read that again. **The vague specs won.** Not by a little — by 10+ percentage points over detailed specs and Speclint-refined specs.

## What Actually Happened

The most common failure mode wasn't bad code — it was **timeouts.** Agents given detailed specs spent more time:

- Reading and re-reading specific acceptance criteria
- Trying to match exact error codes and response formats
- Debugging edge cases that the spec called out explicitly
- Fighting with pre-existing scaffold code to satisfy constraints

Agents given vague specs just... built the thing. They made reasonable assumptions, picked clean patterns, wrote tests for what they implemented, and finished faster.

The clearest example was **Task 12 (cache layer):**
- Tier A (vague): **3/3 success** — agents built clean, simple caches
- Tier B (detailed): **1/3 success** — 2 agents timed out fighting scaffold complexity
- Tier C (Speclint): **0/3 success** — all 3 timed out trying to satisfy explicit LRU eviction + TTL + invalidation patterns + cache stats endpoints

The detailed spec didn't produce better caches. It produced agents that ran out of time trying to build *exactly the cache the spec described* instead of *a cache that works.*

## The Uncomfortable Implication

Speclint's core value proposition was: **make specs rigorous → AI agents produce better code.**

The data says: **make specs rigorous → AI agents try harder to comply → more timeouts → lower completion rate.**

When agents finish — regardless of spec quality — they almost always produce working code. Only 2 out of 180 runs resulted in actual failures (broken code). The bottleneck isn't spec quality. It's time and codebase complexity.

## What Vague Specs Get Right

After analyzing the results, I realized the winning formula isn't "vague." It's:

**Specific about WHAT and WHERE. Vague about HOW.**

"Add pagination to GET /api/items" tells the agent exactly what to build and where it goes. It doesn't tell the agent to use cursor-based pagination with opaque tokens and base64 encoding — it lets the agent pick the approach that fits the codebase.

Compare that to a Speclint-refined spec that says:

> "Accept cursor query param (opaque string, represents position). Return nextCursor in response (null if no more items). Return hasMore boolean. Invalid cursor returns 400 with helpful error message."

Every one of those requirements is reasonable. But collectively, they constrain the agent into a specific implementation that may not be the simplest path to working code.

## Caveats I Want to Be Honest About

This experiment has real limitations:

1. **10-minute timeout probably over-penalized detailed specs.** With 30 minutes, Tier B and C might have caught up. But in practice, fast iteration matters — if your spec makes agents 2x slower, that's a real cost even if the output is comparable.

2. **Claude Sonnet is extremely good at gap-filling.** It infers sensible defaults from vague prompts. Weaker models (or models 2 years ago) might genuinely benefit from more structure.

3. **All greenfield Express.js scaffolds.** Bug fixes in large codebases, refactors, or migrations might tell a completely different story. Detailed specs might matter more when the context is complex and unfamiliar.

4. **Success = compiles + tests pass.** I didn't measure code quality, maintainability, security, or whether the implementation was actually what a human wanted. A vague spec that produces "working but wrong" code is still a failure — I just wasn't measuring that failure mode.

## Why I'm Sunsetting Speclint

After the experiment, I explored pivoting to "strategic lint" — checking whether specs address WHY something should be built, not just HOW to describe it. I spent a day building a prototype.

Then I asked the hard question: **can a tool that only sees a decontextualized spec actually assess strategic validity?**

The answer is no. A PM's evidence lives in Jira, Productboard, their research docs, their head — not in the spec text box. "No evidence of demand" as a lint warning just makes the PM think "you don't know my users" — and they're right.

So here's where I landed:

- **Structural spec linting is real and works** — but AI agents don't need it
- **Strategic spec linting requires context the tool doesn't have** — fundamental problem, not solvable with better prompts
- **The market for "make specs better for humans"** exists but is hard to monetize against free LLM prompts

The honest thing to do is stop building and share what I learned.

## What I'd Do Differently

1. **Run the experiment BEFORE building the product.** I built for weeks, then validated. Should've been reversed.

2. **Test the value prop with the actual buyer, not the tool.** The question wasn't "does the tool work?" (it does). It was "does the buyer's problem exist?" (unclear) and "does this solve it?" (for AI agents, no).

3. **Be suspicious of metrics that always go up.** Speclint's completeness score went from 45 to 99 during development. It felt like progress. But the score measured structural completeness, not value. High scores felt good and meant nothing.

## What's Still Live

The tool still works. The API is live. The [GitHub Action](https://github.com/speclint-ai/speclint-action) still works. The code is [open source (MIT)](https://github.com/DavidNielsen1031/speclint). If you find structural spec linting useful for human-readable specs, have at it.

I just won't be pretending it makes AI agents better.

## The Data

The full experiment data, methodology, and per-task breakdowns are in the [GitHub repo](https://github.com/DavidNielsen1031/speclint). If you want to reproduce the results or run a similar experiment with different models or timeouts, everything is there.

---

*David Nielsen is a product coach and builder at [Perpetual Agility LLC](https://perpetualagility.com). He builds AI-native products and occasionally kills them when the data says to.*
