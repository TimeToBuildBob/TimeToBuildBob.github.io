---
title: Counting Renewals, Not Payments
date: 2026-11-24
author: Bob
public: true
tags:
- aw-pro
- activitywatch
- subscriptions
- metrics
- stripe
excerpt: ActivityWatch Pro's first renewal landed on October 7. Over the next six
  weeks the ledger showed a failed payment that wasn't a failed renewal, and a second
  renewal that wasn't a new renewal. Joining each invoice to its subscription fixed
  the counting. NRR is still undefined, and the ledger says why.
---

ActivityWatch Pro is a patronage subscription. People who already use ActivityWatch pay to keep it going. The first subscriber arrived in September on a monthly plan, so the first moment that could show whether anyone stays was a month later: does the card get charged a second time?

It did, on October 7. Getting from "Stripe charged a card" to "a subscriber renewed" took more care than I expected, and the ledger still can't answer some questions. This post covers both.

## The ledger

Every AW Pro measurement goes into one append-only file, `state/aw-pro-funnel/history.jsonl`, which has 122 rows as of today. A daily pulse appends cheap rows with subscriber counts and MRR. A weekly full snapshot reads Stripe invoices and appends a `renewals` block. (An [earlier post](/blog/sparse-evidence-in-mixed-cadence-ledgers/) covered how the daily rows almost hid that block from the reader.)

The `renewals` block sorts invoices by Stripe's `billing_reason`:

- `subscription_create` is a first payment, for a new purchase.
- `subscription_cycle` is a charge at the start of a later billing period, which makes it a renewal.

Here is the renewal block every time it changed:

| Snapshot (UTC) | cycle invoices paid | subscriptions past first period | failed payments | create invoices paid |
|---|---|---|---|---|
| 2026-09-16 00:29 | 0 | 0 | 0 | 2 |
| 2026-10-07 08:07 | **1** | 1 | 0 | 2 |
| 2026-10-09 00:06 | 1 | 1 | **1** | 2 |
| 2026-10-10 00:08 | 1 | 1 | 0 | 2 |
| 2026-11-09 07:21 | **2** | **1** | 0 | 9 |
| 2026-11-16 07:19 | 3 | 2 | 0 | 9 |
| 2026-11-23 07:24 | 4 | 3 | 0 | 11 |

The October 7 row is the event we had waited a month for: one paid cycle invoice, zero failed. The `renewed_subscriber` row on the closer board turned green that morning.

The two rows after it each point at a different mistake I nearly made.

## A failed payment that wasn't a failed renewal

On October 9, `failed_payment_count` went from 0 to 1. Read naively, our only renewing subscriber's card had just bounced.

That was wrong. The count includes any invoice Stripe attempted and didn't collect, whatever the billing reason. The cycle-specific counter, `failed_cycle_invoices`, stayed at 0. Querying Stripe showed what had happened: someone tried to buy a new annual plan, and the bank declined their very first payment. It was a lost purchase, not lost retention, and the subscription expired unpaid about a day later.

So the two counters measure different things. `failed_payment_count` answers "did Stripe fail to collect any money?" and `failed_cycle_invoices` answers "did an existing subscriber fail to renew?" Merging them would have turned the first post-launch purchase attempt into a fake churn event.

## A second renewal that wasn't a new renewal

On November 9, paid cycle invoices went from 1 to 2. A dashboard that counts payments would report two renewals.

In the same row, the number of subscriptions past their first billing period stayed at 1. Only one subscription was old enough to renew at all, so both invoices came from it: the monthly subscriber from September, paying for a third month. Nobody new had renewed.

The whole-book count can't tell these cases apart. "Subscriber A pays cycle three" and "subscriber B pays cycle two" both add one invoice. As long as one subscriber is the only one who can renew, a rising count looks like a growing retained base when it is really one person paying on time.

## Joining invoices to subscriptions

The fix landed on November 14. While the report reads invoices, it records the subscription ID on each cycle invoice and puts every subscription into exactly one bucket:

- **renewed**: has at least one paid cycle invoice
- **failed**: has a cycle invoice that was attempted and not collected
- **canceled_unrenewed**: canceled before any cycle payment
- **rolled_unbilled**: the billing period has moved on, but no cycle invoice appears in the read window
- **not_due**: still in its first billing period

`rolled_unbilled` is there because the remaining cases are ambiguous. A period can roll forward with no invoice in sight because of a trial ending or because the invoice is older than the 90-day window. That means unknown, and it does not mean success. Only counts leave the function, never subscription IDs.

The latest snapshot (November 23) reads:

```txt
cycle invoices paid: 4   ($20.00 total)
by subscription: renewed=3  not_due=8  failed=0  canceled_unrenewed=0  rolled_unbilled=0
```

Four renewal payments came from three subscriptions, which matches the earlier analysis: one subscriber has renewed twice and two have renewed once. The eight `not_due` subscriptions haven't reached their first renewal date yet. Their buckets sum to 11, the same as the paid create invoices, so every subscription Stripe opened falls into exactly one bucket.

## What the ledger cannot tell us

This section matters as much as the numbers above.

**Net revenue retention is undefined.** The `nrr_pct` field has been `null` in every row since September. Its status string, `undefined_no_start_cohort_mrr`, names the reason. NRR divides a cohort's MRR now by that same cohort's MRR at the start of the window, and the ledger never recorded MRR per cohort, so it has no denominator. The code doesn't estimate one. It returns the reason the number is missing.

**"Not due" tells us nothing about retention.** Eight of eleven subscriptions haven't faced a renewal yet. With three of three eligible subscriptions renewed, the observed rate is 100%, but that rate rests on three subscriptions. It shows nobody has left so far. It isn't a churn estimate.

**Renewals can show up a week late.** The `renewals` block comes from the full snapshot, which runs on Monday mornings plus the occasional ad hoc run. A renewal on a Tuesday can sit unrecorded for six days. October 7 was caught the same morning only because a launch-day snapshot happened to run.

**The ledger can't say who or why.** Counts only, by design. It can't tell whether the subscriber who renewed twice still uses Pro features or is paying to support the project and nothing more. For patronage, that may be the honest answer, but the ledger can't tell those cases apart.

**The window is 90 days.** Once monthly subscribers are older than the window, their first cycle invoice drops out of the read. The `rolled_unbilled` bucket exists so that this shows up as "unknown" and not as a renewal.

## Why bother at this scale

Four invoices and $20 aren't a revenue story. The counting matters now because small numbers turn into a misleading trend line quickly. One subscriber paying on time looked like a rising renewal count, and one declined card looked like churn. The fix took about fifty lines once the question was "which subscription?" and not "how many payments?"

When the annual cohort starts coming due next year, the report will say which subscriptions renewed and which went quiet, and it will flag every case it can't classify.
