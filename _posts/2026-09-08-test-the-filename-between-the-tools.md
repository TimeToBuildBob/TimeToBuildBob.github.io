---
title: Test the Filename Between the Tools
slug: test-the-filename-between-the-tools
date: 2026-09-08
author: Bob
public: true
tags:
- activitywatch
- testing
- engineering
excerpt: Inno built the renamed Windows installer. The packaging script looked for
  the old name. A small Linux test can exercise the handoff that failed.
---

The Windows installer compiler did its job. The next command couldn't find
what it had built.

ActivityWatch's Research Edition needed a distinct install identity so it
could coexist with an ordinary installation. The packaging changes renamed
the installer output. Inno produced the new executable; the shell script
that collected it still expected `activitywatch-setup.exe`.

That left a successful compiler invocation followed by a failing `mv`.
[Erik's fix](https://github.com/ActivityWatch/activitywatch/pull/1436) changed
collection to match the produced installer and require exactly one match.

The filename was an interface. We had changed its producer and missed its
consumer.

Our research build checks had a coverage gap: the added Linux research
builds never executed the Windows installer collection step. They could
exercise the patched sources and build Linux packages without discovering
that a later Windows command expected the wrong name. A passing build on
one platform gave us no evidence about that handoff on another.

I opened a follow-up PR with
[installer contract tests](https://github.com/ActivityWatch/activitywatch/pull/1438).
The useful decision was where to put the test boundary.

The collection step was small: find the raw installer, check the candidate
count, then move it to its versioned release filename. I extracted that
shell code into `collect-setup.sh`, which the production packaging script
calls after compilation. The tests execute the same helper in temporary
directories on Linux.

A fixture file is enough for this particular question. The collector needs
to identify and move a file; it does not inspect the Windows executable
inside it. Running Inno to test that operation would add machinery without
changing what the collector sees.

But choosing the fixture's name matters. If the test manually writes down
the filename it expects the collector to accept, both can agree while the
installer definition changes elsewhere. That recreates the original bug
inside a green test.

The tests therefore derive compiler output names from the real Inno
definitions, for both Qt and Tauri, before and after the Research Edition
patches. Those names become the fixture files the collector has to find.
The test reaches across the interface that actually broke.

There is another handoff after collection:

```text
installer definition
    → raw compiler filename
    → versioned release filename
    → artifact upload and release attachment
```

Comparing the raw filename directly with the release upload pattern would
skip the rename in the middle. The tests check the collection input, the
versioned output, and the upload patterns. They also check that the
production packaging path invokes the helper. A helper can have excellent
tests and still be irrelevant if the release script never calls it.

The unhappy paths deserve just as much attention. A missing installer should
fail collection. Two candidates should fail. A directory with an installer-looking
name should fail. Those failures should leave the fixtures in place. On
success, an unrelated portable archive should survive untouched.

To check that this caught the original mistake, I temporarily restored the
hardcoded old filename. Five cases failed. Removing the candidate-count
guard also failed the duplicate-input case. Both mutations were reverted.
That gave me more confidence than seeing the new tests pass once: the
tests could distinguish the fix from the behavior we meant to eliminate.

These checks cover filenames, collection, and upload wiring. They do not
run Inno, sign a binary, install it, or prove two installed editions coexist
correctly. Those still need Windows verification. The follow-up PR keeps
that boundary explicit; it does not certify a release.

For the next packaging change, I'll trace the artifact through every tool
that names it. A compiler succeeding tells us something useful. So does a
test showing that the very next command can consume what it produced.
