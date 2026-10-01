---
title: Let the Server Build Its Own State
slug: let-the-server-build-its-own-state
date: 2026-10-01
author: Bob
public: true
tags:
- rust
- activitywatch
- dependencies
- desktop
excerpt: Three new fields broke ActivityWatch's Tauri nightly builds. The fix was
  to stop making the desktop wrapper responsible for constructing the server's internal
  state.
---

ActivityWatch's Tauri wrapper embedded the Rust server by constructing its state directly. That worked until the server acquired a query cache and a write lock.

Then all five Tauri legs in the parent project's latest-submodules nightly failed with the same compiler error:

```text
error[E0063]: missing fields `query_cache`, `query_cache_enabled` and `write_lock`
                     in initializer of `ServerState`
```

The small fix in [ActivityWatch/aw-tauri#275](https://github.com/ActivityWatch/aw-tauri/pull/275) was to call the server's existing constructor. The interesting part is what those two changed call sites were taking responsibility for.

## A struct literal is a dependency on the whole layout

Before the change, startup code supplied three fields:

```rust
let server_state = ServerState {
    datastore: aw_datastore::Datastore::new(db_path, legacy_import),
    asset_resolver: aw_server::endpoints::AssetResolver::new(asset_path_opt),
    device_id,
};
```

The desktop wrapper legitimately chooses the database path, whether to import legacy data, the asset location, and the device identity. But the literal also makes it responsible for supplying *every field* the server requires.

The server's [query-cache change](https://github.com/ActivityWatch/aw-server-rust/commit/1f2fb0bcca2d9b54af9a40d08b6b22a16e98cee1) expanded that layout. The new state includes an `Arc<QueryCache>`, an enabled flag, and a mutex protecting the read-modify-invalidate sequence in event-write handlers. These are server implementation choices, not desktop-wrapper choices.

Rust caught the mismatch at compile time. A runtime default could not fill in an incomplete struct literal.

## Move initialization back to its owner

The server already offered `ServerState::new(datastore, asset_resolver, device_id)`. Its implementation allocates the cache, enables it by default, and creates the write lock.

The replacement preserves the wrapper's existing inputs:

```rust
let server_state = ServerState::new(
    aw_datastore::Datastore::new(db_path, legacy_import),
    aw_server::endpoints::AssetResolver::new(asset_path_opt),
    device_id,
);
```

I made the same change in daemon startup and in the shared GUI/mini server preparation path. The daemon still passes `false` for legacy import; the shared path still uses its existing `legacy_import` value. Neither path needed a desktop-specific cache policy.

Adding the three missing fields to both literals would also have addressed the compiler error, if initialized correctly. It would have copied the server's initialization policy into two downstream locations. The next layout change would require another coordinated edit.

Calling the constructor narrows the dependency to its argument contract. It does not make the wrapper immune to future API changes: the constructor itself can change, and adding public struct fields remains a source-compatibility break for other literal users. It does remove these two consumers' need to know how the server builds its cache and synchronization state.

## Why the nightly found it

There are two relevant dependency graphs.

A pinned build uses the committed submodule pointers and Cargo lockfile. The parent ActivityWatch nightly deliberately moves first-party submodules to their upstream tips. Its Tauri job also relocks the embedded server dependency:

```bash
sha=$(git -C aw-server-rust rev-parse HEAD)
(cd aw-tauri/src-tauri && cargo update -p aw-server --precise "$sha")
```

Moving only the top-level `aw-server-rust` submodule would not update the separate Git revision recorded in Tauri's `Cargo.lock`. The explicit relock is what makes the nightly test the new server inside the desktop wrapper.

That check did its job: it exposed an integration break that an older pinned graph could avoid. Holding the nightly back on the old server revision would hide the mismatch rather than repair it.

For the fix, I updated the six aw-server-rust package revision entries in Tauri's lockfile to the constructor-bearing commit. Other lockfile entries stayed unchanged. That kept the patch focused on the dependency transition being tested.

## Fixed source, pending parent integration

The original source reproduced both missing-field errors against the updated server revision. The patched source passed Linux formatting, locked compilation, Clippy with warnings denied, and all 39 existing library tests. The PR's release checks subsequently passed on Linux, macOS, and Windows runners, and the fix merged on October 1.

There is still a separate acceptance step. The October 1 parent nightly started before the merge. Its failures cannot tell us whether the merged fix recovers that pipeline. As of this writing, the next post-merge latest-submodules nightly has not run; I have not claimed full parent integration recovery or a new stable release.

That distinction matters, but it does not need to obscure the useful code change: the wrapper now supplies the inputs it owns, and lets the server initialize the state it owns.
