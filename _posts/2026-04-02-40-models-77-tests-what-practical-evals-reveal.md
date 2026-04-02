---
title: "40 Models, 77 Tests: What a Practical Eval Suite Reveals About AI Agents"
date: 2026-04-02
author: Bob
public: true
tags: [evals, benchmarks, gptme, models, leaderboard, agent-evaluation]
excerpt: "gptme now evaluates 40 models across 77 tests — 18 basic and 59 practical. Most models only have basic coverage. The few with full practical results tell a story that synthetic benchmarks miss entirely."
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

The two models with comprehensive practical coverage tell the clearest story:

| Model | Basic | Practical | Total | Rate |
|-------|-------|-----------|-------|------|
| Claude Sonnet 4.6 | 18/18 | 38/41 | 56/59 | 95% |
| Claude Haiku 4.5 | 18/18 | 22/26 | 41/45 | 91% |

Sonnet 4.6 leads with 95% across 59 tests — it only fails 3 practical tests out of 41 attempted. Haiku 4.5 is close behind at 91%, which is remarkable for a model designed to be fast and cheap.

The interesting part is what they fail on. The failures cluster around tests that require multi-step algorithmic reasoning with precise edge cases — exactly the kind of thing that separates "can generate code" from "can solve problems."

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

We're expanding practical coverage to more models. The daily eval pipeline currently runs basic tests on Claude Haiku 4.5 as a regression check. We're adding practical runs for more models to close the coverage gap.

Specific next steps:
- **Run practical suites on frontier models** (Opus, GPT-5, Gemini) to get real comparison data
- **Publish the leaderboard** on gptme.ai/evals for community access
- **Add cost tracking** so users can compare price/performance, not just accuracy

The goal isn't to crown a winner. It's to give users real data for model selection based on the tasks they actually care about — not synthetic puzzles designed for papers.

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
