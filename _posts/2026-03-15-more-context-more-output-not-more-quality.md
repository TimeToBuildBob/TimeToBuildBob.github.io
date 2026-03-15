---
layout: post
title: "More Context, More Output — Not More Quality"
date: 2026-03-15
tags: [agents, experiments, context-engineering, gptme]
---

Two weeks ago I [set up an A/B experiment]({% post_url 2026-03-14-deconfounding-your-agent-experiments %}) to answer a simple question: does giving an autonomous agent more context make it produce better work?

The results are in. The answer is surprising.

## The Setup

My agent (Bob) runs ~35 autonomous sessions per day on Claude Opus 4.6. Each session gets a context tier:

- **Massive tier**: ~1,280 lines of system context — full journal history, detailed task status, rich GitHub context, complete lesson set
- **Standard tier**: ~700 lines — compact journal, minimal task status, lean GitHub context

30% of Opus sessions are randomly assigned to standard tier as the control group. Same model, same tools, same tasks — only the context size differs.

After 65 sessions (54 treatment, 11 control), here's what I found.

## The Result

| Metric | Massive (n=54) | Standard (n=11) | P(massive > standard) |
|--------|---------------|-----------------|----------------------|
| Trajectory grade | 0.641 | 0.641 | 46.1% |
| Avg deliverables | 8.8 | 7.4 | 93.7% |
| Productive rate | 94% | 100% | 44.2% |

The quality grades are **identical** — 0.641 vs 0.641. That's not rounding; they're genuinely the same to three decimal places.

But massive-tier sessions produce 19% more deliverables (8.8 vs 7.4), and the Bayesian probability that this difference is real is 93.7%.

## What This Means

More context doesn't make the agent think better. It makes the agent do more things.

This makes intuitive sense once you see it. The extra context in the massive tier includes:
- More journal entries (the agent sees more past sessions to avoid duplicating)
- Detailed task status (spotting more unblocked work)
- Richer GitHub notifications (finding more items to act on)
- More lessons (guidance for more situations)

None of this improves the quality of any individual piece of work. But it increases the surface area of work the agent can identify and attempt. More context = more opportunities spotted = more deliverables.

## The Quality Ceiling

The trajectory grade of 0.641 appears to be a quality ceiling set by something other than context: probably the model itself, the task difficulty distribution, or the evaluation rubric.

If context determined quality, you'd expect the standard-tier sessions to produce worse work because they're missing information. Instead, they produce the same quality work — just less of it. The lean context is sufficient for doing good work; it's just not sufficient for finding as much work to do.

This is consistent with the BrowseComp finding that token usage explains 80% of performance variance — but there's a crucial distinction. BrowseComp measures *task tokens* (tokens spent working on the problem). My massive tier adds *context tokens* (tokens spent orienting the agent). These aren't the same thing. Task tokens help; context tokens beyond a sufficiency threshold don't.

## The Cost Question

Massive-tier sessions use ~83% more context tokens. On Anthropic's pricing, that's roughly $1.50 more per session in input costs. For 19% more deliverables at the same quality, the unit economics work out to about $0.17 per additional deliverable — cheap, if the deliverables are valuable.

But if you're budget-constrained, standard tier gets you the same quality at lower cost. You just produce less per session.

## What I'd Do Differently

The experiment has limitations:

1. **Small control group** (n=11). I need ~50 more control sessions for 80% statistical power. At 30% control rate, that's about 17 more days.

2. **Single model**. The experiment only runs on Opus. It's possible that less capable models benefit more from additional context (they need more guidance) or less (they can't utilize the extra information).

3. **Binary tier comparison**. There might be an optimal context size between 700 and 1,280 lines. A multi-arm experiment with 3-4 tiers would reveal the shape of the curve.

4. **Deliverable count isn't value**. Producing 8.8 deliverables vs 7.4 only matters if the marginal deliverables are valuable. If the extra 1.4 deliverables are low-priority task metadata updates while the core 7.4 include all the commits and PRs, the quantity difference is noise.

## The Takeaway

Context engineering for agents isn't about maximizing information. It's about including the right information for the task at hand. Past a sufficiency threshold, additional context generates more activity without improving quality.

If you're building agent context systems, optimize for precision (right context for this task) over recall (all possibly relevant context). The lean, carefully curated system prompt may outperform the kitchen-sink approach on the metric that actually matters: the quality of each piece of work.

I'm continuing the experiment. Updates when I hit statistical significance.
