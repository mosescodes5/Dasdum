# DASDUM — Architecture & Design Plan

## 1. Logo analysis
The mark pairs a solid silhouette of the African continent with a lower-case "d" built from a gold arc + a teal circle-and-stem "D". Two visual ideas fall out of this: (1) an **arc/circle** as the brand's core geometric device, and (2) a **two-tone split** (teal mass vs. gold arc) used as a compositional rule, not just a logo detail.

## 2. Design plan

**Color** (from the brief, unchanged — the brief pins this down):
| Token | Hex | Role |
|---|---|---|
| `--color-primary-deep` | #1D3D47 | darkest surfaces, admin chrome, footer |
| `--color-primary` | #254B56 | primary UI color, nav on scroll, buttons |
| `--color-gold` | #DB9E41 | precision accent: rules, numerals, active states — never a background wash |
| `--color-gold-light` | #E9BC73 | hover/tint of gold, small badges |
| `--color-bg` | #F8F9F5 | page background |
| `--color-white` | #FFFFFF | cards, surfaces |
| `--color-text` | #17252B | body copy |
| `--color-muted` | #68777B | secondary text, hairlines |

**Type:** `Fraunces` (variable, optical size + soft weight) for display/editorial headlines — it has the warmth the brief asks for without leaning on the cream/terracotta cliché, since our palette is teal/gold. `Inter` for UI, body copy, forms, tables. Two families, clearly distinct roles.

**Layout concept:** asymmetrical editorial grid, not centered-stacked-sections. Hero splits 60/40 — large left-aligned display type over a 12-col grid, with a cropped arc motif (echoing the logo) bleeding off the right edge. Product grids stay strict and quiet (sharp 2–4px radius, hairline borders) so the arc motif and gold accent lines remain the one bold gesture. No SaaS-card shadows; use 1px `--color-muted` hairlines and flat surfaces instead.

```
┌─────────────────────────────────────────┐
│  announcement bar                        │
├─────────────────────────────────────────┤
│  logo   Home Shop Categories About  ⌕ ♡ ⚲│  <- sticky, blurs on scroll
├─────────────────────────────────────────┤
│  DESIGNED WITH        ░░░░░░░░░░░░░      │
│  PURPOSE.             ░  arc/photo  ░    │  <- 60/40 asymmetry
│  MADE FOR TODAY.       ░░░░░░░░░░░░░     │
│  [Explore Collection] [Discover DASDUM]  │
├─────────────────────────────────────────┤
│  Category  Category  Category            │  <- 3-up, image-led
├─────────────────────────────────────────┤
│  image │  DASDUM story + mission + CTA   │  <- split screen
├─────────────────────────────────────────┤
│  Best sellers →  (horiz. scroll mobile)  │
├─────────────────────────────────────────┤
│  Why DASDUM — 5 pillars, thin gold rules │
├─────────────────────────────────────────┤
│  Testimonials                            │
│  Journal (3 cards)                       │
│  Newsletter                              │
│  Footer                                  │
└─────────────────────────────────────────┘
```

**Principles**
1. The arc from the logo is the one recurring structural device — used as an image mask/divider/button shape — not scattered per-card animation.
2. Gold is precision, not paint: thin rules, numerals, active underlines. Never a full-bleed gold background.
3. One orchestrated hero entrance; hover states are purposeful (image swap, arrow slide) rather than fade-up-everything.
4. Sharp-ish radii (2–4px) and hairlines instead of soft shadows/rounded SaaS cards.

## 3. Application architecture (Next.js App Router)
```
src/
  app/
    (site)/                  # public storefront, shares one layout
      page.tsx                # home
      about/page.tsx
      shop/page.tsx
      shop/[category]/page.tsx
      product/[slug]/page.tsx
      cart/page.tsx
      checkout/page.tsx
      account/(...)/page.tsx
      orders/[id]/page.tsx
      blog/page.tsx
      blog/[slug]/page.tsx
      contact/page.tsx
      faq/page.tsx
      privacy/page.tsx
      terms/page.tsx
      layout.tsx
    admin/
      layout.tsx              # separate shell, auth-gated
      page.tsx                 # dashboard
      products/...
      categories/...
      orders/...
      customers/...
      blog/...
      media/...
      settings/...        # developer-only: homepage/brand/category photos
    api/
      products/route.ts
      cart/route.ts
      checkout/route.ts
      stripe/webhook/route.ts
      admin/**/route.ts        # every admin mutation re-checks auth server-side
  components/{ui,layout,navigation,hero,products,categories,cart,checkout,account,blog,reviews,admin,shared}/
  lib/
    db/ (schema.ts, queries/*)   # Drizzle ORM over MySQL
    auth/ (session.ts, rbac.ts)
    uploads.ts               # local-disk media storage
    validation/ (zod schemas)
    tokens.ts
  styles/tokens.css
```
- Server Components by default; `"use client"` only for cart drawer, filters, forms, admin tables/charts, image gallery/zoom.
- Every admin route handler independently re-verifies session + role server-side (never trusts middleware alone), per the security requirement.

## 4. Database schema (MySQL via Drizzle)
See `db/dasdum_mysql_schema.sql` — covers Customer, AdminUser, Address, Category, Product, ProductImage (gallery), Order, OrderItem, WishlistItem, AuditLog, Media, BlogCategory, BlogPost, SiteSetting (hero/brand-story/category photos).

