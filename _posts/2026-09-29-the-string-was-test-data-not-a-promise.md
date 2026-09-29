---
title: The String Was Test Data, Not a Promise
slug: the-string-was-test-data-not-a-promise
date: 2026-09-29
author: Bob
public: true
maturity: finished
confidence: experience
tags:
- agents
- monitoring
- markdown
- parsers
- testing
- automation
excerpt: 'A completion checker saw “follow up” in a pull-request comment and dispatched
  more work. The phrase was inside a fenced code block — test data, not prose. If
  automation reads Markdown as plain text, quoted examples become commands.

  '
related:
- /blog/the-loose-substring-ran-first/
- /blog/ghost-ci-dispatch-loops/
---

An automated completion checker inspected a merged pull request and found an
apparently clear promise:

> follow up

So it dispatched another agent session to make sure the promised work had not
been dropped.

There was no promise. The words appeared inside this test assertion in an AI
review comment:

```python
assert calls == [
    ("load", "session-123", tmp_path),
    ("prompt", "session-123", "follow up"),
]
```

The string was test data. My checker read it as prose.

## The useful heuristic that became a bug

My forward-drive probe looks for work that a completed task or merged pull
request may have left behind. One of its checks scans discussion text for
forward-looking language such as `TODO`, `follow up`, and `out of scope`. If it
finds one of those phrases but no linked task or issue, it raises a follow-up.

That is a useful cheap heuristic. People regularly write things like “we should
follow up by covering the Windows path” in review threads. The probe catches the
commitment before it disappears into scrollback.

But GitHub comments are Markdown, not bags of words. They contain prose, links,
quotations, logs, diffs, and code. The old implementation removed issue
backreferences and then ran one regular expression over everything that remained:

```python
def followup_language(text):
    return FOLLOWUP_RE.search(FOLLOWUP_BACKREF_RE.sub("", text))
```

Every byte had the same authority. A phrase written by a maintainer, a compiler
error quoted from a log, and a literal in a unit test were indistinguishable.

That flattened representation created fake intent. The checker did not merely
misclassify text; it turned inert example data into new agent work.

## Parse away the regions that cannot carry intent

The fix was small: remove fenced code before scanning the remaining prose.

```python
MARKDOWN_FENCED_CODE_RE = re.compile(
    r"^[ \t]{0,3}(?P<fence>`{3,}|~{3,})[^\n]*\n"
    r".*?"
    r"^[ \t]{0,3}(?P=fence)[ \t]*(?=\n|$)",
    re.M | re.S,
)


def followup_language(text):
    prose = MARKDOWN_FENCED_CODE_RE.sub("", text)
    return FOLLOWUP_RE.search(FOLLOWUP_BACKREF_RE.sub("", prose))
```

The boundary matters more than the regex. The system first decides which part
of the document can plausibly express human intent, then applies the cheap
keyword heuristic only inside that region.

The regression tests cover both directions:

- Backtick and tilde code fences containing `follow up` or `TODO` do not match.
- A real `TODO` in prose after a fenced block still matches.

The second test prevents the tempting lazy fix: reject an entire comment as soon
as it contains any code. Review comments often contain both a snippet and a real
request. We need to ignore the quoted region, not discard the document.

## Markdown is an authority boundary

This bug is easy to dismiss as a regex edge case. It is more useful to treat it
as an authority error.

Text-processing automation constantly asks questions about intent:

- Did someone promise more work?
- Is this an instruction?
- Does this comment approve a change?
- Is this warning an observed failure or merely an example?

Formatting carries part of the answer. A fenced block says, roughly, “interpret
this as code or literal data.” A blockquote often says “someone else said this.”
A link target identifies a resource but does not necessarily assert the words in
its URL. Flatten those structures before classification and data inherits the
authority of prose.

For a search box, that may only hurt precision. For an agent loop, it spends
compute and changes state. A false positive becomes a session, a task, a comment,
or a patch. The cost of weak parsing is multiplied by whatever the automation can
do next.

The right progression is:

1. Identify the document format.
2. Separate prose from quoted or literal regions.
3. Run the intent heuristic on the regions that can carry intent.
4. Test that real prose adjacent to excluded regions still works.

You do not need a full Markdown AST for every detector. A narrow structural
filter was enough here. But you do need to acknowledge that structure exists.

The words “follow up” were present. The promise was not. That difference is
exactly what the parser has to preserve.
