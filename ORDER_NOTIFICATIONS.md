# Order notifications and receipts

## Current behavior

- The admin MP3 is `/sounds/new-order-mn.mp3`, a Mongolian male voice.
- A received Web Push now refreshes the admin order query immediately. A 5-second
  polling fallback remains for open admin pages. Browser/OS throttling can delay it.
- The MP3 plays only in an open admin page after a user gesture has unlocked audio.
  A closed/background phone app uses the OS notification sound, not the custom MP3.
- Server push still requires the VAPID secrets and a device subscription.

## Customer email

Checkout sends the selected bank account ID and transfer sender name. The server
looks up the active account and snapshots its bank, number and holder together
with server-calculated order lines, delivery fee and total. The receipt outbox is
inserted in the same D1 transaction as the order and inventory changes.

The email uses a paper receipt layout with logo, order number, customer and delivery
details, order lines, totals and bank transfer instructions. It explicitly identifies
the order as awaiting payment; it does not claim payment was received.

Brevo is contacted immediately in `waitUntil` after order creation, without making
checkout wait for email. API acceptance is stored as `sent`; this is not a guarantee
of inbox delivery. Check Brevo for final delivery/bounce status.

Configuration is intentionally absent from this PR. Configure production secrets
only after sender verification and testing:

- `BREVO_API_KEY`: **API key**, not an SMTP key.
- `ORDER_EMAIL_FROM`: verified sender address.
- `ORDER_EMAIL_REPLY_TO`: normally `maidargantuu120@gmail.com`.
- `BASE_URL`: current storefront origin; update it with the final custom domain.

Apply `npx wrangler d1 migrations apply DB --remote` before deploying this code.
Do not point preview deployments at production D1 for testing.

Without secrets, receipts remain pending and no email is sent. Admin-only endpoints:

- `GET /api/orders/:id/email`: configuration and delivery status.
- `GET /api/orders/:id/email-preview`: receipt HTML from the saved snapshot.
- `POST /api/orders/:id/email/retry`: send a pending/failed receipt once configured.

Network timeouts leave `uncertain`, requiring provider-log review; they are not
automatically resent and successful receipts cannot be resent through this endpoint.
This PR does not include scheduled retries or delivery-status webhooks.

## Sharing and installation

Static Open Graph and Twitter tags use “MEAT MALL БНСУ махны дэлгүүр” and the
1200×630 JPEG `share-meatmall.jpg`. Tags are present before JavaScript runs.
Regenerate with `node scripts/build-share-image.mjs` after changing the brand image.
Social apps may retain old previews until their cache refreshes. Update absolute
metadata/image URLs when moving to the final domain.

The blocking installation sheet was removed, including automatic opening for
`?install=1`. The compact banner remains: native install where supported, Android
browser handoff for social in-app visitors, and nonblocking fallback instructions.

## Validation

`npm run check`, `npm run build`, `npx tsx scripts/test-order-email.ts`,
`npx tsx scripts/test-install.ts`, and the disposable local D1/R2 smoke test.
Email tests mock Brevo and send no real messages. `.deployment/order-email-preview.html`
is a sample receipt with a clearly marked test bank account.
