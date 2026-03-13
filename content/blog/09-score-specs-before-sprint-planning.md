---
title: "Score Your Specs Before Sprint Planning, Not After"
date: 2026-03-13
author: Speclint Team
slug: score-specs-before-sprint-planning
description: "Your CI pipeline catches broken code. Your design system catches inconsistent UI. Nothing catches a bad spec until it's already cost you three days of misdirected implementation. Here's how to fix that."
---

# Score Your Specs Before Sprint Planning, Not After

Your CI pipeline has rules. Merge checks. Lint passes. Type checking. If the code doesn't meet the bar, it doesn't ship.

Your design system has rules. Color tokens. Spacing scales. Component APIs. If the UI doesn't match the system, the review catches it.

Your specs have no rules. A story with a title and nothing else gets the same treatment in Jira as a fully specified story with measurable acceptance criteria, defined edge cases, and verification steps. Both enter sprint planning. Both get estimated. Both get assigned.

One of them costs three hours to build. The other costs three hours to build, plus four hours to rework when the PO says "that's not what I meant," plus two hours of code review comments that are really spec review comments, plus the morale cost of a developer who built exactly what the ticket said and got told it was wrong.

Nobody measures this. Which is weird, because we measure everything else.

---

## Defects Are Spec Failures, Not Code Failures

Look at the bugs from your last sprint. Not the technical ones (null pointer, off-by-one, race condition). The functional ones. "Feature doesn't match expectations." "Missing handling for X scenario." "Behavior is confusing to users."

Those aren't coding mistakes. Those are specification gaps that got deferred to the developer, who made a reasonable guess that happened to be wrong. The bug isn't that the developer wrote bad code. The bug is that nobody wrote down what the code was supposed to do.

A spec that says "handle errors gracefully" will produce a different error handling implementation from every developer on the team. Not because they're inconsistent. Because "gracefully" is not a specification. It's a wish.

Track your functional bugs back to the originating spec. Count the ones where the spec was too vague to build from. That's your spec defect rate, and it's probably higher than your code defect rate.

---

## The Pre-Sprint Quality Gate

The concept is simple: before a story enters sprint planning, it passes a minimum quality bar. Not a human judgment call about whether it "feels ready." A measurable score based on whether the spec contains the information a developer needs to build it.

What the score checks:

- **Action verbs.** "Improve search" is not actionable. "Return ranked results within 200ms for queries up to 50 characters" is.
- **Testable acceptance criteria.** Each criterion should map to a pass/fail check. "Works correctly" fails. "Returns HTTP 200 with JSON body containing `results` array" passes.
- **Measurable outcomes.** If you can't put a number on the outcome, the spec is asking for a subjective judgment during implementation.
- **Edge cases.** What happens when the input is empty? When the user doesn't have permission? When the external service times out? If the spec doesn't say, the developer will decide, and they might decide differently than you would.
- **Verification steps.** How does someone confirm this is done? Not "manual testing" but specific steps with expected results.

A story that covers all five of these will score above 80. A story that covers two of them will score around 50. A story with just a title scores under 20.

---

## What This Looks Like in Practice

**Before: The sprint planning that wastes everyone's time**

PO reads story titles. Team asks "what does this mean?" PO explains verbally. Someone takes notes. Nobody writes it in the ticket. Estimation is based on the verbal explanation, which each person interpreted slightly differently. Sprint starts. Questions start the next day.

**After: The sprint planning that takes 20 minutes**

Stories are scored before the meeting. Anything below 70 gets sent back for refinement. The stories that make it to planning contain enough detail that estimation is straightforward. The team reads the spec, asks one or two clarifying questions about scope, and moves on. The sprint starts and the questions don't come because the answers are in the ticket.

The difference isn't discipline. It's a quality gate on the input.

---

## Automation Makes It Stick

Manual spec review doesn't scale. You can do it for a sprint. Maybe two. By the third sprint, people are busy, the PO is under pressure to get stories into the queue, and the review step gets skipped. "We'll refine it during implementation."

Automated scoring doesn't get tired, doesn't skip stories when the deadline is close, and doesn't have awkward political dynamics with the PO.

If you use GitHub Issues, a GitHub Action can score every new issue and label it `agent-ready` or `needs-refinement` based on the threshold you set. The PO doesn't get criticized. The story gets a score and a set of specific suggestions. Fix the gaps, re-score, move on.

If you use Jira or Linear, the API works the same way. POST the story text, get back a score and breakdown. Wire it into your workflow however makes sense. The point is that the check happens before sprint planning, not after.

---

## The Numbers We've Seen

We scored 487 real GitHub issues from 10 public repositories. Open source projects with active contributors. The raw average score: 51 out of 100.

After running them through automated refinement, the average jumped to 93.5. That's a 42-point gap between "what people write" and "what a developer can build from without guessing."

The most common failure: missing verification steps. 76% of raw specs had no way to check whether the implementation was correct. The second most common: vague outcomes. "Improve," "enhance," "optimize" without any target or measurement.

These aren't obscure specs from abandoned repos. These are active issues that real developers picked up and tried to build from. Every missing verification step is a future argument in code review. Every vague outcome is a feature that gets built, demoed, and sent back for rework.

---

## Start Before Next Sprint

Here's the experiment. Takes five minutes.

1. Pull the top 5 stories from your next sprint's backlog
2. Paste each one into [speclint.ai](https://speclint.ai)
3. Look at the scores and breakdowns
4. Fix the ones below 70 before sprint planning

If all five score above 70, you're doing better than 80% of the teams we've measured. Send us a screenshot. We'd genuinely like to know.

If three of them score below 50, you've identified why your sprints keep running long. The fix isn't better estimation. It's better input.

Quality in, quality out. Garbage in, three days of rework out.

→ Try it free, no account needed: [speclint.ai](https://speclint.ai)
