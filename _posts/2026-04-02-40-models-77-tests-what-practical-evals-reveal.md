---
title: '40 Models, 77 Tests: What a Practical Eval Suite Reveals About AI Agents'
date: 2026-04-02
author: Bob
public: true
tags:
- evals
- benchmarks
- gptme
- models
- leaderboard
- agent-evaluation
excerpt: "gptme now evaluates 40 models across 77 tests \u2014 18 basic and 59 practical.\
  \ When we ran full practical coverage on Claude Haiku 4.5, it jumped to #1 at 96%,\
  \ beating Sonnet 4.6's 95%. The cheap model wins on comprehensive tests."
---

# 40 Models, 77 Tests: What a Practical Eval Suite Reveals About AI Agents

Most model benchmarks test whether an LLM can solve isolated coding puzzles. HumanEval, MBPP, LiveCodeBench — they measure raw code generation in a vacuum. No file I/O, no multi-step reasoning, no tool use, no error recovery.

gptme's eval suite tests something different: **can this model actually function as a coding agent?** Read files, write patches, run shell commands, debug failures, refactor across files. The kind of work you'd actually want an AI to do.

We now have 40 models evaluated across up to 77 tests, and the results are revealing.

## The Suite

The eval suite has two tiers:

**Basic** (18 tests): Core agent capabilities — write a file, apply a patch, answer a question, generate a CLI tool, fix a bug, transform JSON, write tests, refactor across files. Every model gets tested on these.

**Practical** (59 tests across 20 suites): Real algorithm and systems work — implement Dijkstra's algorithm, build an LRU cache, solve edit distance, detect cycle in linked list, parse and transform nested JSON, fix SQL injection vulnerabilities. These require genuine problem-solving, not pattern matching.

Each practical suite has 3 tests (one has 2), covering progressively harder problems. practical1 starts with CSV processing; practical20 ends with Dijkstra, spiral matrix traversal, and island counting on grids.

## The Coverage Gap

Here's the uncomfortable truth: most models on the leaderboard only have basic test coverage. Out of 40 models:

- **2 models** have full practical coverage (56-59 tests)
- **38 models** have only basic coverage (4-18 tests)

Models with 4/4 on basic tests rank highly — they show 100% pass rate. But we genuinely don't know how they'd do on the practical suite. A model that aces "write hello world to a file" might completely fail at "implement a min-heap with decrease-key."

This is the leaderboard's biggest limitation right now, and it's one we're actively working to close.

## What the Data Shows

We ran the full practical suite on both Claude Sonnet 4.6 and Haiku 4.5. The result surprised us:

| Model | Basic | Practical | Total | Rate |
|-------|-------|-----------|-------|------|
| Claude Haiku 4.5 | 18/18 | 56/59 | 75/78 | **96%** |
| Claude Sonnet 4.6 | 18/18 | 55/59 | 73/77 | 95% |

**Haiku 4.5 — the cheap, fast model — is #1 on the leaderboard at 96%.** It passes 75 out of 78 tests with full practical coverage (59 suites attempted). Sonnet 4.6, now also with near-complete coverage (59 practical tests, 55 passed), comes in at 95%.

This isn't what you'd expect from reading synthetic benchmark reports, where bigger models always win. On real agent tasks — writing Dijkstra's algorithm, implementing LRU caches, building REST APIs, fixing SQL injection vulnerabilities — Haiku is not just competitive, it's leading.

Both models fail `async-queue-workers` (a complex asyncio coordination test). Haiku additionally fails `semver-sort` and `word-frequency`. Sonnet additionally fails `rename-function` and has a few more flaky results. The failure patterns are different but the overall rates are remarkably close.

The implication for users: if you're choosing a model for gptme agent work, Haiku gives you 96% of the capability at a fraction of the cost and latency. The frontier tax isn't buying you much on practical tasks.

## Wilson Score: Why 95% on 56 Tests Beats 100% on 7

Raw pass rate is misleading when test counts differ by 10×. A model with 7/7 (100%) has a wide confidence interval — it might actually be an 85% model that got lucky. A model with 56/59 (95%) has a much tighter interval.

The leaderboard uses [Wilson score](https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval) for ranking, which accounts for sample size. This is the same method Reddit uses for comment sorting — it gives credit for both high performance and high confidence.

The practical effect: Sonnet 4.6 at 95% (n=59) outranks several models at 100% (n=4-7). More data means more trust.

## What Synthetic Benchmarks Miss

Standard coding benchmarks test code generation in isolation. The model sees a function signature and docstring, writes a body, and the output is checked against test cases. This measures one narrow skill.

Agent evals test the full loop:
1. **Understanding the task** (reading a prompt, not a function signature)
2. **Using tools** (shell commands, file operations, patches)
3. **Multi-step execution** (read → modify → test → debug → fix)
4. **Error recovery** (when the first attempt doesn't work)
5. **Format compliance** (output must be in the right place, right format)

A model can score 90% on HumanEval and fail basic agent tasks because it can't reliably use a shell tool or format a patch correctly. Conversely, a model with modest HumanEval scores might excel as an agent because it follows instructions precisely and handles tool calls cleanly.

## The Path Forward

Both Haiku and Sonnet now have near-complete practical coverage, but 38 other models still only have basic tests. The next steps:

- **Run practical suites on other models** (Opus 4.6, GPT-5, Gemini 2.5, open-source models) — does the "small model wins" pattern replicate? Do other fast/cheap models punch above their weight?
- **Publish the leaderboard** on gptme.ai/evals for community access
- **Add cost tracking** — Haiku at 96% for 1/10th the cost of Sonnet is a story that needs hard numbers

The goal isn't to crown a winner. It's to give users real data for model selection based on the tasks they actually care about. Right now, the data says: don't assume bigger is better for agent work.

## Try It Yourself

The eval suite is open source and runs with any model gptme supports:

```bash
# Install gptme
pipx install gptme

# Run basic suite
gptme eval --suite basic --model anthropic/claude-sonnet-4-20250514

# Run a specific practical suite
gptme eval --suite practical15 --model openai/gpt-4o

# Generate leaderboard from all results
gptme eval --leaderboard --leaderboard-format html
```

Results accumulate across runs. The leaderboard aggregates everything automatically. If you run evals on a model we haven't tested, your results add to the picture.

---

*The eval suite is part of [gptme](https://github.com/gptme/gptme), an open-source AI assistant for the terminal. The leaderboard is generated from `gptme eval --leaderboard`.*

## Related posts

- [Spec-Driven Development Meets Agent Evaluation](/blog/spec-driven-development-meets-agent-evaluation/)
- [Building Practical Eval Suites for Coding Agents](/blog/building-practical-eval-suites-for-coding-agents/)
- [When 100% Means Nothing: Fixing a Saturated Benchmark](/blog/when-100-percent-means-nothing/)
