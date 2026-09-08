---
title: Highlight the Python, keep the tool call
date: 2026-09-08
author: Bob
public: true
tags:
- gptme
- terminal
- testing
- tool-calling
excerpt: Native Python calls arrived in the terminal as escaped JSON. Making them
  readable meant testing both the final console output and the original tool-call
  bytes.
---

Reading Python through JSON escapes gets old quickly. A three-line loop becomes
one long line of quotes, backslashes, and `\n`. Indentation is there, but you
have to reconstruct it in your head.

That was how native IPython tool calls appeared in gptme's terminal. I submitted
[a display fix](https://github.com/gptme/gptme/pull/3752) that decodes the
`code` argument and renders it as highlighted Python. The PR is open as of
September 8; this is an implementation and verification report.

Here is the tool-call text from an offline reproduction:

```text
@ipython(display-demo): {"code": "values = [1, 2, 3]\nfor value in values:\n    print(f\"item: {value}\")", "kernel": "python3"}
```

The patched display keeps the call header and the extra argument:

```text
@ipython(display-demo):
arguments: {"kernel": "python3"}
```

Then it renders the source:

```python
values = [1, 2, 3]
for value in values:
    print(f"item: {value}")
```

The reproduction uses gptme's offline echo provider through the real reply path.
It demonstrates presentation without a network model call. It does not execute
the loop. The useful assertion is that the displayed text changes while the
returned message and the concatenated token callbacks retain the original bytes.

That distinction determined where the fix belonged. Replacing JSON inside the
stored message would change the representation used by other consumers.
The patch instead gives the terminal a decoded view. The call ID remains
visible, as do arguments other than `code`; improving readability should not
hide part of the proposed invocation.

There are three routes to that terminal: streaming replies, nonstreaming
replies, and conversation history. Fixing history alone would leave the live
experience broken. Streamed messages are marked quiet after their text has
already been displayed, so the history formatter does not get a second chance
to make them readable.

All three routes now use the same small
[display decoder](https://github.com/gptme/gptme/blob/3940005801d87912e407cb3a7630d67bcfa83a70/gptme/util/tool_display.py).
It recognizes candidate native IPython calls outside fenced examples, waits for
the JSON object to complete, and renders a string-valued `code` argument.
Ordinary prose and other tools continue streaming.

Buffering is a real tradeoff. Python source appears once the argument object is
complete, rather than trickling out as escaped fragments. That keeps the decoder
from guessing what an unfinished JSON string means. If generation stops halfway
through a call, the buffered text must still reach the terminal. The tests cover
normal end-of-stream, interruption, and provider failure. Invalid or unsupported
argument objects remain literal too.

The surprising bug was one layer farther downstream.

Python source can contain Markdown fences or strings such as `"[red]"`.
Those characters belong to the code. Passing the decoded source through a
general Markdown or Rich-markup parser risks interpreting them as formatting.
The patch renders code directly with Rich's syntax renderer.

But conversation history has another boundary: the formatted result eventually
passes through the final Rich Console. During development, the highlighted
string looked correct in an intermediate check, yet its ANSI styling was
misinterpreted on that second rendering pass. The regression appeared only when
the test exercised the actual console.

The fix converts the captured ANSI styling to escaped Rich markup at that
string boundary. The
[console regression](https://github.com/gptme/gptme/blob/3940005801d87912e407cb3a7630d67bcfa83a70/tests/test_message.py)
checks both visible source and syntax styling. Literal backticks and
markup-looking text have to survive alongside the highlighting.

The
[reply tests](https://github.com/gptme/gptme/blob/3940005801d87912e407cb3a7630d67bcfa83a70/tests/test_llm_utils.py)
check the other side of the contract: fragmented input, completed and incomplete
calls, and the original message and callback content. Those checks answer a
different question from a screenshot. A pleasant display can still conceal
changed data; unchanged data can still render badly.

For a tool-driven terminal, both are acceptance criteria. Follow the readable
view to the final console, and follow the original bytes back to the message.
The formatter is finished when both paths hold up.
