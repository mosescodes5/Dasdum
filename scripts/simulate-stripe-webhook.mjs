#!/usr/bin/env node
// Sends a correctly SIGNED fake Stripe event to your site's webhook, so you
// can test "order becomes paid / expired / refunded" without Stripe.
//
//   node scripts/simulate-stripe-webhook.mjs paid    --order <orderId> --amount 4499
//   node scripts/simulate-stripe-webhook.mjs expired --order <orderId>
//   node scripts/simulate-stripe-webhook.mjs refund  --pi <paymentIntentId> --amount 4499
//
// --order   the order's internal id (admin → order detail, or the `id` column)
// --amount  in pence — for "paid" it must equal the order's grand total or the
//           site (correctly) refuses to mark it paid; that's a useful test too.
// --url     default http://localhost:3000   (non-local URLs also need --yes)
// --partial (refund only) refund half instead of everything
//
// Uses STRIPE_WEBHOOK_SECRET from your .env / environment — the same secret
// the site verifies with. This does NOT talk to Stripe and moves no money.

import { createHmac, randomBytes } from "node:crypto";
import "dotenv/config";

const [kind = "paid", ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) {
    const key = rest[i].slice(2);
    const next = rest[i + 1];
    args[key] = next && !next.startsWith("--") ? (i++, next) : true;
  }
}

const secret = process.env.STRIPE_WEBHOOK_SECRET;
if (!secret) {
  console.error("STRIPE_WEBHOOK_SECRET is not set (put it in .env).");
  process.exit(1);
}
const url = String(args.url ?? "http://localhost:3000").replace(/\/+$/, "");
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);
if (!isLocal && !args.yes) {
  console.error(`Refusing to send a fake event to ${url}. Add --yes if you really mean it.`);
  process.exit(1);
}
const currency = (process.env.NEXT_PUBLIC_CURRENCY ?? "GBP").toLowerCase();
const amount = Number(args.amount);

let event;
if (kind === "paid" || kind === "expired") {
  if (!args.order) fail("--order <orderId> is required");
  if (kind === "paid" && !Number.isInteger(amount)) fail("--amount <pence> is required for 'paid'");
  event = {
    id: "evt_sim_" + randomBytes(6).toString("hex"),
    type: kind === "paid" ? "checkout.session.completed" : "checkout.session.expired",
    data: {
      object: {
        id: "cs_test_sim_" + randomBytes(6).toString("hex"),
        client_reference_id: args.order,
        metadata: { order_id: args.order },
        payment_status: kind === "paid" ? "paid" : "unpaid",
        amount_total: Number.isInteger(amount) ? amount : 0,
        currency,
        payment_intent: args.pi ?? "pi_test_sim_" + randomBytes(6).toString("hex"),
      },
    },
  };
} else if (kind === "refund") {
  if (!args.pi) fail("--pi <paymentIntentId> is required (printed when you ran 'paid')");
  if (!Number.isInteger(amount)) fail("--amount <pence> is required for 'refund'");
  event = {
    id: "evt_sim_" + randomBytes(6).toString("hex"),
    type: "charge.refunded",
    data: {
      object: {
        id: "ch_test_sim_" + randomBytes(6).toString("hex"),
        payment_intent: args.pi,
        amount,
        amount_refunded: args.partial ? Math.floor(amount / 2) : amount,
        currency,
      },
    },
  };
} else {
  fail(`Unknown event "${kind}". Use: paid | expired | refund`);
}

const body = JSON.stringify(event);
const t = Math.floor(Date.now() / 1000);
const sig = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");

const res = await fetch(`${url}/api/stripe/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Stripe-Signature": `t=${t},v1=${sig}` },
  body,
});
console.log(`${event.type} → ${res.status} ${await res.text()}`);
if (kind === "paid" && res.ok) console.log(`Payment intent used: ${event.data.object.payment_intent}  (pass as --pi to test a refund)`);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
