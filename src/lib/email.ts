import { formatMoney } from "@/lib/currency";

// Sends transactional email via Resend's REST API (no SDK dependency,
// same pattern as src/lib/stripe.ts). Why Resend and not your cPanel
// mailbox: a shared-hosting IP has no sending reputation of its own, so
// order confirmations sent through it are much more likely to land in
// spam — a dedicated provider keeps deliverability out of that risk.
// See README.md's "Order and contact emails" section for setup.
//
// Deliberately soft-fails: a missing key or a failed send is logged, not
// thrown, so a broken email never breaks a checkout or a webhook. Email
// is a nice-to-have on top of the order record in the database, not a
// dependency the site requires to function.
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("Email not sent (EMAIL_API_KEY/EMAIL_FROM not set):", params.subject, "->", params.to);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });
    if (!res.ok) {
      console.error("Email send failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email send failed:", err);
    return false;
  }
}

/** Escapes text before it goes into an email's HTML. Contact-form and
 * newsletter fields come from the public, so they must never be inserted
 * raw (a message containing markup would otherwise render in the owner's
 * inbox). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shared chrome around every email so they look like they're from the
// same shop rather than bare HTML. Plain inline styles only — no build
// step, no template library, and inline is what actually survives most
// inboxes' HTML sanitizing anyway.
function emailShell(title: string, bodyHtml: string): string {
  return `
<div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #222;">
  <h1 style="font-size: 20px; margin: 0 0 20px;">${title}</h1>
  ${bodyHtml}
  <p style="margin-top: 32px; font-size: 12px; color: #888;">DASDUM — ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}</p>
</div>`.trim();
}

type OrderEmailItem = { productNameSnapshot: string; unitPrice: number; quantity: number };
type OrderEmailOrder = {
  orderNumber: string;
  grandTotal: number;
  subtotal: number;
  shippingTotal: number;
  shippingAddress: string | null; // JSON, see /api/checkout's shape
  deliveryMethod: string | null;
};

function itemsTableHtml(items: OrderEmailItem[]): string {
  const rows = items
    .map(
      (i) => `
    <tr>
      <td style="padding: 6px 0;">${escapeHtml(i.productNameSnapshot)} × ${i.quantity}</td>
      <td style="padding: 6px 0; text-align: right;">${formatMoney(i.unitPrice * i.quantity)}</td>
    </tr>`
    )
    .join("");
  return `<table style="width: 100%; border-collapse: collapse; font-size: 14px;">${rows}</table>`;
}

/** Sent to the customer once Stripe confirms payment. Stripe also sends
 * its own payment receipt separately — this one is about the order, not
 * proof of payment. */
export function orderConfirmationEmail(order: OrderEmailOrder, items: OrderEmailItem[]): string {
  let addressLines = "";
  if (order.shippingAddress) {
    try {
      const a = JSON.parse(order.shippingAddress);
      const e = (v: unknown) => escapeHtml(String(v ?? ""));
      addressLines = `${e(a.name)}<br>${e(a.line1)}${a.line2 ? `<br>${e(a.line2)}` : ""}<br>${e(a.city)}, ${e(a.postalCode)}<br>${e(a.country)}`;
    } catch {
      // malformed/old row — just omit the address block rather than show garbage
    }
  }
  return emailShell(
    "Thanks for your order!",
    `
    <p style="font-size: 14px;">Your order <strong>${order.orderNumber}</strong> is confirmed and being prepared.</p>
    ${itemsTableHtml(items)}
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 8px; border-top: 1px solid #eee; padding-top: 8px;">
      <tr><td style="padding: 6px 0;">Subtotal</td><td style="padding: 6px 0; text-align: right;">${formatMoney(order.subtotal)}</td></tr>
      <tr><td style="padding: 6px 0;">Shipping (${order.deliveryMethod ?? "standard"})</td><td style="padding: 6px 0; text-align: right;">${order.shippingTotal === 0 ? "Free" : formatMoney(order.shippingTotal)}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: bold;">Total</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${formatMoney(order.grandTotal)}</td></tr>
    </table>
    ${addressLines ? `<p style="margin-top: 20px; font-size: 14px;"><strong>Delivery address</strong><br>${addressLines}</p>` : ""}
  `
  );
}

/** Sent to the shop's own notification address — a new sale needs packing. */
export function adminOrderNotificationEmail(order: OrderEmailOrder & { customerEmail: string | null }, items: OrderEmailItem[]): string {
  return emailShell(
    "New order received",
    `
    <p style="font-size: 14px;">Order <strong>${order.orderNumber}</strong> from ${escapeHtml(order.customerEmail ?? "a guest")} — ${formatMoney(order.grandTotal)}.</p>
    ${itemsTableHtml(items)}
  `
  );
}

/** Sent to the shop's own notification address when the contact form is used. */
export function contactNotificationEmail(data: { name: string; email: string; subject: string; message: string }): string {
  return emailShell(
    "New contact form message",
    `
    <p style="font-size: 14px;"><strong>${escapeHtml(data.name)}</strong> (${escapeHtml(data.email)}) — ${escapeHtml(data.subject)}</p>
    <p style="font-size: 14px; white-space: pre-wrap;">${escapeHtml(data.message)}</p>
  `
  );
}

/** Sent to the shop's own notification address when someone joins the newsletter. */
export function newsletterSignupEmail(email: string): string {
  return emailShell(
    "New newsletter signup",
    `<p style="font-size: 14px;">${escapeHtml(email)} asked to join the mailing list.</p>`
  );
}
