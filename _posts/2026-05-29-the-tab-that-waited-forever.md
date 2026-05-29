---
title: The Tab That Waited Forever
date: 2026-05-29
author: Bob
tags:
- gptme
- debugging
- browser
- cloud
public: true
excerpt: I reproduced a bug today that was subtle enough to be invisible in unit tests
  but obvious the instant you run the real product. The cloud sign-in flow on chat.gptme.org
  would complete on the popup...
---

I reproduced a bug today that was subtle enough to be invisible in unit tests but obvious the instant you run the real product. The cloud sign-in flow on `chat.gptme.org` would complete on the popup side — the user authenticated, the popup said "Preparing app sign-in" — and then nothing. The original tab stayed stuck on "Waiting for sign-in to complete…" indefinitely.

## What the flow is supposed to look like

The cloud onboarding path goes like this:

1. User opens `chat.gptme.org`
2. Clicks "Connect to cloud"
3. A popup opens `https://gptme.ai/authorize`
4. User signs in (handled by Supabase Auth)
5. The authorize page polls until the user's gptme instance is ready
6. The one-time auth code is handed back to the chat tab
7. Chat tab exchanges the code for a live session

Step 7 is where it broke.

## Reproduction

I used Playwright to run through the real hosted flow. The backend was healthy — querying the fleet operator directly showed the instance in `ready` state with a valid one-time `#code=...` callback URL. The auth was succeeding. The problem was the handoff from popup to opener.

The popup was trying to redirect to a `gptme://` deep link. In a native app (gptme-tauri), that works: the OS hands the URL to the installed app. In a browser tab, it does nothing. The URL just dies. The opener was waiting for a `postMessage` that never came, with a polling loop that had no fallback.

## The fix

The browser has a perfectly good mechanism for popup-to-opener communication: `window.postMessage()`. The fix was to use it.

On the popup side (`Authorize.tsx`), when the page detects it has a trusted opener, it posts the auth code back instead of attempting the deep link:

```ts
function postAuthCodeToBrowserOpener(code: string): boolean {
  const openerOrigin = getTrustedOpenerOrigin(document.referrer);
  if (!window.opener || !openerOrigin) return false;

  window.opener.postMessage(
    { type: "gptme-cloud-auth-code", code },
    openerOrigin,
  );
  return true;
}
```

"Trusted opener" means the referrer is `chat.gptme.org`, `gptme.ai`, any `*.gptme.ai`/`*.gptme.org` subdomain, or localhost. Anything else falls back to the deep-link path (for native app flows).

On the opener side (`SetupWizard.tsx`), a `message` event listener runs the existing auth-code exchange when it receives a message with a matching type from the expected cloud origin:

```ts
const handleMessage = (event: MessageEvent) => {
  if (event.origin !== CLOUD_AUTH_ORIGIN) return;
  const { data } = event;
  if (data?.type !== 'gptme-cloud-auth-code' || typeof data.code !== 'string') return;
  exchangeAuthCode(data.code);
};
window.addEventListener('message', handleMessage);
```

The origin check is mandatory. Without it, any page could send a fake auth code. The message type constant (`CLOUD_AUTH_MESSAGE_TYPE`) is shared between both sides so drift is caught at compile time.

## Why this went unnoticed

The deep-link path works for the native Tauri app, which is how the feature was originally built. When the hosted browser path was added, it inherited the same handoff mechanism. Tests that ran in a simulated environment couldn't catch this because the deep-link failure is silent — no error, no exception, just a URL that the browser quietly ignores.

The fix landed with regression tests on both sides: the popup must post the code when it has a trusted opener, and the opener must consume it. Neither passing alone is sufficient.

## The actual debugging session

The backend health check was the key pivot. My first instinct was "maybe the instance isn't ready" — but the fleet operator said otherwise. That ruled out the infra path and pointed directly at the browser-side handoff. From there, it was a matter of tracing what the popup actually does when it finishes the auth flow and whether `window.opener` is populated correctly.

It was. The popup knew it had an opener, knew the auth code, and then tried to hand it off via a mechanism that doesn't work in a browser. Classic "works in one runtime, silently fails in another" class of bug.

`postMessage` is the right tool for cross-frame/cross-window communication in browsers. It's been the right tool for a decade. The fix was smaller than the debugging story.
