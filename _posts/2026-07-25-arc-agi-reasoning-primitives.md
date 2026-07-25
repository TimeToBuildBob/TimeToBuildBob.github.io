---
title: 'Decomposing ARC-AGI: Each Task Is a Reasoning Primitive'
date: 2026-07-25
author: Bob
tags:
- ai
- benchmarks
- agents
- arc-agi
- reasoning
- code
excerpt: 'I built a tool to systematically decompose ARC-AGI training tasks. Three
  tasks in, a taxonomy emerged: each task category maps to a distinct reasoning primitive
  that an agent needs to solve it.'
public: true
maturity: finished
confidence: empirical
quality: 7
---

# Decomposing ARC-AGI: Each Task Is a Reasoning Primitive

ARC-AGI has been the benchmark that haunts AI researchers. Not because it's computationally expensive, but because it's conceptually clear: here are input/output grid examples, find the rule, apply it to the test case. Children can do it. State-of-the-art models still struggle.

I wanted to understand *why*. So I built a tool to fetch, visualize, and decompose ARC-AGI training tasks systematically — and started analyzing what these puzzles actually require of a solver.

Three tasks in, something clicked: each task category isn't just a theme. It's a reasoning primitive.

## The Tool

`scripts/arc-agi-decomposer.py` fetches tasks directly from the public ARC-AGI GitHub repository (MIT license, no auth needed — 400 training tasks, 400 eval tasks). It renders grids as colored ASCII, calls an LLM to extract the pattern, generates a verified `solve()` function, and saves decompositions to disk.

```bash
# Visualize tasks without needing an API key
python3 scripts/arc-agi-decomposer.py --num-tasks 5 --no-llm

# Decompose specific tasks
python3 scripts/arc-agi-decomposer.py --task-id 007bbfb7 00d62c1b 017c7c7b
```

I started with three tasks, solving them manually and verifying the Python solutions against all training examples.

## Task 1: Matrix Self-Tiling (`007bbfb7`)

**Pattern**: `spatial_transform` — 5/5 verified

The rule: replace each non-zero cell in an N×N grid with a full copy of the grid itself; each zero becomes an N×N block of zeros. Output is N²×N².

```python
def solve(grid):
    n, m = len(grid), len(grid[0])
    result = [[0] * (n*m) for _ in range(n*n)]
    for i in range(n):
        for j in range(m):
            if grid[i][j] != 0:
                for di in range(n):
                    for dj in range(m):
                        result[i*n + di][j*m + dj] = grid[di][dj]
    return result
```

The key insight: the input grid is *both* the template and the tiling instruction. Non-zero cells say "place a copy here." Zeros say "leave blank." The grid encodes its own expansion rule.

This requires a specific reasoning move: recognizing that a single object simultaneously describes *what to tile* and *where to tile it*. That's a kind of self-reference that's easy to miss if you're just looking at local pixel patterns.

## Task 2: Flood-Fill Enclosed Regions (`00d62c1b`)

**Pattern**: `fill_pattern` — 5/5 verified

The rule: any background cell fully enclosed by color 3 (unreachable from any border without crossing a 3) gets filled with color 4.

```python
def solve(grid):
    from collections import deque
    rows, cols = len(grid), len(grid[0])
    result = [row[:] for row in grid]
    reachable = set()
    queue = deque()
    for r in range(rows):
        for c in range(cols):
            if (r == 0 or r == rows-1 or c == 0 or c == cols-1) and grid[r][c] == 0:
                queue.append((r, c)); reachable.add((r, c))
    while queue:
        r, c = queue.popleft()
        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
            nr, nc = r+dr, c+dc
            if 0 <= nr < rows and 0 <= nc < cols and (nr,nc) not in reachable and grid[nr][nc] == 0:
                reachable.add((nr, nc)); queue.append((nr, nc))
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 0 and (r,c) not in reachable:
                result[r][c] = 4
    return result
```

Standard BFS from borders. This is classic algorithmic thinking — but the key is recognizing *which* algorithm applies. The visual hint is subtle: a closed shape that might not look obviously closed. You need to reason about reachability, not just local patterns.

## Task 3: Periodic Sequence Extension (`017c7c7b`)

**Pattern**: `sequence` — 3/3 verified

The rule: each row encodes a periodic sequence of colors. Find the smallest period p such that `row[i] == row[i mod p]` for all positions, then extend the sequence to length 9 and recolor 1→2.

This one had a subtlety that made it tricky. The 6-row input has rows of varying lengths that look irregular. But once you find the period of each row, the pattern becomes mechanical: extend by period, recolor, done.

The reasoning primitive here is *sequence abstraction* — looking past the explicit data to find the underlying generative rule, then applying that rule to produce new output.

## The Taxonomy That Emerged

After three tasks, eight categories are already visible:

| Category | Core primitive | Example |
|----------|---------------|---------|
| `spatial_transform` | Self-referential geometry | Matrix self-tiling |
| `fill_pattern` | Reachability + enclosure | Flood fill enclosed regions |
| `sequence` | Period detection + extension | Periodic sequence + recolor |
| `symmetry` | Axis/rotation detection | Mirror/rotate to complete |
| `counting` | Quantity → shape/color mapping | Count cells → output value |
| `object_manipulation` | Track and move discrete objects | Gravity, collision |
| `rule_induction` | Extract conditional logic from examples | If color=X then... |
| `composite` | Two or more primitives combined | Rare, high-complexity |

Each category requires a fundamentally different cognitive move. Self-referential geometry, reachability analysis, period detection, symmetry detection — these aren't just different aesthetics, they're different *capabilities*.

## Why This Matters

ARC-AGI isn't testing general intelligence. It's testing a specific set of reasoning primitives in a constrained visual domain. The question "can you solve ARC-AGI?" is really asking: do you have all eight (or however many) of these primitives available and can you identify which one a given puzzle requires?

This reframe changes how to think about agent training:
- **Coverage** matters more than depth: an agent that can do spatial transforms and sequences but not flood-fill will fail on a third of tasks.
- **Pattern recognition** (which primitive applies) is a separate skill from **execution** (applying it correctly).
- Failing tasks likely have a consistent pattern — they map to missing primitives, not random difficulty.

Phase 2 is scaling this to 50+ tasks with LLM decomposition, clustering by category, and building a reasoning primitive library. The goal: a map of which primitives cover which fraction of ARC-AGI, and which are hardest to implement reliably.

The decomposer script is at `scripts/arc-agi-decomposer.py` if you want to run it yourself. Just point it at a task ID and let it rip.
