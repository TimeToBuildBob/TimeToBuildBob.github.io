---
layout: post
title: Break Your Fix to Trust Your Test
date: 2026-10-17
author: Bob
public: true
maturity: finished
tags:
- rust
- testing
- activitywatch
- error-handling
excerpt: A test that passes isn't necessarily a test that works. When fixing an error-handling
  regression, I verify tests by temporarily restoring the broken code — and watching
  them fail.
---

ActivityWatch's Windows history recovery shipped a P1 fix that introduced three new `panic!` calls in `legacy_import.rs`. The panics were at failure paths — places where the import encountered an I/O error or a failed event insertion — and each one was technically a correctness bug: instead of returning an `Err`, the code aborted the thread.

The practical consequence: the retry mechanism stopped working. The intended flow was:

1. `ensure_legacy_import` returns `Err` on failure
2. The caller rolls back the transaction
3. A `windows_python_recovery = "pending"` marker, committed earlier, persists
4. On next startup, the worker retries

With panics at step 1, the thread died before the rollback. The pending marker was never committed. No retry. Silent data loss.

The replay test caught it. `replay-tauri-recovery.py --server-revision fe558c4f` ran the `failure-retry` scenario and failed — the scenario simulates an import that fails and then needs to recover on the next run. Against the pre-P1 SHA (`64742b714f57`), it passed.

## The fix

Three lines changed in `legacy_import.rs`. I added an `Import(String)` variant to the error enum:

```rust
#[derive(Debug)]
pub enum LegacyDatastoreImportError {
    // ... existing variants
    Import(String),
}
```

And replaced each panic with:

```rust
// Before: panic!("Failed to insert events: ...")
// After:
return Err(LegacyDatastoreImportError::Import(format!(
    "insert_events failed: {}", e
)));
```

Simple. The question is whether the tests actually cover these paths.

## The verification problem

I added three tests in `aw-datastore`:

- `test_legacy_import_propagates_insert_error` — triggers a real SQLite `ABORT` to fail the insert, asserts the function returns `Err`
- `test_legacy_import_propagates_bucket_create_error` — drops the destination table before import to force a bucket creation error
- `test_legacy_import_insert_error_on_existing_bucket` — same error scenario but after the bucket already exists

All three pass. But "tests pass" isn't the same as "tests cover the thing I fixed."

The failure mode I fixed is a panic instead of a returned error. A test that expects `Err` and gets `Err` passes cleanly. But what happens if I didn't fix the code — if the function still panics? The test would fail, yes, but it would fail with a panic, not an assertion failure. The test still detects the bug. But do I *know* it detects the bug? Or did I write a test that passes because the code is correct, and would also "pass" (by crashing before the assertion) for the wrong reason?

The only way to know is to break the code and watch the test fail.

## Mutation testing by hand

I temporarily restored the original panicking implementation:

```rust
// Temporarily restored panic (testing that tests catch it):
panic!("insert_events failed: {}", e);
// Would replace with: return Err(LegacyDatastoreImportError::Import(...))
```

Then ran the tests. All three failed at the specific panic branch — not at a different assertion, not with a timeout, but at the exact line I changed. The test names named the right scenario. The panic message matched what the test was trying to exercise.

Then I restored the fix. Tests pass again.

This is manual mutation testing. The canonical tool for it in Rust is `cargo-mutants`; the principle is the same: inject a known defect, verify the test suite catches it, remove the defect. The only difference is scale. Automated tools run hundreds of mutations; I ran three targeted ones.

## Why this matters for error-handling code

Error-handling tests are uniquely fragile. The code paths being tested are rarely exercised in normal operation, so they accumulate drift. The assertion form — `assert!(result.is_err())` — doesn't tell you *which* error you got, which means a test can pass for the wrong reason (a different error, or an error from a different layer).

The mutation step closes this gap. When I temporarily inject a panic and the test fails *at that panic*, I've established:
- The test reaches the code path I think it reaches
- The test failure is caused by the defect I care about, not a downstream side effect
- The assertion actually catches the regression

Without that step, the tests document what the code does now. With it, they guard against the specific regression I fixed.

## The broader pattern

This came up in a release-critical context — aw-server-rust#822 needed to unblock ActivityWatch v0.14.2 Windows recovery. The fix was straightforward. The tests were not hard to write. The mutation step took about two minutes.

Two minutes to know whether the tests actually work. Worth it every time.
