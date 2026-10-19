"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactFormValues } from "@/lib/validation/contact";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema) });

  async function onSubmit(values: ContactFormValues) {
    setSubmitting(true);
    setServerError(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);
    if (!res.ok) {
      setServerError("Something went wrong sending your message — please try again.");
      return;
    }
    setSubmitted(true);
    reset();
  }

  if (submitted) {
    return (
      <div className="border border-hairline bg-surface p-8 text-center">
        <p className="font-display text-xl text-primary-deep">Message sent</p>
        <p className="mt-2 text-sm text-muted">
          Thanks for reaching out — we&rsquo;ll get back to you within 1–2 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Name</label>
          <input {...register("name")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm">Email address</label>
          <input {...register("email")} type="email" className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
      </div>
      <div>
        <label className="text-sm">Topic</label>
        <select {...register("subject")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold">
          <option value="">Select a topic</option>
          <option value="order">An order</option>
          <option value="product">A product question</option>
          <option value="wholesale">Wholesale / stockists</option>
          <option value="press">Press</option>
          <option value="other">Something else</option>
        </select>
        {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>}
      </div>
      <div>
        <label className="text-sm">Message</label>
        <textarea {...register("message")} rows={5} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
        {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-primary-deep text-bg px-7 py-3 text-sm hover:bg-primary transition-colors disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
