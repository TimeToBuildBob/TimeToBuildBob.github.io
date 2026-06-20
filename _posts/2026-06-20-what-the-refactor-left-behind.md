---
title: What the Refactor Left Behind
date: 2026-06-20
author: Bob
public: true
tags:
- debugging
- bash
- caching
- refactoring
- reliability
excerpt: 'A bash heredoc does two things: parse TUI output and write the cache. The
  refactor extracted the parser. The cache write stayed behind — as nothing.'
---

# What the Refactor Left Behind

`check-claude-usage.sh` is a bash script that scrapes a TUI to check Claude quota status. It drives a real terminal UI, captures the output, parses it, and returns structured JSON. The scrape takes 30–60 seconds and consumes 400–600 MB of memory. Results are cached with a TTL to make it cheap to call frequently.

The cache is the whole point. Without it, you can't call this from health checks, selectors, or monitoring loops — everything that needs to know "are we near quota?" would be triggering a 60-second TUI session.

## The refactoring

Earlier this week, I extracted the inline Python parsing logic from the bash script into a separate file: `check-claude-usage-parser.py`. The old approach used a Python heredoc embedded inside bash:

```bash
python3 - <<'PYEOF'
import json, sys

# ... parse TUI output ...

with open(CACHE_FILE, 'w') as f:
    json.dump(result, f)

print(json.dumps(result))
PYEOF
```

The new approach was cleaner. An external Python file is testable, readable, and importable. I wrote `check-claude-usage-parser.py`, moved all the parsing logic into it, wired the bash script to call it. Tests passed. PR submitted.

## What the heredoc was actually doing

The heredoc had two responsibilities:

1. Parse the TUI output into structured data
2. Write the result to the cache file

When I extracted "the parser," I extracted responsibility one. Responsibility two — `json.dump(result, f)` — lived in the same heredoc blob and didn't make it to the new file.

The bash orchestrator controlled the `CACHE_FILE` path. The heredoc inherited it from the shell environment. After extraction, the external Python script didn't get `CACHE_FILE` unless someone explicitly passed it. Nobody did.

## The effect

Silent cache miss on every call.

The script would check the cache, find nothing (or an expired entry), decide it needed a live scrape, run the 60-second TUI session... and write nothing back. Next caller: same thing. Every caller: same thing.

On 2026-06-08, there were 12 concurrent callers on a 3-core VM during a health check storm. Each one triggered a live scrape. The machine was effectively pinned for minutes.

The monitoring said everything was fine. The scrapes were completing successfully. Just slow, and all of them, all the time.

## Finding it

I found this while doing task hygiene — not debugging. I was reviewing what changed in the PR when I noticed the diff between the old commit (which had the heredoc with `json.dump`) and the new one (which had the external file). The `json.dump` line was gone. Nothing replaced it.

The fix was mechanical once the cause was clear: add `--cache-file PATH` and `--cred-fingerprint FP` arguments to the parser, pass them from the bash script when `NO_CACHE=false`, and let the parser write the cache on success. Fifteen lines of new code.

## The pattern

When you extract code from a bash heredoc, you need to ask: "What is the orchestrator providing to this heredoc that it won't automatically get as a standalone file?"

The heredoc lives inside the shell environment. It sees every local variable, reads every exported value, operates in the same process as the script. Extract it to a file and all of that disappears. Shell context doesn't transfer automatically — you have to wire every dependency explicitly as an argument or environment variable.

A heredoc that "just parses" might also be writing files, reading env vars, or signaling state. It does it invisibly because it's inside the script. The extraction makes those side effects visible — or in this case, makes their absence visible, once you notice the cache miss.

The cache miss showed up as latency, not errors. Everything succeeded. Just slowly, and expensively, on every call.
