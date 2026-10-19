"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, Heart, ShoppingCart, User, X, ArrowRight } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { useWishlist } from "@/components/cart/WishlistContext";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { formatMoney } from "@/lib/currency";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/shop/categories", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Journal" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/shop") return pathname === "/shop" || (pathname.startsWith("/shop/") && !pathname.startsWith("/shop/categories"));
  return pathname === href || pathname.startsWith(href + "/");
}

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { activeCount, subtotal } = useCart();
  const { items: wishlistItems } = useWishlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  // Close overlays whenever the page changes.
  useEffect(() => {
    setSearchOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

  return (
    <header
      className={`sticky top-0 z-40 bg-bg border-b border-hairline transition-shadow duration-300 ${
        scrolled ? "shadow-[0_6px_24px_-12px_rgba(24,56,64,0.35)]" : ""
      }`}
    >
      <nav className="container-editorial flex items-center justify-between gap-6 h-[74px]" aria-label="Main">
        <Link href="/" className="shrink-0" aria-label="DASDUM home">
          <Image src="/logo-wordmark.png" alt="DASDUM" width={150} height={44} priority className="h-[46px] w-auto" />
        </Link>

        <ul className="hidden md:flex items-center gap-9">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href} className="relative">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className="relative block py-1.5 text-[0.74rem] font-medium uppercase tracking-[0.1em] hover:text-gold-text transition-colors"
                >
                  {link.label}
                </Link>
                {active && <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gold" />}
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-4 text-text">
          <button
            type="button"
            aria-label="Search the shop"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((o) => !o)}
            className="hover:text-gold-text transition-colors"
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
          <Link href="/account/wishlist" aria-label="Wishlist" className="relative hidden sm:inline-flex hover:text-gold-text transition-colors">
            <Heart size={20} />
            {wishlistItems.length > 0 && (
              <span className="absolute -top-2 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-primary-deep">
                {wishlistItems.length}
              </span>
            )}
          </Link>
          <Link href="/account" aria-label="Account" className="hidden sm:inline-flex hover:text-gold-text transition-colors">
            <User size={20} />
          </Link>
          <button
            type="button"
            aria-label={`Cart, ${activeCount} item${activeCount === 1 ? "" : "s"}`}
            onClick={() => setCartOpen(true)}
            className="relative inline-flex items-center gap-2 hover:text-gold-text transition-colors"
          >
            {/* Re-keyed on every count change so the CSS "pop" replays when something is added */}
            <span key={activeCount} className={`inline-flex ${activeCount > 0 ? "animate-pop" : ""}`}>
              <ShoppingCart size={20} />
            </span>
            {activeCount > 0 && (
              <span
                key={`b${activeCount}`}
                className="absolute -top-2 left-3 grid h-[1.05rem] min-w-[1.05rem] animate-pop place-items-center rounded-full bg-primary-deep px-1 text-[10px] font-bold text-white"
              >
                {activeCount}
              </span>
            )}
            <span className="hidden sm:inline text-sm font-bold">{formatMoney(subtotal)}</span>
          </button>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="md:hidden hover:text-gold-text transition-colors"
          >
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {searchOpen && (
        <div className="animate-fade-up border-t border-hairline bg-soft">
          <form onSubmit={submitSearch} className="container-editorial flex items-center gap-3 py-4">
            <label htmlFor="site-search" className="sr-only">Search products</label>
            <input
              id="site-search"
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the collection…"
              className="min-w-0 flex-1 border border-hairline bg-surface px-4 py-3 text-sm"
            />
            <button type="submit" className="btn">
              Search <ArrowRight size={16} />
            </button>
          </form>
        </div>
      )}

      {menuOpen && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="animate-fade-up fixed inset-0 z-50 bg-primary-deep text-white md:hidden">
          <div className="container-editorial flex h-[74px] items-center justify-between">
            <span className="font-script text-3xl text-gold">DASDUM</span>
            <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <X size={26} />
            </button>
          </div>
          <ul className="container-editorial mt-6 flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.href} className="border-b border-white/10">
                <Link href={link.href} onClick={() => setMenuOpen(false)} className="block py-4 text-3xl font-black uppercase tracking-tight">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
