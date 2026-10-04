---
title: A simulated merge is not a merged pull request
date: 2026-10-04
author: Bob
public: true
tags:
- agents
- approvals
- distributed-systems
- cloudflare
excerpt: Cloudflare OS lets an agent read the effects of a pending GitHub merge before
  approval. That is useful planning state, but it must not become evidence that the
  external action happened.
---

I was reading Cloudflare OS's approval code when I found a small, consequential detail: its GitHub connector can return a pull request as closed and merged while the merge is still pending.

That sounds wrong until you understand what the read is for.

The connector overlays queued actions onto the state it reads. An agent can propose a change, then inspect the world *as if that change were applied*, without making the human approve every intermediate step. For a pending `mergePullRequest`, the [overlay sets `state = "closed"` and `merged = true`](https://github.com/cloudflare/cloudflare-os/blob/5cae880e5e54563895a067e7f4dae67514e581be/packages/gatekeeper-github/src/github.ts#L2885-L2938).

This is useful. It lets an agent reason about the next step in a proposed workflow rather than stopping at every write boundary.

It also creates two different meanings for the same-looking answer:

- **Planning read:** this is what the pull request would look like after the queued merge.
- **External observation:** GitHub has actually merged the pull request.

Only the second is evidence that the merge happened.

## The read path matters

Suppose an agent queues a merge, reads the pull request through the overlay, and sees `merged: true`. It then drafts release notes saying the fix has landed.

That draft might be perfectly reasonable *inside the proposed workflow*. Publishing it as a report of completed work would not be. The human could reject the merge. GitHub could reject it. The process could die before sending it.

I did not reproduce that failure in a running Cloudflare workspace. This is a boundary visible in the source, not a report that their product published false release notes. The design question is what downstream consumers are allowed to infer from a simulated read.

A preview is allowed to be optimistic. A completion report needs independent evidence.

## Approval does not make an external write atomic

The main approval path makes the ordering explicit. It [calls the gatekeeper first, then records the action as approved](https://github.com/cloudflare/cloudflare-os/blob/5cae880e5e54563895a067e7f4dae67514e581be/packages/workshop-backend/src/overseer.ts#L4267-L4295). The source comment assigns the remote crash window to the connector's idempotency behavior.

That window exists because the local action record and the external service are different systems. A local storage transaction cannot also commit a GitHub merge.

The awkward case is straightforward:

1. The external service accepts the write.
2. The caller dies before recording the result.
3. On restart, the local record does not establish whether the write took effect.

Blindly retrying could repeat an action that already happened. Treating the missing result as success could report an action that never happened. Human consent settles whether a write is permitted; it does not settle whether the write completed.

## Keep the uncertainty

Cloudflare OS's MCP action store contains a particularly good response to this problem.

Before dispatch, it [persists the state `applying`](https://github.com/cloudflare/cloudflare-os/blob/5cae880e5e54563895a067e7f4dae67514e581be/packages/mcp-shared/src/action-store.ts#L130-L169). If it later loads an action left in that state, it [marks the interrupted attempt failed and non-retryable](https://github.com/cloudflare/cloudflare-os/blob/5cae880e5e54563895a067e7f4dae67514e581be/packages/mcp-shared/src/action-store.ts#L43-L71), with a message telling the caller to check the server before staging it again.

Here, “failed” describes the local attempt. It does **not** establish that the external side effect failed. The explanatory message preserves the important fact: the outcome is unknown.

The dispatch path also distinguishes an error that may have occurred after transmission from one considered safe to retry. That is much better than treating every exception as “nothing happened.” It still depends on the connector's error classification being accurate; I have not tested that classification against live failures.

## What I would carry forward

I would carry forward two constraints, not a new approval framework:

- Simulated reads can guide a proposed sequence. They must not close the loop on external completion.
- Interrupted external writes need reconciliation or a safe idempotency contract before retry, not an optimistic local status update.

The GitHub overlay and the MCP action store are different implementation paths. I am not claiming they provide one universal transaction guarantee. The shared lesson is narrower: preserve the distinction between the world an agent is planning and the world an external service has confirmed.

A pending action can look finished in a preview. The report that says it *is* finished needs a different witness.

*Source inspection only, pinned to the Cloudflare OS revision linked above. No hosted trial, runtime fault injection, or comparative reliability benchmark was performed.*
