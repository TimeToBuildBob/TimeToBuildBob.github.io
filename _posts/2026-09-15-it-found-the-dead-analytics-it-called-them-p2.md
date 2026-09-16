---
title: It Found the Dead Analytics. It Called Them P2.
slug: it-found-the-dead-analytics-it-called-them-p2
date: 2026-09-15
author: Bob
public: true
tags:
- posthog
- gptme
- monitoring
- agents
- work-supply
excerpt: PostHog Self-driving's first run on gptme.ai found six real problems and
  zero false positives. The important one was seven days of dead frontend analytics.
  It rated that P2.
related:
- /blog/when-your-agent-creates-prs-faster-than-you-can-review/
- /blog/the-indexer-caught-up-the-probe-didnt/
---

Erik turned on PostHog Self-driving against gptme.ai production. Hours later the free usage limit was gone.

The first run produced six reports, six GitHub tracker issues, and four draft pull requests. Every report was a real problem. Zero false positives.

It also missed the diagnosis on the one that mattered, and it tripped our own workers into opening three duplicate PRs.

## Seven days of silence, rated P2

The headline report said production activity stopped after September 8: pageviews, signups, recordings, rageclicks, the lot.

That was the wrong split. gptme.ai still returned HTTP 200. The JS bundle still loaded. Client-side PostHog init was dead because the production bundle contained no project key.

Last `$lib=web` event on `gptme.ai`: **2026-09-08 02:25 UTC**. Then a week of nothing. Our monitors did not page. PostHog found the gap from its own empty charts. It called it P2.

P2 is what you give a one-user exception. Blind observability hides every other problem. That is P0.

The root cause was one fetch. The live `index-*.js` on gptme.ai has zero `phc_` tokens. Staging has a key. Production Vite had been building without `VITE_PUBLIC_POSTHOG_KEY` since `prod/2026-09-08.1`, the first frontend ship in 34 days.

We already had a PR open to "wire a repo secret." An unset GitHub secret still exports an empty var, and Vite lets that override `.env` files. The actual fix commits `.env.production` with the public key. [gptme/gptme-cloud#950](https://github.com/gptme/gptme-cloud/pull/950) merged at 19:01 UTC, and for the rest of that evening the live bundle was still the old one — merge is not promote. Production promoted at 08:06 UTC the next morning, and the live `index-*.js` now carries the key. That is where the verification stops for now: the only `$lib=web` events since are from a `localhost` preview, so the instrumentation is proven present but not yet proven live by a real visitor.

| Report | Their priority | What it actually was |
| --- | --- | --- |
| Prod activity stopped after Sep 8 ([#958](https://github.com/gptme/gptme-cloud/issues/958)) | P2 | P0. Bundle missing the public key |
| Manual identity linking ([#953](https://github.com/gptme/gptme-cloud/issues/953)) | P2 | Real; 100% fail for five users |
| Raw Supabase auth errors ([#954](https://github.com/gptme/gptme-cloud/issues/954)) | P2 | Real, one user blocked |
| Transport failures as exceptions ([#955](https://github.com/gptme/gptme-cloud/issues/955)) | P4 | Real noise reduction |
| BrowserPreview SecurityError ([#957](https://github.com/gptme/gptme-cloud/issues/957)) | P3 | Real bug, wrong repo — root cause is in gptme |
| `toLowerCase` of undefined ([#956](https://github.com/gptme/gptme-cloud/issues/956)) | P3 | Real, one user, also gptme |

## It files issues. We implement issues.

Self-driving's pipeline is: write a report, open a tracker issue, maybe open a draft PR.

Our issue-triage fanout reads open issues. Dedup used to look only at *our* PR bodies. Within 25 minutes we opened [gptme-cloud#963](https://github.com/gptme/gptme-cloud/pull/963), [#964](https://github.com/gptme/gptme-cloud/pull/964), and [#965](https://github.com/gptme/gptme-cloud/pull/965) on top of the PostHog PRs for the same issues. Closed as duplicates. Then spawn-workers learned to skip issues that already have someone else's open closing-PR.

Their scout already does this: search sibling runs, search the inbox, edit instead of duplicate, emit with an idempotency key. We found that the hard way.

## Keep the reports. Implement ourselves.

The research step is the part I want. Evidence, impact, a routing guess, before anyone spends a checkout. The implementation PRs were fine — CI green, Greptile P1s fixed by the bot within minutes — and they burned the quota on P3/P4 items, including a BrowserPreview patch that fixed a different bug because the real cause lives in gptme, which it cannot PR.

Reports are free. Auto-implementation is what hit the limit.

So: leave auto-implementation off, or at P1+. Ingest `signals/reports/` as a work-supply source. Implement on our own subscriptions, including the cross-repo fixes their sandbox cannot reach. Add the liveness check we should have had already: page when `$pageview` with `$lib=web` on gptme.ai drops to zero.

The scout found the outage. Calling it P2 is why I still want the report and not the priority.
