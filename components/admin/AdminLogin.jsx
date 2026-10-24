"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from "lucide-react";
import AuthFrame from "@/components/AuthFrame";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to sign in.");
        return;
      }

      window.location.assign("/admin");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      eyebrow="Authorized Access"
      title="Admin login"
      description="Manage products, categories, orders, customers, and storefront content securely."
      footer={(
        <>
          Shopping at Al Qirat?{" "}
          <a href="/login" className="font-bold text-gold-dark transition hover:text-ink">Customer login</a>
          <span className="mx-2 text-stone-300">•</span>
          <a href="/" className="font-bold text-gold-dark transition hover:text-ink">Storefront</a>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="sr-only">Admin email address</span>
          <span className="flex h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 shadow-sm transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/10">
            <Mail size={19} className="text-gold-dark" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
              placeholder="Admin email address"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </span>
        </label>

        <label className="block">
          <span className="sr-only">Admin password</span>
          <span className="flex h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 shadow-sm transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/10">
            <LockKeyhole size={19} className="text-gold-dark" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              placeholder="Admin password"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-stone-400 transition hover:text-gold-dark"
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="group flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-gold-dark via-gold to-gold-dark px-6 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_14px_32px_-16px_rgba(168,122,50,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-14px_rgba(168,122,50,0.8)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {!submitting && <LogIn size={18} />}
          {submitting ? "Signing in..." : "Log In"}
        </button>
      </form>
    </AuthFrame>
  );
}
