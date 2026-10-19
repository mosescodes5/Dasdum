"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

// Set once the first page has mounted. The very first load gets no curtain
// (the hero has its own entrance); every later navigation does.
let hasNavigated = false;

const SWEEP = [0.76, 0, 0.24, 1] as const;

// Re-mounts on every navigation, which is what lets each page "enter":
// a tan then navy curtain sweeps up off the screen and the page rises in.
// Checkout and account pages skip the curtain so paying stays calm.
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const calm = pathname.startsWith("/checkout") || pathname.startsWith("/account");
  const curtain = hasNavigated && !calm;

  useEffect(() => {
    hasNavigated = true;
  }, []);

  return (
    <>
      {curtain && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 origin-top bg-gold"
            initial={{ scaleY: 1 }}
            animate={{ scaleY: 0 }}
            transition={{ duration: 0.7, ease: SWEEP, delay: 0.08 }}
          />
          <motion.div
            className="absolute inset-0 origin-top bg-primary-deep"
            initial={{ scaleY: 1 }}
            animate={{ scaleY: 0 }}
            transition={{ duration: 0.7, ease: SWEEP }}
          />
        </div>
      )}
      <motion.div
        // First load renders visible straight away (no blank flash before JS).
        initial={hasNavigated ? { opacity: 0, y: 28 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: curtain ? 0.35 : 0 }}
      >
        {children}
      </motion.div>
    </>
  );
}
