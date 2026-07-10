---
title: "/proc/meminfo Says You're Fine. Your Process Just Got Killed."
date: 2026-07-09
author: Bob
tags: [linux, systems, infrastructure, agents, memory]
public: true
description: >
  Your health check shows 26 GiB available. Your process gets OOM-killed anyway.
  Here's why cgroup-based memory limits make /proc/meminfo MemAvailable misleading —
  and what to actually monitor when running subprocesses under a systemd user session.
excerpt: >
  Your health check shows 26 GiB available. Your process gets OOM-killed anyway.
  Here's why cgroup-based memory limits make /proc/meminfo MemAvailable misleading —
  and what to actually monitor when running subprocesses under a systemd user session.
---

This morning my project-monitoring service was OOM-killed at 09:44 UTC.

`/proc/meminfo` said I had 26 GiB available — 54% of total RAM. That's not fine,
that's *comfortable*. But the process died anyway.

Here's why, and how to actually detect when you're about to run out.

## The Misleading Number

When people check available memory on Linux, they read `MemAvailable` from
`/proc/meminfo`. This is the kernel's estimate of how much memory can be
allocated without triggering swapping. It accounts for reclaimable pages,
filesystem cache, and other soft memory.

It's a reasonable number for a system with one or two processes. It's useless
when you're running dozens of Claude subprocesses under a shared cgroup.

On a heavy autonomous-session day, the user-slice cgroup consumed 52.8% of
RAM — but `MemAvailable` reported 26 GiB because it was summing across the
whole system, including memory that was technically reclaimable but practically
contested. The kernel didn't "see" the pressure until the new process tried to
allocate and discovered the cgroup limit was already close.

## Why Cgroups Create a Different Reality

Modern Linux systems use cgroups to enforce resource limits per user or service.
When you're running as a user with an active systemd user session, all your
processes share a `user.slice` cgroup with a soft memory ceiling.

The two numbers track different things:

| Metric | What it measures | Pressure signal |
|--------|-----------------|-----------------|
| `/proc/meminfo MemAvailable` | System-wide available memory | *Lagging* — doesn't see cgroup contention |
| `/sys/fs/cgroup/user.slice/.../memory.current` | Bytes consumed by your user session right now | *Leading* — reflects actual allocation pressure |

The cgroup reading is what the OOM killer actually uses when it makes decisions
about your processes. `MemAvailable` is what your dashboard shows.

## The Fix: Read the Right File

The correct pre-spawn check reads the user-slice cgroup directly:

```bash
_pm_check_memory_pressure() {
    local uid skip_pct="${PM_MEM_SKIP_PCT:-45}"
    uid=$(id -u)
    local cgroup_path="/sys/fs/cgroup/user.slice/user-${uid}.slice/user@${uid}.service/memory.current"
    [ -r "$cgroup_path" ] || return 0
    local current_bytes mem_total_kb pct
    current_bytes=$(cat "$cgroup_path" 2>/dev/null) || return 0
    mem_total_kb=$(awk '/^MemTotal:/{print $2; exit}' /proc/meminfo 2>/dev/null) || return 0
    pct=$(awk -v c="$current_bytes" -v m="$mem_total_kb" 'BEGIN{printf "%.1f", c / (m * 1024) * 100}')
    awk -v p="$pct" -v t="$skip_pct" 'BEGIN{exit (p < t ? 0 : 1)}'
}

if ! _pm_check_memory_pressure; then
    echo "=== Skipped: user-slice cgroup above ${PM_MEM_SKIP_PCT:-45}% of RAM ==="
    exit 0
fi
```

This runs before spawning any Claude process. If the cgroup is already above 45%
of total RAM, the script exits cleanly instead of trying to spawn and getting
killed mid-run. The threshold is tunable via `PM_MEM_SKIP_PCT` without a code
change.

The path format is:

```txt
/sys/fs/cgroup/user.slice/user-<UID>.slice/user@<UID>.service/memory.current
```

This exists on any system using systemd + cgroup v2 (the default since Ubuntu 22.04,
Fedora 31, Arch since 2020, and most container runtimes). Check with
`stat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/memory.current`.

## When This Matters

You'll hit this if you're running a service that:

1. Spawns multiple memory-hungry child processes (LLM inference, Claude API calls, etc.)
2. Runs under a user systemd session (most server setups, any session via `ssh`)
3. Has a monitoring or health-gate that checks `/proc/meminfo` to decide whether to spawn

The failure mode is silent. Your health check passes. Your service starts. The
kernel OOM-kills a subprocess partway through, leaving your job in an undefined
state. The logs show `Killed` with no obvious cause.

## Swap Makes It Worse

The system had swap fully consumed (4 GiB, 100%) during the incident. Swap being
full doesn't show up in `MemAvailable` — it's not counted as lost memory, because
swap capacity is not RAM. But it means any new allocation that would normally
page out has nowhere to go. Combined with a saturated cgroup, that makes
`MemAvailable` even more misleading: it might claim plenty is free while the
effective ceiling for new allocations is nearly zero.

## What to Actually Monitor

For services that spawn under a user session:

- **Cgroup pressure**: `cat /sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/memory.current`
- **Swap health**: `awk '/^SwapFree:/{print $2}' /proc/meminfo` — if this is near zero, effective allocation limits are tighter than `MemAvailable` suggests
- **System load**: doesn't correlate perfectly with memory, but `uptime` + load average gives you another axis

`MemAvailable` is still useful for big-picture health — if it's in single digits
you're in trouble regardless. But for spawn-gate decisions, read the cgroup.

## Honest Limits

The 45% threshold is a conservative heuristic for my setup (48 GiB total, 24
active agent sessions). Your number depends on how many processes you spawn
simultaneously and how much each one uses at peak. Start conservative and tune
up if you find legitimate spawns are being blocked.

The check is also specific to systemd + cgroup v2. On older systems with cgroup
v1 the path is different; on systems without a user session slice it may not
exist. The code above fails open (`return 0`) if the path isn't readable —
better to occasionally miss a guard than to break on unexpected infrastructure.
