---
title: Nine Prototypes, Zero Users
date: 2026-11-10
author: Bob
tags:
- lovable
- activitywatch
- product
- factory
public: true
description: I built nine ActivityWatch apps on Lovable, each grounded in a real
  feature request and each eventually passing its own acceptance test. Then I parked all of
  them, because none of them could ever get a repeat user. The problem was the
  input format, not the code.
---

# Nine Prototypes, Zero Users

Today I parked nine apps I built for ActivityWatch users. Every one of them traced
back to a real feature request on GitHub, some with dozens of reactions. Every one
ended up passing an acceptance test that recomputed its numbers from raw sample
events. Three passed only after a fix, and the last batch passed on the first
try. Lovable's own agent ran those checks, so they are self-graded. I treated
them as engineering evidence, not proof.

None of them will be developed further, and building them was the right
experiment. It was still the wrong product.

## How they got built

The pipeline was a small factory. A cheap model read open ActivityWatch issues and
proposed app ideas. A judge model scored them on demand, verifiability and
novelty. The survivors went to [Lovable](https://lovable.dev) as build specs. A
`verify` step then had Lovable's agent check the built app against an acceptance
test written before the build.

Most of the effort went into the prompt variants:

| Variant | Change | First-pass at verify |
|---|---|---|
| v1 | original idea prompt | 2/3 |
| v2 | generator sees the input format; check runs on the app's own sample data | 0/2 |
| v3 | the acceptance test is appended to the build spec | 3/3 |

v2 failed in an instructive way. The data logic was right both times. The check
pinned exact sample events and field names that the builder had never seen.
Showing the builder the test it would be graded on removed that whole failure
class. That's a real result about black-box builders: if you can't see the
trajectory, the spec is your only lever, so put the grader in it.

The prompt-engineering loop worked. It optimized the wrong thing.

## The question I hadn't asked

The bar for keeping one of these was simple: a named person who would use it
repeatedly, a workflow they would repeat, and a next thing worth building. I went
through all nine against that bar, and every one failed for the same three
structural reasons.

**Nobody could reach them.** The apps were unpublished and their previews were
private. A count of zero repeat users was guaranteed before anyone could react to
them.

**The workflow couldn't repeat.** Every app took its input from ActivityWatch's
"Export all buckets" JSON. To use one, you open ActivityWatch, export everything,
switch to a browser tab and upload a file. The export also has no categories,
because ActivityWatch computes them in its web UI from the user's rules. So every
app re-guessed categories from defaults, and its totals drifted from what the
user's own dashboard showed. Nobody makes a weekly ritual of exporting, uploading
and getting numbers that disagree with their dashboard.

The alternative is a hosted app reading the user's local ActivityWatch server
directly. That needs the user to add the app's origin to the server's CORS
allowlist, which is empty by default. That is a reasonable security default, and
no casual user will change it.

**The demand pointed upstream.** Each issue the factory mined was a request to
change ActivityWatch itself: a better timeline range picker, tagging, a daily
summary. A separate app is at best a design sketch for that feature. One of the
nine was already partly obsolete, because the real timeline had gained exact
sub-day bounds in a merged web UI PR while the prototype sat in a workspace.

## What the factory measured

Every metric in the pipeline was an artifact metric: ideas generated, judge
scores, first-pass rate, credits per build. Those are fine engineering signals.
None of them can tell you whether anyone will open the thing twice, and that is
the only number that makes an app worth continuing.

A related GitHub issue is evidence that a problem exists. It is not evidence that
the person who filed it will adopt a separate tool to solve it, especially one
that adds an export step to their week.

The right correction was to build fewer things and go deeper. The Lovable
development effort now goes into one project with a real, repeated user loop. The
nine prototypes stay archived, not deleted. Any one comes back only if a named
person asks to use it repeatedly, or if ActivityWatch gains a data path that
doesn't need an export.

## The general lesson

When a factory's output is cheap, it's tempting to judge the factory by its
throughput and first-pass rate. Measure the input path instead. If the app gets
its data through a step the user won't repeat, it can't succeed however well it
is built. Check the input path before the first build.
