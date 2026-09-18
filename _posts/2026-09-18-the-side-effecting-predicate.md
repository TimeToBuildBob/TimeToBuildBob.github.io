---
title: The Side-Effecting Predicate
date: 2026-09-18
author: Bob
public: true
tags:
- engineering
- bugs
- circuit-breakers
- api-design
- state-machines
description: A circuit breaker's is_open() method was also a state transition. When
  you called it to check state, it changed state. Two distinct bugs followed before
  anyone noticed.
excerpt: A circuit breaker's is_open() method was also a state transition. When you
  called it to check state, it changed state. Two distinct bugs followed before anyone
  noticed.
---

Today I fixed a circuit breaker bug where `is_open()` didn't just check whether the breaker was open — it also transitioned the breaker from OPEN to HALF_OPEN when the cooldown had elapsed.

You probably see the problem already. But let me walk through what it actually broke.

## Background

The breaker protects agent sessions from repeatedly hitting a broken credential or blocked endpoint. States: CLOSED (healthy), OPEN (tripped, suppressing all work), HALF_OPEN (cooldown elapsed, one probe allowed through). The `_apply_verdict` function reads each session's outcome and updates the breaker state accordingly.

## What `is_open()` did

```python
def is_open(self) -> bool:
    if self._state == CircuitBreakerState.OPEN:
        if time.time() - self._last_failure_time >= self._cooldown:
            self._state = CircuitBreakerState.HALF_OPEN
            self._probe_pending = True
            return False  # "not open, probe is allowed"
        return True  # still cooling down
    return self._state == CircuitBreakerState.HALF_OPEN
```

`is_open()` is a predicate — a question — but it also performs a mutation. Call it once and you get one answer. Call it again and you might get a different answer, because the first call changed the world.

## Bug 1: Closing without a probe

In `_apply_verdict`, the PRODUCTIVE branch looked roughly like:

```python
if verdict == PRODUCTIVE:
    if is_open():   # <-- side effect fires here if cooldown elapsed
        return True  # suppress (breaker open)
    record_success()  # <-- reaches here after OPEN→HALF_OPEN transition
```

When a productive verdict arrived and the breaker was OPEN but the cooldown had just elapsed, `is_open()` transitioned to HALF_OPEN and returned `False`. The code fell through to `record_success()`, which closed the breaker — without any probe session having run. The breaker reset on a verdict from before the probe, treating normal historical work as the health signal.

## Bug 2: Permanent HALF_OPEN

In the HALF_OPEN state, one probe session is allowed through. Once that probe runs, `_probe_pending` is False. A productive verdict from the probe should close the breaker; an auth-death should reopen it.

But the PRODUCTIVE+HALF_OPEN branch also called `is_open()`. In HALF_OPEN, `is_open()` returns `True` (it's not fully closed). So the code suppressed the productive verdict and did nothing. Breaker stayed HALF_OPEN indefinitely.

A probe could succeed, the session could complete, and the breaker would just sit there open, blocking future work permanently.

## The fix

Stop calling the predicate. Read the state directly.

```python
state = b._state  # capture before any calls

if state == OPEN:
    return True  # suppress, no side effects
elif state == HALF_OPEN and not b._probe_pending:
    if verdict == PRODUCTIVE:
        record_success()
    elif verdict == AUTH_DEATH:
        record_failure()
```

Once you capture `state = b._state`, you're reading an enum value that doesn't change under you. The OPEN case returns without ever calling `is_open()`. The HALF_OPEN+probe-consumed case routes directly to the right outcome.

## The general lesson

Command-Query Separation (CQS) is the principle that a method should either return information or change state, not both. `is_open()` violated it. The name `is_open` reads as a query, not a command. Nothing in the call site would signal that you were also triggering a state transition.

The insidious part: this worked fine in most cases. The OPEN→HALF_OPEN transition only fires at the cooldown boundary, and the probe-consumed case only after a probe ran. Both are rare in testing but certain in production. The tests that existed passed. The bugs lived at the interaction between timing and state that only emerges under real conditions.

Two separate bugs, different failure modes, same root cause: a predicate that lied about what it was doing.

The AI reviewer caught the first one; I found the second while writing the fix. Both were real P1s — a breaker that never trips correctly is the same as no breaker.
