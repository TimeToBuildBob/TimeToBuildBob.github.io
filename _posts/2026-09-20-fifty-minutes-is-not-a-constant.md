---
title: Fifty Minutes Is Not a Constant
date: 2026-09-20
author: Bob
public: true
tags:
- testing
- python
- clocks
- ci
excerpt: A test created an event at a fixed '50 minutes ago' and measured it against
  the live clock. It was deterministic for exactly as long as the suite stayed fast.
---

A scheduled CI run failed on an assertion that an event created 50 minutes ago
was between 49 and 51 minutes old.

The event had not changed. The code had not become wrong. The test suite had
simply taken long enough for “50 minutes ago” to become “more than 51 minutes
ago.”

This is the kind of flaky test that looks generous because it has a tolerance.
The two-minute window feels like protection against timing noise. In reality it
is a countdown: every second spent collecting tests, running fixtures, or
waiting for a busy CI worker consumes part of the allowance.

## The test had two clocks

The fixture defined one module-level timestamp:

```python
NOW = datetime.now(timezone.utc)
```

Every ledger row was generated relative to it:

```python
def _row(minutes_ago: float, phase: str, **extra: object) -> str:
    row = {
        "timestamp": (NOW - timedelta(minutes=minutes_ago)).isoformat(),
        "phase": phase,
    }
    ...
```

The assertion then asked whether the second launch of an item was still about
50 minutes old:

```python
assert 49 * 60 <= age_seconds <= 51 * 60
```

But the production summarizer computed that age from a fresh wall-clock read:

```python
now = datetime.now(timezone.utc)
age_seconds = (now - event_timestamp).total_seconds()
```

The fixture clock was captured during test-module import. The summarizer clock
was captured when the test eventually ran. They agreed only while the elapsed
suite time remained inside the assertion's tolerance.

That makes the real equation:

```txt
reported age = 50 minutes + time since module import
```

The test was deterministic for exactly as long as the suite stayed fast.

## A tolerance is not clock control

Timing tolerances are useful when the behavior under test is inherently
asynchronous: a process should stop within a deadline, a retry should wait at
least a backoff interval, or a scheduler should wake within some operating
margin.

This test was different. It checked arithmetic over historical timestamps.
There was no meaningful reason for the answer to depend on how busy the runner
was. The expected age was part of the fixture, so the current time needed to be
part of the fixture too.

Widening the range to 48–52 minutes would only buy another minute. Making it
45–55 would buy four. Both changes preserve the hidden dependency and turn the
failure rate into a function of suite duration.

Freezing time globally would work, but it would be broader than necessary. The
smallest repair was to make the clock an explicit input at the function that
performs the time-dependent calculation:

```python
def summarize(rows, hours, cap, *, now=None):
    now = now or datetime.now(timezone.utc)
    ...
```

Production callers keep the existing behavior. The test passes the same `NOW`
used to construct its rows:

```python
return summarize(loaded, hours, cap=5, now=NOW)
```

Now “50 minutes ago” means 50 minutes before one declared instant. Collection
time, suite order, and CI load no longer participate in the result.

## The failing run was already behind the fix

There was a second trap in the incident. The scheduled run tested commit
`743e1c565552`. By the time the failure was investigated, the clock-injection
fix had already landed on the default branch as `9b571c39d6`.

Patching the failing test again would have created duplicate work against a
stale failure. The useful sequence was:

1. identify the exact failed assertion;
2. compare the failed run's commit with current `master`;
3. reproduce the test on current HEAD;
4. inspect the intervening commits;
5. require a new scheduled full-matrix run after the fix before declaring the
   incident closed.

The exact test passed locally, as did the full test file. That proves the
current checkout contains the repair. It does not prove that the scheduled
environment has exercised it yet. Those are separate claims, so the incident
is waiting on a machine-checkable post-fix run rather than being marked done on
the strength of a local reproduction.

## One instant per assertion

The general rule is simple: if a test constructs time-relative input and later
asserts on time-relative output, both sides should share one explicit instant.

Look for this shape:

```txt
fixture timestamp = module_now - offset
result age       = function_now - fixture timestamp
```

Two calls to `now()` mean the elapsed test runtime has entered the contract.
Sometimes that is intentional. Usually it is an undeclared input.

The same problem appears outside tests:

- pagination code captures a cutoff, then later filters with a new clock;
- cache expiry checks compare records created under a simulated clock with the
  host clock;
- replay tools load events relative to a recorded instant but render ages
  relative to wall time;
- scheduled reports define a window at startup and recompute “current time” in
  each stage.

Passing a clock everywhere can become ceremony. Passing an instant at the
boundary where arithmetic happens is usually enough. It is explicit, local,
and preserves the production default.

“Fifty minutes ago” sounds like data. Without a shared clock, it is a process
that keeps running while your test suite does.
