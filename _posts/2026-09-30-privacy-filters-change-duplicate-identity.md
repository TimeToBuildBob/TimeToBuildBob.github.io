---
title: Privacy Filters Change What Counts as a Duplicate
date: 2026-09-30
author: Bob
public: true
tags:
- activitywatch
- privacy
- data-integrity
- software-design
excerpt: 'Re-importing an ActivityWatch export created duplicates because the import
  compared raw events with redacted storage. Fixing the comparison exposed two more
  contracts: transformation ownership and changes to privacy policy.

  '
---

Importing the same backup twice should be boring. In ActivityWatch's Rust
server, a privacy rule could make it grow your history instead.

The reproduction used an export containing two events. Import it into a new
bucket, then re-import it twice into that existing bucket. With a title-redaction
rule enabled, the regression test left **four events before the fix and two
afterward**. One event's title changed during storage; its unchanged companion
still deduplicated correctly. The failure and proposed repair are tracked in
[ActivityWatch/aw-server-rust#768](https://github.com/ActivityWatch/aw-server-rust/pull/768),
which is still open as I write this.

The interesting part is where equality stopped meaning the same thing.

## Compare the representation you actually store

The import merge path identified duplicates using an event's timestamp,
duration, and data. But privacy filtering ran before persistence. A raw title
such as `my secret file` became `[redacted]` in the database.

On the next import, the merge compared those two representations:

| Value | Incoming export | Stored row |
|-------|-----------------|------------|
| Timestamp | Same start | Same start |
| Duration | Same duration | Same duration |
| Title | `my secret file` | `[redacted]` |

The data differed, so the imported event looked new. Insertion redacted it
again, leaving another copy of the stored event. A correct privacy transformation
had broken the assumptions of the duplicate check.

For a fixed rule set, the comparison needs the form that would be persisted.
Writing that down is easy. Putting it in the right layer takes more care.

## Preview the transformation; keep insertion responsible for storage

A tempting repair is to filter events before calling the datastore. That puts
filtered data into an insertion path which already applies the rules.

Now the stored value is `filter(filter(raw))`. That only preserves the intended
result if the transformation is idempotent. A sequence of replacement rules has
no general obligation to be idempotent: one replacement can create input that
another pass matches.

The proposed fix adds a non-mutating preview of the datastore's privacy filter.
Import uses that preview to decide whether the event is already present, and
skips events the preview would drop. Events selected for insertion remain raw;
the datastore applies its rules to that raw input. The preview and insertion
both evaluate the filter, but the output of the preview never becomes the
input to a second filtering pass. The implementation lives in
[the datastore worker](https://github.com/ActivityWatch/aw-server-rust/blob/65331de5da3883b46c84b7c3d8ca1c27b5e3cf83/aw-datastore/src/worker.rs).

That distinction matters beyond redaction. Whenever a persistence layer owns
normalization, callers need a way to compare against its result without quietly
taking over its write contract.

## Existing data remembers older policies

Review exposed a second failure in the initial fix. Enable a privacy rule
*after* storing events, and those existing rows retain their original data.
Comparing only the filtered incoming form then misses a duplicate that the old
raw comparison recognized.

The revised merge checks both the raw identity and the identity produced by
the current filter. It also checks both data forms when deciding whether an
older, shorter export should preserve a longer local event. The
[import implementation](https://github.com/ActivityWatch/aw-server-rust/blob/65331de5da3883b46c84b7c3d8ca1c27b5e3cf83/aw-server/src/endpoints/import.rs)
keeps those decisions together.

This is a bounded compatibility repair. It covers raw rows and rows matching
the current transformation. It does not establish arbitrary compatibility with
every historical rule set, retroactively redact existing history, or give events
a new identity independent of their content.

Redaction is also lossy. Two different source titles can become the same stored
title. Comparing transformed content therefore inherits the limits of a
content-based identity model. A universal identity scheme would need a separate
design; this patch repairs the existing import contract.

## Test across the policy boundary

The two regression scenarios are small and useful: repeated imports with a
redaction rule already enabled, and a re-import after enabling that rule on
previously stored data. The latter also checks that an older export does not
shrink the longer stored event. These are concrete assertions in
[the API tests](https://github.com/ActivityWatch/aw-server-rust/blob/65331de5da3883b46c84b7c3d8ca1c27b5e3cf83/aw-server/tests/api.rs).

For importers, retries, and reconciliation jobs, “the same input twice” is an
incomplete test whenever policy changes the stored representation. Add a case
where policy changes *between* the two inputs. That is where yesterday's data
meets today's definition of equality.

## Postscript (2026-11-10)

[ActivityWatch/aw-server-rust#768](https://github.com/ActivityWatch/aw-server-rust/pull/768)
merged on 2026-10-10 with the preview-then-raw-insert design described above. It
reached users in ActivityWatch v0.14.2, released today, whose bundled server
contains the fix. The limits named in the post still stand: imports are correct
for raw rows and rows under the current rule set, not for every historical
policy, and identity is still content-based.
