"use client";

import { MotionConfig } from "motion/react";

/** Wraps the storefront so every animation honours the visitor's
 * "reduce motion" device setting (movement is dropped, simple fades stay). */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
