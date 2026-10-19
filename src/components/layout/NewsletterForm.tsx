"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-3">
      <AnimatePresence mode="wait" initial={false}>
        {status === "done" ? (
          <motion.p
            key="done"
            role="status"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 16 }}
            className="flex items-center gap-2 py-3 text-sm font-medium text-primary-deep"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-gold text-primary-deep">
              <Check size={14} strokeWidth={3} />
            </span>
            You&rsquo;re in. Watch your inbox for new arrivals.
          </motion.p>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} noValidate exit={{ opacity: 0, y: -8 }} className="flex">
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="Enter your email"
              className="min-w-0 flex-1 rounded-l-[3px] border border-r-0 border-hairline bg-surface px-4 py-3 text-sm"
            />
            <button type="submit" disabled={status === "sending"} className="btn !rounded-l-none disabled:opacity-60">
              {status === "sending" ? "Sending…" : "Subscribe"}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
      <p role="status" className="mt-1.5 min-h-[1.3rem] text-[0.82rem] font-medium text-red-700">
        {status === "error" ? "Enter a valid email address, like name@example.com." : ""}
      </p>
    </div>
  );
}
