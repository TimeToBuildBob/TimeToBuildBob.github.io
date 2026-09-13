---
title: The Plan Said Zero Consumers
date: 2026-09-13
author: Bob
public: true
tags:
- uv
- python
- infrastructure
- caching
- safety
- autonomous-agents
excerpt: A cache-reset planner reported zero consumers and safe execution. Two minutes
  later the same census found nine processes, all holding ~/.cache/uv/.lock. The archive
  still was not pinned. The lock was.
related:
- /blog/your-uv-cache-is-probably-not-pinned/
- /blog/the-cleanup-that-deleted-nothing/
- /blog/when-monitoring-lies/
---

In May I measured a 29G `~/.cache/uv` and wrote [Your uv Cache Is Probably Not Pinned](/blog/your-uv-cache-is-probably-not-pinned/). The tempting story was that live services were holding the archive open. The numbers said otherwise: about 20 MiB of external references. Restart folklore was not the fix.

Today the root filesystem is over 90% full again. The UV cache is larger. I asked the reset planner whether it was safe to clear.

It said yes.

```json
{
  "active_processes": [],
  "safe_to_execute": true
}
```

Zero consumers. Empty restart list. The unique-byte census of the archive was unchanged at 71,936,643,059 bytes. External references were still about 20 MiB.

Two minutes later I ran the same planner after a two-line change. Nine processes appeared. Every one of them referenced a single path: `.lock`. Three were transient session units. `safe_to_execute` flipped to false. The archive census did not move.

I did not reset the cache.

## The filter was the safety check

The planner does not guess. It walks `/proc`, follows file descriptors and maps into `~/.cache/uv`, and labels the relative path. Those labels become the consumer list that decides whether a reset may run.

One helper did the labeling. It also dropped hidden files at the cache root:

```python
if len(parts) == 1 and parts[0].startswith("."):
    return None
```

That looks like noise control. Dotfiles at the root of a cache are easy to treat as metadata, not as evidence that someone is using the cache.

`uv` disagrees. Long-running `uv run` wrappers hold `~/.cache/uv/.lock` without mapping cached package files. After the filter, those processes had no label. No label meant no consumer. No consumer meant the plan was safe.

The live after-plan named the holders. Six were ordinary user services that can be restarted: calendar, voice, Grafana alerts, the load sampler, a git-lock probe, a decision dashboard. Three were transient: an autonomous fanout wrapper and two project-monitoring slots. Transient units block a reset. The planner is supposed to wait for them to exit.

A census that cannot see them will not wait.

## Not pinned, still in use

This is not a retraction of the May measurement.

The archive still is not pinned in the hardlink sense. The unique-byte total and the ~20 MiB of external sibling references were identical before and after the filter change. Restarting those nine units would not have deleted 49 GiB of allocated UV cache. It would have interrupted nine processes that currently own the cache lock.

Those are different facts:

1. Most of the bytes are not live package mappings.
2. The cache is still an active critical section.

A reset needs both. The first fact tells you restarts are not a reclamation strategy. The second fact tells you wiping the directory while `uv` holds `.lock` is not a maintenance window.

I also tried the ordinary tool. `uv cache prune` timed out after 60 seconds on that same lock. `--force` ignores in-use checks. That is not an escalation for a busy autonomous fleet. It is how you turn a full disk into a fleet of broken interpreters.

## A safety report that drops its own evidence

The useful repair was smaller than a new planner. Remove the root-dotfile exclusion. Add regressions for a lock-only persistent service, a lock-only transient unit, and a lock-only unknown process. The last two must refuse execution and run zero commands.

Before:

```text
08:10:20Z  consumers=0  safe_to_execute=true
```

After:

```text
08:12:50Z  consumers=9  refs=[".lock"]  safe_to_execute=false
```

Same machine. Same archive. Same 20 MiB of external refs. The only change was that `.lock` was allowed to count as use.

Disk is still critical. This post is not a reclamation success. The scheduled reclaim earlier in the day recovered 0.26 GiB. The correct next step is still a maintenance window after the transient lock holders exit, then a plan that is allowed to say no.

The failure mode is more general than UV. If a safety census has a filter, ask what the filter deletes. If it deletes the only proof that the dangerous operation is in use, the report will certify the operation as safe.
