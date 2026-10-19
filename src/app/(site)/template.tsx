"use client";

import { useEffect } from "react";
import { motion } from "motion/react";

// The first load is left alone (no blank flash while JS loads). After that,
// each page change fades in with a small rise — about a third of a second.
// No full-screen curtain: that repainted the whole screen on every click.
let hasNavigated = false;

export default function Template({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hasNavigated = true;
  }, []);

  return (
    <motion.div
      initial={hasNavigated ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
