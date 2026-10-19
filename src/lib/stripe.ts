import { createHmac, timingSafeEqual } from "node:crypto";

// Minimal Stripe REST client (no SDK dependency). Amounts are minor units.

function flatten(obj: unknown, prefix: string, out: URLSearchParams) {
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}[${k}]` : k, out);
  } else if (obj !== undefined && obj !== null) {
    out.append(prefix, String(obj));
  }
}

export async function stripeRequest<T>(
  path: string,
  body: Record<string, unknown>,
  options: { idempotencyKey?: string } = {}
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  const params = new URLSearchParams();
  flatten(body, "", params);
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Same key = Stripe returns the first result instead of creating a
      // second session if a request is retried.
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    body: params,
    // Don't leave a customer staring at "Processing…" if Stripe hangs.
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(json?.error?.message ?? `Stripe error ${res.status}`);
  return json as T;
}

/** Verifies the Stripe-Signature header against the raw request body. */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    })
  );
  const t = parts["t"];
  // header may contain several v1 signatures; collect them all
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || sigs.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false; // 5 min tolerance
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  return sigs.some((s) => {
    const b = Buffer.from(s);
    return b.length === expectedBuf.length && timingSafeEqual(b, expectedBuf);
  });
}
