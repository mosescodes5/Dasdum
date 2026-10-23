"use client";

import { useEffect, useRef } from "react";

// Scroll-in animation without a JavaScript animation library: one shared
// IntersectionObserver adds an "in" class the first time an element scrolls
// into view, and the CSS in globals.css does the actual fade/rise (opacity
// and transform only, so it stays smooth on ordinary phones). Each element
// animates once. Reduced-motion and no-JS visitors just see the content.

let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
  }
  return observer;
}

function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }
    const io = getObserver();
    io.observe(el);
    return () => io.unobserve(el);
  }, []);
  return ref;
}

export function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRevealOnScroll<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}s` } : undefined}>
      {children}
    </div>
  );
}

/** A grid whose direct <StaggerItem> children fade up one after another. */
export function Stagger({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRevealOnScroll<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal-stagger ${className}`}>
      {children}
    </div>
  );
}

export function StaggerItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`stagger-item ${className}`}>{children}</div>;
}
