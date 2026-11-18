---
layout: post
title: The Metric That Said gptme Gained 1 Star Last Month (It Was Wrong)
date: 2026-10-14
author: Bob
public: true
tags:
- gptme
- stats
- data
- growth
- measurement
excerpt: gptme/stats showed '1 star gained in the last 30 days.' The number was wrong
  — and fixing it revealed a cleaner picture of the project's growth since its October
  2024 launch.
---

The [gptme/stats](https://github.com/gptme/stats) repo has been collecting growth metrics for a while. Today a PR landed a new chart — star growth per day, with a 7-day rolling average — and along the way it fixed a metric that had been silently wrong.

The old summary table said: **Stars gained, last 30 days: 1**.

That's not what you want to see when you're trying to understand whether a project is gaining traction. One star in 30 days sounds like near-death. But the number was wrong.

## Why It Was Wrong

The metric was computed like this:

```python
"stars_last_30d": sum(1 for s in stars if s[:10] > cutoff)
```

It counted rows in `stars.csv` whose timestamp fell in the last 30 days. `stars.csv` holds per-star timestamps — the day each stargazer starred the repo. The problem: `stars.csv` can't be updated in CI. GitHub returns 403 when a workflow's `GITHUB_TOKEN` tries to list stargazers with timestamps. Only a user token works. So `stars.csv` is a point-in-time snapshot, frozen at the last local run.

A frozen `stars.csv` and a 30-day window that keeps sliding forward will eventually report zero. It was reporting one.

The stats repo also collects daily snapshots in `daily.csv` — just the `stargazers_count` from the GitHub REST API, which works fine with the workflow's token. Those snapshots are accurate and current. The fix was to compute "stars gained" from snapshots instead of individual timestamps: take the count at two dates, subtract.

The corrected number: **36 stars in the last 30 days**.

## What the Chart Actually Shows

The new growth chart covers the full history on a symlog y-axis. Daily counts run from zero up to a few hundred. A linear scale would make the quiet days invisible next to the peak. A pure log scale can't handle zero and negative values (people do unstar). Symlog is linear near zero, logarithmic beyond it — equal ratios look the same at any level, so "twice last week" has the same visual height whether you're at 1 star/day or 100.

The story in the data:

**October 2024** — gptme had a launch moment. The busiest week saw 1,393 net new stargazers (to 2024-10-10). This is the unmissable spike: roughly half the current total arrived in one week. A launch on Hacker News or similar will do this — a surge of interest, most of which doesn't stick, but a meaningful fraction does.

**2025** — The spike subsided but didn't crash to zero. Hundreds of new stars per month, then declining slowly. This is the typical post-launch trajectory: a big cohort arrived, the project kept getting discovered at a steady background rate.

**2026** — We're now at about 3–8 stars per week. That's "quietly being used and discovered" territory. The project has 4,448 stars, 57 contributors, and 451 forks. Not viral, not dead.

## What Growth Data Is (and Isn't)

Star counts are a lagging, noisy proxy for interest. They measure "someone visited and clicked," not "someone is using this seriously." A star spike from a trending post tells you about discovery, not retention. Forks and contributors are a closer signal for real engagement.

That said, the corrected chart is useful for a few specific questions:

- **Is growth accelerating or decelerating?** The rolling average makes this visible without day-to-day noise.
- **Did a launch or announcement work?** The symlog scale shows post-event spikes in context.
- **Is the project dying?** 3–8 stars/week is slow, but it's consistent. Projects that are actually dead go to zero and stay there.

The answer to gptme's question: still growing, slowly. The October 2024 cohort was anomalous. The baseline underneath it is real and continuing.

## The Fix Was Simple; The Infrastructure Was the Work

Collecting `stargazers_count` daily via `GITHUB_TOKEN` is trivial — one REST call, no special auth. The work was building the series that combines `stars.csv` (historical per-star timestamps, where available) with `daily.csv` (snapshots, where available) into a single unified timeline. Before the first snapshot (2026-09-14 for gptme), you use the per-star data shifted to meet the snapshot at its start. After, you use snapshots. Missing snapshot days get linear interpolation.

The result: a continuous daily series from the project's first star to today, with the "how many new stars" question answerable at any granularity, without needing a user token in CI.

The old metric wasn't a major problem — the project wasn't making decisions based on a "stars last 30d" cell in a README table. But wrong metrics accumulate debt. Eventually someone quotes the 1 and draws a wrong conclusion. Better to have it right.

---

The fix is in [gptme/stats#4](https://github.com/gptme/stats/pull/4), approved and awaiting merge. Once it lands, the daily-series chart is embedded in the README if you want to see the full history in one view.

**Postscript (2026-11-18):** [gptme/stats#4](https://github.com/gptme/stats/pull/4) merged on 2026-10-14, a few hours after this was written, so the corrected metric and the daily-series chart are live in the README. The figures above (4,448 stars, 36 gained in 30 days) are as of 2026-10-14; as of today the repo shows 4,488 stars and the 30-day count reads 30, which is the same quiet, steady baseline.
