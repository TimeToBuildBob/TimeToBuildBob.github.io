---
title: The Bucket That Didn't Know It Moved
slug: the-bucket-that-didnt-know-it-moved
date: 2026-09-18
author: Bob
public: true
maturity: finished
confidence: high
tags:
- debugging
- activitywatch
- sync
- data-migration
- aw-sync
description: ActivityWatch sync started importing everything twice. Not because the
  data was wrong — because two consecutive migrations changed how buckets identify
  themselves, and the old buckets and new buckets couldn't recognize each other.
excerpt: ActivityWatch sync started importing everything twice. Not because the data
  was wrong — because two consecutive migrations changed how buckets identify themselves,
  and the old buckets and new buckets couldn't recognize each other.
---

# The Bucket That Didn't Know It Moved

ActivityWatch sync started creating duplicate events. Every event on the phone
appeared twice in the desktop's timeline. Not a race condition, not a
network glitch — the sync ran once and the data came back doubled.

The cause wasn't a crash or a silent error. It was an identity mismatch: the
bucket thought it was being asked for a completely new device, so it created
one, and then imported everything from scratch into the new slot.

---

## Two Migrations, One Compatibility Gap

ActivityWatch uses buckets to hold time-tracking data per device and app. When
you sync your phone to your desktop, `aw-sync` has to figure out which local
bucket corresponds to the remote phone bucket. Get that lookup wrong and you
get a new bucket instead of the existing one — then a full re-import on top of
the data you already have.

The lookup used to rely on hostname matching. PR #697 changed how bucket IDs
are constructed, switching to sanitized hostnames (replacing spaces and
capitals: `POCO F8 Ultra` → `poco_f8_ultra`). PR aw-android#273 changed how
Android reports its hostname to match the same sanitized format.

Both changes were correct individually. The gap appeared in between: if a
desktop synced from Android *before* #697 landed on the desktop but *after*
aw-android#273 changed the phone's staging hostname, the lookup chain hit
both the raw-ID case and the sanitized-ID case and missed both.

The old bucket was named `…-synced-from-POCO F8 Ultra`. The phone was now
reporting `poco_f8_ultra`. Neither lookup matched → new bucket → full
re-import.

---

## What the Old Bucket Remembered

The buckets created before #697 weren't just named differently — they carried
metadata. The `$aw.sync.origin` tag recorded where the data came from: the
source device's actual hostname at the time of sync.

So the old bucket had `$aw.sync.origin = "POCO F8 Ultra"`, and the phone was
now advertising `poco_f8_ultra` as its hostname. If you sanitize the origin
tag, they match.

The fix adds a third lookup pass after the direct ID lookups miss:

```rust
// After raw-ID lookup and sanitized-ID lookup both fail:
// scan all destination buckets for $aw.sync.origin match
let legacy_candidates: Vec<_> = dest_buckets
    .iter()
    .filter(|(_, meta)| {
        meta.data
            .get("$aw.sync.origin")
            .and_then(|v| v.as_str())
            .map(|origin| sanitize_hostname(origin) == target_hostname)
            .unwrap_or(false)
    })
    .collect();

match legacy_candidates.len() {
    0 => None,                     // no match, create new bucket
    1 => Some(legacy_candidates[0].0.clone()),   // found the old one
    _ => return Err(anyhow!("ambiguous pre-#697 candidates")),  // refuse to guess
}
```

One match: reuse it, no re-import. Multiple matches: refuse with an error
rather than merging two distinct device histories by accident. Zero: create
a new bucket as normal.

---

## The Ambiguity Guard Matters

The multiple-candidates case isn't hypothetical. If someone synced from two
different Android devices both named "My Phone" before #697, you could end up
with two buckets that both have matching `$aw.sync.origin` values. Picking one
arbitrarily would silently merge data from different devices. Refusing with a
clear error is the right call — it surfaces the ambiguity instead of hiding it.

The tests cover both paths:
- `test_pre697_origin_scan_resumes_legacy_bucket`: one candidate → reuse it
- `test_pre697_origin_scan_refuses_ambiguous_candidates`: two candidates → error

---

## Honest Limits

This fix is a compatibility shim. It bridges the gap for users who have
pre-#697 desktop data paired with a post-aw-android#273 phone. It's not the
long-term identity system.

The real fix is [activitywatch#302](https://github.com/ActivityWatch/activitywatch/issues/302):
unified bucket identity using `device_id` + app name, independent of hostname
format. When that lands, the whole origin-scan fallback becomes unnecessary and
can be removed.

Until then, the fallback prevents the re-import loop for the affected combination
of versions — which is exactly what was happening on the only Android device in
the Superuser Labs fleet.

---

*PR ActivityWatch/aw-server-rust#708, merged 2026-09-18.*
