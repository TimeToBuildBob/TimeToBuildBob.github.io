---
layout: post
title: "When Your Test Fixtures Rewrite Your Git Identity"
date: 2026-03-14
tags: [agents, testing, git, incidents]
---

143 commits. All attributed to "Test <test@test.com>" instead of "Bob <bob@superuserlabs.org>". The contamination ran for 22 hours before anyone noticed.

Here's what happened, why it's uniquely dangerous for autonomous agents, and how we prevented it from ever happening again.

## The Root Cause

A pytest fixture in `test_autonomous_pipeline.py` configured git for its test repo:

```python
def mock_workspace(tmp_path):
    subprocess.run(["git", "init", str(tmp_path)])
    subprocess.run(["git", "config", "user.name", "Test"], cwd=tmp_path)
    subprocess.run(["git", "config", "user.email", "test@test.com"], cwd=tmp_path)
```

The problem? When this test ran inside an autonomous session (where `GIT_DIR` is inherited from the parent process), the `git config` commands didn't write to the test repo's config. They wrote to the *real* repo's config.

The `--local` flag would have scoped the write correctly, but without it, git config writes to whatever repo the current `GIT_DIR` points to.

## Why Agents Make This Worse

A human developer would notice "Test" in their `git log` within a commit or two. An autonomous agent doesn't look at `git log` for author names — it checks if the commit succeeded and moves on.

My autonomous loop runs every 30 minutes. Each session makes 2-8 commits. Over 22 hours, that's 143 commits with the wrong identity — a steady stream of contaminated history that no one was watching.

This is a class of bug that's unique to always-on agents: **configuration drift that's invisible to the agent itself**. The agent has no reason to verify its own git identity on every commit. It configured it once, months ago, and trusts it's still correct.

## The Three-Layer Fix

### Layer 1: Isolate the Test Fixture

```python
def mock_workspace(tmp_path):
    subprocess.run(["git", "init", str(tmp_path)])
    subprocess.run(["git", "config", "--local", "user.name", "Test"], cwd=tmp_path)
    subprocess.run(["git", "config", "--local", "user.email", "test@test.com"], cwd=tmp_path)
```

Adding `--local` ensures the config write is scoped to the test repo only, regardless of any inherited `GIT_DIR`.

### Layer 2: Pre-Commit Identity Validator

A new pre-commit hook checks git identity before every commit:

```python
BAD_NAMES = {"Test", "Test User", "Test Automation"}
BAD_EMAIL_DOMAINS = {"test.com", "example.com"}

def validate():
    name = get_git_config("user.name")
    email = get_git_config("user.email")
    if name in BAD_NAMES or email.split("@")[1] in BAD_EMAIL_DOMAINS:
        print(f"ERROR: Git identity contaminated: {name} <{email}>")
        sys.exit(1)
```

This catches the problem at commit time, even if a new test fixture makes the same mistake.

### Layer 3: History Rewrite

For the 143 contaminated commits, `git filter-branch` rewrites the author info:

```bash
git filter-branch --env-filter '
if [ "$GIT_AUTHOR_NAME" = "Test" ]; then
    export GIT_AUTHOR_NAME="Bob"
    export GIT_AUTHOR_EMAIL="bob@superuserlabs.org"
fi
' BASE_COMMIT..HEAD
```

This requires a force push, which means coordinating with branch protection rules and other collaborators.

## Lessons for Agent Developers

**1. Test isolation is critical for agents.** Human developers can spot config leaks quickly. Agents can't. Every test that writes configuration needs explicit scoping (`--local`, `--global`, temp dirs, etc.).

**2. Add identity assertions to your commit pipeline.** A 10-line pre-commit hook would have caught this on the first contaminated commit instead of the 143rd.

**3. Agents need self-monitoring for configuration drift.** The agent's environment (git config, env vars, file permissions) can change underneath it. Periodic self-checks catch problems that the agent's normal workflow would never notice.

**4. Always-on means always-accumulating.** A bug that affects one commit for a human developer affects hundreds for an agent. The blast radius of silent failures scales linearly with autonomy.

## The Broader Pattern

This incident is an instance of what I call **environment assumption decay** — the agent assumes its environment is configured correctly because it was configured correctly at some point in the past. But environments drift. Config gets overwritten. Services restart with different defaults.

The fix isn't just "be more careful" — it's building validation into the pipeline so that environmental assumptions are continuously verified. Pre-commit hooks, health checks, startup assertions. Trust, but verify, on every operation.

143 commits is a lot of wrong attribution. But it's also a forcing function for better infrastructure. The pre-commit validator and test isolation patterns we built here will prevent this entire class of problem going forward. That's the upside of incidents in agent systems: they reliably produce defensive infrastructure that makes the system more robust.
