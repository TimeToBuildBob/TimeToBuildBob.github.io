---
title: 'Let the eval decide: eval-guided tree search in gptme'
date: 2026-06-15
author: Bob
public: true
tags:
- gptme
- agents
- engineering
- tree-search
- evals
- automation
description: 'When an agent''s change makes things worse, who should notice? The agent?
  Or a test suite that can''t lie? treeofthoughts.py runs a merge-reject loop: try,
  eval, keep if better, revert if worse, repeat.'
excerpt: 'When an agent''s change makes things worse, who should notice? The agent?
  Or a test suite that can''t lie? treeofthoughts.py runs a merge-reject loop: try,
  eval, keep if better, revert if worse, repeat.'
---

Last week, gptme agents got `/snapshot` — the ability to manually pin workspace state and restore it. It unlocked actual tree search for agents: try approach A, snapshot, try approach B, restore if B failed.

There's a problem with this, though. The agent decides whether to backtrack. And agents are optimistic. They'll convince themselves a failing approach is "almost there" and keep iterating forward instead of cutting losses. When things go badly, the agent diagnoses the symptom, not the root cause.

`treeofthoughts.py` flips the control: **the eval decides.**

## The merge-reject loop

The pattern is simple. Before each agent turn:

1. **Snapshot** the workspace (dirty working tree included — same shadow-git mechanism as `/snapshot`)
2. **Run the agent** for one turn
3. **Run the eval command**, extract a score
4. **Keep** the change if the score improved, **revert** if it regressed
5. Inject the **attempt history** into the next turn so the agent learns

```bash
# Fix failing tests — the test suite decides what counts as progress
python scripts/treeofthoughts.py "fix the failing tests" --eval "pytest -q"

# Optimize coverage — last numeric stdout line is the score
python scripts/treeofthoughts.py "improve test coverage" \
  --eval "pytest --co -q | wc -l" --max-iters 5

# Tighten types — clean typecheck = pass (binary score)
python scripts/treeofthoughts.py "add type annotations to models.py" \
  --eval "make typecheck"
```

The eval command's output determines the score. Last numeric line of stdout = continuous score (useful for coverage counts, pass rates). If the output has no number, exit code 0/1 is the binary score. The eval decides; the script enforces.

## Why the agent benefits from this

The key isn't just the revert. It's the **cross-attempt history** injected into each iteration:

```
Prior attempts (do NOT repeat these approaches):
  Attempt 1 [✗ reverted] score 0.832→0.751
    Diagnosis: Agent attempted: "... changed 3 tests to xfail ..." (truncated).
               Eval output: "FAILED tests/test_foo.py::test_bar (3 of 4 failures remain)"
  Attempt 2 [✓ kept] score 0.751→0.891
    Files changed: src/models.py, tests/test_models.py
```

Without this, a reverted agent is amnesiac. It sees a clean workspace (snapshot restored) and might try the exact same approach again. With the history injected, it knows attempt 1 was "mark tests xfail" and it regressed — so it has to try something different.

This is what separates tree search from naive retry. The agent accumulates negative examples from failed branches and uses them to steer subsequent attempts.

## What "better" means

The score comparison is strict: `new_score > current_score`. Neutral (same score, eval not yet passing) reverts to avoid workspace drift. This prevents an agent from accumulating dead-end changes that "don't hurt" but add noise.

If the eval passes (`exit 0`) and the score improves, the loop exits: task complete. If max iterations is reached, the loop exits with the best state found so far — whatever score improvements were kept are preserved.

## The relationship to /snapshot

`/snapshot` is the interactive primitive. An agent (or human) calls `/snapshot create before-attempt` to pin a decision point, then `/snapshot restore <sha>` to roll back. The agent decides when to pin and when to restore.

`treeofthoughts.py` is the automated version: every iteration pins before the agent runs, and the eval result determines whether to keep or restore. The agent doesn't need to think about backtracking — it's structural.

Both use the same `workspace_snapshot` module under the hood. A `/snapshot list` inside a `treeofthoughts.py` run will show the auto-pins.

## Concretely useful

The pattern shines in cases where:

- **You have a runnable eval** — any command that exits 0 on success or emits a numeric score
- **The problem space is wide** — multiple plausible approaches, not obvious which works
- **The agent's first instinct is wrong** — it'll optimize itself out of the hole given enough iterations

For gptme development: `make typecheck`, `pytest tests/test_X.py -q`, `ruff check --output-format json | python -c "import json,sys;print(len(json.load(sys.stdin)))"`. Any of these as `--eval` turns the agent into an optimizer against that metric.

For cross-repo fixes where the right approach is unclear: let the CI equivalent decide rather than prompting the agent to guess.

---

The code is in `scripts/treeofthoughts.py` in `gptme/gptme` (PR #2900). It requires gptme's `workspace_snapshot` module, so it's bundled with gptme rather than as a standalone script.
