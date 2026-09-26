---
title: The Verifier Scored the Oracle Zero
date: 2026-09-26
author: Bob
public: true
tags:
- training
- evals
- rl-environments
- verifiers
- agents
excerpt: 'I needed 40 coding tasks for a training panel and kept getting stuck at
  34. The six "bad" tasks weren''t bad. The verifier was scoring correct reference
  solutions as zero. Here is how I told the two apart without peeking.

  '
---

# The Verifier Scored the Oracle Zero

I'm building a small panel of coding tasks mined from my own work sessions to
measure whether a fine-tuned model actually improves. Each task is a repo
snapshot, an instruction, and two hidden test lists: **fail-to-pass** (F2P, the
tests the change should fix) and **pass-to-pass** (P2P, the tests that must not
break). Before a task goes into the panel it has to pass two controls:

- **oracle**: apply the real reference diff, run the verifier, expect 1.0
- **empty**: apply nothing, expect 0.0

The panel needs at least 40 tasks. After three minting batches I had 34. The
obvious next move was to mint a fourth batch and keep going until the survivors
reached 40.

Instead I looked at the tasks that failed. Their oracle score was 0.0, which
says the reference solution, the code that actually shipped and worked, fails
its own test. That should be rare. When it keeps happening, the problem is
usually the instrument.

## Three ways a correct solution scores zero

The verifier logs showed three failure shapes, and none of them had anything to
do with the solution.

**1. Skips counted as misses.** The verifier counts lines that start with
`PASSED` and treats everything else as a failure. When an optional dependency
isn't installed in the task image, pytest skips the test, and the skip counts
as a miss. One task lost five tests this way because a protocol package wasn't
installed.

**2. P2P tests that were never pass-to-pass in the image.** The task builder
decided which tests were "passing" by running them on the host, where they
passed. Inside the sandbox image, some of them fail at the entry commit, before
any change is applied, and they fail the same way in the empty trial. A test
that fails with and without the solution isn't evidence about the solution. It's
evidence about the environment.

**3. A test ID that doesn't exist.** One P2P ID didn't resolve in the image.
pytest answers `ERROR: not found` and **aborts the whole invocation**, so every
other test in that call goes unreported. That task scored 0/25 because of one
bad string.

All three are measurement bugs. If I had minted more tasks, the same builder
would have produced more of them at the same rate. I'd have paid for a bigger
batch to route around a broken ruler.

## Repairing without peeking

The dangerous part of "fix the test list" is that it's also the exact move you'd
make to cheat. If you drop the tests a model fails, every model looks great.
So the repair rule had to be fixed before re-running anything, and it could use
only the two controls, never any model's score:

- **Drop a P2P ID only if it did not pass under the oracle *and* did not pass
  under the empty trial.** Both failing means the environment is broken, so the
  test says nothing about the solution.
- **Never drop a P2P ID that passes empty and fails under the oracle.** That's a
  real regression by the reference solution. Refuse the whole task instead of
  laundering it.
- **Drop an F2P ID only if it skipped or was never collected under the oracle.**
  An F2P test the oracle *failed* is a real failure, so refuse the task.
- **Refuse if too little is left**: no runnable F2P, or fewer than 10 P2P tests.

The asymmetry is the point. A test only leaves the list if both controls agree
it's noise. Anything that could be a real signal about the solution either stays
or takes the task down with it.

The tool is about a hundred lines and writes a `repair.json` next to each
repaired task recording exactly what was dropped and why. It also refuses to
overwrite an existing repair. It has four tests, one per drop-or-refuse rule above.

## Result

Eight candidates went through the repair:

- **6 repaired.** Re-running the controls on the repaired copies gave
  oracle=1.0 and empty=0.0 on all six.
- **2 refused.** One image was missing a parser library, so all 40 F2P tests
  failed and the oracle "regressed" three P2P tests. That task is broken at the
  image level and no test-list edit can honestly fix it. The other had no P2P
  tests left after dropping the phantom ID.

That took the pool from 34 to 40 without minting a single new task. It also
refused the two tasks where trimming the test list would have hidden a real
problem.

## What I didn't fix

The root cause is in the builder: it probes P2P tests on the host instead of
inside the image. The right fix is to validate P2P membership in the sandbox at
mint time so these tasks are never produced. That's a bigger change than this
session had room for, so it's recorded as the follow-up rather than done. The
repair tool is a patch on existing output, not a replacement for a correct
builder.

## The general lesson

When a filter rejects a lot of candidates, look at the rejects before scaling up
the input. If oracle solutions fail your verifier, the verifier is the first
suspect. Fixing the instrument recovers the tasks you already paid for, and it
stops you from paying the same tax on every future batch.

When you do repair it, write the rule down first, make it depend only on
controls that can't see any model's output, and make it refuse loudly when the
evidence is ambiguous. A repair that can only remove noise is a fix. A repair
that can remove signal is a way to cheat without noticing.
