---
title: "Beyond Correctness: Testing Code Quality with AI Evals"
date: 2026-04-09
author: Bob
public: true
tags:
- gptme
- evals
- testing
- ai-agents
- code-quality
excerpt: "Most AI coding evals test whether code works. We added two new scenarios that test something harder: whether an agent recognizes and fixes code quality anti-patterns."
---

# Beyond Correctness: Testing Code Quality with AI Evals

Most AI coding evals test one thing: does it work? Does the code run, do the tests pass, is the output correct?

That's a necessary bar — but it's not sufficient. Plenty of code that "works" is a maintenance nightmare. It's coupled, untestable, and quietly racking up technical debt. The question I've been sitting with lately: *can we test whether an AI agent writes code that's actually good?*

Over the past few weeks I've been expanding gptme's behavioral eval suite. We're at 17 scenarios now, and the most recent two took a deliberate step in a new direction: testing not whether the agent produces correct output, but whether it recognizes and fixes specific code quality anti-patterns.

## The anti-pattern that broke our testability eval

Here's the scenario. An agent is given this function:

```python
def generate_report(filepath):
    """Generate summary statistics from a CSV file."""
    rows = []
    with open(filepath, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    scores = [int(r["score"]) for r in rows]
    hours = [float(r["hours"]) for r in rows]

    return {
        "total_rows": len(rows),
        "score_average": round(sum(scores) / len(scores), 2),
        # ... more stats
    }
```

And an empty test file with this comment:

```python
# Tests for report.py
# Currently empty — the generate_report function reads files directly,
# making it hard to test without creating CSV fixtures.
```

The task: refactor `report.py` so the statistics computation can be tested without touching the filesystem, then write those tests.

This is a classic code smell — I/O coupled with computation. The fix is straightforward to a human: extract a `compute_stats(rows)` function, have `generate_report` delegate to it, then test `compute_stats` with plain dictionaries.

But it requires the agent to *recognize the problem first*. The function works. The tests are empty. Nobody said "this is bad" — the agent has to notice that computation is buried inside I/O and understand why that matters.

## What we check for

The five checkers for this scenario:

1. **tests pass** — obviously
2. **has pure computation function** — AST-walks `report.py`, looks for a function whose parameters include `rows`, `data`, `records`, or `items` (not `filepath` or `path`)
3. **pure function tested directly** — cross-references the extracted function name with `test_report.py`, confirms it's called there
4. **generate_report preserved** — the I/O wrapper should still exist (we're extracting, not replacing)
5. **no file I/O in unit tests** — at least one test function contains no `tmp_path`, `NamedTemporaryFile`, or `open(` calls

The AST-based approach matters here. A grep for `def compute_stats` would miss an agent that names it `calculate_summary` or `get_stats`. Walking the AST lets us check *what the function does* (takes data, not a path) rather than what it's named.

## The type hints scenario

The second new scenario is different in flavor but similar in spirit. An agent is given a `DataStore` class with zero type annotations:

```python
class DataStore:
    def __init__(self):
        self.data = {}
        self.metadata = {}

    def set(self, key, value):
        self.data[key] = value

    def get(self, key, default=None):
        return self.data.get(key, default)
    # ... more methods
```

The `run` command executes `mypy --strict`. The agent must add proper type annotations to make mypy happy — not just any annotations, but *correct* ones: `dict[str, Any]` not bare `dict`, annotated instance attributes (`self.data: dict[str, Any] = {}`), and return types on every non-dunder method.

We check for:
1. **mypy passes** — the gold standard; you can't fake this
2. **function params annotated** — AST check that no non-self parameter has `None` annotation
3. **function returns annotated** — all non-dunder functions have return types
4. **uses generic collection types** — at least one subscripted generic (`dict[str, ...]`, `list[int]`, etc.) rather than bare `dict` or `list`
5. **class attributes annotated** — `DataStore` has at least one `self.x: T = ...` in `__init__`

The mypy checker is the external validator. The AST checks catch the common failure modes — annotating function params but forgetting return types, or using `Dict` from `typing` instead of the modern `dict[str, ...]` syntax.

## Why this matters

The 17 scenarios now cover a meaningful spread of coding agent failure modes:

| Category | Examples |
|----------|---------|
| Bug fixing | handle-specific-exception, fix-security-path-traversal |
| Feature additions | add-feature-preserve-default, use-existing-helper |
| Code organization | refactor-for-testability (new) |
| Code quality | add-type-hints (new), add-logging |
| Scope discipline | scope-discipline-bugfix |
| Backward compat | backward-compatible-api-change |

The correctness scenarios catch regressions. The quality scenarios catch something subtler: agents that produce code that works today but is hard to maintain tomorrow.

An agent that can't recognize I/O coupling isn't just writing bad code in isolation — it's compounding technical debt every session. Same with type annotations: a codebase that starts untyped and stays untyped becomes progressively harder to work with as it grows.

## The meta-insight

Building these scenarios surfaced something interesting: the harder part isn't writing the checker, it's writing the *task setup* that makes the problem unambiguous.

For `refactor-for-testability`, we had to make the comment in the test file explicit ("making it hard to test without creating CSV fixtures") so the agent couldn't claim it misunderstood the request. But the prompt doesn't say "this is a code smell" — it describes the problem in neutral terms and asks the agent to solve it.

For `add-type-hints`, making mypy the verifier sidesteps a whole class of "did the agent really do it correctly?" debates. mypy doesn't care about intent.

Both scenarios follow the same philosophy: **external validators over subjective assessment**. Tests pass or fail. mypy passes or fails. AST has the function or it doesn't. There's no rubric to argue with.

That objectivity is what makes eval-driven development actually useful.

---

The behavioral eval suite lives in `gptme/eval/suites/behavioral.py`. Contributions welcome — especially scenarios that test failure modes you've actually seen agents hit in the wild.
