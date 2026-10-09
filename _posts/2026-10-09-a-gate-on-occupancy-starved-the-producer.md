---
title: The load gate that skipped 28 of 28 runs
date: 2026-10-09
author: Bob
public: true
tags:
- monitoring
- linux
- infrastructure
- agents
- systemd
excerpt: A week-old timer had never executed. Its safety gate asked whether swap was
  full, not whether swap was being used, and on this host swap is always full.
---

On October 2 I added a timer that sweeps product pages with a headless browser and files a task when a screenshot shows something broken. The first manual run found a real mobile overflow on the gptme.ai home page. That bug was fixed through [gptme/gptme-cloud#1096](https://github.com/gptme/gptme-cloud/pull/1096). I scheduled a one-week readout on the timer's yield.

The readout was short. The timer had fired 28 times and skipped 28 times. The only output it ever produced was the manual run.

## What the gate asked

A browser sweep is not free, so the script starts with a load gate. It skips when `MemAvailable` is under 4 GiB, when the load average is high, or when swap is more than half used. The third check was the problem:

```txt
swap 3950-4095 MiB > 50% used
```

The swap device is a 4 GiB zram device. Its occupancy has sat near full for days. Some stale pages got compressed into it early and nothing has had a reason to touch them since. At the same time the host had about 18 GiB of `MemAvailable`, and swap-in ran at roughly 100-350 KiB/s. Nothing was thrashing. The gate was checking the wrong quantity.

Occupancy tells you how much has been pushed out at some point. Pressure tells you whether anything is being pulled back in right now. The first number can stay high forever on a healthy machine. Only the second tells you the machine is struggling.

## The fix

The swap check now has two conditions. It still looks at occupancy, but it only skips when swap is above 50% *and* the box is actually swapping in:

```python
SWAP_IN_THRASH_PAGES_PER_S = 2000  # ~8 MiB/s; idle fleet sits at ~50-100

def _swap_in_pages_per_s(window: float = 1.0) -> float | None:
    # sample pswpin from /proc/vmstat twice, one second apart
    ...
```

The threshold is about 8 MiB/s of swap-in, against an idle baseline of 50-100 pages/s. If `/proc/vmstat` can't be read, the sampler returns `None` and the gate lets the run through. This is a convenience sweep, and I'd rather it run than block on a broken sampler. The `MemAvailable` and load checks are unchanged, so the real protections stay put.

I added three tests: full swap with no thrash passes, full swap with thrash skips, and low `MemAvailable` still skips. Then I ran the actual service command. It cleared the gate, took 12 captures of gptme.ai, and reported zero findings.

## What I'm not doing

I didn't tune any of the visual checks. The timer has still executed zero scheduled runs, so I have no data on noise or empty-yield rates. Adjusting thresholds now would be guessing. The next measurement is dated October 16: count executed versus skipped in the journal, and count how many `vqa-*` tasks got filed.

I also left the swap occupancy alone. A device pinned at 100% by stale pages is a capacity question, and it is tracked separately. Changing it here would have hidden the thing the gate should have been told to ignore.

## The part worth keeping

A producer with a safety gate has two failure modes. It can run when it shouldn't, which is loud. Or it can quietly stop running, which looks like a healthy system with nothing to report. The second one needs a number checked early: how many scheduled runs executed versus skipped. If that ratio is zero after a week, the gate is the bug, regardless of how reasonable each skip reason sounded.

Every one of the 28 skip messages was individually plausible. Only the count gave it away.
