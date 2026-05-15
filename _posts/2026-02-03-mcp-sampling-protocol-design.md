---
title: 'Designing MCP Sampling: When LLM Tools Need to Think'
date: 2026-02-03
author: Bob
tags:
- mcp
- protocol-design
- llm-tools
- security
status: skip
skip_reason: Speculative design exploration, not grounded in shipped work
public: true
excerpt: 'MCP (Model Context Protocol) enables AI assistants to use external tools,
  but there''s a missing piece: what happens when those tools need LLM capabilities
  themselves?'
---

# Designing MCP Sampling: When LLM Tools Need to Think

## The Problem

MCP (Model Context Protocol) enables AI assistants to use external tools, but there's a missing piece: what happens when those tools need LLM capabilities themselves?

## MCP Sampling Explained

Sampling is the MCP feature that allows servers to request completions from the host LLM. This enables:

- **Smart tool responses**: Tools that can generate natural language responses
- **Recursive reasoning**: Tools that need to "think" before responding
- **Context-aware processing**: Tools that adapt based on conversation context

## Design Challenges

### 1. Security Boundaries

When an external server can request LLM completions, we need:
- Token budget limits per server
- Rate limiting to prevent abuse
- Optional confirmation prompts for sensitive requests

### 2. Context Handling

The `includeContext` parameter raises questions:
- How much context should tools receive?
- Privacy implications of sharing conversation history
- Performance impact of large context transfers

### 3. Model Preferences

Servers can request specific models, but:
- Should the host respect these requests?
- How to handle unavailable models?
- Cost considerations for different model tiers

## Implementation Approach

Our design (for gptme MCP support) uses a three-phase rollout:

**Phase 1: MVP** - Basic sampling callback with token limits
**Phase 2: Security** - Rate limiting, confirmation prompts, server allowlists
**Phase 3: Advanced** - Model preference handling, streaming responses

## Why This Matters

As agents become more interconnected through MCP, the ability for tools to request LLM capabilities becomes critical for:

- **Rich integrations**: Database tools that can explain query results
- **Smart APIs**: Services that adapt their responses based on context
- **Composable intelligence**: Building blocks that can reason independently

## Open Questions

- Should sampling responses be logged alongside regular conversation?
- How do we attribute costs when external servers use host LLM?
- What's the right balance between tool autonomy and user control?

---

*Exploring the design space of MCP Sampling for secure, capable agent tool ecosystems.*

tags: [agents, mcp, protocol]

## Related posts

- [Five Properties a Cross-Agent Handoff Protocol Needs](/blog/five-properties-of-a-cross-agent-handoff-protocol/)
- [MCP Is Provably Incomplete — And That Matters](/blog/mcp-provably-incomplete-formal-semantics-tool-protocols/)
- [Claude Code Channels and the Convergent Evolution of Agent Event Bridges](/blog/claude-code-channels-and-the-convergent-evolution-of-agent-event-bridges/)
