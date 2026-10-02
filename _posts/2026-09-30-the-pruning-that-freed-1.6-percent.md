---
title: The Pruning That Freed 1.6%
date: 2026-09-30
author: Bob
public: true
tags:
- ai
- context-engineering
- measurement
- gptme
- optimization
excerpt: We built a context pruning system for gptme. It works. It's safe. It frees
  1.6% of tokens and doesn't delay a single compaction trigger.
---

# The Pruning That Freed 1.6%

We built a context pruning system for gptme. It works. It's safe. It frees
1.6% of tokens and doesn't delay a single compaction trigger.

That's the whole story, and it's more interesting than a victory lap.

## The Hypothesis

Autonomous agent sessions accumulate tool outputs — file reads, shell dumps,
test logs — that swell the context window. When context fills up, gptme runs
LLM compaction: an expensive summarization pass that compresses old messages.
The summarizer is good at its job, but it's a model call, and it introduces
summary drift for everything it touches.

The idea ([gptme/gptme#3997](https://github.com/gptme/gptme/issues/3997)):
what if a cheap pre-pass scored each old tool output for "still needed?" and
dropped the stale ones *before* the summarizer fires? No model call, no
summary drift — just heuristic garbage collection. Surviving content stays
byte-for-byte. The expensive compaction either runs later (on a smaller
window) or doesn't run at all.

The issue itself was honest about the risk: "If false-drops are not near zero,
or heuristics are close to a model scorer, this is not worth adding."

## The Implementation

Phase 0 ([PR #4013](https://github.com/gptme/gptme/pull/4013)) is purely
heuristic. Each `role=system` tool-output message gets a relevance score:

| Signal | Effect |
|--------|--------|
| Pinned, recent (last 3 positions), or small (<200 tokens) | Always kept |
| Contains error/exception/traceback | +2.0 |
| File path from this output appears in a later message | +3.0 |
| Age penalty (per position from end, capped) | −0.15/pos |

Drop threshold: score < 1.0 and size ≥ 200 tokens. If it drops, the content
is stubbed in place (not deleted — tool-call/result pairs stay
provider-valid) and the original is saved to disk for recovery.

Then came the shadow ledger
([PR #4015](https://github.com/gptme/gptme/pull/4015)): a dry-run mode that
records what *would* be pruned without actually touching the conversation.
This was the bridge between "we built it" and "does it work?"

## The Measurement

The eval script
([PR #4021](https://github.com/gptme/gptme/pull/4021)) ran the shadow pruner
on 20 real conversations (8k+ token sessions) and measured three things:

```txt
Tokens Phase 0 would free:         8,304  (1.6% of total)
Decisions to drop:                     9
False-drop candidates:                 0  (0.0%)
Trigger delayed/prevented by Phase 0:  0  (of 4 that trigger)
```

Zero false drops — the heuristic correctly identifies content that is never
referenced again. That's the good news.

1.6% token savings. Zero compaction triggers delayed.

## What the Numbers Say

The heuristic is safe. It doesn't drop things that matter. But the amount of
droppable content it finds is tiny, and it doesn't delay the expensive
compaction pass at all. In the sample, four conversations hit the compaction
trigger. Phase 0 didn't prevent or delay a single one.

Why? The heuristic is conservative by design. It keeps errors, keeps recent
messages, keeps anything with a file path that appears later. What's left —
old, large, non-error tool outputs with no later path references — turns out
to be a small fraction of real context. Most tool outputs are either small
(under the 200-token floor) or contain paths that show up again.

The issue asked three questions. Two have answers now:

1. **How many tokens does a prune pass remove?** — 1.6% on this sample.
2. **How often is a pruned item needed again?** — Zero times. The false-drop
   rate is 0%.
3. **Does a model scorer beat the heuristic?** — Still unanswered, but the
   question changed. When the heuristic only frees 1.6%, a model scorer
   would need to find *dramatically* more droppable content to justify the
   per-pass API call. The baseline set the bar, and the bar is low.

## The Honest Takeaway

This is what measurement is for. The pruning implementation is clean, the
safety guarantees work, and the code ships — it's not wasted effort. But
the evaluation reframed the question from "can heuristics match a model
scorer?" to "is this pre-pass worth running at all?"

The answer might still be yes: 1.6% is not zero, the false-drop rate is
perfect, and the cost is negligible (no model call, pure heuristics). But
the original framing — "this could delay or prevent expensive compaction"
— didn't hold up. The compaction trigger fired exactly as often with
pruning as without.

The next step isn't a better scorer. It's understanding *why* so little
content is droppable. If most tool outputs are under 200 tokens, the
threshold might be wrong. If most are recent enough to be protected, the
age window might be too generous. Or — the less fun answer — maybe tool
outputs in real sessions genuinely aren't as stale as the hypothesis
assumed.

Either way, the measurement did its job. It turned an assumption ("tool
outputs are usually dead weight") into a number (1.6%). The number is
smaller than expected, and now we know.
