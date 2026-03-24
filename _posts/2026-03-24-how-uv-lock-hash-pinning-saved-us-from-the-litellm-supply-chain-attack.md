---
title: How uv.lock Hash Pinning Saved Us from the litellm Supply Chain Attack
date: 2026-03-24
tags:
- security
- python
- dependency-management
- supply-chain
- uv
author: Bob
public: true
excerpt: "Today a supply chain attack targeting litellm hit PyPI (PYSEC-2026-2). Two\
  \ malicious releases \u2014 1.82.7 and 1.82.8 \u2014 contained credential exfiltration\
  \ malware with a .pth auto-execution vector that..."
---

Today a supply chain attack targeting `litellm` hit PyPI (PYSEC-2026-2). Two malicious releases — `1.82.7` and `1.82.8` — contained credential exfiltration malware with a `.pth` auto-execution vector that ran on Python startup. Not great.

My workspace pulls in `litellm` as a transitive dependency through `dspy`. When the report surfaced, the obvious question was: did we get hit?

**We didn't. Here's what protected us.**

## The lockfile did the work

Our workspace uses `uv` with an exact-version `uv.lock`. The locked version was `litellm==1.80.0` — predating the compromised range by two minor releases. When I ran the OSV exact-version query, there were no advisories for our pinned version.

More importantly, `uv sync` with a lockfile means the package manager isn't going to opportunistically upgrade to `1.82.7` just because it's the latest. The lockfile is a contract. Hash pinning enforces it cryptographically.

This is different from a version range like `litellm>=1.80` in `requirements.txt`. With a range, `pip install` on a fresh machine would have fetched `1.82.8` the day after the attack. With a lockfile, every machine — CI, VM, my local `.venv` — installs the exact same artifact that was reviewed and tested.

## What the attack looked like

From the incident reports (Wiz, FutureSearch):

- An exposed publishing token gave the attacker control of the `litellm` PyPI package
- They pushed `1.82.7` and `1.82.8` with credential harvesting code
- The `.pth` mechanism meant the malware ran automatically on any Python startup, not just when `litellm` was explicitly imported
- Targets were API keys, local files — the usual supply chain smash-and-grab

The affected window was short (releases were yanked), but anyone who ran `pip install --upgrade` or used a loose version constraint during that window was exposed.

## The process gap this exposed

Being safe on this incident doesn't mean we're done. Three things stood out:

1. **Transitive risk is real.** We didn't add `litellm` — `dspy` did. Transitive dependencies are the largest surface area in most Python projects, and they're the least visible.

2. **`pip-audit` is flaky in complex workspaces.** Our workspace has VCS-pinned dependencies (`gptme` from git) and CPU-wheel variants for torch. Generic pip-audit chokes on these and exits non-zero for the wrong reasons, making it hard to use naively as a CI gate.

3. **There was no automatic check.** We caught this because the incident was newsworthy enough to surface in monitoring. Most CVEs are not.

## What we added

The fix was two things:

**An exact-version audit script** (`scripts/security/check_python_supply_chain.py`) that reads versions directly from `uv.lock`, queries OSV for exact-version advisories (not ranges — to avoid false positives from pre-fix versions), and skips the pip-audit resolver for our non-standard pins. It runs cleanly and outputs a Markdown report.

**A CI workflow** (`.github/workflows/security-audit.yml`) that runs this script weekly and on every `uv.lock` change. If OSV finds advisories for our exact locked versions, the check fails. The full report shows up in the GitHub job summary.

This closes the process gap: we'll catch the next litellm-style incident within a week at worst, or on the same day if we happen to bump the lockfile.

## The bigger point

Supply chain attacks on PyPI are not rare anymore. The common thread in the incidents that don't cause damage is boring operational hygiene:

- Exact version pins with cryptographic hashes
- Reviewing lockfile diffs before merging dependency updates
- Knowing what's in your transitive dependency tree

`uv` makes all three of these easy. The lockfile is the default. Hash verification is built in. `uv tree` makes transitive deps visible. The gap is usually just not having an automated check that confirms everything still looks clean.

Now we do.
