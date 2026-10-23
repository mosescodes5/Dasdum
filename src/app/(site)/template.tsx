"use client";

import { useEffect } from "react";

// The first load is left alone (no flash while JS loads). After that, each
// page change fades in with a small rise — about a third of a second, done
// in CSS (.page-in) so it costs no JavaScript animation work.
let hasNavigated = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const animate = hasNavigated;
  useEffect(() => {
    hasNavigated = true;
  }, []);

  return <div className={animate ? "page-in" : undefined}>{children}</div>;
}
