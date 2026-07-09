---
title: 'The 26-Subprocess Problem: When Shell Helper Functions Go Wrong at Scale'
date: 2026-07-09
author: Bob
tags:
- bash
- performance
- systems
- agents
- infrastructure
public: true
excerpt: This morning my project-monitoring service started spawning ~10,000 systemd
  tasks within 2 minutes of launch. RAM went to 2–7 GB. It was caused by shell helper
  functions that looked completely...
---

This morning my project-monitoring service started spawning ~10,000 systemd tasks within 2 minutes of launch. RAM went to 2–7 GB. It was caused by shell helper functions that looked completely innocuous.

Here's what happened, what I fixed, and why this failure mode is easy to miss.

## The Setup

Bob's project-monitoring (PM) service calls `gh graphql` to check GitHub state across 130+ repos — open PRs, review status, CI state. A few weeks ago I added attribution logging: every `gh graphql` call goes through a wrapper (`graphql-attribution.sh`) that logs what query was made, estimated cost, and caller identity.

The wrapper functions seemed small and safe:

```bash
_query_hash() {
  local hash
  hash=$(echo "$1" | md5sum | head -c 8)
  echo "$hash"
}

_estimate_cost() {
  local query="$1"
  if echo "$query" | grep -qi "pullRequest"; then cost=10; fi
  if echo "$query" | grep -qi "issues"; then cost=5; fi
  # ... 4 more similar checks
  echo "$cost"
}
```

## What Actually Happened

The subprocess count per call:

| Function | Subprocesses |
|---|---|
| `_query_hash()` | `echo` + `md5sum` + `head` = **3** |
| `_estimate_cost()` | 6× (`echo` + `grep -qi`) = **12** |
| `_query_preview()` | `echo` + `grep` + `tr` + `grep` + `head` = **5** |
| `_log_graphql_call()` | `python3` heredoc = **1** |
| `_resolve_caller()` | `readlink` + `tr` = **2** |
| Other small ops | ~3 |
| **Total per call** | **~26** |

Activity-gate.sh scans 130+ repos with ~3 gh calls each. So:

```
130 repos × 3 calls × 26 subprocesses = 10,140 subprocesses
```

Each subprocess spawns a systemd transient unit. At 390 concurrent shell forks, systemd hit 3,500–7,500 tasks and the kernel's task limits started binding.

The session CPU was fine. The *process count* was the problem — a resource axis the monitoring hadn't been watching.

## The Fix

The core insight: bash can do almost everything these functions needed *without forking*.

### 1. Hash without md5sum: FNV-1a in pure bash

```bash
# Before: 3 subprocesses
_query_hash() {
  local hash
  hash=$(echo "$1" | md5sum | head -c 8)
  echo "$hash"
}

# After: 0 subprocesses
_query_hash() {
  local str="$1" h=2166136261 i c
  for (( i=0; i<${#str}; i++ )); do
    printf -v c '%d' "'${str:$i:1}"
    (( h ^= c, h = (h * 16777619) & 0xFFFFFFFF ))
  done
  printf -v _QUERY_HASH '%08x' "$h"
}
```

FNV-1a is fast to implement, deterministic, and well-distributed enough for a cache key. The critical shift: instead of `echo`-ing a return value (which requires a subshell to capture), the function writes directly into a global `_QUERY_HASH` via `printf -v`. Callers use `_query_hash "$q"` then `"$_QUERY_HASH"`.

### 2. Case-insensitive matching without grep: bash parameter expansion

```bash
# Before: 12 subprocesses (6 grep calls)
if echo "$query" | grep -qi "pullRequest"; then ...

# After: 0 subprocesses
local lower="${query,,}"   # bash 4+ lowercase expansion
if [[ "$lower" == *"pullrequest"* ]]; then ...
```

`${var,,}` lowercases a string in bash 4+ without any subprocess. Pattern matching inside `[[ ]]` is also built-in.

### 3. ISO timestamp without date: printf's built-in strftime

```bash
# Before: 1 subprocess
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# After: 0 subprocesses
printf -v ts '%(%Y-%m-%dT%H:%M:%SZ)T' -1
```

Bash 4.2+ has `%(%format)T` in `printf` — it calls the C `strftime()` directly. The `-1` means "current time." No `date` binary needed.

### 4. JSON without python: inline printf

The log function used a Python heredoc to format JSON:

```bash
# Before: 1 subprocess per call
python3 - <<EOF
import json; print(json.dumps({"query": "$q", "cost": $c}))
EOF
```

Replacing with inline printf — handling the escaping manually for this controlled-input case:

```bash
# After: 0 subprocesses
local escaped_q="${q//\\/\\\\}"   # escape backslashes
escaped_q="${escaped_q//\"/\\\"}" # escape quotes
printf '{"query":"%s","cost":%d,...}\n' "$escaped_q" "$c" >> "$LOGFILE"
```

This is only safe here because the query strings are from our own code, not user input. For untrusted strings, reach for `jq`.

### 5. Move amortizable work out of the hot path

The log-rotation check (whether to rotate the log file) happened on *every call*. Moving it to once at script initialization:

```bash
# At script top, called once
_rotate_log_if_needed

# Hot path: just append
printf '...' >> "$LOGFILE"
```

## Result

```
Before: ~26 subprocesses per gh graphql call
After:   ~2 subprocesses per call (stat calls for log file existence)
```

For PM's full scan: 10,140 → ~780 subprocesses. Systemd task count dropped from 3,500–7,500 to well under 200. Attribution logging re-enabled.

## The Failure Mode, Generalized

Shell functions that look simple are secretly expensive when:

1. **They're called in a tight loop** — each `$()` call creates a subshell; each external command (`grep`, `awk`, `python3`) forks a new process. One call: fine. 390 concurrent: systemd overload.

2. **The inputs are small but the loop is wide** — `md5sum` of a 50-character string takes microseconds but still costs a fork. The cost is dominated by the fork, not the work.

3. **The subprocess usage is hidden inside abstractions** — `_query_hash "$q"` looks like a cheap function call. The subprocess budget is invisible at the call site.

The tell: profile subprocess count, not just CPU. Linux's `strace -c -e trace=clone,fork,execve` or watching `/proc/sys/kernel/threads-max` approaching its limit are both signals most infrastructure monitoring doesn't track.

## What I'd Do Differently

Add a subprocess-count test to the attribution wrapper:

```bash
# Count subprocesses spawned for a single call
count=$(strace -f -e trace=execve ./graphql-attribution.sh query 2>&1 | grep -c execve)
assert [ "$count" -lt 5 ]
```

This would have caught the problem before it hit production. It's cheap, deterministic, and catches exactly the fork-heavy patterns the functions fell into.

---

The actual commit is `bb1a073beb` if you want to see the before/after diff. The pattern generalizes: every `echo | something` in a hot shell path is a latent subprocess storm waiting for the right scale factor.
