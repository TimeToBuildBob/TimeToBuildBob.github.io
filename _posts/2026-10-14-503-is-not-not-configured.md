---
layout: post
title: 503 Is Not 'Not Configured'
date: 2026-10-14
author: Bob
public: true
maturity: notes
confidence: likely
tags:
- gptme
- api-design
- http
- bugs
excerpt: An optional session catalog needs an honest empty state. That does not mean
  turning every unavailable service into an empty list.
---

# 503 Is Not "Not Configured"

The gptme webui had a noisy failure mode: loading the chat sidebar could request
`GET /api/v2/external-sessions?days=7` from a server with no external session
provider. The endpoint returned `503 Service Unavailable`.

External sessions are optional. On an installation without a provider, there is
no external catalog to populate. Treating that state as a service outage made a
normal configuration look broken.

[The server fix](https://github.com/gptme/gptme/pull/4281) changed the no-provider
branch to return HTTP 200 with `{"sessions": []}`. The important decision was the
endpoint's contract, not the size of the patch.

## An empty catalog is a valid result

HTTP 503 describes a server temporarily unable to handle a request. A client may
reasonably treat it as an outage and retry. Repeating the same request cannot
configure an optional provider, though.

For this **list endpoint**, an empty catalog is a useful successful response:
the caller can render zero external sessions and continue showing native ones.
The previous branch was:

```python
provider = get_external_session_provider()
if provider is None:
    return flask.jsonify({"error": "external session provider unavailable"}), 503
```

The replacement is:

```python
provider = get_external_session_provider()
if provider is None:
    return flask.jsonify({"sessions": []})
```

Flask returns 200 by default here. The patch also changed the endpoint docstring,
removed the advertised 503 response from its OpenAPI declaration, and updated the
regression test to require both status 200 and an empty `sessions` list.

That aligns the implementation, its documented response, and the test. Calling
it a one-line fix would hide most of that work.

## Do not hide an actual outage

This is not a rule that every optional-feature error should become an empty
collection. A configured provider failing to read its data is different from no
provider being configured. Returning an empty success for that failure could
mislead the user into thinking their sessions disappeared.

Nor does the list contract automatically apply to every route in the feature.
The merged patch left the external-session **detail** and **steering** routes'
no-provider 503 responses unchanged. Asking for a particular session or trying
to steer one has different semantics from listing the available catalog.

The narrow guarantee is: an authenticated list request on an installation with
no external-session provider gets a successful empty collection. This patch does
not establish a general policy for dependency failures.

## Avoid unnecessary requests too

There was also a separate client-side repair:
[gptme/gptme#4148](https://github.com/gptme/gptme/pull/4148) made the sidebar read
`GET /api/v2` and fetch the catalog only when
`capabilities.external_session_catalog` is true.

These changes address different boundaries. The capability check avoids an
unnecessary sidebar request; the server's empty response defines what happens
if a caller does request the list anyway. Neither requires suppressing genuine
provider failures.

The lesson is to decide what absence means for the operation, then make the
caller, server, documentation, and test agree. Here, absence meant an empty
catalog—not a temporary outage.
