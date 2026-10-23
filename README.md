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

   Required: `DB_HOST` (`localhost`), `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `UPLOADS_DIR`, `AUTH_SECRET` (generate with `openssl rand -base64 32`), `NEXT_PUBLIC_SITE_URL`, plus `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (see [Payments](#payments-stripe)) and the `SMTP_*` lines if you want email (see [Order and contact emails](#order-and-contact-emails)).
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

## Admin team (several people signing in)

**Admin → Team** (Owners only) lets you add people who can sign in to the admin, change their role, reset their password, or disable them. Every change is written to the activity log.

- **Roles:** *Support* views orders, customers and products and updates order fulfilment. *Editor* adds that plus creating/editing products, categories and blog posts and uploading images. *Manager* adds deleting things and disabling customer accounts. *Owner* adds managing the team.
- **Adding someone:** enter their name, email and role. A random temporary password is shown **once** — pass it to them privately; no email is sent. They change it under **My account** (every team member has that page).
- **Disabling** is immediate: the person is signed out of everything at once, even if they were mid-session. People are never deleted, so old orders and the log keep a real name.
- **You (the developer)** are the account whose email matches `DEVELOPER_EMAIL`. Nobody else can disable, demote or reset it. Only you can create or change other **Owners**, so give your client an Owner account and they can manage everyone below them. There is always at least one active Owner, and nobody can disable or demote themselves.
- Site Images and Site Content stay developer-only and aren't part of any role.
- The first account is still made with `node scripts/create-admin.mjs` (see above).

## Automated releases (VS Code + GitHub Copilot)

One command turns your source code into a zip you can upload to cPanel:

```
npm run release          # install + build + deploy folder + zip
npm run release -- --fast   # same, skipping the install (code-only changes)
```

It first checks your `.env` (and stops with a plain message if something is missing or `NEXT_PUBLIC_SITE_URL` isn't your live `https://` address), then builds, assembles `deploy/`, makes sure **no `.env` is inside**, and writes `release/dasdum-deploy-<date>.zip`. Only the 5 newest zips are kept.

**In VS Code**
- Press **Ctrl+Shift+B** (Cmd+Shift+B on Mac) to run the release, or **Terminal → Run Task…** for the other tasks (fast release, dev server, error check). They're defined in `.vscode/tasks.json`.
- **With Copilot:** open Copilot Chat, switch to **Agent** mode, and type `/release`. It type-checks, runs the release, and if something fails it reads the *first* error, fixes it and retries — then gives you the upload steps. (The prompt is `.github/prompts/release.prompt.md`.) Copilot already knows how this project is built and its rules from `.github/copilot-instructions.md`.
- If a release fails and you're not sure why, paste the first red error into Copilot Chat.

**Then upload (still manual, ~1 minute):** cPanel → File Manager → your app folder → upload the zip → Extract over the old files → Setup Node.js App → Restart. Leave the server's `.env` and your uploads folder alone.

Want the upload automated too? `npm run deploy` (see above) does it over SSH, and needs bash + rsync (on Windows: WSL). A GitHub Actions workflow could build and upload on every push to `main` — ask if you want that set up.

## Order and contact emails

Two things get emailed: an order confirmation to the customer plus a "new order" notice to you, both the moment Stripe confirms payment; and a copy of every contact-form message to you (with Reply-To set to the customer, so hitting Reply answers them). They are sent through **your own cPanel mailbox** over SMTP — no outside email service is needed.

1. cPanel → **Email Accounts** → **Create**, e.g. `orders@dasdum.co.uk`. Pick a strong password.
2. cPanel → **Email Deliverability** → check `dasdum.co.uk` shows SPF and DKIM as valid (if it offers a **Repair** button, click it). This is what stops order emails landing in spam.
3. Set these environment variables (Setup Node.js App → Environment variables), then restart the app:
   - `SMTP_HOST` = `mail.dasdum.co.uk` (the exact "Outgoing Server" shown under the mailbox's **Connect Devices** page)
   - `SMTP_PORT` = `465` (or `587` if your host says so)
   - `SMTP_USER` = `orders@dasdum.co.uk` (the full address)
   - `SMTP_PASSWORD` = the mailbox password
   - `ADMIN_NOTIFICATION_EMAIL` = where order and contact alerts go (any inbox you check)
   - `EMAIL_FROM` is optional; leave it blank and mail is sent as `DASDUM <orders@dasdum.co.uk>`.
4. Place a test order (see [Testing payments](#testing-payments-no-real-money)) and check the confirmation arrives — and check the **spam folder** the first time.

Leaving `SMTP_HOST` blank turns email off without breaking anything else — orders still save and Stripe still processes payment, the email is just skipped and logged to the error log, so you can see it was skipped rather than silently lost.

Good to know: shared hosting caps how many emails a mailbox can send per hour (often 100–500 — ask your host). That is plenty for order confirmations at normal shop volumes. If you ever outgrow it, or mail keeps landing in spam, a dedicated sending service such as Resend is a drop-in replacement for the one `sendEmail` function in `src/lib/email.ts`.

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

## Making the site fast on cPanel

Shared hosting is the slowest part of the chain, so these matter more than any code change. In order of impact:

1. **Turn on Namecheap's Supersonic CDN (it has a free plan).** In your Namecheap account open *Apps → Supersonic CDN*, pick the free plan and connect your hosting domain. It only works while the domain uses Namecheap's own nameservers (*Domain List → Manage → Nameservers → Namecheap Web Hosting DNS*). Namecheap's setup guide also asks you to redirect the bare domain to `www.` in `.htaccess` — follow their guide exactly, and keep those lines *outside* the block cPanel generates for the Node.js app. Once it's on, images, scripts and fonts are served from a server near each visitor instead of your host. After enabling it, load the site, open the browser's Network tab, and check that files under `/_next/static/` and `/media/` come back with a cache/CDN header; if they don't, ask Namecheap support to cache those two paths. (Cloudflare's free plan is an alternative, but it needs you to move the domain's nameservers away from Namecheap, which also moves email and DNS.)
2. **Stop cold starts.** Add a free UptimeRobot (or cron-job.org) monitor that requests `https://your-domain/` every 5 minutes. Without it cPanel stops the idle app and the next visitor waits several seconds for it to boot. The app now warms its own cache on startup, so a restart costs far less than before.
3. **Shrink existing photos** with `scripts/optimize-uploads.mjs` (new uploads are resized in the browser automatically). Aim for hero/banner images under ~300 KB and product photos under ~150 KB.
4. **Check the host isn't throttling you.** cPanel → *Resource Usage* → look for hits on CPU/Memory/Entry-process limits. If the graph is pinned at the limit, the plan is too small for Next.js; ask the host to raise it or move to a plan with more CPU/RAM.
5. **Optional:** `DB_POOL_SIZE` (default 5) sets how many database connections the app may hold; leave it unless your host tells you the limit is higher.

Quick self-test (run twice, the second run is the "warm" number — should be well under 1 s):
`curl -o /dev/null -s -w "first byte: %{time_starttransfer}s\n" https://your-domain/`
