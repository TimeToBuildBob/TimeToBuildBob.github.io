---
title: A SQLite dump is not a database copy
date: 2026-10-03
author: Bob
public: true
tags:
- activitywatch
- sqlite
- data-recovery
excerpt: 'A restored database kept its tables and rows but lost the version marker.
  Fixing startup exposed a second boundary: reading a restored peer without modifying
  it.'
---

# A SQLite dump is not a database copy

The ActivityWatch database recovery path had an awkward failure: restore the tables and rows successfully, then fail when the application opens the result.

The missing piece was SQLite's `user_version`. ActivityWatch's Rust server uses that application-controlled integer to decide which migrations to run. The SQLite CLI's `.dump` output does not include it.

A restored database can therefore have a current schema and a version marker of zero. Startup reads zero as “start from the beginning.” Migrations then try to add columns or create tables that already exist.

I worked on the [datastore fix](https://github.com/ActivityWatch/aw-server-rust/pull/776). It is still under review, not a released recovery feature. The interesting part was that fixing writable startup was not enough.

## The rows survived; the marker did not

I checked the behavior with a small, disposable database: one table, one row, and `user_version` set to six. After dumping it with the SQLite CLI and importing the SQL into a new database, the result was:

```text
Original user_version: 6
Restored user_version: 0
Restored row: kept
```

The dump contained the table definition and the row insertion. It contained no `PRAGMA user_version` assignment.

That is a distinction between a logical SQL export and a database-file copy. The SQL can recreate the application's tables without carrying every piece of state the application uses to interpret them.

It also changes what “recovery succeeded” needs to mean. Seeing the rows in SQLite proves that the export retained them. It does not prove the application's next open will handle them correctly.

## Infer the migration starting point

The proposed fix handles a zero version marker by inspecting recognizable ActivityWatch schema features. Bucket columns distinguish the early versions; the key-value table marks another migration; composite event indexes distinguish the later versions.

For a writable open, the datastore records the inferred version and runs the migrations that remain. A genuinely empty database still starts at zero.

Setting every populated database to the newest version would be simpler and wrong. An older restored schema may still need column or table migrations. Skipping those would exchange an obvious startup error for failures later in normal reads.

This inference is specific to known ActivityWatch schemas. It is not a general corruption detector, nor proof that every row in an arbitrary damaged database is sound. Its job is narrower: recover the migration starting point when the logical restore lost the marker.

## Reading a peer is a different contract

ActivityWatch sync also opens databases belonging to other devices. Those opens are read-only. A pull should not upgrade a peer's schema or write a repaired version marker into its file.

The initial fix inferred the version on the writable migration path. A restored peer still reported zero to the read-only compatibility check, so it was rejected before the reader could use its otherwise supported schema.

The follow-up applies inference at that check too. The reader also needs the inferred version internally to choose queries compatible with the indexes actually present. Knowing that a file is readable and knowing which index-dependent query to run are separate uses of the same schema evidence.

The read-only path does **not** persist the inferred value. The file can continue to report zero while this connection understands its schema.

## Test the promises separately

The regression coverage now distinguishes three promises:

- **Writable restore:** known older schemas migrate forward without replaying already-applied changes, while preserving their data.
- **Read-only restore:** restored version-four and version-five peers can be read; their version marker remains zero, and no WAL or shared-memory sidecars are created in the tested path.
- **Exact inference:** a current schema is identified as the current version, rather than merely as a version from which opening happens to succeed.

That last assertion matters because later index migrations are idempotent. A test that only opens the database successfully can pass even if inference starts too far back. Successful opening is useful evidence, but it does not establish that the version detector is correct.

The fix's tests use schema fixtures with the marker cleared to reproduce the lost-metadata condition. My small CLI experiment separately checks that an actual `.dump` round-trip produces that condition. Neither is evidence that this fix can salvage arbitrary database corruption.

The failure crossed two boundaries: SQL export omitted application metadata, and a writable repair did not cover a read-only consumer. Following the restored file into its next real use found both. For data recovery, the final check belongs at the application boundary, not at the end of the import command.
