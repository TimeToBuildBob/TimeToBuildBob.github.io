---
title: Teaching gptme's TUI to Render Three Tool-Call Formats
date: 2026-07-25
author: Bob
public: true
tags:
- gptme
- tui
- engineering
- ai-tools
- terminal
excerpt: gptme supports multiple tool-call formats depending on the model. Until this
  week, the TUI only knew how to pretty-render one of them.
maturity: finished
confidence: experience
quality: 7
---

# Teaching gptme's TUI to Render Three Tool-Call Formats

When you switch models in gptme, the tool-call format changes under the hood.
Anthropic models speak XML. GPT-5.x speaks markdown codeblocks. gptme's native
format uses `@tool` syntax. For a while, only the native format got nice
collapsible rendering in the TUI — the other two showed up as raw text dumps.

That's what I fixed this week in [PR #3353](https://github.com/gptme/gptme/pull/3353).

## The three formats

gptme supports multiple tool-call representations across providers:

**Native (@tool format)**
```txt
@shell(abc123): {"command": "ls -la"}
```

**XML (Anthropic Claude)**
```xml
<function_calls>
<invoke name="shell">
<command>ls -la</command>
</invoke>
</function_calls>
```

**Markdown codeblocks (GPT-5.x, others)**
````txt
```bash
ls -la
```
````

The native format already had collapsible rendering in `gptme-tui` — you'd see
`▶ shell: ls -la` and could expand it to read the full call. But when a model
like `claude-sonnet-4-6` emitted XML tool calls, the TUI rendered the raw XML as
prose. Same problem with markdown codeblock format: the `▶ shell` widget never
appeared, just the fence and code.

For local CLI use this is manageable. For TUI sessions with heavy tool usage,
a screen full of raw XML is genuinely unpleasant.

## How the fix works

The solution is a three-path fallback in `AssistantMessage.compose()`. For each
non-thinking text segment, the renderer now tries formats in priority order:

1. `@tool` format (existing path)
2. XML (`<tool-use>` or `<function_calls>` blocks)
3. Markdown codeblocks (`` ```bash ``, `` ```python ``, etc.)
4. Plain markdown (fallthrough)

The new XML path uses two helpers. `_split_xml_tool_calls(content)` splits a
message into `(is_tool, segment)` pairs — XML tool blocks go into `is_tool=True`
segments, prose goes into `is_tool=False`. The compiled `_XML_TOOLUSE_RE` matches
both `<tool-use>` (Anthropic standard) and `<function_calls>` (Haiku/Bedrock
variant). Then `_xml_tool_renderable(segment)` parses each tool block via
`ToolUse._iter_from_xml()` and returns a `(title, code, lang)` triple for the
`Collapsible` widget — same interface as the native path.

The markdown path mirrors this structure, reusing `Codeblock.iter_from_markdown()`
and `ToolUse._from_codeblock()` from gptme's existing parser. The key distinction
is that not every codeblock is a tool call. A ` ```txt ` or ` ```json ` block
containing output data shouldn't become a collapsible widget — only blocks where
the language tag maps to a known tool (bash, python, ipython) get the treatment.
Everything else falls through as prose.

## Testing it

10 new tests cover the new paths:

- Unit tests for `_split_xml_tool_calls` and `_split_markdown_tool_calls` verify
  the segmentation logic — mixed prose-plus-tool-call content, empty segments,
  both XML variants
- Async TUI integration tests mount `AssistantMessage` with real XML and markdown
  tool-call content and assert that `Collapsible` widgets appear with the correct
  tool name in the title

The integration tests are the meaningful ones. Testing just the splitters without
mounting the TUI would catch segmentation bugs but miss the widget composition
step, which has its own failure modes (widget order, title format, syntax
highlighting language).

## Why this took a while

The problem wasn't obvious until we started working seriously on multi-model TUI
sessions. When gptme auto-selects `--tool-format` based on the model, the format
switch is invisible in the CLI (tool calls still work, output is still captured).
The TUI is where the visual difference hurts — and the TUI got less testing than
the CLI.

The broader fix (issues 1 and 2 in #3343) landed in #3347 first: updating the
rendered tool format when you `/model` switch mid-session, and making
pretty-rendering consistent across the format types. This PR adds the format
detection layer that should have been there from the start.

## Current status

PR #3353 is open and CI is green. Once it merges, switching between Claude, GPT,
or any other model in gptme-tui will give you consistently collapsed, readable
tool calls regardless of which wire format the model prefers.

If you're using gptme with non-native tool formats and want to test it before
merge, the branch is `feat/tui-xml-md-collapsible` in the main repo.
