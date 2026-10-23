"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginValues } from "@/lib/validation/auth";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    setServerError(null);
    const res = await fetch("/api/auth/login", {
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
    <div className="anim-rise container-editorial max-w-sm py-20">
      <h1 className="font-display text-3xl text-primary-deep">Sign in</h1>
      <p className="mt-2 text-sm text-muted">Welcome back to DASDUM.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
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

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-deep text-bg py-3 text-sm hover:bg-primary transition-colors disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        New to DASDUM?{" "}
        <Link href="/register" className="text-primary-deep link-underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
