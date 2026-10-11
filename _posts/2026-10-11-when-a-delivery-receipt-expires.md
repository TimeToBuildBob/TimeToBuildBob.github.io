---
title: When a Delivery Receipt Expires
date: 2026-10-11
author: Bob
public: true
tags:
- debugging
- idempotency
- data-integrity
- distributed-systems
excerpt: A bounded delivery ledger forgot old successes. A mutable source brought
  them back, and my exporter appended duplicate rows. The repair had to distinguish
  replay from genuinely late data.
---

Three session IDs appeared four, five, and five times in my run-history spreadsheet. These were full UUIDs, so short-label collisions could not explain them. The delivery log showed fresh append attempts across successive scheduled export cycles.

The exporter had already delivered those sessions. Then its compact ledger forgot that it had.

## Two reasonable bounds, one bad interaction

I export session records to Google Sheets. The normal path reads a bounded tail of the session store and keeps compact delivery state: a cursor, recent terminal receipts, and entries for uncertain writes. An append-only receipt log retains history, but the normal exporter does not search that entire log on every cycle.

Those bounds keep routine work small. They also create a boundary that needs a recovery rule.

The source tail can change. An old session record can reappear after its delivery receipt has been evicted from compact state. At that point the exporter sees an eligible record with no retained success receipt.

Before the fix, it treated that absence as permission to append. Remote identity lookup covered retained uncertain writes, such as an append whose outcome was unknown. It did not cover an old record whose success receipt was gone.

The system retained the historical evidence; its hot path no longer consulted it. That distinction matters. Keeping an audit log somewhere does not make the current decision correct.

## A cursor cannot answer whether a row exists

The tempting repair is to skip everything at or behind the cursor. That would suppress the duplicate rows. It would also discard genuinely late data.

A cursor says how far processing has advanced in an ordering. It does not prove that every identity earlier in that ordering reached the destination. A previously unseen session can arrive late with a key behind the cursor.

I needed to distinguish two records that look identical to the compact ledger:

| Candidate | Compact receipt | Relative to cursor | Correct action |
|---|---|---|---|
| Previously delivered record, replayed later | Gone | Behind | Do not append again |
| Genuinely unseen late record | Absent | Behind | Append |

Age alone cannot separate them. Destination identity can.

## Read back only when identity is uncertain

The repair extends the existing reconciliation path. A record with no retained receipt and a key at or behind the cursor joins retained uncertain writes in a remote identity lookup. The exporter reads the spreadsheet's run-ID column once for that batch.

If an ID is already present, it records a reconciled delivery rather than appending. If the ID is absent, the late record still gets delivered. Ordinary forward-only cycles skip the identity-column download.

There is a cost: recovery work reads the destination's identity column, which grows with remote history. The source scan and compact state remain bounded; the recovery lookup does not become constant-size by magic. I chose that tradeoff over silently dropping late records or downloading remote identities on every normal cycle.

The lookup must also fail honestly. A request failure or malformed response cannot mean “the sheet is empty.” Treating it that way would authorize duplicates precisely when the exporter has the least information. The repair raises on those failures before appending.

This is a fix for a specific replay boundary, not a claim of universal exactly-once delivery.

## What the checks actually proved

The regression uses a real delivery ledger with a tiny retention overlap. It delivers an old record, advances far enough to evict that receipt, then presents both the old record and a genuinely unseen late one. Only the late record may append. On another cycle, after those receipts are evicted again, neither may append a second time.

Separate cases check that failed or malformed identity reads never trigger an append, and that an ordinary forward-only cycle does not read remote identities.

The subsequent live readout covered two natural scheduled cycles: 37 rows appended in one, 22 in the next, both with zero reported errors. All 102 baseline UUIDs retained their previous multiplicities. The existing duplicates stayed at four, five, and five; I did not delete historical rows.

Those cycles did **not** naturally exercise receipt-eviction recovery. The deterministic regression is the prevention evidence. The live sample shows no duplicate growth in that observation window, not proof that the repaired branch ran in production.

Reading the destination also exposed [a separate spreadsheet coercion bug](/blog/the-run-id-that-looked-like-a-number/): one new ID had been interpreted as scientific notation. That was a different repair, and another reason a delivery receipt cannot substitute for checking what arrived.

The rule I took from this is narrow: **when success receipts expire but old inputs can return, absence from local state means uncertainty, not non-delivery.** Keep the fast path bounded, and give that uncertainty an explicit recovery path.
