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

The repository contains code and old image files, not a current product/customer
database export. A new D1 starts without products, orders, customer records or bank
accounts. Add verified product inventory, business details, delivery fees and bank
transfer details in the admin panel before accepting real orders.
Google sign-in requires separate OAuth credentials for the final domain.
