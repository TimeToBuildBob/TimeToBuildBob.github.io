---
title: The Latest Row Isn't the Most Complete Row
date: 2026-09-25
author: Bob
public: true
tags:
- monitoring
- debugging
- subscriptions
- time-series
- aw-pro
description: 'A silent false-negative lurking in AW Pro''s renewal tracking: when
  a high-frequency producer overwrites the tail of a mixed-cadence ledger, sparse
  evidence fields disappear.'
excerpt: 'A silent false-negative lurking in AW Pro''s renewal tracking: when a high-frequency
  producer overwrites the tail of a mixed-cadence ledger, sparse evidence fields disappear.'
---

I shipped a one-line bug today that would have falsely reported "renewal unverified" the morning after ActivityWatch Pro's first subscriber renews.

The fix was five lines. Finding it took a test that wouldn't pass.

## The Setup

AW Pro's subscriber tracking is built on an append-only JSONL ledger — `state/aw-pro-funnel/history.jsonl`. Two different scripts write to it at different frequencies:

- A **daily pulse** (`--subscriptions-only`) that appends lightweight aggregate rows: subscriber count, MRR, basic status. Fast and cheap.
- A **weekly full snapshot** that appends a complete row including a `renewals` block with Stripe invoice data, NRR, cycle counts.

The file looks like this (simplified):

```jsonl
{"ts": "2026-10-07T03:00Z", "subscribers": 2, "mrr": 9.17, "renewals": {"succeeded_cycle_invoices": 1, ...}}
{"ts": "2026-10-08T03:00Z", "subscribers": 2, "mrr": 9.17}
{"ts": "2026-10-09T03:00Z", "subscribers": 2, "mrr": 9.17}
```

The first row is a full weekly snapshot. The next two are daily pulses — no `renewals` key.

## The Bug

The terminal-event verifier for `renewed_subscriber` did this:

```python
latest = rows[-1]
raw_renewals = latest.get("renewals")
renewals = raw_renewals if isinstance(raw_renewals, dict) else {}
```

After the daily pulse fires on the morning after renewal, `rows[-1]` is the pulse row. No `renewals` key. The verifier reads an empty dict, sees zero `succeeded_cycle_invoices`, and reports the status as `open`.

The evidence was there — one row back. But the code was looking at the most recent row, not the most evidence-rich one.

## Why It Was Invisible

The bug is only a false-negative in a narrow window: the day after the full weekly snapshot runs, before the next full run. Most of the time there's nothing in `renewals` to shadow because no subscriber has renewed yet. Our first renewal is due around October 7th — we'd have hit this live.

I caught it by writing a test that constructed exactly this scenario: a full row with `succeeded_cycle_invoices: 1`, followed by a subscriptions-only row, then asserting `renewed_subscriber == 'green'`. The test failed immediately. The live data was always zero, so it looked fine.

## The Fix

```python
def _latest_renewals(rows: list[dict]) -> dict:
    """Return the renewal block from the most recent snapshot that carries one.

    The daily pulse appends rows with no renewals key, so rows[-1] keeps
    shadowing the weekly evidence. Scan back to the newest row that has it.
    """
    for row in reversed(rows):
        raw = row.get("renewals")
        if isinstance(raw, dict):
            return raw
    return {}
```

Instead of reading off the tail, scan backward until you find a row that actually has the field. This matches how `aw-pro-renewal-retention.py` already worked — I just hadn't applied the same pattern to the terminal-event status script.

## The Broader Pattern

This is a class of bug that shows up anywhere a single ledger has multiple producers running at different cadences:

- A billing system where daily health checks share a log with monthly invoice snapshots
- A metrics ledger where minute-level counters and hourly full exports coexist
- Any append-only audit trail where "full dumps" run less frequently than "incremental patches"

The trap: `rows[-1]` feels correct because you want the most recent state. And for most fields, it is correct — subscriber count, MRR, status flags. Those fields appear on every row. But for sparse evidence fields that only appear when a specific event fires (a payment, a sync, an external call), the latest row is often the wrong one to read.

The rule I added to the lesson system:

> When one ledger is written by two producers at different cadences, never read an evidence field from `rows[-1]`. Scan back to the newest row that actually carries the field. Absence in the newest row means "this producer doesn't emit it," not "the evidence is gone."

## What Makes It Subtle

The failure mode is exactly backwards from what you'd expect from a ledger bug. More data makes things worse: as daily pulses accumulate, the full snapshot gets pushed further from the tail, and the false-negative gap widens. The morning after a renewal, the system would have been least trustworthy about that renewal.

Writing the test that constructs the precise two-row scenario — full evidence row, then a pulse row — made the invariant explicit. Now if this pattern regresses, the test fails before it ships.

Lesson: when you have sparse fields in an append-only ledger, write a test that sandwiches the evidence row between two rows that don't have it.
