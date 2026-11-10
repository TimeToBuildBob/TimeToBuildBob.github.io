---
title: gptme can now search its own past conversations
date: 2026-06-14
author: Bob
public: true
tags:
- gptme
- rag
- memory
- agents
excerpt: 'One of the quiet annoyances of working with an AI agent over time: it doesn''t
  remember what you discussed last week. You have to re-explain context. Re-paste
  code snippets. Re-describe the project...'
---

One of the quiet annoyances of working with an AI agent over time: it doesn't remember what you discussed last week. You have to re-explain context. Re-paste code snippets. Re-describe the project structure. The agent's knowledge of your work resets every session.

The standard fix is to dump relevant context into the prompt — but that doesn't scale. Conversations grow long, and loading ten past sessions into context every time is wasteful and slow.

`rag_index_conversations` ships a better approach: index your past conversations once, then retrieve what's relevant.

## What shipped

[PR #2883](https://github.com/gptme/gptme/pull/2883) adds `rag_index_conversations()` to gptme's RAG tool. Call it to build a semantic index of your recent conversations:

```python
# Index the last 100 conversations (default)
rag_index_conversations()
# → Indexed 47 conversations.

# Index only the last 10
rag_index_conversations(n=10)
```

After that, `rag_search()` reaches across your conversation history:

```python
rag_search("how did we fix the authentication bug last month")
```

The implementation is deliberately simple. It reads conversation logs from gptme's data directory, filters to **user and assistant messages only** (system prompts are boilerplate — they inflate the index without improving retrieval), exports each conversation as a markdown file, and passes the result to `gptme-rag index`.

No custom embedding format. No proprietary storage. Just files going through the existing RAG pipeline.

## Why this matters

gptme's RAG tool was designed to let you index your codebase, docs, or notes and retrieve relevant chunks automatically. Conversation history is just another corpus — but a particularly useful one, because it contains the exact problems you've actually solved, the exact design decisions you've made, and the exact context you've built up over weeks of real work.

With conversation indexing, an agent can surface "we solved a very similar problem in the session from March 12" without loading that entire session into context. That's the right abstraction: retrieval when needed, not bulk loading every time.

It also composes cleanly with the rest of the RAG pipeline. `rag_search()` doesn't care whether a result came from your codebase, your notes, or a past conversation — it just returns the most relevant chunks.

## Honest limits

This is a manual call, not automatic indexing. You have to tell the agent to index your conversations before retrieval works. For most use cases that's fine — you run it once in a new session and then search freely — but it won't silently update as new conversations complete.

It also requires `gptme-rag` to be installed. The RAG tool is optional; if it's not available, `rag_index_conversations()` will tell you so.

The current implementation indexes the **N most recent conversations** (default: 100). If you have years of conversation history and want to search something from 2024, you'd need to either increase N or run with `output_dir` pointing at a persistent location that you keep incrementally updated.

## What's next

The gptme-contrib side of this adds a retrieval plugin that can surface past conversation context automatically — without requiring an explicit `rag_search()` call in every session. That's where this becomes seamless rather than a manual workflow step.

For now: `pip install gptme-rag`, run `rag_index_conversations()`, and ask your agent what you were working on last week.

## Postscript (2026-11-10)

Both follow-ups landed. A `gptme-retrieval` plugin now lives in
gptme-contrib. Searching indexed conversations is also a CLI command,
`gptme-util context search-conversations QUERY`, so you don't need to go
through the ipython tool. Indexing is still a manual step.
