---
title: The Test Hook Failed Because It Exited Too Fast
date: 2026-09-22
author: Bob
public: true
tags:
- testing
- shell
- git-hooks
- debugging
- ci
maturity: finished
confidence: fact
excerpt: 'A fake pre-push hook returned success, but CI still rejected the push. The
  hook was exiting before it read stdin, turning a correct result into a timing-dependent
  SIGPIPE failure under pipefail.

  '
---

# The Test Hook Failed Because It Exited Too Fast

The failing test looked straightforward: install a fake global pre-push hook
that exits successfully, run the real guard, and assert that the push is
allowed.

Locally, it passed 100 times in a row.

CI failed anyway.

The fake hook was too small to be reliable:

```bash
#!/usr/bin/env bash
exit 0
```

That script says exactly what the test appears to need. It also exits without
reading the pre-push records Git sent to its standard input. Under the right
scheduling, that was enough to turn a successful hook into a failed pipeline.

## The Pipeline Had Two Results

The guard chained into the global hook with the equivalent of:

```bash
printf '%s\n' "$push_records" | "$global_hook"
```

The surrounding script used `set -o pipefail`, as it should. Without
`pipefail`, a broken producer can be hidden by a successful final command.

But `pipefail` also means the pipeline has to care about both processes:

- the hook's exit status;
- the producer's exit status.

If the fake hook ran first, it returned `0` immediately and closed the read end
of the pipe. When `printf` ran a moment later, there was nobody left to read.
The kernel delivered `SIGPIPE`, `printf` failed, and `pipefail` made the whole
pipeline fail.

The hook had succeeded. The pipeline had not.

That distinction explains why the test was flaky instead of consistently
wrong. When `printf` won the race, the small input fit into the pipe buffer and
the hook's early exit did not matter. When the hook won, the producer wrote
into a pipe with no reader.

## Reproduce the Scheduler, Not the Hope

Rerunning a timing-sensitive test until it passes is weak evidence. Rerunning
it 100 times and seeing green was useful only because it established that the
ordinary local schedule did not exercise the failure.

The deterministic reproducer delayed the producer by 20 milliseconds:

```bash
printf() {
    sleep 0.02
    builtin printf "$@"
}
export -f printf

bash test_pre_push_guard_chaining.sh
```

That forced the consumer to exit first. The exact CI assertion then failed on
demand: four assertions passed and the nominal "global hook returned success"
case failed.

This is the useful move for race debugging. Do not ask whether the test fails
often enough. Identify the ordering required for failure, then force that
ordering.

## The Fixture Was Less Real Than Production

The production global hook consumes its input before deciding whether to allow
the push. The fake hook did not. The test double had accidentally removed a
behavior that was part of the process contract.

The fix was one line in each exit-only fake hook:

```bash
#!/usr/bin/env bash
cat >/dev/null
exit 0
```

The blocking fixture got the same treatment before `exit 1`.

Draining stdin keeps the read end open until the producer finishes. The hook
still returns the intended result, but it now behaves like a real pre-push hook
at the boundary the test actually exercises.

The delayed-producer reproduction passed after the change. The full shell test
suite also passed: 12 suites and 247 assertions.

Production code did not change. The bug was in the model of production used by
the test.

## A Second Test Was Passing for the Wrong Reason

The same repair exposed another fixture problem. The test for a rejecting
global hook used a feature-branch-to-master push. A separate branch guard would
reject that push even if global-hook chaining were completely broken.

So the assertion proved only that *something* returned non-zero.

This was the shell version of [a regression test that passed before its
fix](/blog/the-test-passed-before-the-fix/): the fixture contained the right
objects but omitted the condition that made the target behavior decisive.

Changing the fixture to a valid master-to-master update removed the independent
failure path. Now the test fails only when the global hook's rejection is lost.

This is a nasty testing pattern because the suite stays green while the behavior
under test can be broken. For a negative-path assertion, every unrelated reason
to reject the operation is a masking hazard.

## What This Changed in My Testing Style

Three rules came out of a nine-line patch:

1. A subprocess fixture must honor the I/O contract, not just return the right
   status code.
2. A pipeline test under `pipefail` is testing every stage, including timing and
   pipe lifetime.
3. A rejection test needs an otherwise-valid input, or another guard can make a
   broken test pass.

Tiny shell fixtures are attractive because they look deterministic. They are
still concurrent programs. The moment one process writes to another, the test
owns scheduling, buffering, EOF, and signal behavior whether the author planned
for it or not.

In this case, the fake hook failed because it finished too quickly. That is a
good reminder: minimal test doubles should remove irrelevant behavior, but
reading the input was not irrelevant. It was the contract.
