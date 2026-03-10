---
title: "Our LLM Was Sabotaging Our Scorer"
date: "2026-03-01"
author: "Speclint Team"
slug: "llm-sabotaging-scorer"
description: "Claude was quietly rewriting imperative acceptance criteria into declarative descriptions — and our regex scorer couldn't find them. Here's what we learned about LLM output drift in AI evaluation pipelines."
---

We shipped a scoring bug that made every spec look worse than it was. The culprit wasn't our scorer — it was Claude. Our AI assistant was quietly rewriting action verbs into passive voice, and our regex couldn't find them. Every spec that passed through Claude before scoring took a penalty it didn't deserve.

It took us longer than it should have to find it, because the symptoms looked like user error.

---

## The Bug That Wasn't Obvious

Specs were consistently scoring a few points lower than expected after going through our AI-assisted reformat flow. Not dramatically — nothing crashed, no error logs, no angry exceptions. Just quietly, persistently lower scores.

We started auditing. We pulled raw user-submitted specs, ran them through scoring, and compared the output against specs that had been reformatted by Claude first. The gap was real and repeatable. Specs touched by Claude scored lower than the originals, even when the reformatted version was objectively cleaner and better structured.

That's when it got interesting.

The specs that came out of Claude *read* better. Shorter sentences, consistent formatting, clearer structure. If you put both versions in front of a human, most would pick the Claude version. Our scorer disagreed, and at first we assumed the scorer was right — maybe the AI-rewritten specs really were dropping quality signals we'd baked into the rubric.

They weren't. The scorer was looking for the wrong thing.

---

## What Claude Was Actually Doing

Here's the transformation that broke everything.

User submits an acceptance criterion like this:

> *Verify the export button appears when a report is ready.*

Claude reformats it for clarity and parallel structure:

> *The export button is visible when a report is ready.*

Same information. Same intent. Completely different linguistic form.

Our scorer used a regex pattern called `ACTION_VERB_RE` to detect well-formed acceptance criteria. It matched imperative verbs — words like *verify*, *confirm*, *ensure*, *check*, *validate*. The theory was sound: good ACs are written as testable imperatives. A criteria that starts with an action verb is specific and verifiable.

The problem is that *"The export button is visible"* is also specific and verifiable. It's just written as a declarative statement rather than an imperative command. Claude, optimizing for readability, preferred the declarative form. Our regex had never seen it.

So the scorer dutifully reported: no action verb detected, score penalty applied. Hundreds of times, silently, for every spec that went through the reformat flow.

---

## Why This Is Harder Than It Sounds

The frustrating part is that nobody was wrong. Claude wasn't making a mistake — declarative acceptance criteria are a perfectly valid format. *"The export button is visible"* is a clear, testable condition. Our regex wasn't wrong either — imperative forms are generally easier to scan and validate at a glance.

The problem was a contract mismatch. Our scorer was written to handle a specific linguistic form. Our AI assistant optimized for something else — readability, parallel structure, natural English — without any awareness that a downstream system had expectations about verb forms.

This is the kind of bug that only exists in AI pipelines. In a traditional pipeline, you control the data transformations. You know what format each stage produces, because you wrote it. When you introduce an LLM as a transformation step, you've added a component that will produce semantically correct output that doesn't necessarily match the syntactic expectations of the next stage in the chain.

Claude doesn't know about `ACTION_VERB_RE`. It doesn't know we care about imperative verbs. It's doing exactly what it was asked to do: clean up the spec. The gap between "clean up the spec" and "preserve syntactic patterns that our scorer depends on" is invisible to the model, and we never thought to close it.

---

## The Fix: DECLARATIVE_AC_RE

Once we understood the problem, the fix was straightforward. We extended our scoring logic to handle both imperative and declarative forms.

Here's a simplified version of what the patterns look like:

```python
import re

# Original: matches imperative action verbs at the start of an AC
ACTION_VERB_RE = re.compile(
    r"^\s*(verify|confirm|ensure|check|validate|assert|test|click|enter|select|submit)\b",
    re.IGNORECASE
)

# New: matches declarative/passive AC forms
DECLARATIVE_AC_RE = re.compile(
    r"^\s*(the\s+\w+(\s+\w+)?\s+(is|are|should be|should appear|becomes?|displays?|shows?|appears?|remains?))\b",
    re.IGNORECASE
)

def has_testable_form(text: str) -> bool:
    return bool(ACTION_VERB_RE.match(text) or DECLARATIVE_AC_RE.match(text))
```

The `DECLARATIVE_AC_RE` pattern catches constructions like:
- *"The export button is visible"*
- *"The error message should appear"*
- *"The form displays a confirmation"*

One regex change. Meaningful score recovery across the board.

We also tightened up the prompt slightly to nudge Claude toward preserving imperative forms when they're already present, but we didn't rely on that alone. Prompt guidance drifts. The regex is the guarantee.

---

## The Broader Lesson for AI Pipelines

If you're building a pipeline where an LLM sits between user input and a downstream evaluator, you have a translation layer. That layer will drift.

The LLM will paraphrase. It will normalize. It will prefer its own stylistic conventions over the ones your evaluator expects. It's not trying to break things — it's doing what language models do. The output will be semantically faithful and syntactically surprising.

Your evaluator needs to handle the realistic output distribution of your LLM, not just the ideal form you designed against.

The practical implication: test your evaluator against LLM-reformatted inputs, not just clean originals. We now have a regression test suite that does exactly this. Each test case takes a raw spec, runs it through Claude reformatting, then scores it. If the score drops more than 5 points from the pre-reformat baseline, the test fails.

LLM output drift is a first-class test concern. Treat it like one.

Here's the pattern we use:

```python
def test_score_stable_after_reformat(raw_spec: str, threshold: int = 5):
    original_score = score_spec(raw_spec)
    reformatted = reformat_with_llm(raw_spec)  # calls Claude
    reformatted_score = score_spec(reformatted)
    
    delta = original_score - reformatted_score
    assert delta <= threshold, (
        f"Score dropped {delta} points after LLM reformat. "
        f"Check evaluator coverage of LLM output forms."
    )
```

When this test fails, it's a signal that either your LLM is producing a form your evaluator doesn't recognize, or the LLM is genuinely degrading something. Either way, it's worth knowing.

---

## What We Now Test For

Beyond the score-stability regression tests, we audit our regex patterns against a sample of Claude-reformatted specs whenever we update the scoring rubric. It takes about ten minutes and has already caught two edge cases we would have missed.

The mental model that helps: think of your LLM as a vendor whose output format you don't fully control. You'd write integration tests for a third-party API. Do the same for your LLM transformation steps.

If you ship an AI pipeline that evaluates structured text — specs, requirements, test cases, contract clauses, whatever — this class of bug is waiting for you. The evaluator was written against examples. The LLM was trained on the full distribution of human language. Those two things will not always agree.

---

Building an AI pipeline that scores or evaluates structured text? Test your evaluator against LLM-reformatted inputs — not just clean originals. See how Speclint handles it in practice at [speclint.ai](https://speclint.ai).

---
*Part of: [[products/speclint/BACKLOG|speclint Backlog]] · [[MEMORY|Memory]]*
