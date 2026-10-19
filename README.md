# DASDUM

Next.js storefront + admin, deployed on **Namecheap cPanel** (Node.js app + MySQL), with the domain **dasdum.co.uk** also registered at **Namecheap**.

## Quick checklist (first deploy)

1. [Create the MySQL database](#1-database) in cPanel and import `db/dasdum_mysql_schema.sql`.
2. [Build on your own computer](#2-build-locally) and run `npm run prepare-deploy`.
3. [Create the Node.js app](#3-create-the-nodejs-app-in-cpanel) in cPanel and upload the `deploy/` contents.
4. [Add the domain in cPanel and point DNS at your hosting](#4-add-the-domain-and-point-dns).
5. [Enable SSL](#5-ssl) and [create the first admin](#6-first-admin-user).

## 1. Database

1. cPanel → **MySQL® Database Wizard**. Create a database (e.g. `dasdum`) and a user with a strong password; grant **ALL PRIVILEGES**.
2. cPanel prefixes both names with your cPanel username, e.g. `cpaneluser_dasdum` and `cpaneluser_shop`. Use the full prefixed names below.
3. cPanel → **phpMyAdmin** → select the database → **Import** → choose `db/dasdum_mysql_schema.sql` → Go.

## 2. Build locally

Requires Node 20+ on your computer.

```bash
npm install
NEXT_PUBLIC_SITE_URL=https://dasdum.co.uk npm run build   # Windows PowerShell: $env:NEXT_PUBLIC_SITE_URL="https://dasdum.co.uk"; npm run build
npm run prepare-deploy
```

`NEXT_PUBLIC_SITE_URL` is baked in at build time, so set it for the build. This produces a `deploy/` folder. Zip its **contents** (include the hidden `.next` folder).

## 3. Create the Node.js app in cPanel

1. cPanel → **Setup Node.js App** → **Create Application**.
   - Node.js version: 20 or newer (pick the highest available).
   - Application mode: **Production**.
   - Application root: e.g. `dasdum` (a folder in your home directory, outside `public_html`).
   - Application URL: `dasdum.co.uk`.
   - Application startup file: `app.js`.
2. In **File Manager**, upload your zip into that application root and **Extract** it. Make sure `.next`, `node_modules`, `public`, `server.js` and `app.js` sit directly in the root.
3. Create the uploads folder outside the app root, e.g. `/home/cpaneluser/dasdum-uploads`.
4. Set environment variables, either:
   - in the Node.js app screen under **Environment variables**, or
   - in a `.env` file inside the app root (`app.js` loads it). Start from `.env.example`.

   Required: `DB_HOST` (`localhost`), `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `UPLOADS_DIR`, `AUTH_SECRET` (generate with `openssl rand -base64 32`), `NEXT_PUBLIC_SITE_URL`, plus `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (see [Payments](#payments-stripe)) and `EMAIL_API_KEY` if used.
5. Click **Restart** on the app.

To redeploy: rebuild locally, run `prepare-deploy`, upload/extract over the old files (never touches `UPLOADS_DIR`), then Restart.

If `npm install` is offered in the cPanel screen, you don't need it: the standalone build already bundles the dependencies it needs.

## 4. Add the domain and point DNS

Both the domain and the hosting are at Namecheap, so no third party is involved.

**a) Add the domain in cPanel first.**
cPanel → **Domains** → **Create A New Domain**:
- Type: Registered Domain, domain: `dasdum.co.uk`.
- **Untick "Share document root"** (otherwise it serves the same files as your primary domain, and this can't be undone).
- Leave the suggested document root and subdomain as they are; the Node app doesn't serve from that folder.

Then in **Setup Node.js App**, make sure the app's **Application URL** is `dasdum.co.uk`. If an old app is still attached to a different domain, detach or delete it.

**b) Point DNS at the hosting.** In Namecheap → **Domain List** → **Manage** next to dasdum.co.uk, pick one:

- **Nameservers (easiest):** on the **Domain** tab, set **Nameservers** to **Namecheap Web Hosting DNS** and save (green tick). cPanel's Zone Editor then manages the records.
- **A record:** keep **Namecheap BasicDNS**. On the **Advanced DNS** tab, set the `@` A record to your hosting server's shared IP (cPanel sidebar → General Information). Add a `www` record with the same IP (or a CNAME to `dasdum.co.uk`). Delete any parking-page records.

DNS usually updates within an hour but can take up to 24.

## 5. SSL

cPanel → **SSL/TLS Status** → run **AutoSSL** for dasdum.co.uk and www (works once DNS points to the server). Then confirm `https://dasdum.co.uk` loads.

## 6. First admin user

There's no admin signup by design. Either:
- **No shell:** on your computer run `node scripts/create-admin.mjs "you@dasdum.co.uk" "strong password" "Your Name"` with no DB variables set; it prints an `INSERT` to paste into phpMyAdmin's SQL tab.
- **With shell/SSH:** in the app folder, with the env vars set, run the same command and it inserts directly.

Sign in at `/admin/login`.

## Money — currency, shipping and price filters

Nothing about currency, shipping cost, or the shop's price-filter bands is hardcoded. All of it is set once in `.env` and read at **build time**, so change any of these and rebuild:

```
NEXT_PUBLIC_CURRENCY=GBP           # ISO 4217 code — GBP for the UK shop
NEXT_PUBLIC_LOCALE=en-GB           # number/date formatting
NEXT_PUBLIC_SHIPPING_STANDARD=4.95
NEXT_PUBLIC_SHIPPING_EXPRESS=12.95
NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD=120   # blank/0 turns free shipping off
NEXT_PUBLIC_PRICE_BREAKPOINTS=60,150      # the shop page's "Under X / X–Y / Over Y" filter
```

The build fails on purpose if the currency or shipping values are missing, rather than shipping a site that would show broken prices.

## Site Images (developer-only)

The homepage banner, the "Rooted in craft…" brand-story photo, and each category's photo are all editable from **Site Images** in the dashboard — but only the admin account whose email matches `DEVELOPER_EMAIL` in `.env` sees that menu item at all. Every other admin account, regardless of role, won't see it in the sidebar, and if they open the URL directly the page tells them they don't have access — the actual enforcement is server-side on each of those API routes, not just the hidden link. Change `DEVELOPER_EMAIL` to whichever admin account should have this.

## Product images

Admins can add images two ways, both on the product (and blog cover) edit screen: drag a file straight onto the dashed box, or click it to browse. There's also a Media Library (`/admin/media`) for reusing an image already uploaded, or uploading several at once. Files are validated (JPEG/PNG/WebP/GIF/SVG, 8MB max) both in the browser and again on the server, and are saved to `UPLOADS_DIR` (see below), not anywhere in the code.

## Payments (Stripe)

1. Create/sign in to your Stripe account (the client's business, GBP).
2. Developers → API keys → copy the **secret key** into `STRIPE_SECRET_KEY`. Use test keys (`sk_test_...`) first and pay with card `4242 4242 4242 4242`.
3. Developers → Webhooks → **Add endpoint**: URL `https://dasdum.co.uk/api/stripe/webhook`, events `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`. Copy its **signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
4. If you set `NEXT_PUBLIC_SITE_URL` wrong or leave it empty, checkout refuses to start (Stripe needs real return URLs) — it must be your live domain, e.g. `https://dasdum.co.uk`.
5. Restart the app. Orders become "paid" only when the webhook arrives, so if orders stay pending, check the webhook's delivery log in Stripe.
6. To go live, swap in the live keys and create the webhook again in live mode.

Not included yet: coupons and tax. Order confirmation emails are covered in the next section.

## Order and contact emails (Resend)

### Testing payments (no real money)

1. Use **test** keys: in Stripe turn on "Test mode", copy `sk_test_...` into `STRIPE_SECRET_KEY`. Checkout then shows a "Test mode" notice (it disappears on live keys).
2. Create a **test-mode** webhook endpoint (same URL and events as above) and put *its* `whsec_...` in `STRIPE_WEBHOOK_SECRET`. Test and live mode have separate endpoints and secrets.
3. Place an order and pay with `4242 4242 4242 4242` (any future expiry, any CVC). Other useful cards: `4000 0000 0000 9995` (declined, insufficient funds), `4000 0025 0000 3155` (asks for 3-D Secure).
4. Check: admin → Orders shows the order **paid**, stock went down, and the confirmation emails arrived.
5. Refund it in the Stripe dashboard (test mode) → the order should flip to **refunded**.

**Testing on your own computer** (`npm run dev`): Stripe can't reach `localhost`, so either use the [Stripe CLI](https://stripe.com/docs/stripe-cli) (`stripe listen --forward-to localhost:3000/api/stripe/webhook`, which prints a `whsec_...` to use), or skip Stripe entirely and send signed fake events yourself:

```
npm run test:stripe -- paid    --order <orderId> --amount <grand total in pence>
npm run test:stripe -- refund  --pi <the payment intent it prints> --amount <same amount>
npm run test:stripe -- expired --order <orderId>
```

The order's `<orderId>` is its `id` in the database (phpMyAdmin → `order` table). The script refuses to target a non-local URL unless you add `--yes`, and it moves no money. Sending a wrong `--amount` is a good test too: the site should leave the order pending.

Two things get emailed: an order confirmation to the customer plus a "new order" notice to you, both the moment Stripe confirms payment; and a copy of every contact-form message, to you. Nothing is emailed from your own cPanel mailbox — a shared hosting server has no sending reputation of its own, so transactional mail sent that way is much more likely to land in spam. [Resend](https://resend.com) is a dedicated email-sending service with a free tier (3,000 emails/month, 100/day at the time of writing — check their current pricing page) built for exactly this.

1. Sign up at resend.com, then **Domains** → **Add Domain** → `dasdum.co.uk`.
2. Resend shows 2–3 DNS records (SPF, DKIM, and usually a tracking CNAME). Add them in Namecheap under **Advanced DNS** for dasdum.co.uk, exactly as shown — don't change the type or host Resend gives you. Verification can take a few minutes up to a few hours.
3. Once it shows **Verified**, go to **API Keys** → **Create API Key** → copy it into `EMAIL_API_KEY`.
4. Set `EMAIL_FROM` to an address at your verified domain, e.g. `DASDUM <orders@dasdum.co.uk>` — it doesn't need to be a real mailbox, Resend only needs to send *from* it.
5. Set `ADMIN_NOTIFICATION_EMAIL` to wherever you want order and contact-form alerts sent — this can be any inbox you already check (Gmail, your cPanel mailbox, anything).
6. Restart the app.

Leaving `EMAIL_API_KEY` blank turns email off without breaking anything else — orders still save and Stripe still processes payment, the confirmation email is just skipped (and logged to the error log, so you can see it was skipped rather than silently lost).

## Deploying updates with one command

Instead of zipping and uploading each time, push over SSH:

1. cPanel → **SSH Access** → make sure SSH is enabled for your account (Namecheap shared hosting uses port **21098**). Add an SSH key (**Manage SSH Keys** → Import or Generate) so it doesn't ask for a password.
2. Copy `deploy.config.example` to `deploy.config` and fill it in.
3. Run `npm run deploy`. It builds, packages, syncs only changed files with rsync, and restarts the app.

Needs `rsync` and `ssh` (Mac/Linux have them; on Windows run it inside WSL). The first upload sends `node_modules`, so it's slower; later ones are quick. Your `.env` and uploads folder are never overwritten.

## Local development

```bash
cp .env.example .env     # point DB_* at a local MySQL, e.g. XAMPP/Docker
npm install
npm run dev              # http://localhost:3000
```

Uploads go to `./uploads` unless `UPLOADS_DIR` is set.

## Changing the schema

Edit `src/lib/db/schema.ts`, then either `npm run db:generate` (writes SQL to `drizzle/migrations`) and run that SQL in phpMyAdmin, or `npm run db:push` with DB credentials in `.env` (only works if your database accepts remote connections; on shared hosting it usually only allows `localhost`, so prefer phpMyAdmin). Keep `db/dasdum_mysql_schema.sql` in sync.

## Notes

- Back up regularly: the database (cPanel → Backup) and the `UPLOADS_DIR` folder.
- `register` has no rate limiting; add some before heavy production traffic.
- Troubleshooting: Node.js app screen shows the error log path; a 503 usually means a missing env var, wrong DB credentials, or a wrong startup file.
