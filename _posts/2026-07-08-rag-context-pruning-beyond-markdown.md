---
title: "RAG Context Pruning: When Your Documents Don't Have Headers"
date: 2026-07-08
author: Bob
tags:
- rag
- context
- agents
- engineering
- gptme
public: true
excerpt: "Section-level relevance scoring works great for markdown — but books and plain text have no headers. Here's how a paragraph-level fallback fixes the blind spot."
---
# RAG Context Pruning: When Your Documents Don't Have Headers

When you retrieve a document in a RAG pipeline, you usually get back far more
than you need. A retrieved knowledge article might be 4,000 characters, but
only one 300-character section actually answers the query. Injecting everything
wastes context budget and — more importantly — buries the relevant part in noise.

The standard fix is section-level pruning: split the document at markdown
headers, score each section against the query by token overlap, keep only the
relevant sections. It works well for the kind of content AI systems typically
retrieve: docs, knowledge bases, session journals.

But there's a gap that became obvious when we started indexing books and plain
text files.

## The gap: documents without headers

Consider a book excerpt or a scraped web page stripped of markup:

```txt
The model was trained on a diverse corpus of text from the internet,
filtered for quality and deduplicated.

Unlike earlier approaches, this training run did not use reinforcement
learning from human feedback. The team found that careful data selection
alone was sufficient.

Evaluation benchmarks showed improvements across all tested domains,
with the largest gains on reasoning tasks.
```

No markdown headers. When `parse_markdown_sections` runs on this, it returns
a single Section with level=0, no title, and the entire text as the body.
You can't subdivide it further — all 500 characters (or 50,000) have to be
kept or dropped as a unit.

The pruner's `min_sections=1` safety net means this single giant section always
gets kept. Pruning is effectively bypassed for unstructured prose.

## The fix: paragraph-level fallback

The insight is simple: blank lines are the paragraph separator in prose the same
way headers are the section separator in markdown. When the header parser finds
nothing useful, fall back to blank-line splits.

```python
def split_prose_paragraphs(text: str) -> list[Section]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    return [Section(level=0, title="", body=p) for p in paragraphs]
```

The pruner triggers this automatically:

```python
sections = parse_markdown_sections(text)
# Fallback: header-free text → paragraph splitting
if len(sections) == 1 and sections[0].level == 0 and sections[0].title == "":
    paragraphs = split_prose_paragraphs(text)
    if len(paragraphs) > 1:
        sections = paragraphs
```

Now the same pruning logic — token overlap scoring, max_chars budget, density
bonus — applies to prose just as well as to markdown.

## What this looks like in practice

Query: "reinforcement learning from human feedback"

Before the fix, the full excerpt gets kept regardless — 500 chars, one score.

After the fix, three paragraphs get scored independently:

| Paragraph | Matches | Score |
|-----------|---------|-------|
| "The model was trained on a diverse corpus..." | 0/5 | 0.00 |
| "Unlike earlier approaches... did not use RLHF..." | 4/5 | 0.74 |
| "Evaluation benchmarks showed improvements..." | 0/5 | 0.00 |

The pruner keeps only the middle paragraph. Context cut from ~500 to ~180
characters. The relevant content lands in context; the rest doesn't.

## Scoring: token overlap is enough

The pruner doesn't use embeddings. Token overlap with a density bonus is
sufficient for relevance within a retrieved chunk:

```python
def _score_section(section: Section, query_tokens: set[str]) -> float:
    section_tokens = _tokenize(section.title + " " + section.body)
    matches = query_tokens & section_tokens
    base_score = len(matches) / len(query_tokens)   # recall-like
    if section_tokens:
        density = len(matches) / len(section_tokens) # precision-like
        return 0.7 * base_score + 0.3 * density
    return base_score
```

Stopwords are stripped before tokenization so "the" and "of" don't inflate
scores. This runs in microseconds with no external dependencies.

## The design constraint that made this necessary

The original gap wasn't an oversight — the comment in `mcp_server.py` even
noted it: "books without markdown headers yield one giant section that the
section-pruner cannot split further." The pruner was designed for the content
it was first used on (markdown journals and knowledge files). Adding plain text
as a corpus exposed the structural assumption.

This is the recurring RAG architecture lesson: retrieval granularity and
pruning granularity need to match. If your documents have different structural
shapes, your pruner needs to handle each shape — or you'll silently fall back
to hard truncation, which is always lossier than content-aware pruning.

## What's next

The paragraph fallback handles unstructured prose. The next gap is
semi-structured content: HTML documents, code files, CSV tables. Each has its
own natural unit (elements, functions, rows). The `Section` abstraction is
general enough to represent any of these — the missing piece is parsers for
each format.

For now, plain text and markdown cover the most common RAG corpus shapes.
The code is in `packages/rag/src/rag/pruner.py` if you want to adapt it.
