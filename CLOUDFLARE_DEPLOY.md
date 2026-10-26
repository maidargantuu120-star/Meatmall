# Meatmall on Cloudflare

The storefront and API run together on Cloudflare Pages. `DB` binds to D1
`meatmall-db`; `BUCKET` binds to the private R2 bucket `meatmall-storage`.
Supabase and PostgreSQL are not used by this deployment.

## Deployment

1. Enable R2 in the Cloudflare account and create `meatmall-storage`.
2. Authenticate the official CLI with the intended Cloudflare account.
3. Apply the schema: `npx wrangler d1 migrations apply DB --remote`.
4. Connect `maidargantuu120-star/Meatmall`, branch `main`, to Cloudflare Pages.
   Set the build command to `npm run build`, output to `dist/public`, root to `/`.
5. Set production secrets `SESSION_SECRET` (at least 32 random characters),
   `ADMIN_USERNAME`, and a strong `ADMIN_PASSWORD`. Never set `DEV_LOGIN` in production.
6. Deploy. `wrangler.toml` supplies D1/R2 bindings. Check the production bindings
   and set the same resources for any preview environment only if intended.
7. Add the owned custom domain through Pages → Custom domains when available.

Alternatively create a direct-upload Pages project and run
`npx wrangler pages deploy dist/public --project-name meatmall`.
Direct-upload projects cannot later switch to Git integration; use the Git-connected
workflow above when automatic deployments are required.

## Media

Uploads are binary multipart files. The browser limits both image dimensions,
encodes WebP and sends the file to `/api/media`. The API verifies the WebP signature,
rejects empty/oversized files (5 MB maximum), stores a UUID-named object in R2,
and saves only `/uploads/...webp` URLs and metadata in D1.
JSON and multipart writes containing inline `data:image/` strings are rejected.
R2 objects are served through the API with immutable cache headers; public bucket
access and public development URLs are unnecessary.

## Verification

Run `npm run check` and `npm run build`. For a disposable local instance, apply
the migrations with `--local`, provide secrets in `.dev.vars`, and run
`npx wrangler pages dev dist/public --port 8799 --ip 127.0.0.1`.
`node scripts/smoke-cloudflare.mjs` uses ignored `.deployment/secrets.json` and
creates local test data. It checks authentication, file storage, invalid file and
inline image rejection, prices, stock, fractional quantities and origin validation.
Never run this script against a production database.

## Store setup

### Shipping fees and Jeju

Administrators edit base shipping and the additional Jeju fee at `/admin/settings`.
The existing `shipping_fee` JSON setting keeps its array format; the first row
now includes `jejuSurcharge`. A legacy row without that field defaults to 6,000
won additional Jeju shipping while preserving its existing base fee. No database
migration or redeployment is needed for later fee changes. Old administrator
clients that only save the base fee preserve the configured surcharge.

Checkout offers Kakao Postcode search, filling the Korean address and five-digit
postal code, with manual input available if the service fails. The shared policy
checks Jeju addresses and postal codes 63000–63644. Conflicting mainland/Jeju
address and postcode information blocks checkout. The browser displays base plus
Jeju surcharge, and the server independently recalculates from the submitted
destination and stored settings. A changed expected fee returns 409 before any
order/inventory mutation, so the buyer must review the new amount and submit again.
Cart totals are estimates until the destination is entered.

Orders store the postal code with their delivery address. Receipt snapshots keep
the base fee, surcharge, region and final total from order time; later settings
changes do not reprice old orders. The admin receipt identifies Jeju destinations.
Existing clients without a postcode still have their Korean Jeju address checked.

Validate with `npm run check`, `npm run build`, and `node scripts/test-shipping.mjs`.
The test creates disposable local products/orders only, with no email/push keys.
Also verify a real Kakao address selection in local checkout and administrator
fee editing. Never create test orders in the production database.

The repository contains code and old image files, not a current product/customer
database export. A new D1 starts without products, orders, customer records or bank
accounts. Add verified product inventory, business details, delivery fees and bank
transfer details in the admin panel before accepting real orders.
Google sign-in requires separate OAuth credentials for the final domain.

## Google sign-in

Use the `maidargantuu120@gmail.com` Google Cloud account and the dedicated
Meatmall project. Configure an external OAuth app named `Meatmall` with the
support/developer contact `maidargantuu120@gmail.com`, home page
`https://meatmall.kr/`, privacy policy `https://meatmall.kr/privacy`, terms
`https://meatmall.kr/terms`, and authorized domain `meatmall.kr`.

Create a Web application client with authorized origins `https://meatmall.kr`
and `https://www.meatmall.kr`, and the single redirect URI
`https://meatmall.kr/api/auth/google/callback`. Only `openid`, `email` and
`profile` are needed. Publish the app for external customers after checking the
consent configuration. Billing and paid Google APIs are not needed for this flow.

Store `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as production secrets in
Cloudflare Pages, and set `BASE_URL=https://meatmall.kr`. Never commit or display
the client secret. Apply a new deployment after updating the production values.

The login start endpoint moves alternate production hosts to the canonical
domain before setting a short-lived signed HttpOnly state cookie. The callback
checks that cookie and its expiry, consumes it, and accepts only a Google-verified
email and subject. OAuth URLs and token-response bodies are excluded from logs.
The next Capacitor build also uses `https://meatmall.kr` for API requests.

