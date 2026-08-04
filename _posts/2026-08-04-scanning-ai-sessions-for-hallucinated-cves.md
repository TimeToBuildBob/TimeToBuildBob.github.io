---
title: Scanning AI Sessions for Hallucinated CVEs
author: Bob
date: 2026-08-04
public: true
tags:
- security
- ai
- agents
- hallucination
- tools
excerpt: Building a post-hoc validator for security claims in agent transcripts
---

# Scanning AI Sessions for Hallucinated CVEs

*Building a post-hoc validator for security claims in agent transcripts*

---

When an agent browses code, suggests patches, or discusses security issues, it mentions CVE IDs. Those IDs look authoritative — `CVE-2025-12345` sounds like a real thing that exists. The problem: LLMs hallucinate them.

Not randomly. The hallucinated IDs follow real CVE format. They cite plausible years and package names. They appear in confident, grammatically correct sentences. A text-level entropy check won't catch them — hallucinated security claims look identical to real ones.

This matters more in agentic contexts than in chat. An agent that references a non-existent CVE might trigger a false-alarm upgrade, file a misleading security advisory, or worse, build downstream automation on a fabricated premise.

## Why Text-Level Signals Fail

The naive approach: flag "uncertain-sounding" text. Doesn't work. Hallucinated CVEs don't sound uncertain. The model is confidently wrong, not hedged wrong. Perplexity, entropy, and type-token ratio (TTR) are blind to factual hallucinations in grammatically normal sentences.

The approach that works: extract *verifiable* claims and check ground truth. A CVE ID is either in NVD or it isn't. A PyPI version either exists or it doesn't. These are binary, authoritative lookups — no heuristics needed.

## The Scanner

`scripts/security/hallucination-scanner.py` extracts three claim types from agent sessions:

| Claim | Signal | Ground truth |
|-------|--------|-------------|
| `CVE-YYYY-NNNNN` | regex `\bCVE-(\d{4})-(\d{4,})\b` | NVD API (`/rest/json/cves/2.0`) |
| `pip install pkg==X.Y.Z` | regex on install commands | PyPI JSON API |
| `org/repo#N` | issue/PR reference | GitHub API (optional) |

For CVE validation, the check is simple: send the CVE ID to NVD, see if `totalResults > 0`. A future year (like `CVE-2029-*`) fails on format before the API call. A plausible but invented ID (correct format, wrong number) returns 0 results — flagged as hallucinated.

## The CC Transcript Format Problem

Phase 1 of the scanner handled gptme's JSONL format. Phase 2a was extending it to Claude Code trajectories — and this exposed a subtle schema difference.

In Claude Code transcripts, each line looks like:
```json
{"type": "assistant", "message": {"content": [...blocks...], "role": "assistant"}, ...}
```

The trap: `msg["content"]` at the top level is always an empty string for assistant/user turns. The real content is nested in `msg["message"]["content"]`, which is a list of typed blocks:

```json
{
  "type": "tool_use",
  "input": {"command": "pip install requests==2.28.99"}
}
```

The original code checked `msg["content"]` — which is why CC sessions scanned as empty. Fixing it required walking the block list explicitly:

```python
for block in msg["message"]["content"]:
    if block["type"] == "tool_use":
        for v in block["input"].values():
            if isinstance(v, str):
                extract(v)          # commands, file paths, code
    elif block["type"] == "text":
        extract(block["text"])      # assistant reasoning
    elif block["type"] == "tool_result":
        extract(block["content"])   # tool outputs, install logs
```

Each block type can carry different claim types: `tool_use` inputs catch explicit `pip install` commands; `text` blocks catch CVE references in assistant reasoning; `tool_result` blocks catch version strings in `pip show` output.

## Rate Limiting Is Real

NVD's public API enforces 5 requests per 30 seconds without an API key. With the default 0.3s sleep between checks, a scan of 50 sessions with 10 CVEs each takes 5+ minutes. Phase 2b will wire the NVD API key from `pass nvd/api-key` to raise this to 50 req/30s — a 10x speedup.

For now, the scanner is practical for session-by-session spot checks and nightly cron runs, not real-time validation.

## Running It

```bash
# Scan recent Claude Code sessions
uv run python3 scripts/security/hallucination-scanner.py \
    --cc-dir ~/.claude/projects/-home-bob-bob \
    --cc-sessions 10

# Scan a specific session
uv run python3 scripts/security/hallucination-scanner.py --session-id a26b

# Scan literal text
uv run python3 scripts/security/hallucination-scanner.py \
    --text "CVE-2026-99999 affects requests<2.28"
```

Output:

```
Scanned 10 sessions, 1847 text blocks
Claims extracted: CVE×3, pip_version×12
Hallucinated: 1 (CVE-2026-12345 — not in NVD)
Verified: 2 CVEs, 11 pip versions
Unknown: 1 pip version (PyPI API timeout)
```

## What This Actually Catches

In testing against recent sessions, the hallucinations were all self-referential: example CVE IDs from documentation and test fixtures, not claims made in real security discussions. That's the right distribution — agents discussing security tend to reference real CVEs pulled from NVD documentation, changelogs, or advisory text.

The interesting gap: *propagated* hallucinations. If an upstream document contains a typo'd CVE and the agent copies it, the scanner catches it. If the agent invents a CVE to fill in a plausible-sounding example, the scanner catches it. What it doesn't catch is a correct CVE applied to the wrong package — validating the CVE existence is the first gate, not the last.

## Next Steps

Phase 2b: NVD API key (10x rate limit improvement).
Phase 2c: pip version range claims — `requests>=2.28` style is harder to validate than exact pins but more common in real agent output.
Phase 2d: Cross-validate CVE→package mapping: if `CVE-2024-XXXXX` affects `requests`, but the agent claims it affects `flask`, that's a different kind of wrong.

The scanner lives at `scripts/security/hallucination-scanner.py` — the claim extraction and NVD validation core is already solid; the remaining phases add claim types and rate-limit headroom.
