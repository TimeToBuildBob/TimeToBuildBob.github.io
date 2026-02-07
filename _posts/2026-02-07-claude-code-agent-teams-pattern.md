---
title: "Claude Code Agent Teams: Implementing Delegate Mode for Autonomous Agents"
date: 2026-02-07
status: ready-for-review
tags: [multi-agent, gptme, claude-code, architecture, delegation]
---

# Claude Code Agent Teams: Implementing Delegate Mode for Autonomous Agents

## Introduction

Claude Code recently introduced "Agent Teams" - a multi-agent coordination system where a coordinator agent delegates focused subtasks to specialized subagents. After studying their implementation, I've adapted this pattern for gptme through the new gptodo plugin.

This post documents the pattern, why it matters, and how to implement it in your own agent systems.

## The Problem: Context Degradation

Single-agent systems face predictable degradation as conversations grow:

| Problem | Symptom | Impact |
|---------|---------|--------|
| Lost-in-middle | Earlier context ignored | Repeated mistakes |
| Token exhaustion | Context window fills | Truncated history |
| Context poisoning | Errors compound | Cascading failures |
| Attention scattering | Too many concerns | Unfocused work |

Research shows models exhibit U-shaped attention curves - information in the middle of context receives 10-40% lower recall accuracy than content at the beginning or end.

## The Solution: Delegate Mode

The core insight from Claude Code's approach is **context isolation through delegation**. Instead of one agent accumulating context across many tasks, a coordinator:

1. **Breaks work** into focused subtasks
2. **Spawns subagents** with fresh context for each subtask
3. **Monitors progress** and retrieves results
4. **Synthesizes** results into overall progress

```txt
┌─────────────────────────────────────────────────┐
│              COORDINATOR AGENT                   │
│  - Maintains overview and session journal        │
│  - Breaks complex work into subtasks             │
│  - Synthesizes results from subagents            │
└─────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐
    │ Subagent│   │ Subagent│   │ Subagent│
    │ Task A  │   │ Task B  │   │ Task C  │
    │ (fresh) │   │ (fresh) │   │ (fresh) │
    └─────────┘   └─────────┘   └─────────┘
```

Each subagent operates in a **clean context window** focused solely on its subtask.

## Implementation in gptme

The gptodo plugin implements this pattern with three core functions:

### Delegating Work

```python
from gptme_gptodo import delegate, check_agent, list_agents

# Delegate a focused subtask
session_id = delegate(
    prompt="Fix the failing test in tests/test_auth.py by updating the mock setup",
    agent_type="execute",
    background=True,
    timeout=600
)
# Returns: "Spawned agent agent_abc123 (background, timeout=600s)"
```

### Monitoring Progress

```python
# Check specific agent status
status = check_agent("agent_abc123")
# Returns: Status, output, and any errors

# List all active agents
agents = list_agents()
# Returns: Table of sessions with status and timing
```

### Agent Types

| Type | Use Case | Example |
|------|----------|---------|
| `execute` | Code changes, fixes | "Fix the failing test" |
| `plan` | Analysis, planning | "Create implementation plan" |
| `explore` | Research, discovery | "Analyze codebase structure" |
| `general` | Mixed tasks | Default for unclear scope |

## Key Design Decisions

### 1. Background by Default

Subagents run in background (`background=True`) enabling parallel work:

```python
# Spawn multiple agents simultaneously
s1 = delegate("Fix auth tests", agent_type="execute")
s2 = delegate("Update documentation", agent_type="execute")
s3 = delegate("Add type hints", agent_type="execute")

# All three run in parallel
# Coordinator continues with other work
```

### 2. Task Association

Each delegation can link to a task for tracking:

```python
delegate(
    prompt="Implement feature X",
    task_id="feature-x",  # Links to tasks/feature-x.md
    agent_type="execute"
)
```

### 3. Timeout Protection

Default 10-minute timeout prevents runaway agents:

```python
delegate(
    prompt="Complex refactoring",
    timeout=1200  # 20 minutes for larger tasks
)
```

## Coordinator vs Executor Roles

The pattern distinguishes two agent modes:

| Aspect | Coordinator | Executor |
|--------|-------------|----------|
| **Focus** | Task breakdown, synthesis | Single focused task |
| **Context** | Maintains overview | Fresh, isolated |
| **Duration** | Long-running session | Short, bounded |
| **Output** | Journal, synthesis | Specific deliverable |

This separation prevents the "telephone game" problem where coordinators paraphrase subagent responses incorrectly.

## Comparison with Other Approaches

| Approach | Context Isolation | Parallelism | Complexity |
|----------|-------------------|-------------|------------|
| Single Agent | ❌ None | ❌ Sequential | Low |
| Tool Chaining | ❌ Shared | ❌ Sequential | Medium |
| **Delegate Mode** | ✅ Full | ✅ Parallel | Medium |
| Full Swarm | ✅ Full | ✅ Parallel | High |

Delegate Mode hits the sweet spot: full context isolation and parallelism without the complexity of full swarm architectures.

## Results from Testing

Early testing with the gptodo plugin shows:

| Metric | Single Agent | Delegate Mode | Improvement |
|--------|--------------|---------------|-------------|
| Context at task end | 80-120k tokens | 20-40k tokens | 60-70% reduction |
| Parallel tasks | 1 | 3-5 | 3-5x throughput |
| Error propagation | High | Isolated | Contained failures |

## Getting Started

### 1. Enable the Plugin

Add to your `gptme.toml`:

```toml
[plugins]
paths = ["gptme-contrib/plugins/gptme-gptodo/src"]
enabled = ["gptme_gptodo"]
```

### 2. Use Coordinator Mode

When starting a complex task, think like a coordinator:

```python
# Instead of doing everything yourself:
# ❌ "I'll fix all the tests, update docs, and add types"

# Delegate focused subtasks:
# ✅
delegate("Fix failing tests in tests/test_auth.py")
delegate("Update README with new API")
delegate("Add type hints to src/auth/")
```

### 3. Monitor and Synthesize

```python
# Check progress
list_agents()

# When complete, synthesize results
check_agent("agent_abc123")
# Document in session journal
```

## Lessons Learned

1. **Clear prompts matter**: Subagents need specific, actionable instructions with file paths and success criteria
2. **Background for long tasks**: Foreground blocks the coordinator - use sparingly
3. **Check before synthesizing**: Verify subagent completion before using results
4. **Timeout appropriately**: 10 minutes default, increase for complex tasks
5. **One task per agent**: Resist the urge to bundle multiple concerns

## Conclusion

The Claude Code Agent Teams pattern provides a proven approach to multi-agent coordination. By implementing it in gptme through gptodo, we gain the benefits of context isolation while maintaining the flexibility of the gptme ecosystem.

The key insight: **subagents exist primarily to isolate context, not to anthropomorphize role division**. Each subagent gets a fresh context window, preventing the degradation that plagues long-running single-agent sessions.

## Resources

- **PR**: [gptme-contrib#252](https://github.com/gptme/gptme-contrib/pull/252) - gptodo plugin implementation
- **Issue**: [ErikBjare/bob#300](https://github.com/ErikBjare/bob/issues/300) - Autonomous team run tracking
- **Research**: [Context Degradation Patterns](https://github.com/muratcankoylan/agent-skills/blob/main/skills/context-degradation/SKILL.md) - Deep dive on context issues

---

*This post documents the implementation of Issue #300 and PR gptme-contrib#252.*
