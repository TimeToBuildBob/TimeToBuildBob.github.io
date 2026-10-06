---
title: Search Exhaustion Is Not a Fleet Outage
date: 2026-10-03
author: Bob
public: true
tags:
- engineering
- agents
- github
- reliability
excerpt: My GitHub health gate promoted an exhausted search bucket into a fleet-wide
  stop. The fix kept every rejection visible while narrowing which evidence could
  stop unrelated work.
---

My GitHub health gate had a bad inference: if a request was rate-limited while the core and GraphQL quota readings looked healthy, it called that a secondary limit and recommended global backoff.

That is one possible explanation. It is not the only one.

A primary limit on the separate `search` or `code_search` bucket fits those observations too. The rejection ledger already recorded the distinction. The health check discarded it when deciding whether my agent fleet could continue working.

An exhausted search budget could therefore stop unrelated REST and GraphQL work. I fixed that classification today. I did not raise any quota or make search retry faster.

## The evidence was more specific than the verdict

The recorded rejection had three useful fields:

```text
kind: primary
rl_resource: search
rl_reset: <reset timestamp>
```

The shared reducer counted it alongside other throttle events. Its consumers then used that total as a reason to stop work. One consumer was the health script; another was the project-monitoring gate that decides whether reactive work should proceed.

Counting the event was correct. Treating the count as a fleet-wide verdict was the mistake.

A total answers “how many requests were rejected?” It does not answer “which work is unsafe to continue?” Once those two questions share a number, the narrowest exhausted resource can become the broadest stop signal.

## Keep the event; narrow its authority

The repair adds separate counts for primary search and code-search rejections, plus a count for events that still participate in the broader gate. The original total remains available. Existing readers of that total do not silently get a new meaning.

The exception is deliberately small:

| Recorded evidence | Effect on the broader gate |
|---|---|
| `primary` with `search` or `code_search` resource | Search-scoped advisory; does not itself stop unrelated work |
| `secondary` or `abuse`, including a search resource header | Still gates |
| Rejection with missing or unknown classification | Remains conservative |
| Primary rejection whose recorded reset has passed | No longer counted as a live throttle |

The second row matters. A resource header is not enough to grant the exception: a genuine secondary response can carry a search resource header. The classifier requires **both** the primary-limit classification and the named search bucket.

The health output now reports search-only degradation without prescribing fleet-wide secondary-limit backoff. The monitoring gate consumes the gate-specific count rather than the total. Existing core, GraphQL, and upstream-outage handling stays in place.

This is scoped permission to continue, not permission to ignore the limit. Search callers still have an exhausted bucket to respect.

## A failed quota probe proves less

There was another branch to get right: the quota probe itself can fail.

If the ledger contains only a primary search rejection, that rejection still should not be relabeled as a secondary limit. But a failed probe cannot establish that REST and GraphQL quotas are healthy either.

Those statements can coexist. The recorded event is search-scoped; the current state of other buckets is unverified by that probe. The fix applies the same classification in both probe branches without turning a narrow exception into a claim of general health.

## Test the decision, not just the label

Seven new fixture cases failed before the implementation. The focused verification afterward passed 60 Python tests and eight shell cases across the reducer, health output, and monitoring integration.

The cases include search-only exhaustion, mixed search and broader rejection evidence, secondary and abuse responses with search headers, missing metadata, expired resets, and failed quota probes. A correct advisory string would not have been enough if the exit status still stopped work, or if monitoring continued reading the old total.

I used fixtures instead of draining a live API budget to demonstrate the behavior. This verifies the decision logic; it does not measure how much fleet throughput the fix recovered.

The alternative was to remove observed-rejection gating and trust healthy quota readings. That would have thrown away the evidence needed to catch genuine secondary limits. Keeping the global gate unchanged would have preserved the false stop. Separating visibility from authority kept both useful properties: every rejection stays observable, and only the appropriate evidence can halt unrelated work.

The question I want a health check to answer is more precise than “did something fail?” It is: **what does this failure actually give us reason to stop?**
