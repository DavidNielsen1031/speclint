---
title: "Stop Being a Backlog Janitor"
date: 2026-03-13
author: Speclint Team
slug: stop-being-a-backlog-janitor
description: "565 people upvoted a post about Product Owners being 'backlog janitors with an MBA.' The backlog quality problem is real, it's everywhere, and nobody talks about fixing the actual input."
---

# Stop Being a Backlog Janitor

A post on r/agile got 565 upvotes last year. The title: "I stopped pretending to be a Product Owner when I realized I was just a backlog janitor with an MBA."

565 people looked at that and thought: yeah, that's me.

The comments were worse. Stories about sprint planning where the PO reads ticket titles out loud because there's nothing else written. Acceptance criteria fields left blank for the third sprint in a row. Teams estimating work based on vibes because the spec doesn't contain enough information to estimate from.

One comment that stuck with us: "Stories have a title and no body. Acceptance Criteria? What's that?"

That's not a process failure. That's the default state of most backlogs.

---

## The Real Problem Isn't Discipline

The standard advice for bad backlogs is "refinement." Have more meetings. Get the team together. Talk through the stories. Write better acceptance criteria.

This advice is correct and also mostly useless, because it treats spec quality as a willpower problem. If the PO just tried harder, the stories would be better. If the team just committed to refinement, the gaps would get caught.

But the PO is also handling stakeholder requests, roadmap pressure, sprint reviews, and the twelve other things the Scrum Guide says they're responsible for. Writing precise acceptance criteria takes time and mental energy that competes with everything else on their plate.

The result is predictable. Stories go into sprint with just enough detail that everyone can pretend they understand what's being asked. Implementation starts. Questions come up. The answers aren't in the spec because the spec is three bullet points. The developer makes a judgment call. The judgment call is wrong. The code review catches it two days later.

The spec was always the bottleneck. Nobody measured it.

---

## What "Vague" Actually Costs

Here's a spec that looks fine at first read:

> **Title:** Improve search functionality
>
> **Description:** Make the search feature work better for users who can't find what they're looking for.
>
> **Acceptance Criteria:**
> - Search returns relevant results
> - Performance is acceptable
> - Users can filter results

This spec will pass sprint planning. Nobody will flag it. The developer assigned to it will open the ticket, read it, and then spend 30 minutes figuring out what "relevant" means in this context. They'll decide on their own what "acceptable performance" is. They'll pick filter categories without checking with the PO because the PO is in another meeting.

Three days later, the feature works. It doesn't match what the PO wanted. The PO didn't know what they wanted because they never had to specify it.

Run that same spec through a quality scorer and you get a 35. Missing measurable outcomes. Vague action verbs. No edge cases. No verification steps. The number isn't the point. The point is that every gap in the spec becomes a decision someone else has to make during implementation.

Count the implicit decisions in the spec above. "Relevant results" is at least three decisions (ranking algorithm, relevance threshold, handling of zero results). "Acceptable performance" is two more (latency target, dataset size). "Filter results" is another three (which fields, UI placement, multi-select behavior).

That's eight decisions that should have been made during planning, deferred to whoever picks up the ticket.

---

## Measuring Spec Quality Changes the Conversation

The moment you put a number on spec quality, the conversation shifts. Instead of arguing about whether a story is "ready" based on gut feel, you have a score that points at specific gaps.

"This story scored 45 because it has no measurable outcome and the acceptance criteria use passive voice with no testable assertions."

That's not a subjective opinion. It's a measurement. And it's something the PO can fix in five minutes before the story enters sprint, instead of something the developer discovers three days into implementation.

We've watched this pattern across our own sprint planning. Before scoring: specs averaged 65, and we thought they were fine. After scoring: the same specs hit 100 on the second pass, and the implementation time dropped because we weren't guessing at intent.

The data from our autoresearch work backs this up. We scored 487 real GitHub issues from public repos. The average raw score was 51. After refinement, the average jumped to 93.5. The gap between "what people write" and "what's actually buildable" is 42 points.

---

## The Spec Is Cheaper to Fix Than the Code

Every minute spent improving a spec before development saves somewhere between five and twenty minutes during implementation and review. That's not a made-up ratio. It's what we measured building our own product.

When the spec is precise, the developer isn't guessing. Code review is faster because there's something concrete to check against. QA has test cases because the acceptance criteria are the test cases. The sprint finishes on time because nobody spent two days building the wrong thing.

The backlog janitor problem isn't about POs being lazy. It's about not having a feedback loop on input quality. Your CI pipeline won't let you ship broken code. Your design system won't let you ship inconsistent UI. But nothing stops you from shipping a three-word acceptance criterion into a sprint.

Until you measure it.

---

## Try It On Your Worst Ticket

Find the ticket in your current sprint that everyone kind of understands but nobody could implement from the description alone. The one with the blank acceptance criteria field, or the one where the criteria are things like "works correctly" and "handles edge cases."

Paste it into [speclint.ai](https://speclint.ai). See what comes back.

If it scores above 70, you're ahead of most teams we've measured. If it scores below 50, you've found the reason your last sprint went sideways.

The backlog doesn't need another refinement meeting. It needs a quality gate.

→ Score your specs before sprint planning: [speclint.ai](https://speclint.ai)
