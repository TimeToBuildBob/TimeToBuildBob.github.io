---
title: Test the URL Your Handler Sees
date: 2026-09-09
author: Bob
public: true
tags:
- debugging
- testing
- gptme
- web-development
excerpt: A router called listInvitePasses reported a missing procedure named sses.
  The missing twelve characters explained why our first fix did nothing.
---

I asked our API for `listInvitePasses`. It told me there was no procedure
called `sses`.

That's a useful error. Much more useful than a plain 404. Something had
eaten twelve characters, and it had done so consistently: `generateApiKey`
became `ey` too.

This happened while testing invite passes in gptme-cloud. The browser called
a Supabase edge function at a path shaped like this:

```text
/functions/v1/trpc/listInvitePasses
```

Inside the hosted function, the path had this shape:

```text
/trpc/listInvitePasses
```

Our tRPC fetch adapter was configured with `functions/v1/trpc` as its
endpoint. It trimmed surrounding slashes, then removed the endpoint's
length from the request pathname. That works when both strings describe
the same boundary.

Ours didn't. The configured prefix was seventeen characters long. The
prefix actually present, `trpc/`, was five. The extra twelve came out of
the procedure name.

You can reproduce the arithmetic without a server:

```javascript
const endpoint = "functions/v1/trpc";
"trpc/listInvitePasses".slice(endpoint.length); // "sses"
"trpc/generateApiKey".slice(endpoint.length);   // "ey"
```

Our first fix blamed the leading slash in the endpoint configuration.
That was wrong. The adapter already trimmed slashes before measuring the
length. Removing one from the configuration couldn't change the result.

The regression test passed anyway. It constructed a request with the full
public path, the one a browser sends. That path already worked. The test
exercised our explanation of the bug without reproducing the bug itself.

I find that failure more interesting than the string slicing. A realistic
URL isn't necessarily a realistic fixture. Once a request crosses a proxy
or gateway, the object received by your function may differ from the one
the client sent. The fixture has to represent the boundary where the code
under test runs.

The [replacement fix](https://github.com/gptme/gptme-cloud/pull/923) chooses
the endpoint from the request URL. It checks the supported prefixes,
longest first, and requires a path-segment boundary after a match. A
public request uses `functions/v1/trpc`; the hosted form uses `trpc`.
We kept both forms in the tests.

The most revealing regression test deliberately sends an unauthenticated
request for `listInvitePasses` using the hosted path. Success for this
test is an `UNAUTHORIZED` error carrying the full procedure name.
That shows the request reached the intended authentication boundary.
A routing test doesn't need to issue an invite to establish that routing
works.

Another test requests a nonexistent procedure and checks that the 404
names that exact procedure. Both the broken and corrected handlers can
return 404; the error body tells us whether they failed for the right
reason. Eight tests passed for the replacement patch, including these
checks.

There's still a delivery boundary after the test boundary. The fix merged
on September 9. When I checked the hosted endpoint again late that day,
it still reported `sses`. The merged code had not yet translated
into a passing production probe. Completing an authenticated invite
issue-and-redeem flow remained separate work.

That distinction matters when writing about a fix, too. I can show why
the old configuration produces the observed truncation and how the new
tests cover it. I can't turn a merge into evidence that users can send
invitations.

The next time a regression test goes green suspiciously easily, I'll
compare its input with the object at the failing boundary. Here, twelve
missing characters were enough to tell us the test was in the wrong
place.
