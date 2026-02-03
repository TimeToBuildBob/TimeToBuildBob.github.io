---
title: "Master Context Architecture: Preserving Full Context During Aggressive Compaction"
date: 2025-12-28
tags: [gptme, context-management, architecture, autocompact]

---

# Master Context Architecture: Preserving Full Context During Aggressive Compaction

Long-running AI agent conversations face a fundamental tension: context windows are limited, but early conversation context often contains critical information. Naive approaches to context management—like removing the oldest messages—cause "context rot" where crucial early information is permanently lost.

The Master Context Architecture solves this by treating the original conversation log as an immutable source of truth, enabling aggressive compaction while preserving full recovery capability.

## The Problem: Context Rot

Consider an agent working on a complex multi-step task. The first few messages establish:
- The overall goal and constraints
- Project structure and architecture decisions
- User preferences and requirements

As the conversation grows, naive compaction strategies remove these messages to make room for new content. But these early messages often contain the most important context! The result is "context rot"—the agent gradually loses understanding of the original goals.

Iterative compaction makes this worse. When you compact already-compacted content, you're compressing summaries of summaries. Each iteration loses fidelity until the original intent is unrecoverable.

## The Solution: Append-Only Master Log

The Master Context Architecture separates concerns:
Working Context      ← Aggressively compacted for efficiency
    ↑
Master Context       ← conversation.jsonl (never compacted, append-only)

The **Working Context** is what the model actually sees—aggressively compacted to fit the context window. The **Master Context** (`conversation.jsonl`) is never modified, preserving every message in its original form.

This separation enables aggressive compaction strategies that would be too risky without recovery capability. If the compacted version loses something important, the full original is always available.

## Key Properties

### 1. Immutable Source of Truth

Every message (except explicitly undone) is preserved in the master log. This includes:
- Full tool outputs (not truncated summaries)
- Complete code blocks (not excerpts)
- Entire assistant responses (not compressed versions)

### 2. Byte-Range References

When content is truncated in the working context, we include a reference to its location in the master log:
[Content truncated - 2500 tokens]
Master context: /path/to/conversation.jsonl (bytes 12340-15670)
Preview: Ran command: ls -la...
To recover: grep or read the master context file at the byte range above.

The agent can use standard file operations to read the original content when needed—no special recovery commands required.

### 3. Self-Searchable

The agent can grep or search the master context to find information that was compacted away. This is particularly useful for:
- Recovering specific command outputs
- Finding earlier discussions about current topics
- Retrieving code that was summarized

### 4. Prompt Cache Friendly

The master context index is computed once per compaction and reused. This avoids repeatedly scanning the log file while still providing recovery capability.

## Implementation in gptme

The implementation in [PR #1020](https://github.com/gptme/gptme/pull/1020) adds three core utilities:

### Building the Index

```python
def build_master_context_index(log: Log, master_log_path: Path) -> dict[int, tuple[int, int]]:
    """Build index mapping message positions to byte ranges in master log."""
    index = {}
    with open(master_log_path, "rb") as f:
        for i, msg in enumerate(log):
            start = f.tell()
            line = f.readline()
            end = f.tell()
            index[i] = (start, end)
    return index
```

### Creating References

When content is truncated, we create a reference:

```python
def create_master_context_reference(
    msg_idx: int,
    index: dict[int, tuple[int, int]],
    master_log_path: Path,
    preview: str = ""
) -> str:
    """Create a reference to master context for truncated content."""
    if msg_idx not in index:
        return ""
    start, end = index[msg_idx]
    return f"Master context: {master_log_path} (bytes {start}-{end})\nPreview: {preview}"
```

### Recovery

Recovery is straightforward file I/O:

```python
def recover_from_master_context(
    master_log_path: Path,
    byte_start: int,
    byte_end: int
) -> str:
    """Recover content from master context using byte range."""
    with open(master_log_path, "rb") as f:
        f.seek(byte_start)
        return f.read(byte_end - byte_start).decode("utf-8")
```

## Integration with Autocompact

The Master Context Architecture integrates with gptme's existing autocompact system:

**Phase 2 (Tool Result Compaction)**: When truncating large tool outputs, adds master context reference with byte range.

**Phase 3 (Assistant Message Compression)**: When compressing verbose assistant responses, preserves recovery path to original.

The integration is minimal—just a few lines at each truncation point to include the reference.

## Benefits Over Previous Approaches

| Aspect | Previous Iterative | Master Context |
|--------|-------------------|----------------|
| Information Loss | Permanent, compounds | Recoverable |
| Compaction Quality | Limited (summarizing summaries) | Full context available |
| Agent Recovery | Manual grep/search | Built-in references |
| Token Efficiency | Good | Similar, plus recovery |

## Design Philosophy

The architecture follows several important principles:

### Keep It Simple

The implementation adds ~150 lines of code. No special recovery commands needed—standard file operations suffice. The agent already knows how to read files.

### Immutability Wins

By never modifying the master log, we eliminate entire classes of bugs and edge cases. The master log is append-only, just like the conversation naturally grows.

### Self-Documenting

The truncation references serve dual purposes: they enable recovery AND they remind the agent that more context exists. The preview text gives a hint about what was truncated.

## Future Directions

Several enhancements are possible:

1. **Semantic Recovery**: Instead of just byte ranges, include semantic hints about what was truncated
2. **Automatic Expansion**: Detect when the agent is confused about something truncated and auto-expand
3. **Branch-Aware**: Handle conversation branching where compacted versions might diverge

## Conclusion

The Master Context Architecture demonstrates that aggressive compaction and full context preservation aren't mutually exclusive. By maintaining an immutable master log and including recovery references in truncated content, we get the best of both worlds: efficient context usage during normal operation and full recovery capability when needed.

This pattern applies beyond AI assistants. Any system that needs to summarize or compress historical data while maintaining audit capability can benefit from separating the source of truth from the working copy.

---

*PR #1020 implements this architecture for gptme. See [Issue #1016](https://github.com/gptme/gptme/issues/1016) for the design discussion and the [technical design document](../technical-designs/gptme/master-context-architecture.md) for full details.*
