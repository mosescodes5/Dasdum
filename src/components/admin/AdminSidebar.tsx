"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Newspaper,
  Image as ImageIcon,
  Wand2,
  FileText,
  UserCog,
  KeyRound,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/blog", label: "Blog", icon: Newspaper },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
];

// Shown only to the one admin account set in DEVELOPER_EMAIL — editing the
// homepage banner, brand-story photo, and category photos isn't day-to-day
// store management, and every other admin/editor account stays unable to
// even see it, regardless of their role.
const SITE_IMAGES_ITEM = { href: "/admin/settings", label: "Site Images", icon: Wand2 };

// Page copy (About, homepage story, pillars) — shown only to the developer
// account (DEVELOPER_EMAIL), matching the API's requireDeveloper() check.
const SITE_CONTENT_ITEM = { href: "/admin/content", label: "Site Content", icon: FileText };

// Managing who can sign in — Owners only (the API enforces it too).
const TEAM_ITEM = { href: "/admin/team", label: "Team", icon: UserCog };
// Everyone can change their own password.
const ACCOUNT_ITEM = { href: "/admin/account", label: "My account", icon: KeyRound };

export function AdminSidebar({
  showSiteImages = false,
  showSiteContent = false,
  showTeam = false,
}: {
  showSiteImages?: boolean;
  showSiteContent?: boolean;
  showTeam?: boolean;
}) {
  const pathname = usePathname();
  const nav = [
    ...NAV,
    ...(showTeam ? [TEAM_ITEM] : []),
    ...(showSiteContent ? [SITE_CONTENT_ITEM] : []),
    ...(showSiteImages ? [SITE_IMAGES_ITEM] : []),
    ACCOUNT_ITEM,
  ];

  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col bg-[#17313A] text-white/80 min-h-screen">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <Image src="/logo.png" alt="" width={24} height={24} className="h-6 w-auto brightness-0 invert" />
        <span className="font-display text-base text-white">DASDUM Admin</span>
      </div>
      <nav className="flex-1 py-4 space-y-0.5">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active ? "bg-white/10 text-white border-l-2 border-[#DB9E41]" : "hover:bg-white/5 hover:text-white border-l-2 border-transparent"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
