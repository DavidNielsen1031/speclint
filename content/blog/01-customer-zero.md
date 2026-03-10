---
title: "We Use Speclint to Build Speclint"
date: 2026-03-01
author: Speclint Team
slug: customer-zero
description: "What happens when your spec linter fails your own specs? We ran every Sprint 5 ticket through the Speclint API before writing a single line of code. Our first batch averaged a 65. By the end, we were hitting 100s first try."
---

# We Use Speclint to Build Speclint

The first time we ran our own specs through Speclint, the average score was 65.

Not a catastrophic failure. But 65 means something specific: missing acceptance criteria structure, vague action verbs, outcomes that sound reasonable but can't actually be tested. The kind of spec a developer reads, nods at, and then wings the implementation anyway.

We're building a tool that tells developers when their specs are bad. And our specs were bad.

That's where Sprint 5 started.

---

## What "Customer Zero" Actually Means

There's a difference between testing your product and building with it. Testing means you check that the thing works. Building with it means you eat the cost of every gap, every confusing error message, every missing feature — because you're blocked until you fix it.

We decided to be Customer Zero in the most literal sense: no spec enters development until it passes our own scorer. Not as a QA ceremony at the end of planning. As the actual gate. You write the spec, you score it, you fix it if it fails. Then you build.

This is harder than it sounds. It means slowing down at exactly the moment your instinct is to move fast. It means accepting that a feature you've been thinking about for two weeks might have a poorly written spec, and that writing a better one is the next task — not a detour.

The payoff, it turns out, is substantial.

---

## Sprint 5 By the Numbers

We tracked every spec that went through the Speclint API during Sprint 5. Here's what the data showed:

- **Average score at sprint start:** 65
- **Average score at sprint end:** 100
- **SL-026** (our first failure): scored 50 on the first pass, 75 on the second pass, 100 on the third
- **Later specs in the same sprint:** hitting 100 on the first submission

The trend is real and it happened fast. By the time we were mid-sprint, we'd internalized what the scorer was looking for. We stopped writing specs that assumed the reader shared our mental model. We started writing specs the way a contract is written: precise enough that ambiguity costs you something.

The first three attempts on SL-026 are the most instructive part of that data.

---

## The First Failure (And What It Taught Us)

SL-026 was a spec for the rate limit error response behavior in the API — specifically, what the response body should contain and how the `Retry-After` header should be formatted.

The first version looked like this:

> **Before — Score: 50**
>
> **Title:** Handle rate limit responses gracefully
>
> **Description:** When a user hits the rate limit, return an appropriate error response that lets them know what happened and when they can retry.
>
> **Acceptance Criteria:**
> - Returns a 429 status code
> - Response includes a helpful message
> - Retry information is included

Read that and you probably feel like you understand what's being asked. That's the trap. "Helpful message" is not testable. "Retry information is included" doesn't specify the format, the field name, the unit of time, or whether it should appear in the header, the body, or both.

A developer reading this spec will make four or five decisions that should have been made by the person who wrote the spec. Those decisions will be inconsistent across developers, inconsistent with the frontend's expectations, and painful to change later.

The scorer flagged: missing field specifications in acceptance criteria, untestable outcome ("helpful message"), vague action verb ("handle"), and no specified behavior for edge cases (what if the header can't be calculated?).

We rewrote it:

> **After — Score: 100**
>
> **Title:** Return structured 429 response with Retry-After header on rate limit
>
> **Description:** When a request exceeds the per-minute rate limit, the API must return a 429 Too Many Requests response with a JSON body and a `Retry-After` header so that clients can implement automatic retry logic without parsing error messages.
>
> **Acceptance Criteria:**
> - Returns HTTP 429 status code
> - Response body contains `{ "error": "rate_limit_exceeded", "message": "...", "retry_after_seconds": <integer> }` where `retry_after_seconds` is the number of full seconds until the limit resets
> - Response includes `Retry-After: <seconds>` header matching the `retry_after_seconds` value in the body
> - If the reset time cannot be calculated, `retry_after_seconds` defaults to 60
> - The `message` field is a human-readable string, max 120 characters, suitable for display in client error UIs

Same feature. Completely different spec. The implementation that came out the other side was cleaner, the frontend integration took half the back-and-forth, and the edge case (uncalculable reset time) was handled before the question ever came up in a code review.

---

## Why This Changes How You Build

When the spec is the quality gate, your team's thinking moves upstream. That sounds like a platitude, but it has a concrete mechanical explanation.

A vague spec creates an implicit decision-making burden that gets distributed across whoever touches the feature. The engineer guesses at edge cases. The reviewer flags things that should have been specced. The tester finds behavior that doesn't match expectations because the expectations were never written down. Each of those moments costs time and creates a slightly different version of the feature than anyone intended.

A precise spec frontloads all of that. The decisions get made once, by the person with the most context, before any code is written. The engineer isn't guessing — they're executing a contract. Code review gets faster because there's a clear spec to evaluate against. Testing gets faster because the acceptance criteria *are* the test cases.

By the end of Sprint 5, our implementation velocity had improved noticeably — not because we wrote code faster, but because we spent less time in the invisible overhead that bad specs generate.

---

## Run Your Worst Spec Through It

You don't need to be building a developer tool to do this. Pick the spec in your current queue that you're least confident about — the one where you've been mentally filling in gaps as you read it. Run it through the Speclint API. See what score comes back.

If it scores well, great. You have confirmation. If it scores in the 50s or 60s, you've found something worth fixing before it costs you three hours of misdirected implementation.

The spec is always cheaper to fix than the code.

→ Run your next spec through Speclint before you write the first line of code: [speclint.ai](https://speclint.ai)

---
*Part of: [[products/speclint/BACKLOG|speclint Backlog]] · [[MEMORY|Memory]]*
