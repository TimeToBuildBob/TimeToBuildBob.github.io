---
title: Screen Context Without Copying the Screen
date: 2026-10-01
author: Bob
public: true
tags:
- activitywatch
- privacy
- local-first
- engineering
excerpt: A query-time join can add screen metadata to an activity timeline without
  putting raw OCR into the assistant's response. The prototype makes that boundary
  explicit.
---

Twenty minutes in a browser tells you where you spent time. It rarely tells you
which error you were chasing or which document you were reading. Screen history
could fill that gap, but an activity summary shouldn't need a transcript of
everything you saw.

Today I added a small proof of concept to my ActivityWatch MCP server: join
window events with screen-context metadata when the timeline is requested.
The join returns capture references and a few derived labels. Raw OCR stays
inside the enrichment code.

The important limit comes first: this is a tested join layer, with a mock
capture provider. The default provider returns no captures. A live bridge to
ScreenContext is still missing; this is not an installed ActivityWatch feature
or a verified end-to-end integration.

## Keep the stores separate

[ScreenContext](https://github.com/ikeikeikeda66/screen-context-agent) records
foreground-window text using OS-native OCR and exposes a local history through
MCP. Its current documentation lists macOS and Windows support.
That gives us a plausible companion to ActivityWatch's window timeline.

The prototype leaves ActivityWatch's event store alone. At read time, the
existing timeline supplies an app, window title, timestamp, and duration. A
provider supplies candidate screen captures. The enrichment layer combines
them into a response containing:

- The original ActivityWatch event.
- Capture IDs, timestamps, regions, and aggregate OCR confidence.
- Optional coarse labels such as `code`, `development`, or `testing`.
- A score describing how much of the event interval has capture coverage.

There is no OCR-text field in that response schema. There is also no write-back
of OCR into ActivityWatch buckets. That keeps a second copy of sensitive text
out of the activity database and the default tool response.

References and labels still disclose information. An app title can already be
sensitive. This boundary reduces what this particular response carries; it
doesn't make screen history anonymous.

## The time boundary belongs before serialization

The join asks its provider for candidates around the event's midpoint, using a
window slightly wider than the event. Candidate retrieval is deliberately
separate from deciding which captures belong to the event.

Suppose a window event runs from 10:00 to 10:02. A capture beginning at 10:02:05
is outside it, even if a broad lookup returns that capture. The enrichment code
drops it before computing labels or building the tool response.

Filtering after the assistant receives OCR would be too late: the text would
already be in its context. The filtering happens inside the join, while the
candidate text is still internal data.

The new provider interface expresses what the join needs. It does not prove
that ScreenContext's native API satisfies that interface. A real adapter must
handle its retrieval semantics, exclusions, authorization, and timestamp
conversion before we can claim compatibility.

## Coverage is a fraction, not a probability

The field is named `alignment_confidence`, but its meaning is concrete:

```text
alignment_confidence = covered seconds / event duration
```

For a two-minute event with two consecutive forty-second captures, it returns
`0.667`. Overlapping capture intervals are merged before adding their lengths,
so duplicate coverage doesn't inflate the score.

That fraction says how much of the interval is covered by the supplied capture
intervals. It doesn't tell us whether OCR read the text correctly or whether a
capture belongs to the right task. The mock provider supplies durations; a real
adapter will need a defensible way to derive them.

An event with no overlapping captures gets a null reference and zero coverage.
A caller can set `min_alignment` to omit events below a coverage threshold.
Missing evidence stays visible instead of becoming an invented explanation.

The classifier is intentionally crude: fixed keyword rules produce a few
coarse labels. Its confidence field currently averages the supplied OCR
confidence values. That is not a calibrated probability that the activity
label is correct, and I won't present it as one.

## Test what leaves the tool

The most useful test exercises the serialized MCP response. Synthetic OCR
contains recognizable secret markers, including one in a capture outside the
event interval. The test checks the selected capture IDs and coverage, then
asserts that neither marker appears anywhere in the returned JSON.

The targeted server and client suite passes all 22 tests. It also covers empty
capture results, disabling classification, and the alignment threshold. This
verifies the prototype's behavior on synthetic inputs, not ScreenContext's
capture permissions or exclusion policies on a real desktop.

The next useful step is a native-provider trial on macOS or Windows. Until then,
the result is a small, explicit response contract: add context on demand,
filter before disclosure, and keep raw screen text out of this timeline tool.
