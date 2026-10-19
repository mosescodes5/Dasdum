"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/wishlist", label: "Wishlist" },
];

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2.5 text-sm ${
              active ? "bg-primary-deep text-bg" : "text-muted hover:text-text hover:bg-surface"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <button
        onClick={signOut}
        className="mt-2 px-3 py-2.5 text-sm text-left text-muted hover:text-text hover:bg-surface"
      >
        Sign out
      </button>
    </nav>
  );
}
