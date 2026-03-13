---
title: "If Your Stories Don't Have Acceptance Criteria, They're Not Stories"
date: 2026-03-13
author: Speclint Team
slug: acceptance-criteria-not-optional
description: "Teams skip acceptance criteria because writing them 'feels like waterfall.' Then they wonder why nothing gets finished on time. The criteria aren't documentation overhead. They're the actual specification."
---

# If Your Stories Don't Have Acceptance Criteria, They're Not Stories

Someone on Reddit put it bluntly: "Implicit acceptance criteria is how you get explicit garbage out."

Nine upvotes. Buried in a thread about why sprints keep failing. Nobody argued with it because there's nothing to argue with. If the developer has to guess what "done" means, the output is going to be whatever they guessed.

This should be obvious. It's not, apparently, because most teams skip acceptance criteria most of the time.

---

## The Waterfall Excuse

The most common defense for missing acceptance criteria: "Writing detailed specs up front is waterfall thinking. We're Agile. We figure it out as we go."

This is a misunderstanding of what Agile actually asks for. Agile doesn't say "don't define what you're building." It says "don't define everything about everything before you start anything." A user story with clear acceptance criteria isn't a 40-page requirements document. It's the minimum information a developer needs to build the right thing on the first try.

The teams that skip ACs aren't being Agile. They're being ambiguous. And ambiguity has a cost that shows up in code review comments, missed sprint commitments, and the quiet frustration of developers who've learned to stop asking clarifying questions because the answers aren't written down anywhere.

"Where can I find REAL user stories?" was a thread with 43 comments. People searching for examples of what a good story looks like. Not because the format is complicated, but because they've never seen one done well in their own org.

---

## What Missing ACs Actually Look Like in Practice

Here's what a developer sees when they open a story without acceptance criteria:

> **Title:** Add export functionality
>
> **Description:** Users need to be able to export their data.

That's it. The developer now has to decide: Export to what format? CSV? JSON? PDF? All three? Which data? All of it, or just what's on the current screen? Does export include filtered results? What about permissions? Can a viewer export admin data? What's the file naming convention? Is there a size limit?

Each of those unanswered questions becomes a coin flip during implementation. The developer picks CSV because that's what they'd want. The PO wanted PDF because the stakeholder mentioned printing. Nobody finds out until the demo.

Now add acceptance criteria:

> **Acceptance Criteria:**
> - Clicking "Export" on the dashboard downloads a CSV file containing all rows matching the current filter
> - File name follows the pattern `export-{dashboard-name}-{YYYY-MM-DD}.csv`
> - Columns match the visible table columns in their displayed order
> - Export respects the user's permission level: viewers see only their own data, admins see all data
> - Files exceeding 10,000 rows trigger a background job with an email notification when complete
> - Export button is disabled with a tooltip during an active background export

Same feature. Zero ambiguity. The developer reads this and starts coding. No Slack messages. No "quick question" meetings. No building the wrong thing.

---

## "But My PO Doesn't Have Time to Write ACs"

They don't have time to NOT write ACs.

The time spent writing five or six acceptance criteria: maybe 10 minutes per story. The time spent unwinding a misbuilt feature because the spec was ambiguous: hours to days. Multiply that across every story in every sprint and the math isn't close.

The deeper issue is that writing ACs forces you to think through what you're actually asking for. If you can't articulate the acceptance criteria, you haven't finished thinking about the feature. That's not a writing problem. It's a thinking problem. And pushing an unfinished thought into sprint planning doesn't make it more finished. It just makes it someone else's problem.

A comment from r/agile: "Team has problems finishing stories at end of sprint." The thread had dozens of responses suggesting process fixes, velocity adjustments, commitment strategies. Almost nobody said the obvious thing: the stories probably weren't specific enough to estimate, so the estimates were fiction, so the sprint was built on fiction.

Fix the input. The output fixes itself.

---

## The Testability Rule

Here's a fast filter for whether acceptance criteria are real or decorative: can someone who didn't write the story read the ACs and build a test case from each one without asking a single question?

If yes, the criteria are doing their job.

If no, they're just sentences that make the ticket look complete. "Should work correctly" isn't a criterion. "Handles edge cases gracefully" isn't a criterion. "User experience is good" is definitely not a criterion.

Real criteria are boring. They specify formats, thresholds, error states, and sequences. They read like a contract because that's what they are. A contract between the person who decided what to build and the person who's going to build it.

---

## Scoring Makes This Mechanical, Not Political

Telling a PO "your stories need better ACs" is a political conversation. It implies criticism. It usually doesn't change behavior because the PO has heard it before and there's no clear bar for "better."

Showing them a score changes the dynamic. "This story scored 42. The breakdown says it's missing testable assertions and has no verification steps. Here's the refined version that scores 95." That's not a judgment call. It's a measurement with a fix attached.

We built Speclint because we needed this for ourselves. Our own specs averaged 65 before we started scoring them. We thought they were fine. The scorer disagreed, and it was right. The implementation quality improved immediately once the specs improved.

The same pattern shows up in every team we've measured. The gap between "seems fine" and "actually buildable" is bigger than anyone expects. And the fix is almost always the same: write down what "done" means in enough detail that a stranger could verify it.

---

## Start With One Sprint

Pick your next sprint's stories. Run them through a quality scorer before sprint planning. See how many score above 70. See how many have measurable outcomes, specified edge cases, and acceptance criteria that could be turned into test cases without a follow-up conversation.

If the average is below 60, you've found the bottleneck. It's not velocity. It's not team capacity. It's input quality.

Acceptance criteria aren't optional. They're the spec.

→ Score your stories before sprint planning: [speclint.ai](https://speclint.ai)