Validate with `npm run check`, `npm run build`, then
`node scripts/test-google-oauth.mjs`. This uses mocked Google endpoints and a
disposable database. After deploying, test the site's Google button in a browser,
complete Google consent, and verify that the site returns to an authenticated
session. Do not treat reaching the Google account chooser as successful login.

## Administrator password changes

The storefront and administrator pages share one session. An administrator signed
in by Google or the ordinary password form can use the footer's admin link to
open `/admin` directly. `/admin/login` also redirects signed-in administrators
to the dashboard. Members without the administrator role remain blocked and see
an explanation on the admin login screen, which also offers Google sign-in.
The admin logout button calls the shared `/api/logout` endpoint.

Signed-in administrators can open `/admin/security` (sidebar: `Нууц үг солих`)
and enter their current password, a new 12–128 character password, and its
confirmation. The change is immediate and does not require a deployment or any
Cloudflare secret update. The handler requires an administrator session, JSON,
and a matching Origin. It updates only that user's password, with a conditional
write to prevent concurrent changes from overwriting each other.

The existing `users.password` column stores a salted PBKDF2 hash. An `admin-v1$`
hash prefix marks an administrator-managed password, disabling the legacy
`ADMIN_PASSWORD` fallback permanently for that account. Before the first change,
an existing admin may use either their current DB password or the configured
bootstrap password. No schema migration or account recreation is needed.
Google account links, user IDs, roles, orders and all other data are preserved.

After a change, the current browser receives a renewed session. Other existing
cookies and bearer tokens are invalidated by binding managed admin sessions to
the stored password hash. Google login continues to work. Do not delete or change
`SESSION_SECRET` as part of this operation. The Cloudflare bootstrap secret may
remain configured; it cannot override a password changed through this page.

Validate with `npm run check`, `npm run build`,
`node scripts/test-admin-password.mjs`, and `node scripts/test-google-oauth.mjs`.
The tests use disposable local databases and never change production passwords.

## Additional administrators

The account page `/admin/security` shows the signed-in administrator's current
email and username, and separates their password change from inviting a new
operator. Only signed-in administrators may create or revoke invitations.
Creating a new operator does not require sharing the original account's password
or changing its email, Google link, role or session.

An invitation is restricted to one normalized email, expires after 24 hours, and
can be used once. D1 lazily creates `admin_invitations`, storing only a SHA-256
digest of a cryptographically random 256-bit bearer token. The link carries its
token in a fragment, never a request URL/query. The list API does not return
tokens. Reissuing revokes older links for that email, and the creator can revoke
pending invitations. Demoting the creator also makes their unused links invalid.

Share the link privately with the intended operator; this feature does not send
email automatically. `/admin/activate` lets that person choose their own name and
12–128 character password, with no existing password required. Acceptance uses
an atomic D1 batch to create a new administrator with a managed password hash and
consume the invitation. It never promotes or overwrites an existing email account.
The new operator signs in at `/admin/login` with that email and their own password.
Origin and JSON guards protect create/revoke/inspect/accept requests.

Validate with `node scripts/test-admin-invitations.mjs` after the normal typecheck
and build. The test uses only disposable local accounts and covers authorization,
origin/content-type rejection, expired/revoked/reused links, concurrent claims,
duplicate email protection, new email/password login and original account preservation.

## Web push notifications

Set production secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (a matching P-256
Web Push key pair), and `VAPID_SUBJECT=mailto:maidargantuu120@gmail.com`, then
deploy. Keep the private key only in encrypted Cloudflare secrets. Keep this pair
stable: existing browser subscriptions depend on its public key. Subscriptions
are saved in D1 lazily, without changing accounts, passwords or order records.

Installing the web app does not grant notification permission. iOS/iPadOS 16.4+
requires opening the Home Screen app and granting permission after a button tap.
The client requests permission directly in that tap, before any asynchronous
worker lookup, and subscribes only after the service worker is active. Normal
Chrome and macOS Safari use the same flow. Native Capacitor push is separate.

Already granted devices automatically reconnect on login and when returning to
the app, without another permission prompt. The UI reflects the resulting server
subscription. Explicitly turning notifications off persists a device opt-out;
automatic reconnect does not undo it. Blocked permission and installation advice
remain visible. Missing server configuration and reconnect failures have retry
states. Enabling is separate from sending a test: a failed test cannot masquerade
as failed permission. The test endpoint reports failure when no push service
accepted a message and removes expired subscriptions on HTTP 404/410.

Validate with `npm run check`, `npm run build`, and
`node scripts/test-web-push.mjs`. These use simulated browser permission states,
a disposable D1 database and an in-process push provider. Real iPhone/Android
notification display still needs a physical-device check after deployment.

## Search indexing

The canonical storefront origin is `https://meatmall.kr`. The Pages worker
redirects public GET/HEAD requests from `www.meatmall.kr` to the same path and
query on the canonical origin. `/api` requests retain their origin for session
and native-client compatibility. Every HTML response has a path-specific
canonical URL; account, checkout, admin and unknown routes have `noindex`.

`client/public/robots.txt` is included in the Vite build. `/sitemap.xml` is
generated by the worker from the current products and active service categories,
plus the home, contact, privacy and terms pages. It has a five-minute cache and
returns 503 on catalog failures instead of publishing an incomplete sitemap.
There are no guessed modification dates.

After deployment, verify both files on the custom domain and submit
`https://meatmall.kr/sitemap.xml` in Google Search Console. Validate locally with
`npm run check`, `npm run build`, then `node scripts/test-seo.mjs`; the integration
test uses a disposable in-memory database and does not touch production data.
