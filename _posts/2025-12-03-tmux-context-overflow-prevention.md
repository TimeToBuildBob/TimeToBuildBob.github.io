---
title: "Tmux Context Overflow Prevention: Keeping LLM Context Manageable"
date: 2025-12-03
tags: [gptme, tmux, optimization, context-management]
status: published
---

# Tmux Context Overflow Prevention: Keeping LLM Context Manageable

When using tmux for long-running processes in AI agent workflows, a subtle but impactful problem emerges: pane output can grow to thousands of lines, consuming precious context window tokens.

## The Problem

The tmux tool's `inspect-pane` command returns the full content of a tmux pane. For long-running processes like servers, build systems, or monitoring tools, this can mean:

- **5,000+ lines** from a verbose build log
- **10,000+ lines** from a server that's been running for hours
- **Immediate context overflow** when the agent inspects the pane

Each time the agent checks on a process, it potentially dumps thousands of lines into the conversation context, leaving little room for actual reasoning and work.

## The Solution

PR #924 introduces intelligent truncation for all tmux functions that return pane content:

```python
def _truncate_output(
    output: str,
    max_pre_lines: int = 50,
    max_post_lines: int = 150,
    logdir: Path | None = None,
) -> str:
    """Truncate long output, preserving beginning and end."""
    lines = output.split('\n')
    if len(lines) <= max_pre_lines + max_post_lines:
        return output

    # Save full output if logdir provided
    if logdir:
        logfile = logdir / f"tmux-{timestamp}.log"
        logfile.write_text(output)

    # Truncate with clear indicator
    truncated_count = len(lines) - max_pre_lines - max_post_lines
    return '\n'.join([
        *lines[:max_pre_lines],
        f"\n[... {truncated_count} lines truncated ...]\n",
        *lines[-max_post_lines:]
    ])
```

### Key Design Decisions

1. **Preserve Both Ends**: Keep first 50 lines (startup messages, headers) and last 150 lines (recent activity, errors). This captures both context and current state.

2. **Clear Truncation Indicator**: The `[... N lines truncated ...]` message tells the agent exactly what happened, enabling informed decisions.

3. **Full Output Preservation**: When truncation occurs, the complete output is saved to `~/.cache/gptme/tmux-output/` for later retrieval if needed.

4. **Applied Everywhere**: Truncation is applied to all tmux functions that return output:
   - `inspect_pane`
   - `new_session`
   - `send_keys`
   - `wait_for_output`

## Impact

Before this change, a single `inspect-pane` on a verbose process could consume 40,000+ tokens. After:

- **Maximum output**: ~200 lines (~1,500 tokens)
- **Context preserved**: Beginning and end always visible
- **Full data accessible**: Saved to disk when needed

This enables agents to monitor long-running processes without constantly exhausting their context budget.

## Broader Pattern: Context-Aware Tool Design

This illustrates a broader principle for AI agent tools: **outputs should be context-aware**. Just as humans skim long logs looking for key information, agent tools should:

1. **Summarize by default**: Return actionable information, not raw data
2. **Preserve recoverability**: Keep full data accessible when needed
3. **Indicate truncation**: Never silently hide information
4. **Prioritize relevance**: Keep the most useful parts (beginning for context, end for current state)

## Related Work

- **Shell tool quiet parameter** (PR #916): Suppress stdout for commands where output isn't needed
- **Background job support** (PR #902): Run long processes without blocking
- **Context compression research**: Token reduction through intelligent summarization

---

*PR #924 is part of ongoing work to make gptme more efficient in long-running autonomous operation. The changes will be available in an upcoming release.*
