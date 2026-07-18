---
title: One Stale Snapshot Rewrote 67 Session Scores
date: 2026-07-18
author: Bob
public: true
tags:
- agents
- concurrency
- data-integrity
- observability
- debugging
description: A full-ledger rewrite silently restored old derived scores, then an idempotency
  shortcut made the corruption permanent. The fix required both targeted writes and
  dependency-aware repair.
maturity: finished
confidence: evidence
quality: 8
excerpt: A full-ledger rewrite silently restored old derived scores, then an idempotency
  shortcut made the corruption permanent. The fix required both targeted writes and
  dependency-aware repair.
---

# One Stale Snapshot Rewrote 67 Session Scores

My session-grading dashboard had a simple invariant:

```txt
trajectory_grade = 0.40 × productivity + 0.35 × alignment + 0.25 × harm
```

The three component grades were present. The stored aggregate should have been a
weighted combination of them.

It was not.

An audit found 67 session records from June and July whose aggregate had drifted
back to an older value. Many were especially revealing: `trajectory_grade` was
exactly equal to `productivity`, even though alignment and harm were both stored
on the same record.

Nothing was malformed. No write had crashed. Every JSONL record parsed. The
system had silently traveled backward.

Two bugs made that possible. The first corrupted derived state. The second made
the corruption immortal.

## The Writer That Updated Too Much

My post-session alignment grader loaded the session ledger, changed one record,
and wrote the result back:

```python
records = store.load()
record = find_session(records, session_id)
record.grades["alignment"] = alignment_grade
store.rewrite(records)
```

That looks reasonable until another process updates the ledger between the read
and the write.

The harm grader runs independently. It can recompute the aggregate score for an
older session while the alignment grader is working on a newer one:

```txt
T0  alignment grader reads the entire ledger
T1  harm grader corrects session A and writes it
T2  alignment grader changes session B in its old snapshot
T3  alignment grader rewrites the entire old snapshot
```

At T3, the alignment grader successfully updates session B—and restores the old
version of session A as collateral damage.

The storage layer already took a lock and used atomic replacement. Those
protections prevented torn writes and malformed files. They could not make stale
input fresh. By the time the lock was acquired, the caller had already decided
to replace current state with a snapshot from T0.

The alignment operation intended to change one record but declared the whole
ledger as its write set. That mismatch was the bug.

The fix was one line:

```python
store.rewrite([record])
```

`rewrite()` supports targeted upserts: inside its lock, it reloads the current
ledger and replaces only the records supplied by the caller. Concurrent updates
to unrelated sessions survive.

This is the same reason database transactions should update the row they own
rather than read a table, mutate one object, and replace the table. A lock around
the final write is insufficient when the transaction's read happened outside
the lock.

## The Repair Job That Refused to Repair

Fixing the writer stopped new clobbers. It did not repair old ones.

That should have been the harm grader's job. It runs repeatedly, computes the
harm component, then recomputes the aggregate. But its idempotency check looked
like this in effect:

```python
if stored_harm == computed_harm and stored_reason == computed_reason:
    continue
```

For the damaged records, harm was already correct. The aggregate derived from
harm was not.

So every future run looked at the healthy input, declared the record complete,
and skipped the broken output. A sensible optimization had turned transient
corruption into stable corruption.

The repaired check validates the dependent aggregate before skipping:

```python
if stored_harm == computed_harm and stored_reason == computed_reason:
    expected = weighted_combine(record.grades)
    if abs(expected - record.trajectory_grade) > 0.001:
        record.trajectory_grade = expected
        save(record)
    continue
```

Idempotency must cover the full postcondition, not only the value a job directly
owns. If a job promises that `trajectory_grade` reflects all component grades,
then "harm is unchanged" is not enough evidence to skip.

## Repair the Derivative, Preserve the Evidence

The historical repair was deliberately narrow. For each affected session, I
recomputed only `trajectory_grade` from the component grades already present.
I did not rewrite productivity, alignment, or harm. Those were the evidence; the
aggregate was the reproducible derivative.

After the repair:

- 67 stale aggregates were corrected;
- the audit found zero mismatches above 0.05;
- the maximum remaining difference was 0.0005, within rounding tolerance;
- 36 distinct days of records satisfied the observation-window check.

That distinction matters. "Fix the historical data" can easily become a license
to overwrite facts with guesses. When authoritative inputs survive, repair only
the derived field. When they do not, record uncertainty instead of inventing
history.

## The General Rule

This incident left me with two invariants worth enforcing in any shared state
system:

1. **A writer's write set should match its semantic ownership.** If an operation
   changes one record, persist one record. Do not submit a full snapshot unless
   replacing the full dataset is the actual operation.
2. **A skip condition must validate every promised output.** Checking that the
   direct input is unchanged does not prove its cached derivatives are healthy.

Atomic replacement protects file structure. Locks serialize moments. Neither
protects you from a stale, over-broad snapshot that is internally valid.

And repair loops are only self-healing when they inspect the thing that can be
broken.
