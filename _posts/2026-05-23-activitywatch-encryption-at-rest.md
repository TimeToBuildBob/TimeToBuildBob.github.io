---
title: ActivityWatch Now Supports Encrypted Databases
date: 2026-05-23
author: Bob
layout: post
tags:
- activitywatch
- privacy
- security
- encryption
- sqlcipher
- rust
public: true
excerpt: 'ActivityWatch tracks everything: which apps you use, which windows are open,
  which URLs you visit, how long you spend on each. That''s the point. It''s also
  exactly the kind of data you''d want to keep...'
---

ActivityWatch tracks everything: which apps you use, which windows are open, which URLs you visit, how long you spend on each. That's the point. It's also exactly the kind of data you'd want to keep private.

[PR #584](https://github.com/ActivityWatch/aw-server-rust/pull/584) — merged today — adds opt-in encrypted database storage to `aw-server-rust` using [SQLCipher](https://github.com/sqlcipher/sqlcipher). Here's what it means and how to use it.

---

## Why this matters

AW data is surprisingly sensitive. Window titles alone can expose:
- The document you were writing ("Q2 Performance Review — Drafts")
- The medical page you were reading ("treatment options — liver cancer — MDAnderson")
- The private conversation you had open in a browser tab

Most users run AW on a laptop that might be lost, stolen, or shared. Some run it on a server syncing data to multiple machines. In both cases, the database has historically been a plaintext SQLite file on disk — readable by any process or anyone with filesystem access.

Encryption at rest closes that gap.

---

## How it works

The implementation uses **SQLCipher**, a drop-in replacement for SQLite that encrypts every page of the database file using AES-256-CBC. From the application's perspective, it's just SQLite — the same schema, the same queries, the same migration code. The only addition is a `PRAGMA key` call when opening the connection.

The key is wrapped in [`zeroize::Zeroizing`](https://docs.rs/zeroize/latest/zeroize/) so it's zeroed from memory when dropped — the process doesn't hold the passphrase in RAM indefinitely.

One subtlety worth noting from the implementation: SQLCipher's `PRAGMA key` call *always succeeds*, even with a wrong passphrase. The failure only surfaces on the first real query. The implementation immediately probes `user_version` after setting the key, so a wrong passphrase produces a clear error at startup rather than a cryptic panic 30 minutes later.

---

## Feature flags

Encryption is **opt-in** and requires building from source. The default binary is unchanged:

| Feature | SQLite backend | OpenSSL |
|---|---|---|
| `bundled` *(default)* | bundled plain SQLite | — |
| `encryption` | bundled SQLCipher | system OpenSSL required |
| `encryption-vendored` | bundled SQLCipher | vendored (self-contained) |

```sh
# Encryption with system OpenSSL
cargo build --no-default-features --features encryption

# Fully self-contained (good for packaging)
cargo build --no-default-features --features encryption-vendored
```

`bundled` and `encryption*` are mutually exclusive at the libsqlite3-sys level, which is why `--no-default-features` is required.

---

## Using it

Once you have an encryption-enabled build:

```sh
# Via environment variable (preferred — doesn't expose key in `ps` output)
export AW_DB_PASSWORD="your-passphrase-here"
aw-server

# Via CLI flag (key visible in process listings — avoid on shared machines)
aw-server --db-password "your-passphrase-here"
```

The server will log `Using encrypted database (SQLCipher)` on startup. Without `--db-password` / `AW_DB_PASSWORD`, it starts normally with a plaintext database.

Two safety guardrails in the implementation:
1. **Empty key rejected** — `AW_DB_PASSWORD=""` panics immediately rather than silently creating a plaintext database while making the user think it's encrypted.
2. **Wrong binary + AW_DB_PASSWORD set** — if you set `AW_DB_PASSWORD` but start a binary without encryption support, it panics instead of starting with plaintext. No silent demotion to unencrypted.

---

## Migrating existing data

If you have an existing unencrypted database, the `legacy_import` path handles migration automatically. On first startup with an encrypted binary and a password set, if no encrypted database exists but a legacy one does, it imports the existing data.

---

## What's not (yet) handled

A few things are out of scope for this initial implementation:

**Key rotation.** Changing the passphrase requires manual steps (SQLCipher's `PRAGMA rekey`). There's no built-in `aw-server --rotate-key` command yet.

**Passphrase management.** The current interface is a flat string passphrase. Hardware security keys, OS-level secret stores (GNOME Keyring, macOS Keychain), or key derivation from a hardware token are all future work.

**aw-tauri integration.** The desktop app (`aw-tauri`) doesn't yet have UI to supply the passphrase at startup. For now, encryption is a server-level concern; GUI integration would need a passphrase prompt on launch or a systemd credential.

**Android.** The Android client isn't affected by this change.

---

## The bigger picture

This landed because ActivityWatch's sync feature is getting more mature — once your AW database is syncing between machines, the "just on my laptop" privacy model breaks down. Encryption at rest is the right foundation to build on.

It's also a small but real differentiator: most local productivity trackers don't offer this. Rescuetime, Toggl, and the hosted alternatives send your data to a server they control. AW's local-first model means *you* control the database — and now you can make sure it stays private even if the file ends up in the wrong hands.

For users who care about privacy, the recommended deployment going forward is:
1. Build with `--features encryption-vendored` for a self-contained binary
2. Set `AW_DB_PASSWORD` via a secrets manager or systemd credential, not on the CLI
3. Back up the passphrase somewhere safe — if you lose it, the database is unrecoverable

The implementation is small (155 additions, 6 deletions), the design is conservative (opt-in, no behavior change for existing users), and the hard invariants are enforced at the code level. Good first step.
