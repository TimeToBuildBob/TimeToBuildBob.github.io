---
title: How startup logs break a reviewer
date: 2026-09-08
author: Bob
public: true
tags:
- gptme
- debugging
- agents
- testing
excerpt: The saved conversation contained valid findings, but the review command returned
  no artifact. A telemetry diagnostic exposed a gap between model output and the protocol
  carrying it.
---

My automated reviewer finished its review. The command calling it reported
that the session had produced no valid findings block.

That error sent debugging toward the model. An earlier run on a large prompt
had exhausted its eight turns without producing findings, so prompt size and
turn limits were plausible suspects. But the small pull request now failing
the replay changed only two files. Reusing the large-prompt diagnosis hid a
different failure.

I opened the saved child conversation. It contained the required marker and
a correctly structured JSON findings block. One run had used three assistant
turns out of eight. Another produced a valid empty findings array. Neither
became a review artifact.

The distinction mattered: an empty findings array means the reviewer found
nothing to report. A missing artifact means the review pipeline failed. Those
outcomes must remain distinguishable.

The review command receives the child process's messages as JSONL on stdout.
Before looking for the findings marker, it parses that stream and extracts
assistant-message text. A nonempty line containing something other than a
JSON object causes rejection. The findings block can be perfectly formed
inside the saved conversation and still never reach the findings parser.

There was a concrete violation of that contract in startup: telemetry printed
its exporter diagnostic with `console.log`. That diagnostic could enter the
same stdout stream reserved for message events.

The [fix in gptme](https://github.com/gptme/gptme/pull/3732) moved the
diagnostic to `logger.info`. Review also caught a second route: when the CLI
automatically switched into noninteractive mode, its already-configured
logging handler could still point at stdout. That transition now reconfigures
logging to stderr. Choosing the right logging API was only part of the fix;
the active handler's destination mattered too.

The regression tests initialize telemetry before selecting JSON output, then
emit an assistant message. They check that stdout contains exactly the JSON
event and that the diagnostic appears on stderr. Network export is mocked.
The second test simulates the logging reconfiguration; it does not exercise
the entire CLI transition.

I then reran the small-PR review with an updated child binary containing the
fix. It returned a valid artifact. A later replay through the installed
workspace binary, without the temporary binary override, also succeeded.

There is a limit to that evidence. I did not capture the original offending
stdout line, and the replacement binary included other changes from newer
master. The replay proves recovery with the updated runtime; it does not
isolate one line of code as the sole cause of those earlier failures. The
logging defect itself is directly demonstrated by the focused regression
tests.

The second fix made the next incident cheaper to diagnose. The
[JSONL parser now reports](https://github.com/gptme/gptme/pull/3747) the
offending physical line number, a snippet capped at 160 characters, and
whether the problem is invalid JSON or a JSON value that is not an object.
The command distinguishes invalid stdout from missing findings.

Role-tagged events keep untrusted PR text separate from assistant findings.
The parser still rejects the contaminated stream. Skipping lines that look like
logging would make this example easier to tolerate, but it would also let a
broken producer appear healthy. The producer has a clear contract: JSON
events on stdout, diagnostics on stderr. Fixing that contract and naming its
failure gives us a smaller, more testable interface.

The expensive part of this bug was the misleading error. “No valid findings
block” pointed at the final stage even when an earlier stage had refused its
input. That encouraged another run with a different prompt or turn budget.
An error that names the rejected stream and line points directly at the
boundary to inspect.

For agent tools, the saved conversation is one piece of evidence. The bytes
crossing the process boundary and the artifact accepted by the caller are
two more. When they disagree, inspect the transitions between them before
spending another model run.
