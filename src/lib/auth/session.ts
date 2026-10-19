import { cookies } from "next/headers";

export type SessionRole = "customer" | "admin";

export type SessionPayload = {
  sub: string; // customer.id or admin_user.id
  role: SessionRole;
  adminRole?: "super_admin" | "manager" | "editor" | "support";
  exp: number; // epoch seconds
};

const COOKIE_NAMES: Record<SessionRole, string> = {
  customer: "dasdum_session",
  admin: "dasdum_admin_session",
};

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

function base64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function sign(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return base64url(sig);
}

async function encodeSession(payload: SessionPayload): Promise<string> {
  const secret = getAuthSecret();
  const body = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(body, secret);
  return `${body}.${signature}`;
}

async function decodeSession(token: string): Promise<SessionPayload | null> {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const secret = getAuthSecret();
    const expected = await sign(body, secret);
    if (expected !== signature) return null;
    const payload: SessionPayload = JSON.parse(new TextDecoder().decode(base64urlToBytes(body)));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, role: SessionRole, adminRole?: SessionPayload["adminRole"]) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await encodeSession({ sub: userId, role, adminRole, exp });
  const store = await cookies();
  store.set(COOKIE_NAMES[role], token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Reads and verifies the session cookie server-side. Call this in every
 * gated page, route handler, and server action — never trust middleware alone. */
export async function getSession(role: SessionRole): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAMES[role])?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function clearSession(role: SessionRole) {
  const store = await cookies();
  store.delete(COOKIE_NAMES[role]);
}
