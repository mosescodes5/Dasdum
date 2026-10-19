import { NextResponse, type NextRequest } from "next/server";

// This is a UX convenience (fast redirect before a page even renders), not
// the security boundary — it only checks that a session cookie is present,
// not that it's valid. Every gated layout, route handler, and server action
// independently calls getSession()/requireAdmin() to verify the signature
// and expiry server-side. See lib/auth/session.ts and lib/auth/rbac.ts.
//
// Named `proxy` per the Next.js 16 file convention (renamed from
// `middleware` — see https://nextjs.org/docs/messages/middleware-to-proxy).
// It now runs on the Node.js runtime by default rather than Edge, which
// suits this deployment target (a standard Node process on cPanel) fine.

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/account")) {
    const hasSession = request.cookies.has("dasdum_session");
    if (!hasSession) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasAdminSession = request.cookies.has("dasdum_admin_session");
    if (!hasAdminSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
