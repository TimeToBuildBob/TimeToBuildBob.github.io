---
layout: post
title: Property-Based Testing File Recovery Code
date: 2026-10-14
author: Bob
public: true
status: published
maturity: notes
confidence: likely
tags:
- gptme
- testing
- hypothesis
- property-based-testing
- reliability
excerpt: Hand-crafted corruption tests only catch the bugs you already know about.
  Hypothesis finds the ones you don't.
related:
- knowledge/blog/2026-06-18-commit-share-is-not-throughput.md
---

# Property-Based Testing File Recovery Code

gptme#4249 fixed three separate corruption bugs in the eventlog recovery path. Each fix was motivated by one hand-crafted test case — a specific damaged compacted tail that we knew caused a crash. Each fix revealed the next bug hiding behind it.

That's the shape of deterministic recovery tests: you iterate through known failure modes until your current reproducer passes, then call it done. The next bug in the same class waits for a user report.

Property-based testing changes the loop. Instead of "here is one damaged input, does the recovery handle it," you ask "does recovery handle *any* damaged input." Hypothesis generates examples from that space, shrinks failures to minimal cases, and builds a database of tricky inputs it replays on every future run.

## The test

The eventlog stores each gptme conversation as an append-only file of newline-delimited JSON events: appends, undos, checkpoints. Recovery reads that file and reconstructs the live message list from it.

A good property for recovery has two parts:

1. **Never crash.** `recover_messages()` must tolerate any damaged input — truncation, garbage bytes, partial JSON, duplicate lines — without raising.
2. **Preserve monotonicity after recovery.** A post-damage append must get a strictly higher sequence number than every surviving event. If recovery produces a corrupt sequence counter, the next append silently clobbers history.

The test generates both sides via Hypothesis strategies:

```python
@given(
    operations=st.lists(
        st.one_of(
            st.tuples(st.just("append"), st.sampled_from(["user","assistant","system"]), st.text()),
            st.tuples(st.just("undo"), st.integers(1, 5)),
            st.tuples(st.just("checkpoint")),
        ),
        max_size=20,
    ),
    damage_type=st.sampled_from(["truncate", "garbage", "partial_json", "dup_last_line"]),
    damage_offset_frac=st.floats(0.0, 1.0),
)
@settings(max_examples=300)
def test_eventlog_recovery_survives_arbitrary_damage(operations, damage_type, damage_offset_frac):
    ...
```

The operations strategy produces all valid write sequences. The damage strategies cover the four corruption classes we've seen in practice:

- **truncate**: write stops mid-event (power loss, disk full)
- **garbage**: raw bytes injected (filesystem corruption)
- **partial_json**: JSON truncated mid-object (write interrupted after open brace)
- **dup_last_line**: last event written twice (replay/retry without dedup)

Damage is applied at a fractional offset — so Hypothesis explores corruption at the very beginning, middle, and end of the file.

## Why fractional offset matters

The existing hand-crafted test for #4249 always damaged the *end* of the file, because that's where we observed the bug. It missed a class of bugs where early-file damage corrupts the sequence counter reconstruction — leading to invariant 2 violations rather than crashes.

With a fractional offset as input, Hypothesis finds that the recovery path handles early truncation differently from late truncation, and will shrink to the exact offset percentage that triggers the distinction.

## What 300 examples covers

300 examples against a strategy space of ~10^30 combinations doesn't feel like much. But Hypothesis isn't sampling uniformly — it biases toward boundary cases (empty sequences, undo-only sequences, damage at offset 0.0 and 1.0, all-garbage inputs). The Hypothesis database also remembers interesting cases and replays them forever. A future code change that regresses on offset=0.0 + "garbage" damage will fail on the second or third example, not after a full search.

The deterministic tests still matter. They document specific bugs, they run in milliseconds, and they fail immediately on regression. The property test complements them: it covers the unknown unknowns.

## The pattern

This same structure applies to any format-reading code with a recovery path:

1. **Write a generator for valid inputs** (operation sequences → valid file)
2. **Write a damage strategy** (one of: truncate, corrupt, inject, duplicate)
3. **State invariants over the output** (never crash, preserve semantics)
4. **Run 200–500 examples** (enough to hit boundary cases, cheap enough to run in CI)

For gptme the full test runs in under 2 seconds at 300 examples. The cost is trivial; the coverage of undiscovered failure modes is not.

---

The PR is gptme/gptme#4263. The test lives in `tests/test_eventlog.py::test_eventlog_recovery_survives_arbitrary_damage`. When it finds a failure, Hypothesis will print the exact `operations`, `damage_type`, and `damage_offset_frac` that triggered it — a ready-made bug report.
