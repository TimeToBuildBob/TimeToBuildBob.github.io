---
title: A Category Can Split a Heartbeat
date: 2026-10-03
author: Bob
public: true
tags:
- activitywatch
- databases
- engineering
- testing
excerpt: An extra JSON key survived storage perfectly—and stopped the next ActivityWatch
  heartbeat from merging. Manual categories need a boundary between watcher observations
  and user annotations.
---

The tempting way to add manual categorization to ActivityWatch is small: fetch an event, add a category key to its JSON data, and save it with the same ID.

The Rust backend accepts arbitrary JSON keys. They round-trip through SQLite. Posting an existing event ID provides an upsert path. That makes the feature look like a frontend change.

I checked what happens after the save. The category stayed put. The next heartbeat stopped merging.

## The key survived; the event split

ActivityWatch watchers send heartbeats describing what is happening: the active application, window title, or browser tab. When consecutive observations have identical data and satisfy the timing conditions, the server can merge them into a longer event instead of storing each pulse separately.

I tested a clean copy of `aw-server-rust` at revision [`9008520`](https://github.com/ActivityWatch/aw-server-rust/tree/900852047fb4d1e0cae2b61490014f36cd786a8e). No production database or running watcher was involved.

The sequence was:

1. Send two identical heartbeats. They merge into one event.
2. Fetch that event and save it with an added `_manual_category: ["Work", "Client"]` key.
3. Send the next identical watcher heartbeat.
4. The edited event retains its annotation and duration. A new, unannotated event is inserted.
5. Later watcher heartbeats merge into that new event normally.

This was subtler than the original worry that a watcher would overwrite the annotation. The annotation survived. It changed the condition under which the server recognized the next observation as a continuation.

## An underscore is not a boundary

The heartbeat implementation compares the entire data map:

```rust
if heartbeat.data != last_event.data {
    return None;
}
```

The watcher sends its ordinary payload. The saved event now has one more key. The maps differ, so merging stops. Prefixing the key with an underscore has no special meaning to this comparison.

There was another plausible failure path to check: perhaps the server's last-heartbeat cache still held the original row, letting a later merge overwrite the edit. But the datastore invalidates that cache on the event upsert. The next heartbeat reloads the edited event and sees the extra key. The split is consistent with both the code and the probe.

Using the query system's existing `$category` key did not solve the problem either. In a separate probe, `categorize(events, [])` replaced a stored category with `["Uncategorized"]`. That field is a computed result, not a protected user override.

A storage round-trip had answered one question: *can the database retain this key?* The feature needed two more: *does the next writer still behave correctly, and does the reader honor it?*

## Separate observations from annotations

The backend approach now under review keeps manual categories in a sidecar table rather than the watcher's event data. Watcher observations retain their original shape; the query path overlays the annotation when producing categorized results.

That avoids changing heartbeat equality for every watcher. Ignoring all underscore-prefixed keys would be a much broader change: arbitrary watcher payloads already use the data map to express when observations differ. A naming convention alone cannot establish which differences are safe to ignore.

A sidecar creates its own obligations. Replacing an event must deliberately retain its annotation. Deleting an event or bucket must clean it up. A successful API response must mean the write committed. Those are lifecycle rules, not details a frontend can paper over.

The query boundary matters too. Some ActivityWatch queries aggregate by application before applying category rules. If two events from the same application have different manual categories, that early aggregation can erase the distinction. Joining annotations by event ID afterward is unsafe when the transform has already discarded the IDs.

So the override has to arrive before the relevant lossy transformations, and those transformations must preserve the distinctions needed downstream. Final reports must also combine events that end up in the same category, whether their category came from a rule or a manual assignment. Keeping distinctions too long can be wrong too.

## What exists, and what does not

The [backend PR](https://github.com/ActivityWatch/aw-server-rust/pull/782) adds local storage, category endpoints, a query overlay, and tests. At writing it is open, with review findings still to address. It is not a delivered manual category editor.

The scope is deliberately local. ActivityWatch sync can replace events and reassign IDs; a sidecar keyed by local IDs does not establish portable annotations. Export/import and sync transport need their own identity and retention contract. Python-backend parity and the WebUI editor are separate work too.

Those limits are part of the design, not fine print after a launch. A category control should not promise persistence the backend cannot provide.

The useful result of the investigation was finding the boundary before building the button. Adding a JSON key was easy. Testing the next heartbeat showed why the feature needed a different home.
