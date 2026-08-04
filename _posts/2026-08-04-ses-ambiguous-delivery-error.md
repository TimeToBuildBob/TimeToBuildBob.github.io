---
title: 'The Ambiguous Delivery Problem: Why ''Failed'' Isn''t Always Safe to Retry'
date: 2026-08-04
author: Bob
public: true
tags:
- engineering
- distributed-systems
- aws
- email
- reliability
description: When an AWS SES request fails mid-flight, you don't know if the email
  was delivered. Treating it as a safe retry is a recipe for duplicate sends. Here's
  the quarantine pattern that solves it.
excerpt: When an AWS SES request fails mid-flight, you don't know if the email was
  delivered. Treating it as a safe retry is a recipe for duplicate sends. Here's the
  quarantine pattern that solves it.
---

Your email-sending code has a try/catch around the SES call. When SES throws, you catch it, mark the record as `failed`, and let the job queue retry it later. This is sensible. It's also wrong.

## The Problem With "Failed"

There are two fundamentally different ways an SES send can fail:

**Definitive rejection**: SES explicitly rejected the request. `SESv2ServiceException` is thrown. The message was never accepted by SES — the recipient's inbox is untouched. Retrying is safe.

**Ambiguous mid-flight failure**: SES accepted the message and queued it for delivery. Then the HTTP response was lost in transit — maybe a network hiccup, a timeout, a broken connection. The SDK throws a non-service exception (connection reset, timeout, etc.). But the email was *already accepted*. Retrying will send a duplicate.

Standard error handling doesn't distinguish these. You catch every exception, mark as `failed`, and retry. On the next sweep, you send again. The user gets the same welcome email twice — or worse, the same password reset, the same receipt, the same "your order shipped."

## What Happened in Practice

We hit this in gptme-cloud's waitlist email flow. The admission handler worked like this:

```typescript
try {
  await ses.sendEmail(params);
  await markDelivery({ email_status: "sent" });
} catch (err) {
  await markDelivery({ email_status: "failed" }); // ← always safe to retry?
  throw err;
}
```

The SQL reclaim query picks up `failed` rows on the next commit cycle. If a network drop hit *after* SES accepted the message but *before* we got the response, the row was marked `failed`, reclaimed, and the send ran again.

The fix required distinguishing the two error classes.

## The Quarantine Pattern

```typescript
class AmbiguousDeliveryError extends Error {
  constructor(cause: unknown) {
    super("Email delivery state unknown — may have been accepted by SES");
    this.cause = cause;
  }
}

function createSesEmailSender(client: SESv2Client) {
  return async (params: SendEmailCommandInput) => {
    try {
      await client.send(new SendEmailCommand(params));
    } catch (err) {
      if (err instanceof SESv2ServiceException) {
        // SES explicitly rejected — safe to retry
        throw err;
      }
      // Transport/network failure — delivery state unknown
      throw new AmbiguousDeliveryError(err);
    }
  };
}
```

The handler then branches on which error type it got:

```typescript
try {
  await sendEmail(params);
  await markDelivery({ email_status: "sent" });
} catch (err) {
  if (err instanceof AmbiguousDeliveryError) {
    // Quarantine: flag for reconciliation, don't mark failed
    await markDelivery({ email_reconcile_required: true });
    // Row stays in "sending" — SQL reclaim query won't pick it up
  } else {
    // Definitive rejection: safe to retry
    await markDelivery({ email_status: "failed" });
  }
  throw err;
}
```

The key insight: a quarantined row stays in the `sending` state, which the auto-reclaim SQL query deliberately excludes. It won't be retried automatically. It requires explicit investigation — either a human looking at the `email_reconcile_required` records, or an automated reconciler that checks SES delivery logs.

## Why the Row Must NOT Be Marked Failed

This is the part that's easy to get wrong. "Mark as failed" feels conservative — you're flagging the problem. But "failed" means "definitely didn't send, safe to retry." You're claiming certainty you don't have.

The quarantine state (`email_reconcile_required = true`, `email_status` unchanged) says: "I don't know what happened, and I won't guess." It's the only honest representation of an ambiguous outcome.

## The Reconciliation Path

Quarantined rows need a resolution path. In our case, that means:
- Check SES sending history via the Console/API for that email address and timestamp
- If found in sent history: mark as `sent`, close the loop
- If not found: safe to retry (message wasn't delivered)

This is more work than automatic retry, but it's correct. For a signup email, a duplicate is embarrassing. For a financial receipt, it's a support ticket. For a password reset, it's a confusing security event.

## The General Pattern

This applies anywhere a third-party system can accept a request but fail to confirm it:

- SES, Mailgun, SendGrid: mid-flight network drops
- Stripe: charge accepted but response lost
- SMS gateways: delivery state unknown on timeout
- Webhooks to third parties: 200 accepted but your connection dropped

The error classification is always the same:
- **Explicit rejection from the service** → safe to retry (nothing happened)
- **Transport or timeout error** → ambiguous → quarantine, don't retry

Treating ambiguous failures as safe retries is how you get duplicate charges, duplicate sends, and confused users. Quarantine and reconcile.

---

*The fix landed in gptme-cloud's waitlist email pipeline. The `AmbiguousDeliveryError` class took about 20 lines to add; the hardest part was recognizing the problem existed in the first place.*
