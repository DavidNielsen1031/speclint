---
title: "The Quality Gate That Changed How Our AI Agent Writes Code"
date: 2026-03-01
author: Speclint Team
slug: spec-quality-gate
description: "We stopped upgrading our AI model and started upgrading our specs. Then we added a single gate: if the spec scores below 80, the agent doesn't start. Here's what happened."
---

We spent three months chasing better output from our AI coding agents. We tried a bigger model. We tried longer prompts. We tried chain-of-thought, few-shot examples, and elaborate system messages. Output quality inched up, then back down, then sideways. Then we did something mundane: we added a quality gate to the spec before the agent ever saw it. Implementation rework dropped. Clarification requests during development dropped. And we stopped arguing about which model to use.

The gate is one command: `npx speclint enforce --issue N --repo owner/repo`. If the spec scores below 80, the coding agent doesn't start. That's it. That's the whole thing.

---

## The Problem With "Good Enough" Specs

AI coding agents are remarkably literal. They implement what the spec says — not what you meant, not what you intended, not what seemed obvious in the planning meeting. If the spec says "add a settings page," the agent will build a settings page. It might have no actual settings on it. If the spec says "users should be able to update their profile," you'll get a form that submits to nowhere because the API endpoint wasn't mentioned.

This isn't a model failure. It's a spec failure. The model did exactly what it was told.

What most teams call a "good enough" spec is a spec written well enough that a human could fill in the gaps. Humans are good at gap-filling. They ask questions, infer intent, notice when something doesn't add up. AI agents don't do any of that. They execute.

The mental shift that changed how we work: a spec written for a human colleague is not a spec written for an AI agent. Human specs can be conversational, intentionally loose, deliberately underspecified in places where "you'll figure it out." Agent specs need acceptance criteria. They need edge cases named. They need to say what happens on failure. A spec that gets a human to a 90% correct implementation gets an agent to a 60% correct implementation, because the 30% gap that a human bridges through intuition is a 30% gap the agent drives a truck through.

We were writing human specs and wondering why our agents kept missing the mark.

---

## What Enforce Mode Does

Speclint scores specs across a set of dimensions: clarity, completeness, testability, edge case coverage, and a few others that vary by issue type. Each dimension contributes to a 0–100 composite score. The score isn't a vibe — it's a checklist of what's present and what's missing, weighted by how much each gap typically costs in implementation.

Enforce mode is the operational version of that score:

```bash
npx speclint enforce --issue 42 --repo acme/platform --threshold 80
```

If the score is 80 or above, the command exits 0. If it's below, the command exits 1 and prints the scorer's feedback: which dimensions scored low, why, and what's missing. That exit code is the gate. Anything downstream that depends on it — a CI job, an agent harness, a shell script — sees a failure and stops.

The spec author gets the feedback. They rewrite. They re-run. When it passes, the work continues.

---

## How We Wired It Into Our Agent Harness

We run Claude Code as an agent for implementation work. The harness assembles a prompt from the issue spec, attaches relevant context (schema files, API docs, related code), and kicks off the agent. Before we added the gate, the harness assumed the spec was good. It wasn't always.

Now the harness runs enforce mode first:

```bash
# Fetch and score the spec before assembling the agent prompt
npx speclint enforce --issue $ISSUE_NUMBER --repo $REPO --threshold 80

if [ $? -ne 0 ]; then
  echo "Spec quality below threshold. Fix the spec before running the agent."
  exit 1
fi

# Score passed — assemble prompt and launch agent
```

The agent never sees a failing spec. If a spec is weak, the author finds out before any compute runs, before any agent token burns, before any code review cycle begins. The gate pays for itself the first time it catches a spec that would have cost two hours of implementation review to untangle.

After running this for two months, we stopped asking "why did the agent do this?" and started asking "what did the spec say?" Those are different questions. The first one is frustrating. The second one is productive.

---

## What Actually Changed

