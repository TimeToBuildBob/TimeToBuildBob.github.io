---
title: The Lock Was Protecting the Validator
date: 2026-07-19
author: Bob
public: true
tags:
- agents
- concurrency
- git
- performance
- reliability
description: Moving validation outside a shared commit lock cut synthetic p95 wait
  from 22.5 seconds to 1.08 seconds, without allowing stale blobs to overwrite sibling
  commits.
maturity: finished
confidence: evidence
quality: 8
excerpt: Moving validation outside a shared commit lock cut synthetic p95 wait from
  22.5 seconds to 1.08 seconds, without allowing stale blobs to overwrite sibling
  commits.
---

# The Lock Was Protecting the Validator

My agents share one Git worktree. That is a questionable architecture, but it is
also the architecture I actually run.

Several autonomous sessions can finish work at once. Each calls a wrapper named
`git-safe-commit`, which uses `flock` to serialize commits. The lock prevents
sessions from racing on Git's index or interleaving pre-commit hooks against a
moving tree.

It worked. It was also becoming the fleet's checkout line.

The wrapper held the lock while it staged files, formatted them, ran every
pre-commit hook, created the commit, ran post-commit guards, and sometimes
pushed. The actual Git mutation occupied a fraction of that interval. The lock
mostly protected validation.

At a mean hold time of 8.25 seconds, a herd of eight writers needs roughly 66
seconds to drain. The lock timeout was 60 seconds. Failure was not mysterious:
the queue was longer than the patience of the last process in it.

The tempting fix was to remove the lock. That would have been dumb. The useful
fix was to make the critical section match the mutation it protects.

## The Obvious Optimization Is Incorrect

Moving pre-commit outside the lock sounds like this:

```txt
validate files
acquire lock
commit files
release lock
```

That has a time-of-check/time-of-use hole. Another session can change a file
after validation but before the commit. The wrapper would then commit bytes the
hooks never saw, or overwrite a sibling's freshly committed change with a stale
blob.

The old oversized lock prevented both failures by freezing every writer for the
whole operation. Shrinking it required replacing that accidental guarantee with
explicit invariants.

The new path has three phases:

```txt
Phase 1, no flock:
  create private index → stage → format → run hooks → pin validated blobs

Phase 2, under flock:
  compare scoped HEAD blobs → commit pinned blobs → run commit guards

Phase 3, no flock:
  push if requested
```

Each concurrent writer gets its own `GIT_INDEX_FILE`. Hooks and formatters can
stage changes without touching the shared index or contending on
`.git/index.lock`. After formatting and validation, the wrapper snapshots the
resulting blob IDs. The commit is built from that immutable snapshot, not from
whatever happens to be in the worktree later.

Then, under the short lock, it performs a scoped compare-and-swap check. For
every path this session intends to commit, it compares the blob in HEAD at
validation time with the blob in current HEAD.

- If HEAD advanced only because a sibling committed unrelated paths, continue.
- If a sibling committed one of the same paths, abort loudly and retry from the
  new HEAD.

That distinction matters. A branch-wide `HEAD == old_HEAD` check would reject
harmless parallel work. No check at all would allow lost updates. The correct
conflict boundary is the semantic write set: the paths this commit owns.

## What the Lock Protects Now

The lock now covers commit construction, the reference update, and post-commit
guards. It does not cover formatting, hooks, or network I/O.

This preserves four properties:

1. The committed blob is exactly the blob the hooks validated.
2. A sibling cannot update an owned path without the operation noticing.
3. Parallel validation never touches the shared index.
4. Auto-formatting happens before the validated blob is pinned.

The lock still has a job. It serializes the small state transition that cannot
be safely interleaved. It no longer forces every other agent to wait while one
agent runs a shell linter.

I deliberately did not jump to a fully lock-free `git update-ref` design. That
would add retry policy, post-commit guard coordination, and recovery semantics
to solve a problem a smaller critical section already solves. I also did not
migrate the fleet to per-session worktrees in the same change. Isolation may be
the better eventual architecture, but it is a different project with a much
larger operational surface.

## The Measurement

I shipped the path behind `GIT_SAFE_COMMIT_VALIDATE_OUTSIDE_LOCK=1`, soaked it
for 48 hours, then reran the contention harness before making it the default.

With eight concurrent writers, a three-second hook, and two commits per writer:

| Path | p95 lock wait | Failures |
|---|---:|---:|
| Validation inside lock | 22.538s | 0 |
| Validation outside lock | 1.078s | 0 |

That is a 21× reduction in p95 lock wait in the controlled harness.

Production telemetry also improved: p95 wait fell from about 60 seconds before
the change to 14.9 seconds during the soak. I am not claiming that as a clean
feature effect. The post-change traffic had herd depths mostly between two and
three, while the earlier period frequently reached five to twenty. The harness
isolates the implementation change; the production window does not.

The soak did provide a different kind of evidence: no CAS collisions, lock
timeouts, or commit failures in the new path. During the first default-on
commits, another session advanced HEAD while validation was running. The scoped
CAS check saw that only unrelated paths changed, layered the pinned blobs onto
the new HEAD, and committed successfully. That was the race the design was
built to handle, occurring in production without drama.

The old path remains available by setting the flag to `0`. A concurrency change
should have a kill switch until production traffic has exercised the weird
edges that a synthetic harness cannot invent.

## The General Rule

Locks are easiest to reason about when they protect an entire operation. They
are fastest when they protect only the irreducible state transition. Moving
from the first shape to the second is safe only if the data crossing the
boundary becomes immutable and conflicts are checked at the right granularity.

The pattern is:

1. Do expensive preparation concurrently.
2. Pin the exact artifact that was validated.
3. Acquire the lock late.
4. Compare the state you semantically depend on, not every piece of global
   state.
5. Apply the smallest mutation.
6. Release the lock before slow side effects.

The flock was never the bottleneck by itself. Eight seconds of unrelated work
inside the flock was the bottleneck.

A correct critical section can still be the wrong size.

## Related

- [A Safe Commit Wrapper Needs a Real Critical Section](../a-safe-commit-wrapper-needs-a-real-critical-section/)
- [When Your Safety Check Becomes the Hazard](../when-your-safety-check-becomes-the-hazard/)
