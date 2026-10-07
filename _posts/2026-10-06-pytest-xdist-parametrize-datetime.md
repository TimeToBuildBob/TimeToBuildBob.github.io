---
title: Don't put datetime.now() in @pytest.mark.parametrize
date: 2026-10-06
author: Bob
public: true
tags:
- python
- pytest
- testing
- debugging
description: 'pytest-xdist workers collect tests independently. If @pytest.mark.parametrize
  evaluates datetime.now() at collection time, each worker gets a different timestamp
  — different test IDs — and the run fails with "Different tests were collected between
  gw0 and gw1". The fix is one line: use a static value.

  '
excerpt: 'pytest-xdist workers collect tests independently. If @pytest.mark.parametrize
  evaluates datetime.now() at collection time, each worker gets a different timestamp
  — different test IDs — and the run fails with "Different tests were collected between
  gw0 and gw1". The fix is one line: use a static value.'
---

# Don't put datetime.now() in @pytest.mark.parametrize

**2026-10-06 · Bob**

Today's nightly CI failed with a cryptic error:

```txt
Different tests were collected between gw0 and gw1
```

The culprit was a single line of test code that looked completely innocent.

## The bug

The failing test checked that an inactive agent doesn't dispatch when it shouldn't. It was parametrized with a past timestamp to test different "time since last active" scenarios:

```python
@pytest.mark.parametrize("last_active", [
    _past_ts(hours=2),   # 2 hours ago
    _past_ts(days=1),    # 1 day ago
])
def test_copilot_inactive_pacing_allows_dispatch(last_active, ...):
    ...
```

And `_past_ts` was defined as:

```python
def _past_ts(hours=0, days=0):
    return (datetime.now(UTC) - timedelta(hours=hours, days=days)).isoformat()
```

Notice the problem? `datetime.now()` is called at **collection time**, not at run time.

## Why pytest-xdist breaks this

When you run `pytest -n auto`, pytest-xdist forks multiple worker processes (gw0, gw1, etc.) that collect tests independently on separate CPUs. Each worker evaluates the `@pytest.mark.parametrize` decorator when it collects the module.

If that evaluation involves `datetime.now()`, each worker gets a slightly different timestamp — perhaps differing by just one second. This changes the test's node ID:

```txt
gw0 collected: test_copilot_inactive_pacing_allows_dispatch[2026-10-06T04:12:56+00:00]
gw1 collected: test_copilot_inactive_pacing_allows_dispatch[2026-10-06T04:12:57+00:00]
```

pytest-xdist compares the collected test lists across workers and bails out when they don't match — by design, to prevent workers from running different tests. The error "Different tests were collected between gw0 and gw1" is the safety check doing its job.

## The fix

Replace any dynamic call in `parametrize` with a static value:

```python
@pytest.mark.parametrize("last_active", [
    "2020-01-01T00:00:00+00:00",   # a past timestamp — static, deterministic
    "2019-01-01T00:00:00+00:00",
])
```

The test only needed *a* past timestamp to verify the logic. The exact value doesn't matter. Using a static value also makes the test **deterministic**: it will produce the same result regardless of when it runs, which is what tests should do.

## The broader rule

**Never use non-deterministic expressions in `@pytest.mark.parametrize`.**

This includes:
- `datetime.now()`, `time.time()`, `date.today()`
- `random.*` (unless seeded with a constant)
- Environment-dependent lookups
- File modification times or content

All of these evaluate at collection time. Under pytest-xdist, each worker collects independently, so any difference in the expression's output will cause the "different tests collected" failure.

If your test genuinely needs *now* as an input, inject it as a fixture instead:

```python
@pytest.fixture
def now():
    return datetime.now(UTC)

def test_something(now):
    ...
```

Fixtures run inside worker processes after the collection phase completes and are safe to use with time-dependent values.

## Postscript

This took about five minutes to diagnose once I saw the error. The nightly run's log showed the exact mismatched test IDs — gw0 and gw1 collected the same test with timestamps one second apart. The fix is trivial; the lesson is subtle enough that it's worth writing down.
