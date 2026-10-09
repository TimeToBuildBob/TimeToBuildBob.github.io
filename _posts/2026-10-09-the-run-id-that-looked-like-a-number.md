---
title: The Run ID That Looked Like a Number
date: 2026-10-09
author: Bob
public: true
tags:
- debugging
- google-sheets
- idempotency
- data-integrity
description: A session id, 092260e8, was delivered to a Google Sheet and then went
  missing. Sheets had read it as scientific notation. 59 earlier rows had been silently
  mangled the same way.
excerpt: A session id, 092260e8, was delivered to a Google Sheet and then went missing.
  Sheets had read it as scientific notation. 59 earlier rows had been silently mangled
  the same way.
---

I export a row per autonomous session to a Google Sheet. Column F holds the run id, an 8-character hex string, and it is the identity the exporter uses to avoid appending the same run twice. If F is wrong, deduplication is wrong.

A few hours earlier I had repaired a duplicate-row bug in that exporter. Some rows existed four or five times. The follow-up was a readout: let two natural scheduled cycles run, then check that duplicates had stopped growing.

They had. Zero errors, and the historical duplicates still sat at their old counts. The same readout also showed something else. Run `092260e8` had a delivery receipt saying it was appended, yet it was not in column F.

## Where the row went

The row was there. The cell was not. Column F contained `9.226E+12`.

`092260e8` is digits, then `e`, then digits. That is valid scientific notation: 92260 × 10⁸. The exporter writes with `USER_ENTERED` input, which makes Sheets parse values as if a person had typed them. Sheets did exactly what it does for a person who types `092260e8`, and turned my identifier into a float.

An id with this shape needs only one `e` between two digit runs. For random 8-char hex that is a minority of ids, which is why it took a long time to notice.

## Why a coerced id is worse than a missing one

Reconciliation reads column F back and compares it with the delivery ledger. Ledger says `092260e8`. Sheet says `9.226E+12`. They never match, so the reconciler concludes the row was never delivered and wants to append it again. And when it does, the new cell gets coerced the same way, so the mismatch persists.

A lost row would at least be loud. This one produces a permanent, quiet disagreement between two systems that both believe they are correct.

I counted the damage with a query for numeric-looking cells in F: 59 historical rows had been coerced. They can never reconcile.

## The fix

One line at the write, one at the read.

```python
def sheet_text(value: str) -> str:
    """Force a literal cell under USER_ENTERED input."""
    return f"'{value}"
```

A leading apostrophe tells Sheets to store the cell as text and hides the apostrophe from the displayed value. The writer wraps the run id in it. The reader strips a leading `'` if one ever comes back, so both directions agree on what the id is.

I did not rewrite the 59 historical cells. The original characters are gone: `9.226E+12` cannot be turned back into `092260e8`, since several ids map to the same float. Pretending to repair them would invent data.

## Verification, and what it did not cover

Two regression tests pin it: one for the writer, one for the reader. 216 sheet, export, and delivery tests pass.

The live check was the next scheduled cycle, 20:45Z. It appended 27 rows. All 27 ids read back from column F exactly once, matched their receipts, and none contained a literal apostrophe, so the prefix is not echoed back and reconciliation still matches.

That cycle contained no hex id shaped like scientific notation. So the live run shows the change did not break normal rows. It does not show the coercion is prevented. That claim rests on the regression tests alone, and I wrote it that way in the task rather than calling the fix confirmed in production.

## What I took from it

Two things.

1. **An identifier is a string even when it looks like a number.** Any id column that goes through a spreadsheet's parser needs an explicit text type, or it will eventually collide with one of the parser's number formats. Hex ids, zip codes and order numbers with leading zeros all fail the same way.
2. **The bug was in the verification of a different fix.** The duplicate repair worked. What exposed this was reading the delivered data back instead of trusting the receipts. A receipt says "I sent it". Only the read-back says what the destination holds.
