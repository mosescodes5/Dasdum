# DASDUM storefront — notes for Copilot

UK e-commerce site: Next.js 16 (App Router) + React 19, Tailwind 3, Drizzle ORM on MySQL, `motion` for animation, Stripe Checkout (plain REST, `src/lib/stripe.ts`), email over SMTP (`src/lib/email.ts`, nodemailer). Hosted on **cPanel (Node.js app)** — not Vercel.

## Commands
- `npm run dev` — local site at http://localhost:3000
- `npx tsc --noEmit` — type-check (run before releasing)
- `npm run release` — **the one-command release**: validates `.env`, `npm ci`, `npm run build`, builds `deploy/`, zips it into `release/dasdum-deploy-*.zip`. `npm run release -- --fast` skips the install.
- `npm run create-admin`, `npm run test:stripe` (signed fake Stripe events for local testing)

## Releasing (what the user does after `npm run release`)
Upload the zip in cPanel → File Manager → app root → Extract over old files → Setup Node.js App → Restart. Never delete the server's `.env` or the uploads folder.

## Rules that matter
- **`NEXT_PUBLIC_*` values are baked in at build time** (currency, shipping prices, `NEXT_PUBLIC_SITE_URL`, contact/social links). Changing them needs a rebuild + re-upload; setting them in cPanel does nothing.
- **Never commit or zip secrets.** `.env`, `deploy.config` and `release/` are git-ignored. Server secrets (DB, `AUTH_SECRET`, `STRIPE_*`, `SMTP_*`) live in cPanel's environment variables.
- **Money is stored in minor units (pence)**; use `formatMoney` from `src/lib/currency.ts`. Prices/stock are always re-read from the database at checkout — never trust the browser.
- **No demo or invented content.** Products, categories, prices and orders come from the database; an empty section is hidden, not filled with placeholders. No fake reviews, discounts or stock notices.
- Page copy is editable in the admin (Site Content / Site Images, developer-only via `DEVELOPER_EMAIL`); don't hardcode it in components.
- Database changes: update `src/lib/db/schema.ts` **and** `db/dasdum_mysql_schema.sql`, and give the user the `ALTER TABLE` to run in phpMyAdmin (there is no migration runner on the server).
- Motion: keep it to opacity/transform, once per element, respecting reduced-motion (see `src/components/motion/Reveal.tsx`). No parallax, clip-path or blur animations — they made the site lag.
- Stripe webhook (`src/app/api/stripe/webhook/route.ts`) is the only thing that marks orders paid; keep its signature and amount checks.

## When a release fails
Read the **first** red error in the terminal (not the last line). Fix the cause, then re-run `npm run release -- --fast`.