We tracked two things before and after adding the gate: clarification requests during active development (Slack messages to the spec author, comments on the PR asking about intent) and implementation rework cycles (PR reviews that sent significant code back for a redo, not style nits).

Before the gate: an average of 2.3 clarification threads per issue, 1.4 rework cycles per issue for agent-driven work.

After the gate: 0.6 clarification threads, 0.4 rework cycles.

We're not claiming the gate produces perfect code. It doesn't. But the direction of change was unambiguous and immediate — it showed up in the first two-week batch after we turned it on. The issues that slipped through with a marginal score (80-83) still produced more questions than the ones that scored 90+. The signal is clean.

The less measurable change: the planning conversation shifted. When spec authors know their spec will be scored before the agent runs, they write differently. They think about edge cases before someone else finds them in review. They specify the failure path. They name the thing that "obviously" shouldn't need to be said. That behavior change — upstream of the tool, in the human writing the spec — is probably worth as much as the gate itself.

---

## Three Ways to Add a Quality Gate

You don't need a full agent harness to use enforce mode. Here are three patterns, from lightest to most integrated:

### 1. CI Pre-Check (Easiest)

Add enforce as a step in your existing CI pipeline. Run it before any implementation work can be merged or assigned:

```yaml
name: Spec Quality Gate

on:
  issues:
    types: [opened, edited]

jobs:
  spec-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check spec quality
        run: |
          npx speclint enforce \
            --issue ${{ github.event.issue.number }} \
            --repo ${{ github.repository }} \
            --threshold 80
        env:
          SPECLINT_API_KEY: ${{ secrets.SPECLINT_API_KEY }}
```

This runs every time an issue is opened or edited. If the spec doesn't pass, the check fails and stays visible on the issue until it does. No tooling changes required. No agent workflow changes required. Engineers see the feedback inline on the issue.

### 2. Agent Harness Middleware (Most Leverage)

If you're running any form of agent automation — a script that kicks off Cursor, Claude Code, Copilot Workspace, or your own agent setup — add enforce as the first step. The agent doesn't start on a failing spec. This is the pattern with the highest leverage because it catches the problem at the exact moment it would become expensive.

```bash
npx speclint enforce --issue $ISSUE --repo $REPO --threshold 80 || exit 1
# your agent launch command here
```

One line. The `|| exit 1` ensures the failure propagates if you're running this inside a larger script.

### 3. Manual CLI Gate (No Automation Required)

Not running agents yet? The CLI gate still works as a personal discipline tool. Run it before you start implementation on any spec you're going to hand off:

```bash
npx speclint enforce --issue 88 --repo myorg/myapp
```

If it passes, start work. If it doesn't, fix the spec first. The 20 minutes you spend clarifying now is the 3 hours of rework you avoid later. This pattern also builds the habit before you need it — so when agents arrive in your workflow, you're already thinking in spec quality terms.

---

## Spec Quality Is the Multiplier

There's a framing mistake worth naming: spec quality isn't a prerequisite that slows you down. It's a multiplier that makes everything downstream faster.

A weak spec handed to a human developer produces mediocre output after several clarification rounds. The same spec handed to an AI agent produces worse output, faster, with no clarification rounds — just code that doesn't do the right thing. The agent's speed amplifies the spec's quality in both directions. A good spec gets implemented quickly and correctly. A bad spec gets implemented quickly and incorrectly.

Upgrading your specs is not a planning tax. It's a force multiplier on every agent run, every implementation cycle, every hour of review time. We tried three different models before we tried this. The gate beat all of them.

---

Add `enforce` mode to your agent workflow in under 10 minutes: [speclint.ai/docs/enforce](https://speclint.ai/docs/enforce)

Not using Speclint yet? Score your first spec free at [speclint.ai](https://speclint.ai).

---
*Part of: [[products/speclint/BACKLOG|speclint Backlog]] · [[MEMORY|Memory]]*
