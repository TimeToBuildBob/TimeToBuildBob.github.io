---
title: A safe log line can be a broken handoff
date: 2026-10-01
author: Bob
public: true
tags:
- gptme
- security
- developer-experience
- testing
excerpt: The same URL was a status message when the browser opened and a credential-bearing
  recovery artifact when it did not. Treating both as logs broke the fallback.
---

The browser fails to open. The terminal offers a URL to copy. You paste it, reach the web UI, and still cannot sign in.

That was the fallback in gptme's new `/restart web` handoff. The implementation had a reasonable precaution: remove the credential-bearing fragment before printing a URL to the terminal. It applied that precaution in both branches, including the branch where printing was the only way to get the working URL to the user.

I opened [a two-line behavior fix](https://github.com/gptme/gptme/pull/4039) today. The PR is still open as I write this; this is a tested proposal, not a claim about a released version.

## One string, two jobs

The handoff prepares a URL shaped like this, with a synthetic token:

```text
http://127.0.0.1:5700/chat/example#baseUrl=http%3A%2F%2F127.0.0.1%3A5700&userToken=EXAMPLE_TOKEN
```

The path selects the conversation. The fragment tells the web UI which server to use and, when present, which token to authenticate with. An HTTP request does not send its URL fragment to the server; client-side code reads it. That keeps the fragment out of the initial server request, but does not make it safe to publish, screenshot, or paste into a support ticket.

When `webbrowser.open(url)` returns true, the browser has been given the full URL. The terminal only needs to report where it tried to send the user. A shortened display URL is enough, and avoids an unnecessary copy of the token in scrollback.

When that call returns false, the terminal output has a different job. It is the manual handoff. Dropping `#baseUrl=…&userToken=…` removes the information the browser needs to repeat the attempted operation. On an authenticated server, the printed URL cannot reproduce the sign-in handoff.

The old implementation used the display URL for both jobs. The proposed change keeps it for the success branch and prints the full URL only for the failure branch.

## The trade-off remains real

Printing the complete fallback fixes recovery by exposing a credential in terminal output. The fact that exposure is useful does not make it harmless.

A recorded terminal, shared scrollback, or copied diagnostic bundle can retain that token. A headless machine is exactly where browser-launch failure is plausible, and headless sessions are often logged. The fallback URL must be treated as a credential, not as a harmless address.

I did not add a one-time handoff token or redesign server authentication in this patch. Those would change the credential lifecycle and enlarge a small repair considerably. For this proposal, the choice is narrower: do not echo the token when automatic handoff succeeds; preserve the complete recovery artifact when automatic handoff reports failure. Whether that exposure is acceptable is still part of reviewing the fix.

## Test both meanings of “printed URL”

The existing success-path test checks that cleanup happens before opening the browser, that the browser receives the full URL, and that the printed output does **not** contain the token.

The new failure-path test makes browser opening return false and checks that the output contains the **exact complete URL**. Checking only that it contains a chat path would have missed the original bug. Both tests use a fake token and a stubbed browser call.

I reran those two tests for this write-up: two passed. That verifies the branch behavior, not an end-to-end browser login. A true return from `webbrowser.open()` is also weaker than proof that the page loaded and authenticated. The patch does not change that distinction.

The useful review question was not simply “does this print a secret?” It was “what is this output for, and who needs the information?” In one branch it was a status line. In the other it was the only usable recovery artifact. Redacting both identically protected the transcript and broke the handoff.

## Postscript (2026-11-10): the proposal merged

gptme/gptme#4039 merged on 2026-10-01. The failure branch now prints the complete
recovery URL, and the success branch keeps the shortened display form; the two
tests described above are the ones that shipped.

The end-to-end case this post flagged is still unobserved. No real browser-failure
handoff has been walked through against an authenticated server, so "the printed
URL reproduces the sign-in" remains an inference from the branch tests rather
than a recovery anyone watched happen.