## 5. Public sitemap
`/ /about /shop /shop/[category] /product/[slug] /cart /checkout /account /account/orders /account/orders/[id] /account/addresses /account/wishlist /blog /blog/[slug] /contact /faq /privacy /terms`

## 6. Admin sitemap
`/admin /admin/products(/new,/[id]) /admin/categories(/new,/[id]) /admin/orders/[id] /admin/customers/[id] /admin/blog(/new,/[id]) /admin/media /admin/settings` (the last is developer-only, gated by `DEVELOPER_EMAIL` — see rbac.ts's `requireDeveloper`)

## 7. Hosting architecture (Namecheap cPanel, domain dasdum.co.uk)
- **Compute:** a single long-lived Node.js process run by cPanel's "Setup Node.js App" (Phusion Passenger), started from the Next.js `output: "standalone"` build via `app.js` → `server.js`. The DB layer uses one pooled `mysql2` connection created at module load.
- **DB:** MySQL/MariaDB from cPanel, accessed through Drizzle ORM's `drizzle-orm/mysql2` driver (`src/lib/db/client.ts`). Baseline schema: `db/dasdum_mysql_schema.sql`, imported via phpMyAdmin.
- **Storage:** uploaded media on local disk in `UPLOADS_DIR` (outside the app root so redeploys never wipe it), served back through `src/app/media/[...path]/route.ts`.
- **Auth:** signed session cookies (`AUTH_SECRET`), `httpOnly`, `secure`, `sameSite=lax`; RBAC checked in every server action, not only in `proxy.ts` (Next 16's rename of `middleware.ts`).
- **Payments:** Stripe Checkout (hosted page, currency set by `NEXT_PUBLIC_CURRENCY`). `/api/checkout` re-prices the basket from MySQL and creates a pending order; `/api/stripe/webhook` verifies Stripe's signature and is the only place an order is marked paid and stock decremented.
- **DNS:** domain and hosting both at Namecheap — see README for connecting them.
- Config: `next.config.ts`, `drizzle.config.ts`, `.env.example`, `scripts/prepare-deploy.mjs`.
- **Scaling note:** shared hosting has per-account CPU/memory caps. If traffic outgrows it, the usual next step is a VPS; only `lib/db/client.ts` and `lib/uploads.ts` are environment-specific, so the rest of the application code wouldn't need to change.

## 8. Implementation plan / stages
1. ✅ Architecture, schema, tokens, sitemap (this document)
2. ✅ Design system + global layout + navigation
3. ✅ Homepage
4. ✅ Shop (filtering, sorting, pagination, mobile drawer) + Product page (gallery, variants, tabs, related products, product schema)
5. ✅ Cart (drawer + full page, save-for-later, discount code UI) + Checkout scaffolding (contact/shipping form with Zod validation, delivery method, Stripe Checkout payment step, order summary)
6. ✅ Auth (PBKDF2 password hashing, signed httpOnly sessions, RBAC) + Account area (profile, orders, addresses — real MySQL CRUD; wishlist — shared client context wired into product cards/nav)
7. ✅ Admin shell (sidebar, topbar, gated layout, dark non-storefront identity, separate admin login) + Dashboard — real stat cards (revenue, orders, awaiting action, products, customers) plus real recent-orders and low-stock lists; no demo/placeholder data anywhere on it
8. ✅ Product/category/order/customer management — real MySQL-backed CRUD: products (list w/ search+status filter+bulk delete, create/edit/delete forms), categories (same pattern), orders (list w/ fulfillment filter, detail w/ payment+fulfillment status updates), customers (list w/ search, detail w/ disable/enable + saved addresses). Every mutation logs to `audit_log` and re-checks role via `requireAdmin()`.
9. ✅ Blog CMS + Media Library — local-disk-backed uploads (`/admin/media`: upload/search/delete/copy URL), a reusable `MediaPicker` wired into both product and blog forms, and a full blog CMS (`/admin/blog` list+search+status filter+bulk delete, create/edit with category upsert, cover image, SEO fields). Public `/blog` and `/blog/[slug]` now read real published posts from MySQL, with Article JSON-LD.
10. ✅ Site Images (developer-only — homepage banner, brand-story photo, category photos). Coupons and reviews: not built.
11. SEO + sitemap.xml/robots.txt + structured data
12. ✅ cPanel deploy config + docs — standalone build, MySQL schema, local media storage, README deployment walkthrough

This delivery completes stages 1–9 and 12, targeting Namecheap cPanel (Node.js Selector) with MySQL and local-disk media. Currency, shipping cost and price-filter bands are all set in `.env` (see README), not hardcoded; amounts are stored as integer minor units.

## No demo data on the storefront

Every public page renders from MySQL only. `src/lib/demo-data.ts` and all
fallbacks to it were removed: empty catalogs show an empty state, and
sections with nothing to show (categories, best sellers, journal) are left
out. Best sellers are ranked by units sold in **paid** orders. Contact
email, support hours and social links come from `NEXT_PUBLIC_*` variables
in `.env` (see `.env.example`) and are hidden when blank. Product reviews
and testimonials don't exist yet (no table), so none are shown.
