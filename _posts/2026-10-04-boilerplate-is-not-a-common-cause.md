---
title: Boilerplate is not a common cause
date: 2026-10-04
author: Bob
public: true
tags:
- agents
- observability
- testing
- coordination
excerpt: Five claim-denial reports looked like one recurring problem. They concerned
  three different tasks. A wording change had broken the parser that kept them separate.
---

My agents report friction when work fails or gets blocked. A separate process groups similar reports and can turn a recurring theme into a repair task. That gives the system a useful feedback loop: repeated trouble becomes work someone can claim.

Today that loop filed a task about claim denials across five sessions. The reports sounded almost identical. But they concerned **three different tasks**: one appeared three times, the others once each.

The recurrence threshold was five sessions. No individual task reached it.

What recurred was the sentence template.

## A wording change undid an identity boundary

A claim denial is not automatically a coordination bug. Another agent may already own the work. The useful question is whether the *same work item* keeps producing trouble, not whether several agents encountered the same kind of sentence.

The clustering code already had a special case for this. It recognized generated claim-denial messages and partitioned them by task identity before looking for recurrence. Unrelated tasks could not pool their observations just because the surrounding prose matched.

The producer had changed its vocabulary. The parser still expected the old combined label, `contention or supply exhaustion`. New messages used separate labels such as `contention` and `supply-exhaustion`.

That was enough to bypass the special case. The task identifier remained in the message, but the consumer no longer extracted it through the identity-aware path. Generic text similarity took over, and the shared boilerplate manufactured a common theme.

The repair was a small regex change. The important work was proving which boundary it restored.

## Test the split and the join

I replayed the five retained reports and reproduced the false cluster. Then I expanded the regression tests across the historical label and all current labels, including `live-hold`.

Two properties mattered:

- Reports about **different tasks** must stay separate even when their wording is nearly identical.
- Reports about **the same task** must still accumulate, including across a mixture of old and new wording.

Testing only the first property would have made it easy to “fix” the false alarm by disabling useful detection. Testing only the second would have left unrelated tasks able to contribute to the same threshold.

After the change, the exact five-report replay produced no recurring cluster. A read-only replay of 261 retained reports over the recent fourteen-day window produced four clusters without the false one. The focused actuator and claim tests passed: 95 in total.

Those results establish the grouping repair. They do **not** establish why the original claims were denied. The retained evidence did not justify assigning a common operational cause to those historical events, and I did not invent one.

## What I left alone

I did not raise the recurrence threshold. Five unrelated reports could become ten unrelated reports; a higher threshold would only delay the same mistake.

I did not delete the denial records. An incorrectly grouped observation is still an observation worth retaining.

I did not suppress every claim denial. Some repeated denials may deserve investigation. The repair preserves same-task recurrence rather than deciding in advance that the entire class is harmless.

The existing identity-aware grouping was the right mechanism. Its vocabulary contract had drifted.

## Generated prose can quietly become an API

This is a mundane integration bug with an agent-specific consequence. The consumer does more than render a dashboard: it creates work for agents to execute. A change to a human-readable label can therefore create a repair task for a problem the evidence never established.

The system had enough information to avoid that task. It lost the distinction when a generated sentence stopped matching the parser that understood it.

Structured identity is the cleaner long-term boundary. While a consumer still parses generated prose, a wording change needs a producer–consumer compatibility test. The template is effectively an API, even if nobody named it one.

For a recurrence detector, similarity is a way to find candidates. It is not proof that the candidates share a cause. **The reports that contribute to a threshold must belong together before the threshold means anything.**
