---
title: The runner died nine minutes ago
date: 2026-09-10
author: Bob
public: true
tags:
- debugging
- infrastructure
- ci
- linux
excerpt: Two CI failures looked like an eleven-minute runner timeout. Matching GitHub
  jobs to kernel OOM records revealed a much shorter life and a misleading clock.
---

I had a CI investigation named after an eleven-minute failure. Two pre-commit
jobs had lost their runners, the pre-commit and later step conclusions were
empty, and GitHub recorded the failures eleven to twelve minutes after the
jobs started. A runner
lifetime limit was a plausible explanation.

The runners had actually died less than three minutes into their jobs.

I found that by joining three records: the runner name in GitHub's job API,
the pod UID in the node's retained Kubernetes logs, and the same UID in the
kernel's out-of-memory records. Matching identities mattered. A nearby OOM on
a busy node would have been a lead; a matching pod cgroup tied the event to
the failed job.

Here are the two timelines, all in UTC:

| Event | September 7 run | September 8 run |
|---|---|---|
| Job started | 18:57:54 | 01:00:43 |
| Kernel killed workload | 19:00:39 | 01:02:24 |
| GitHub recorded completion | 19:10:00 | 01:11:43 |
| Start to kill | **2m45s** | **1m41s** |
| Kill to recorded completion | **9m21s** | **9m19s** |

Most of the apparent runtime happened after the workload was dead. Those
nearly identical reporting delays helped make the failures look like a
repeatable lifetime limit. I have not established why GitHub took that long
to record completion; the timestamps establish the delay, without explaining
its internal mechanism.

The kernel records named a different limit: memory. Both events were marked
`CONSTRAINT_MEMCG`, and both cgroups had a 3 GiB limit. ShellCheck was the
dominant memory consumer, with anonymous resident memory of about 2.74 GiB
in one run and 2.61 GiB in the other. The first cgroup's reported usage had
reached its limit exactly.

That also explained how a lint job could disappear without a useful lint
failure. The logs recorded group termination under `memory.oom.group`,
followed by kills of the runner scripts. One also explicitly recorded the
death of `Runner.Worker`.

Linux supports treating a cgroup as an indivisible workload during an OOM:
when `memory.oom.group` is enabled, its tasks are killed together, with an
exception for explicitly OOM-protected tasks. That behavior prevents a
partially killed workload from continuing in an inconsistent state.
The [kernel's cgroup v2 documentation](https://docs.kernel.org/admin-guide/cgroup-v2.html)
describes the contract. In this case, the reporting machinery shared the
failure boundary with the tool it was running.

There were several ways to turn this evidence into another wrong diagnosis.
The cgroup OOM did not establish that the whole node had run out of RAM.
ShellCheck's footprint did not identify the input or allocation responsible,
or prove a defect in ShellCheck. And the missing step conclusions did not
establish a failed typecheck. Splitting mypy would have targeted an unproven
cause.

By the time I reconstructed the failure, I had already moved the heavy
pre-commit job to a GitHub-hosted runner. Lightweight change detection stayed
on the self-hosted runners. The useful work in this investigation was to
verify that mitigation and correct the explanation attached to it.

A scheduled run completed its hooks, cross-package typecheck, and post-steps
in 17m48s. A subsequent PR run completed in 13m23s. Both were on hosted
runners. A planned acceptance check on a new PR changing at least fifteen
files remained open; the successful PR changed only three. Those passes
supported keeping the mitigation, while leaving the broader sample pending.

The durable change was in how I investigate a silent runner loss. Start with
the job's identity, follow it down to the process's resource boundary, and
recover the termination time from evidence that survived the process.
Only then interpret the duration in the dashboard.

The completion timestamp was accurate about when GitHub recorded completion.
I had asked it when my process died.
