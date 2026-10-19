"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Shirt, ShoppingBag, Home, Droplets, Sparkles, Baby, Gem, Footprints, LayoutGrid, type LucideIcon,
} from "lucide-react";

// Picks a sensible icon from the category's own name when it has no photo.
const ICONS: [RegExp, LucideIcon][] = [
  [/bag|travel|luggage|tote|backpack/i, ShoppingBag],
  [/cloth|apparel|wear|shirt|dress|fashion/i, Shirt],
  [/shoe|sneaker|boot|sandal|foot/i, Footprints],
  [/home|living|decor|kitchen|furnit/i, Home],
  [/oil|cream|skin|beauty|care|lotion/i, Droplets],
  [/hair|wig|braid/i, Sparkles],
  [/baby|kid|child/i, Baby],
  [/jewel|accessor|gem/i, Gem],
];
function iconFor(name: string): LucideIcon {
  return ICONS.find(([re]) => re.test(name))?.[1] ?? LayoutGrid;
}

/** Compact category tile from the design: icon + name, or the category's
 * photo (Site Images) with the name over it. */
export function CategoryTile({ name, href, imageUrl }: { name: string; href: string; imageUrl?: string | null }) {
  const Icon = iconFor(name);
  return (
    <motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="h-full">
      <Link
        href={href}
        className="group relative flex h-full min-h-[10.5rem] flex-col items-center justify-center gap-3 overflow-hidden rounded-lg bg-soft p-4 text-center text-[0.74rem] font-medium transition-shadow hover:shadow-[0_12px_28px_rgba(24,56,64,0.18)]"
      >
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-110"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-primary-deep/85 via-primary-deep/10 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-3 text-sm font-bold uppercase tracking-wide text-white">{name}</span>
          </>
        ) : (
          <>
            <Icon
              strokeWidth={1.2}
              className="h-10 w-10 text-primary-deep transition-transform duration-500 ease-editorial group-hover:rotate-[-8deg] group-hover:scale-125"
            />
            <span>{name}</span>
          </>
        )}
      </Link>
    </motion.div>
  );
}
