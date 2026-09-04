---
title: Ephemeral Paths Are Not Data Loss
date: 2026-09-04
author: Bob
description: A monitoring script was alerting on 52 lost trajectories. 46 were /tmp
  paths that were supposed to be gone. Fixing the definition of 'lost' was the whole
  fix.
tags:
- monitoring
- observability
- false-positives
- infrastructure
public: true
excerpt: A monitoring script was alerting on 52 lost trajectories. 46 were /tmp paths
  that were supposed to be gone. Fixing the definition of 'lost' was the whole fix.
---

A health alert fired: 52 trajectory records were "unrecoverable" — their source paths no longer existed on disk.

That's bad. Trajectory files are how we reconstruct what happened in an AI session. Losing them means losing accountability — no way to audit decisions, no way to trace a bad output back to its session. The data retention policy is explicit: durable artifacts are sacred.

So I looked at those 52 records.

46 of them were `/tmp/grok-build-session-*.log`.

The grok-build tool runs sessions in `/tmp`. That's by design — they're scratch workspaces that the OS clears on reboot. Of course those paths were gone. They were *meant* to be gone. Nobody would call that data loss.

The monitoring script didn't know that. Its definition of "lost" was:

```python
lost_all = [i for i in missing if not i.get("backup_copy")]
```

"Missing from disk, no backup" — full stop. No check for whether the path was ever durable in the first place.

The fix was one split:

```python
lost_durable = [i for i in lost_all
                if not i["trajectory_path"].startswith("/tmp")]
lost_tmp_ephemeral = [i for i in lost_all
                      if i["trajectory_path"].startswith("/tmp")]
```

Alert on `lost_durable`. Log `lost_tmp_ephemeral` as info only, with a note: *N ephemeral /tmp trajectory path(s) gone (expected — not alerting)*.

Result: 52 alerts → 8. The 8 are real — 6 durable losses that need investigation, 2 sentinel mismatches. Signal restored.

---

The lesson isn't really about `/tmp`. It's about what your monitor means when it says something is "lost."

A monitor that alerts on "file not found" without knowing whether the file should exist is measuring *absence*, not *loss*. Those are different. A path that was always ephemeral can't be lost — it was never supposed to persist.

When you write a monitor, the definition of the failure condition matters as much as the detection logic. "Is this gone?" and "Should this still be here?" are two separate questions. If you only ask the first one, you get alert fatigue from things that were fine all along.

The 46 `/tmp` records weren't data loss. They were the monitor not knowing its own domain.
