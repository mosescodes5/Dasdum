"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/** Wraps the storefront so every animation honours the visitor's
 * "reduce motion" device setting. LazyMotion loads the animation engine only
 * when something that needs it (cart drawer, filter drawer, newsletter
 * message) first appears, instead of shipping it with every page. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
