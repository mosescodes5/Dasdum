"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterValues } from "@/lib/validation/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterValues) {
    setSubmitting(true);
    setServerError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as any;
      setServerError(data?.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <div className="container-editorial max-w-sm py-20">
      <h1 className="font-display text-3xl text-primary-deep">Create an account</h1>
      <p className="mt-2 text-sm text-muted">Track orders, save addresses, and build a wishlist.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">First name</label>
            <input {...register("firstName")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
            {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="text-sm">Last name</label>
            <input {...register("lastName")} className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
            {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
          </div>
        </div>
        <div>
          <label className="text-sm">Email address</label>
          <input {...register("email")} type="email" className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-sm">Password</label>
          <input {...register("password")} type="password" className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <div>
          <label className="text-sm">Confirm password</label>
          <input {...register("confirmPassword")} type="password" className="mt-1.5 w-full border border-hairline px-3 py-2.5 text-sm focus-visible:outline-gold" />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-deep text-bg py-3 text-sm hover:bg-primary transition-colors disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-primary-deep link-underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
