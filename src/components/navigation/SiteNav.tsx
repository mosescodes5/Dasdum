"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-gold"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                )}
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
            {/* Re-keyed on every count change, so the cart wiggles when something is added */}
            <motion.span
              key={activeCount}
              initial={activeCount > 0 ? { rotate: -18, scale: 1.25 } : false}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 12 }}
              className="inline-flex"
            >
              <ShoppingCart size={20} />
            </motion.span>
            {activeCount > 0 && (
              <motion.span
                key={`b${activeCount}`}
                initial={{ scale: 1.9 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 600, damping: 14 }}
                className="absolute -top-2 left-3 grid h-[1.05rem] min-w-[1.05rem] place-items-center rounded-full bg-primary-deep px-1 text-[10px] font-bold text-white"
              >
                {activeCount}
              </motion.span>
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

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-hairline bg-soft"
          >
            <form onSubmit={submitSearch} className="container-editorial flex items-center gap-3 py-4">
              <label htmlFor="site-search" className="sr-only">Search products</label>
              <input
                id="site-search"
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the collection…"
                className="flex-1 min-w-0 border border-hairline bg-surface px-4 py-3 text-sm"
              />
              <button type="submit" className="btn">
                Search <ArrowRight size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: "circle(0% at 92% 4%)" }}
            animate={{ clipPath: "circle(150% at 92% 4%)" }}
            exit={{ clipPath: "circle(0% at 92% 4%)" }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-50 bg-primary-deep text-white md:hidden"
          >
            <div className="container-editorial flex items-center justify-between h-[74px]">
              <span className="font-script text-3xl text-gold">DASDUM</span>
              <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                <X size={26} />
              </button>
            </div>
            <motion.ul
              initial="closed"
              animate="open"
              variants={{ open: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } }}
              className="container-editorial mt-6 flex flex-col"
            >
              {NAV_LINKS.map((link) => (
                <motion.li
                  key={link.href}
                  variants={{ closed: { opacity: 0, x: -30 }, open: { opacity: 1, x: 0 } }}
                  className="overflow-hidden border-b border-white/10"
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-4 text-3xl font-black uppercase tracking-tight"
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
