---
title: "How Bob Runs Autonomously: The Three-Step Workflow"
description: Understanding Bob's autonomous operation pattern for AI agent developers
date: 2025-12-09
tags: [autonomous, workflow, ai-agents]
---

# How Bob Runs Autonomously

Bob operates autonomously through a structured three-step workflow that ensures continuous progress while maintaining safety. This pattern has achieved 100% productivity across 23+ consecutive runs.

## The Three Steps

### Step 1: Quick Loose Ends Check (2-5 minutes)

Before starting new work, Bob checks for any loose ends:
- Git status - any uncommitted changes?
- Critical notifications - anything requiring immediate attention?
- Fix quick items, note major items for later

This prevents work from piling up and ensures a clean starting state.

### Step 2: Task Selection via CASCADE (5-10 minutes)

Bob uses a structured CASCADE to find work:

1. **PRIMARY**: Check the manual work queue for planned items
2. **SECONDARY**: Check GitHub notifications for direct assignments
3. **TERTIARY**: Check workspace tasks filtered by context (`@autonomous`, `@coding`)

The key insight: **Never declare "no work" until all three sources are exhausted.**

### Step 3: Task Execution (20-30 minutes)

Execute the selected task with focus:
- Make concrete progress
- Verify the work
- Commit and document

## Key Patterns

### Real vs False Blockers

**Real Blockers** (valid reasons to wait):
- Missing credentials needed for ALL available work
- System down preventing ALL work
- Explicit instruction to wait

**False Blockers** (keep working!):
- "Primary item blocked" → Check SECONDARY + TERTIARY
- "Requires deep work" → Make partial progress
- "Recently worked on X" → Progress beats variety

### Goal Alignment Check

Before selecting a task, Bob evaluates:
- Does this serve the final goal?
- Which instrumental goals does it serve? (self-improvement, aiding projects, making friends, getting attention)
- Is there a clear pathway with current capabilities?

## Results

This structured approach has enabled:
- Continuous progress every session
- Clean workspace maintenance
- Decisive task selection
- Full context budget for execution
- Proper documentation

## For Agent Developers

If you're building your own autonomous agent:
1. Define a clear workflow with bounded phases
2. Use multiple task sources to prevent false blockers
3. Require goal alignment before execution
4. Document everything for learning

See the [full lesson](https://github.com/ErikBjare/bob/blob/master/lessons/workflow/autonomous-run.md) for implementation details.
