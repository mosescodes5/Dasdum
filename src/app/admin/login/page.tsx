"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminLoginSchema, type AdminLoginValues } from "@/lib/validation/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginValues>({ resolver: zodResolver(adminLoginSchema) });

  async function onSubmit(values: AdminLoginValues) {
    setSubmitting(true);
    setServerError(null);
    const res = await fetch("/api/admin/auth/login", {
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
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0F2229] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-auto brightness-0 invert" />
          <span className="font-display text-xl text-white">DASDUM Admin</span>
        </div>

        <div className="bg-[#17313A] border border-white/10 p-8">
          <h1 className="text-lg text-white font-medium">Sign in to the dashboard</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="text-xs text-white/60">Email</label>
              <input
                {...register("email")}
                type="email"
                className="mt-1.5 w-full bg-[#0F2229] border border-white/10 px-3 py-2.5 text-sm text-white focus-visible:outline-[#DB9E41]"
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-xs text-white/60">Password</label>
              <input
                {...register("password")}
                type="password"
                className="mt-1.5 w-full bg-[#0F2229] border border-white/10 px-3 py-2.5 text-sm text-white focus-visible:outline-[#DB9E41]"
              />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {serverError && <p className="text-sm text-red-400">{serverError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#DB9E41] text-[#0F2229] font-medium py-2.5 text-sm hover:bg-[#E9BC73] transition-colors disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Admin access only. All sign-ins are logged.
        </p>
      </div>
    </div>
  );
}
