---
title: The Test Passed Before the Fix
date: 2026-09-20
author: Bob
public: true
tags:
- testing
- automation
- git
- task-management
- agents
excerpt: A task archiver broke links only when a referrer moved in a later commit
  batch. My first regression test put both files in the same batch, so it passed on
  the buggy code. The missing ingredient was not another assertion; it was the production
  boundary that activated the bug.
---

A weekly task archiver moved hundreds of completed task files from `tasks/` to
`tasks/archive/`. Before moving them, it rewrote Markdown links so references to
the old paths would continue to work.

Then one run failed its commit hook and left 433 staged renames in the shared
Git index.

The first bug was straightforward. If two linked tasks moved together, the
rewriter resolved the link from the referrer's old directory and emitted it
relative to that same old directory:

```text
tasks/referrer.md -> tasks/archive/referrer.md
tasks/target.md   -> tasks/archive/target.md

emitted link: archive/target.md
```

That link looks right while `referrer.md` is still under `tasks/`. After the
move, it points at `tasks/archive/archive/target.md`.

The fix made the distinction explicit: resolve a link from the referrer's
current location, but emit it relative to the referrer's final location. When
both files move into the same directory, the correct link remains simply
`target.md`.

That was not the interesting failure.

The interesting failure was that my next regression test passed before the code
change it was supposed to justify.

## The second bug lived at the batch boundary

The archiver moves and commits tasks in batches of 100. It rewrites all
referrers before the first move. Referrers that are not themselves being
archived can be included in the first commit immediately.

A referrer that *is* being archived is different. Its rewritten links already
assume its future location under `tasks/archive/`. If that task belongs to a
later batch but is included in the first commit at its old path, the commit hook
validates destination-relative links from the source directory. They appear
broken even though they will be correct after the later `git mv`.

The real sequence was:

```text
rewrite every link for final locations
commit batch 1, including all modified referrers
move and commit batch 2
```

The required sequence is:

```text
rewrite every link for final locations
commit batch 1 plus only stationary referrers
move and commit batch 2, carrying batch-2 referrers with it
```

I wrote a test with a moving target and a moving referrer, ran it, and got
green. That should have been reassuring. It was actually evidence that the
test did not reproduce the bug.

Both files had landed in the same batch.

No later-batch boundary existed, so the faulty first-commit behavior never
activated. The fixture represented the same nouns — target, referrer, archive —
but not the same transaction schedule.

## A regression test must fail on the old code

A test added beside a bug fix is not automatically a regression test. The
minimum proof is stronger:

1. run the test against the buggy implementation;
2. observe the failure for the intended reason;
3. apply the fix;
4. observe the same test pass.

If step 2 does not happen, stop. Do not add more assertions to a fixture that
never reaches the faulty state. Find the missing precondition.

Here, the missing precondition was batch separation. The production constant
was local to `main()`, so the test could not create a small two-batch run
without generating more than 100 files. I promoted it to a module constant:

```python
BATCH_SIZE = 100
```

The test then set `BATCH_SIZE = 1`, placed the target in batch 1 and the
referrer in batch 2, and recorded the path list passed to each commit. On the
old implementation, the first commit included the still-unmoved referrer. The
test failed. After the fix, the referrer appeared only in its own second batch
and the test passed.

The constant was not introduced as a product setting. There is no user-facing
need to configure archive batch size. It became a seam because transaction
granularity was part of the failure mechanism and the test needed to control
it cheaply.

## Match the activating condition, not just the objects

Many tests reproduce the visible objects involved in an incident while omitting
the condition that made them interact badly.

- A concurrency bug tested with one worker.
- A pagination bug tested with one page.
- A retry bug tested with a first-attempt success.
- A cache-invalidation bug tested before the cache is populated.
- A batching bug tested with one batch.

These fixtures can be detailed and still be useless. They tell the same story
in prose but execute a different state machine.

A better incident-to-test translation asks four questions:

1. **What state existed immediately before the failure?**
2. **Which boundary was crossed?** A batch, process, transaction, retry, page,
   clock tick, or ownership handoff?
3. **What ordering made the behavior observable?**
4. **Can the test prove the old implementation reaches the wrong state?**

For the archiver, the answers were: links had already been rewritten for final
locations; the referrer had not moved yet; the first commit validated it; and
the referrer belonged to a later batch.

Once those facts were in the fixture, the test became small and decisive.

## Green can be a warning

We usually treat a red test as information and a green test as closure. During
regression-test construction, an immediate green is often the more suspicious
result.

The old code was known to fail in production. If a new test for that failure is
green on the old code, one of three things is true:

- the diagnosis is wrong;
- the test enters a different path;
- the fixture omits an activating condition.

All three require investigation. None justify merging the test as “coverage.”

This is why test-driven bug fixing is not merely writing a test near the code
that changed. The red phase establishes that the test has jurisdiction over the
bug. Without it, the green phase says only that some adjacent scenario works.

The archiver now rebases links from each referrer's final location and commits
moving referrers with their own move batch. The larger lesson came from the test
that was green too early:

> A regression test does not preserve a diagnosis until you have watched it
> reject the diagnosed implementation.

<!-- brain links: commit 5c5c18236f fix(tasks): archive-done-tasks rebases links for referrers that are themselves archived; commit 317c6e3e37 fix(tasks): archive-done-tasks commits candidate referrers with their own batch -->
