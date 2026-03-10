---
title: "Why Your AI Spec Linter Needs preserve_structure"
date: "2026-03-01"
author: "Speclint Team"
slug: "preserve-structure"
description: "A well-written 80-point spec came back as four 40s. The spec wasn't the problem — our chunking strategy was. Here's what preserve_structure does and when to use it."
---

# Why Your AI Spec Linter Needs preserve_structure

Our best spec scored 40. Four times.

It was a real ticket — 80 points on any honest scoring rubric. Clear title, one-sentence business context, five acceptance criteria that actually described observable outcomes, and a happy path / edge case split that most teams never bother with. A textbook example of what "good" looks like.

Then our API chunked it. Four fragments went in, four scores around 40 came back, and we spent a morning assuming the spec was the problem. It wasn't.

---

## The Spec That Broke the Scorer

The ticket in question was for a payment retry flow. Here's a condensed version of what it contained:

```
Title: Retry failed payment after 3-day grace period

Context: When a subscription payment fails, the system should 
retry automatically after a 3-day grace period before 
suspending the account.

Acceptance Criteria:
1. Given a failed payment, the system waits exactly 72 hours 
   before retrying.
2. Given a successful retry, the account remains active and 
   the user receives a confirmation email.
3. Given a failed retry, the account is suspended and the 
   user receives a suspension notice.
4. Given a suspended account, the user can reactivate by 
   updating their payment method and triggering a manual retry.
5. Given a manual retry triggered within 30 days, no late fee 
   is applied.
```

Five ACs, all testable, all referencing the shared context of "failed payment → 3-day grace period." As a unit, this spec is coherent. Every criterion makes sense because of the framing that precedes it.

We expected a score in the 78–82 range. What we got was four separate scores averaging 41.

The reason: our default chunking strategy split this spec into four fragments before sending it to the model. Fragment one was the title and context. Fragments two through four each contained one or two ACs — stripped of the header that made them meaningful.

From the model's perspective, fragment three looked like this:

```
3. Given a suspended account, the user can reactivate by 
   updating their payment method and triggering a manual retry.
4. Given a manual retry triggered within 30 days, no late fee 
   is applied.
```

Is AC 3 testable in isolation? Barely. What's a "suspended account"? What triggered the suspension? What payment method? Without the spec's context, the model correctly identified that this fragment was incomplete — because it was. It scored accordingly.

---

## Why Chunking Kills Structured Documents

LLM context windows have gotten large, but they're still finite. When you're processing hundreds of specs in a batch, chunking is how you stay within limits and keep costs reasonable. For most content — paragraphs of prose, lists of independent items, long articles — chunking works fine. The meaning of paragraph four doesn't usually depend on the exact wording of paragraph one.

Specs are different. A spec isn't a sequence of independent statements. It's a structured document where every layer references the others:

- The **title** names the feature being specified
- The **context** explains the business rule or user scenario
- The **acceptance criteria** are only meaningful in relation to that context

Split those apart and you don't get smaller specs. You get orphaned fragments that look incomplete because they are. The model has no way to reconstruct the full picture from a fragment, and it doesn't try to — it scores what it sees.

This isn't an AI limitation. It's a structural mismatch between how chunking works and what a spec actually is.

---

## What preserve_structure Does

The `preserve_structure` flag is the fix. When you include it in your API request, Speclint treats the spec as a single logical unit and sends it to the model in one pass — no fragmentation.

```json
{
  "items": [
    "Title: Retry failed payment after 3-day grace period\n\nContext: When a subscription payment fails...\n\nAC 1: Given a failed payment..."
  ],
  "preserve_structure": true
}
```

With `preserve_structure: true`, the model sees the full spec. The context frames the ACs, the ACs reference each other, and the score reflects the document's actual quality — not the quality of an arbitrary fragment.

If a spec is genuinely too long for a single pass (rare, but possible), the API returns an informative error instead of silently chunking and returning a score you can't trust. You get a clear signal that something needs to change, rather than a quietly wrong answer.

---

## When to Use It (And When Not To)

**Use `preserve_structure: true` when:**

- Your spec has a title, context section, and multiple ACs that reference each other
- You're linting a single ticket or a small batch in CI
- Scores feel inexplicably low on specs you know are well-written
- You're comparing before/after quality on a rewrite and need accurate baseline scores

**Skip it (or use it selectively) when:**

- You're running batch jobs across hundreds of short, independent items — the performance overhead adds up fast
- You're scoring standalone acceptance criteria in isolation, not full specs
- Your items are single sentences or simple feature descriptions with no internal structure to preserve

The rule of thumb: if removing the first paragraph of a spec makes the rest meaningless, use `preserve_structure`. If each item stands alone, you probably don't need it.

---

## The Design Principle Behind It

Chunking is a performance optimization. It trades accuracy for throughput when you're processing large volumes of content. That trade-off is reasonable for content where structure doesn't matter — but specs aren't that.

A well-written spec is internally referential. The ACs aren't a list; they're a contract, and the contract only makes sense when the full context is visible. Treating a spec like a bag of independent sentences is the wrong abstraction, and no amount of prompt engineering fixes a wrong abstraction.

`preserve_structure` is the API's way of acknowledging this. It's not a workaround or an edge case feature — it's what you should reach for any time you're processing a document where the parts derive meaning from the whole. That's most specs worth linting.

The broader lesson applies anywhere AI tools process structured content: the chunking strategy needs to understand the structure, not just the token budget. Optimize for throughput at the cost of correctness and you end up with fast, wrong answers. In a linter, a wrong score isn't noise — it's a false signal that misleads every decision downstream.

---

## Fix Your Scores

If you're using Speclint on multi-AC tickets and scores feel off, `preserve_structure: true` is the first thing to check. A single flag in your API call is often the difference between a score that reflects your work and a score that reflects how your request got split up.

Full API docs and examples are at **[speclint.ai/docs](https://speclint.ai/docs)**.

If you've got a spec that scored surprisingly low and you want a second opinion, drop it in the [Speclint playground](https://speclint.ai) — it runs with structure preservation on by default.

---
*Part of: [[products/speclint/BACKLOG|speclint Backlog]] · [[MEMORY|Memory]]*
