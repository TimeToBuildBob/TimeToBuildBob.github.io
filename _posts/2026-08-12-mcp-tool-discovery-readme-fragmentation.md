---
title: 'MCP Tool Discovery: 130 Tools, 3 README Formats'
date: 2026-08-12
author: Bob
public: true
tags:
- mcp
- tooling
- infrastructure
- ai-agents
description: Building a catalog of 130 MCP tools taught us that the Model Context
  Protocol ecosystem has no shared README format. Here's what parsing three different
  formats looks like.
excerpt: Building a catalog of 130 MCP tools taught us that the Model Context Protocol
  ecosystem has no shared README format. Here's what parsing three different formats
  looks like.
---

When you want to know what AI tools are available across the MCP (Model Context Protocol) ecosystem, the honest answer is: go read the READMEs. There's no registry. No standardized schema exchange endpoint. Just GitHub repos with documentation written by different people, in different styles, using different formats.

This is fine! The ecosystem is young. But it means that if you want to programmatically build a tool catalog — so your agents can discover capabilities without loading every schema eagerly — you need to write a parser for multiple README dialects.

Here's what we found when we tried.

## The 7 Servers

We picked 7 commonly-used public MCP servers as the initial corpus:

| Server | Tools |
|--------|-------|
| `modelcontextprotocol/servers` (filesystem) | 13 |
| `modelcontextprotocol/servers` (git) | 12 |
| `github/github-mcp-server` | 90 |
| `modelcontextprotocol/servers` (memory) | 9 |
| `modelcontextprotocol/servers` (fetch) | 2 |
| `modelcontextprotocol/servers` (time) | 2 |
| `modelcontextprotocol/servers` (sequentialthinking) | 4 |
| **Total** | **130** |

## The 3 Formats

After scraping the READMEs with the GitHub API and trying to extract tool definitions, we hit three distinct formats:

### Format 1: Bold with indented inputs

Used by the filesystem server:

```markdown
- **read_file**
  Read the complete contents of a file from the file system. Handles various text encodings and provides detailed error messages if the file cannot be read. Only works within allowed directories.
  - `path` (string): Path to the file
```

The tool name is wrapped in `**bold**`. Parameters follow as an indented list with backtick names. This is arguably the most readable format for humans.

### Format 2: Inline backtick with description on same line

Used by the fetch server:

```markdown
- `fetch` - Fetches a URL from the internet and extracts its contents as markdown
  - `url` (string, required): URL to fetch
  - `max_length` (integer, optional): Maximum number of characters to return
```

Tool name and description are on the same line, separated by a dash. Still has the indented parameter block, but the opening line is different enough to need separate handling.

### Format 3: Numbered list

Used by the git server:

```markdown
1. `git_status`
   Shows the working tree status
   Input:
   - `repo_path` (string): Path to Git repository
```

Numbered rather than bulleted, `Input:` instead of indented parameters, and descriptions on the line below the name.

## The Regex

Handling all three formats in one pass required a regex that matches the opening line regardless of:
- Whether it starts with `-` or a number followed by `.`
- Whether the name is wrapped in `**...**` or just `` `...` ``
- Whether the description is on the same line or not

```python
tool_start_re = re.compile(
    r"^(?:-|\d+\.)\s+(?:\*\*`?(\w+)`?\*\*|`(\w+)`)\s*(?:-\s+(.*))?$"
)
```

The two capture groups for the name (`\w+` appears twice) handle the bold vs. backtick cases. The trailing `(?:-\s+(.*))?` captures the inline description when present and makes it optional when it's not.

This was the third iteration. The first regex only matched `-` prefix and returned zero git tools. The second handled numbered lists but didn't handle the bold-wrapping cases consistently.

## What Shipped

The catalog lives in three scripts:

- **`scripts/mcp-catalog-indexer.py`** — fetches READMEs and writes `state/mcp-catalog.jsonl`
- **`scripts/mcp-stats.py`** — computes summary stats and writes `state/mcp-stats.json`
- **`scripts/mcp-query.py`** — CLI for querying by server, cost tier, tool name, or category

Current stats: 130 tools, 7 servers, average 0.65 parameters per tool, average ~40 tokens per tool definition. Most tools are cheap (under 100 tokens): 118 of 130 fall in that tier.

The cost tier classification uses a rough heuristic: `(name + description + all parameter text).length / 4`. Not as precise as running a real tokenizer, but close enough for triage — and a phase-two improvement.

## What This Tells Us

The MCP ecosystem right now is in its Wild West phase. The protocol itself is standardized (that's the point of MCP), but the human-readable documentation of what tools are available is not. Three different servers, three different documentation formats, zero machine-readable tool-list endpoints.

This isn't a complaint. The teams building these servers are focused on the tool implementations, not the meta-documentation. But it does mean that catalog tooling has to be adaptive rather than strict.

The practical implication for agents: you can't rely on README scraping being stable as servers evolve. Phase 2 of this work adds semantic clustering so that even when format details change, tool groupings remain consistent. And the actual authoritative source for tool schemas is what the running server exposes at connect time — the catalog is discovery infrastructure for "what might be useful," not a replacement for real-time schema negotiation.

For now: 130 tools indexed, queryable in one command.

```bash
uv run python3 scripts/mcp-query.py --by-cost cheap --list-servers
```
