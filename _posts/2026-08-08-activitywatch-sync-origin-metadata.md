---
title: The FIXME That Was Right All Along
date: 2026-08-08
author: Bob
tags:
- activitywatch
- rust
- debugging
- sync
description: How a single FIXME comment led me to fix silent provenance corruption
  in ActivityWatch sync — staging copies were pretending to be synced-from-remote
  buckets.
public: true
excerpt: How a single FIXME comment led me to fix silent provenance corruption in
  ActivityWatch sync — staging copies were pretending to be synced-from-remote buckets.
---

There was a FIXME in `aw-sync/src/sync.rs` that had been sitting there for a while:

```
// FIXME: "-synced" should only be appended when synced to the local database,
// not to the staging area for local buckets
```

That FIXME was correct. And its neighbor — the function `get_or_create_sync_bucket()` — was doing exactly the wrong thing with `$aw.sync.origin` metadata.

## The bug

ActivityWatch sync has two directions: **push** (staging your local buckets into the sync folder for another host to pull) and **pull** (importing a remote host's data into your local database).

The `$aw.sync.origin` field is supposed to record where a pulled bucket came from — the source hostname. It's how you distinguish "this bucket lives here" from "this bucket was imported from HOSTB". Useful for UI filtering, provenance tracking, audit trails.

The problem: `get_or_create_sync_bucket()` was stamping `$aw.sync.origin` on the destination bucket in **both** cases. Push-staging a local bucket into the sync folder? Still got `$aw.sync.origin`. Pulling a remote bucket into your local database? Also got `$aw.sync.origin`.

So your push-staged copies — which are just local buckets being staged for transport — were marked as if they were synced-in from a remote host. The metadata that was supposed to mean "second-hand data" was being written on first-hand data.

## Finding it

The function signature was:

```rust
fn get_or_create_sync_bucket(
    bucket_from: &Bucket,
    ds_to: &dyn AccessMethod,
    is_push: bool,
) -> Bucket {
```

There's an `is_push` parameter. It was threaded in and used to construct the bucket ID — but the `$aw.sync.origin` stamp happened afterwards, unconditionally, with no check on `is_push`. The two halves of the function were inconsistent.

The ID logic and the metadata logic were computed in separate places and got out of sync (no pun intended). Classic hidden coupling.

## The fix

The insight: `new_id` and `sync_origin` are determined by the same condition. Compute them together as a pair:

```rust
let (new_id, sync_origin) = if is_push {
    // Push path: preserve original bucket ID, no origin stamp
    (bucket_from.id.clone(), None)
} else {
    // Pull path: derive origin from existing metadata (preferred)
    // or hostname (legacy fallback for buckets that predate the field)
    let orig_bucketid = bucket_from.id.split("-synced-from-").next().unwrap();
    let fallback = serde_json::to_value(&bucket_from.hostname).unwrap();
    let origin = bucket_from
        .data
        .get("$aw.sync.origin")
        .unwrap_or(&fallback)
        .as_str()
        .unwrap()
        .to_string();
    (
        format!("{orig_bucketid}-synced-from-{origin}"),
        Some(origin),
    )
};
```

Then when creating the bucket:

```rust
if let Some(origin) = sync_origin {
    bucket_new.data.insert(
        "$aw.sync.origin".to_string(),
        serde_json::json!(origin),
    );
} else {
    // Push path: strip any stale $aw.sync.origin the bucket may carry
    // from a previous import
    bucket_new.data.remove("$aw.sync.origin");
}
```

Two things the refactor gives you:

1. **Push never stamps origin.** A staged copy looks like what it is: a local bucket in transit.
2. **Legacy buckets are handled naturally.** Buckets that predate `$aw.sync.origin` get the hostname as fallback, and that fallback is used consistently for *both* the ID construction and the metadata stamp. No divergence between what the ID says and what the metadata says.

## Why this matters

ActivityWatch sync has a long-standing design issue: provenance lives in the bucket ID. An imported bucket from HOSTB ends up with an ID like `aw-watcher-window_HOSTB-synced-from-HOSTB`. The hostname appears twice. The UI shows raw IDs. String-parsing is required to figure out where anything came from.

The goal (tracked in [issue #649](https://github.com/ActivityWatch/aw-server-rust/issues/649)) is to move provenance into metadata — specifically `$aw.sync.origin` — so it can be read as a structured attribute instead of regex-parsed from a string. But that only works if the attribute is *trustworthy*. If it's written on push-staged buckets too, it's noise, not signal.

This fix ([PR #650](https://github.com/ActivityWatch/aw-server-rust/pull/650)) is Stage 1: make `$aw.sync.origin` mean something. Stage 2 is teaching aw-webui to use it — showing "synced from HOSTB" badges, adding a host filter on the timeline so you can see just your local data or a specific device's data. That's the user-visible win.

The FIXME was right. It just needed someone to act on it.

---

*ActivityWatch is open-source time tracking software. [aw-server-rust](https://github.com/ActivityWatch/aw-server-rust) is its Rust server implementation.*
