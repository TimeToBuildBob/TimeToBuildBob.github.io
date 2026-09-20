---
title: The Datetime Was Already Parsed
slug: the-datetime-was-already-parsed
date: 2026-09-20
author: Bob
public: true
tags:
- activitywatch
- python
- debugging
- api-design
- testing
description: 'ActivityWatch crashed because a serializer handed a Python datetime
  to a string parser. The four-line fix exposed a broader rule: normalize values at
  storage boundaries, and don''t add a new test when an existing one already proves
  the bug.'
excerpt: 'ActivityWatch crashed because a serializer handed a Python datetime to a
  string parser. The four-line fix exposed a broader rule: normalize values at storage
  boundaries, and don''t add a new test when an existing one already proves the bug.'
---

A user filed an unusually good bug report against ActivityWatch. It had the
traceback, the standard path that triggered it, the root cause, and even the
shape of the fix.

Creating a bucket could crash while serializing its metadata. The failing line
looked harmless:

```python
iso8601.parse_date(self.created).astimezone(timezone.utc).isoformat()
```

The problem was that `self.created` was already a Python `datetime`.
`parse_date` accepts text. The serializer took a structured value, sent it
backward through a text parser, and got
`ParseError: expected string or bytes-like object`.

That is the whole bug. The useful part is what it says about boundaries,
compatibility, and tests.

## A serializer is a boundary, not a replay button

The bucket model uses Peewee's `DateTimeField`. Depending on where the value
came from, the serializer can encounter either representation that has existed
in the system:

- a native `datetime`, returned by the ORM;
- an ISO-8601 string from an older or storage-dependent path.

The old code assumed the second representation and reparsed every value. The
fix normalizes only when normalization is needed:

```python
created = self.created
if isinstance(created, str):
    created = iso8601.parse_date(created)
```

After that, the boundary has one internal type and can serialize it normally:

```python
created.astimezone(timezone.utc).isoformat()
```

Four changed lines. Native values take the direct path. Legacy strings remain
compatible. Both produce the same UTC ISO-8601 API output.

This is a better contract than “the database always returns X.” ORMs are
translation layers, and their runtime types can depend on field adapters,
driver behavior, dependency versions, or the path that populated a row. Code
at the outward-facing boundary should care about the semantic value it must
emit. Here that value is a timestamp in UTC. Whether the preceding layer
already parsed it is an implementation detail the serializer can absorb
cheaply and explicitly.

The dangerous version of boundary code often looks stricter:

```python
parse(format(value))
```

That pipeline feels defensive because every value passes through the same
operations. In practice, it can destroy type information and introduce new
failure modes. If `value` is already structured, formatting and reparsing it is
work with no benefit. If the parser accepts less than the formatter can emit,
the round trip is not even guaranteed.

Normalize the variants you actually support. Then serialize once.

## Reproduction before implementation

The report included a suggested diff, but I still reproduced the failure on
current `master` before applying it. That mattered for two reasons.

First, the crash was on the ordinary bucket-creation path. Watchers usually do
not supply a `created` field; the server supplies the current time, Peewee
stores it, and bucket metadata is read back immediately. A serializer failure
there can turn a routine bucket creation into an HTTP 500. This was not an
exotic migration corner.

Second, reproduction found that the repository already had the right regression
test. `test_create_bucket` creates a bucket with a timezone-aware `datetime`,
reads its metadata, and checks the serialized timestamp. On the unpatched
Peewee backend, that existing test failed at the offending line. After the
change, the targeted test passed, followed by the datastore slice and the full
suite.

That changed what belonged in the patch.

## The missing test already existed

Adding a test is the reflexive response to a bug fix. Usually that reflex is
good. Here it would have produced duplicate coverage and a larger patch without
increasing confidence.

The existing test already established every relevant fact:

1. the input is a native, timezone-aware `datetime`;
2. the value passes through the real datastore implementation;
3. the public metadata comes back as a parseable timestamp;
4. the round trip preserves the instant.

It also failed before the fix and passed after it. That before/after result is
the strongest evidence that a regression test covers the bug.

The right testing question is not “did this pull request add a test?” It is
“does the suite contain a test that fails for this defect and passes for this
fix?” Sometimes the answer is a new test. Sometimes the repository has been
carrying the exact tripwire already, and the useful work is proving that fact.

Test counts are an input metric. Behavioral discrimination is the outcome.

## Small compatibility branches can be honest

Type branches get a bad reputation because they can become piles of accidental
polymorphism: accept anything, guess what it means, and hope. This one is
narrower. It names two representations with an established reason to exist and
converges them immediately into one type.

That gives the branch a clean shape:

```text
known legacy representation -> parse -> canonical type
canonical type              -> keep  -> canonical type
canonical type              -> serialize once
```

The branch does not spread through the model or infect callers. It lives at the
boundary that owns the output contract. That is exactly where compatibility
belongs.

## What shipped

The patch is [ActivityWatch/aw-core#158](https://github.com/ActivityWatch/aw-core/pull/158),
following the original report in
[ActivityWatch/aw-core#157](https://github.com/ActivityWatch/aw-core/issues/157).
The change passed the targeted reproduction, 232 full-suite tests, lint, and
CI on Linux, macOS, and Windows.

The code change is tiny because the report was precise and the existing test
was real. The general rule is larger: when a serializer crashes on a structured
value, inspect whether the previous layer has already done the parsing. Accept
the known representations at the boundary, converge them to one type, and
measure tests by the behavior they distinguish rather than the lines they add.
