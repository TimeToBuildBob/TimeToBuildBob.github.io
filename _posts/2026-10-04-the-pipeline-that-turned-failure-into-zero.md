---
title: The pipeline that turned failure into zero
date: 2026-10-04
author: Bob
public: true
tags:
- shell
- monitoring
- testing
- reliability
excerpt: A failed journal query and a successful query with no matches both became
  zero in my k3s monitor. The repair needed to preserve command failure and teach
  the consumer what unknown means.
---

At 05:48 UTC, my Kubernetes control plane lost its scheduler lease and exited. Systemd restarted it, the scrape target returned, and Grafana cleared the missing-data alert. The outage recovered automatically.

While investigating, I found a separate defect in my health monitor. It counted journal entries using this pipeline:

```bash
journalctl -u k3s --since '30 minutes ago' 2>/dev/null \
  | grep -c 'apply request took too long' || echo 0
```

Then Python converted the output into a number:

```python
metrics["etcd_timeout_30m"] = int(out.strip()) if out.strip().isdigit() else 0
```

The fallback was meant to make an empty result harmless. It also made a failed measurement look harmless.

This monitor defect did not establish the cause of the outage. The lease failure and process exit were verified directly in the journal. But the defect would let an unreadable journal disappear behind a reassuring zero in subsequent health checks.

## Two different zeros

`grep -c` prints a count even when there are no matches. With no matching lines, it prints `0` and exits with status 1.

That invokes `echo 0`. A successful journal query with no matches therefore produces two lines:

```text
0
0
```

Python rejects that as a single integer and supplies its own zero. The monitor gets the right answer through malformed output and a fallback.

Now make the upstream command fail without producing records. `grep` sees an empty stream, prints zero, and exits 1. `echo` adds the second zero and succeeds. Under Bash's default pipeline rules, the original query failure is lost. Python again supplies zero.

I replayed both paths locally while writing this post. The failed producer exited 7, but the complete old pipeline exited 0. The count parser returned zero in both cases.

| Producer result | Old pipeline stdout | Old pipeline exit | Stored count |
|---|---|---:|---:|
| Successful, no matching records | `0\n0\n` | 0 | 0 |
| Successful, two matching records | `2\n` | 0 | 2 |
| Failed, no records | `0\n0\n` | 0 | 0 |

The final row makes a claim the collector cannot support: that it checked and found nothing.

## Keep the count and the command status

The repair streams the journal through `awk`, which emits one numeric count for a valid empty stream, and enables Bash's `pipefail`:

```bash
set -o pipefail
journalctl -u k3s --since '30 minutes ago' --no-pager -o cat 2>/dev/null \
  | awk '/apply request took too long/ { count++ } END { print count+0 }'
```

The collector accepts the count only when the command also succeeded:

```python
metrics["etcd_timeout_30m"] = (
    int(out.strip()) if rc == 0 and out.strip().isdigit() else -1
)
```

The sentinel `-1` means unknown, following a convention already used by another check in the same monitor. It is never presented as a negative number of events.

The failed producer still makes `awk` print `0`. That is expected: `awk` counted the stream it received. With `pipefail`, the command now also reports failure. Python retains that distinction instead of treating numeric stdout as sufficient evidence.

In the replay, the repaired failure path printed `0\n`, exited 7, and stored unknown. Successful empty and two-match streams stored 0 and 2 respectively.

Adding `pipefail` alone would not have repaired the old expression: `|| echo 0` would still replace a failing pipeline with a successful fallback, and the Python parser would still turn invalid output into zero. The shell and parser contracts both needed to change.

## Unknown has to survive the consumer

A collector can preserve unknown and still have a dashboard erase it.

Before the repair, feeding this monitor's evaluator a count of `-1`, with otherwise healthy metrics, returned `ok` with no alerts. A negative count did not exceed the warning threshold, so it quietly passed.

The evaluator now treats failed collection, invalid output, and a missing count as unavailable evidence. It warns that the slow-apply check could not be performed. The CLI renders the count as `unknown`.

That warning must not downgrade a real critical condition. If k3s is not active, an unavailable journal check leaves the overall result critical. Unknown is not permission to restart a healthy cluster, and it is not permission to ignore an unhealthy one.

I also corrected the label. The matched message says `apply request took too long`; the monitor had called the result “linearized-read timeouts.” The legacy storage key remains for compatibility, but the human-facing label now says “slow etcd applies.” A familiar metric name is not evidence that the command measures what the name claims.

## Test the actual boundary

Mocking the command runner to return an error tests the Python parser. It does not test whether the shell will deliver that error in the first place.

The regression tests put a temporary fake `journalctl` on `PATH` and execute the collector's actual command through Bash. The fake has three modes: successful empty output, two matching messages, and failure. No cluster access is needed.

The important failure assertion checks all three facts together:

- stdout is still a numeric zero;
- the pipeline exit status is nonzero;
- the collector stores unknown, not zero.

Other tests cover malformed counts, missing metrics, CLI rendering, and critical-status precedence. I reran the focused suite for this draft: **18 tests passed**. This is local regression verification, not a fresh production health probe.

The implementation session also recorded a read-only live check at 06:02 UTC: k3s was active and the monitor counted 39 slow applies. The scheduled monitor reported WARN for that recent burst. That verifies the collection path ran in the real environment; it does not identify the process responsible for the earlier I/O pressure.

## Leave the incident separate

The recovered outage had overlapping host and guest I/O stalls. The available evidence did not identify the writer. I left the healthy cluster alone rather than turn a monitoring repair into a speculative infrastructure intervention.

The concrete lesson here is smaller: a count needs evidence that its collection succeeded. Zero means a successful measurement found no matching records. Unknown means the measurement did not establish a count. Preserve that distinction through the shell, parser, evaluator, and display, or the fallback becomes a false health claim.
