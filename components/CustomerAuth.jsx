"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, LogIn, Mail, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import AuthFrame from "./AuthFrame";

function validatePassword(password) {
  if (password.length < 8) return "Password must contain at least 8 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include an uppercase letter, a lowercase letter, and a number.";
  }
  return "";
}

export default function CustomerAuth({ nextPath, initialError, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: initialError ? "error" : "", message: initialError || "" });
  const [submitting, setSubmitting] = useState(false);
  const isRegistering = mode === "register";
  const isResettingPassword = mode === "reset";

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    const fullName = String(form.get("fullName") || "").trim();
    if (isRegistering) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setStatus({ type: "error", message: passwordError });
        setSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        setStatus({ type: "error", message: "Passwords do not match." });
        setSubmitting(false);
        return;
      }
    }
    if (!isSupabaseConfigured()) {
      setStatus({ type: "error", message: "Customer accounts are not available yet. Please check back soon." });
      setSubmitting(false);
      return;
    }
    const supabase = createClient();

    const result = isRegistering
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`,
          },
        })
      : isResettingPassword
        ? await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
          })
        : await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);
    if (result.error) {
      setStatus({ type: "error", message: result.error.message });
      return;
    }

    if (isResettingPassword) {
      setStatus({ type: "success", message: "If an account exists for this email, we have sent a password-reset link." });
      return;
    }

    if (isRegistering && !result.data.session) {
      setStatus({ type: "success", message: "Account created. Check your email to confirm your account, then sign in." });
      return;
    }

    window.location.assign(nextPath);
  }

  return (
    <AuthFrame
      eyebrow={isRegistering ? "Join Al Qirat Perfumes" : isResettingPassword ? "Password Recovery" : "Welcome Back"}
      title={isRegistering ? "Create your account" : isResettingPassword ? "Reset your password" : "Log in to Al Qirat"}
      description={isRegistering ? "Create an account to save your delivery details and enjoy a faster checkout." : isResettingPassword ? "Enter your email and we will send a secure password-reset link." : "Track orders, save your delivery address, and checkout faster."}
      footer={(
        <>
          {isResettingPassword ? "Remember your password? " : isRegistering ? "Already have an account? " : "New to Al Qirat? "}
          {isResettingPassword ? (
            <button type="button" onClick={() => { setMode("login"); setStatus({ type: "", message: "" }); }} className="font-bold text-gold-dark transition hover:text-ink">
              Sign in
            </button>
          ) : (
            <a href={`${isRegistering ? "/login" : "/register"}?next=${encodeURIComponent(nextPath)}`} className="font-bold text-gold-dark transition hover:text-ink">
              {isRegistering ? "Sign in" : "Create an account"}
            </a>
          )}
        </>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <label className="block">
                <span className="sr-only">Full name</span>
                <span className="flex h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 shadow-sm transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/10">
                  <UserRound size={18} className="text-gold-dark" />
                  <input name="fullName" required minLength={2} autoComplete="name" className="h-full w-full bg-transparent text-sm outline-none placeholder:text-stone-400" placeholder="Full name" />
                </span>
              </label>
            )}
            <label className="block">
              <span className="sr-only">Email address</span>
              <span className="flex h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 shadow-sm transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/10">
                <Mail size={18} className="text-gold-dark" />
                <input name="email" type="email" required autoComplete="email" className="h-full w-full bg-transparent text-sm outline-none placeholder:text-stone-400" placeholder="Email address" />
              </span>
            </label>
            {!isResettingPassword && <label className="block">
              <span className="sr-only">Password</span>
              <span className="flex h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 shadow-sm transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/10">
                <LockKeyhole size={18} className="text-gold-dark" />
                <input name="password" type={showPassword ? "text" : "password"} minLength={8} required autoComplete={isRegistering ? "new-password" : "current-password"} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400" placeholder={isRegistering ? "Password (8+ characters)" : "Password"} />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="text-stone-400 transition hover:text-gold-dark">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>}
            {!isRegistering && !isResettingPassword && <div className="flex justify-end"><button type="button" onClick={() => { setMode("reset"); setStatus({ type: "", message: "" }); }} className="text-sm font-semibold text-gold-dark transition hover:text-ink">Forgot password?</button></div>}
            {isRegistering && (
              <label className="block">
                <span className="sr-only">Confirm password</span>
                <span className="flex h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 shadow-sm transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/10">
                  <LockKeyhole size={18} className="text-gold-dark" />
                  <input name="confirmPassword" type={showPassword ? "text" : "password"} minLength={8} required autoComplete="new-password" className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400" placeholder="Confirm password" />
                </span>
              </label>
            )}

            {status.message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${status.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{status.message}</p>}
            <button disabled={submitting} className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-forest px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-[0_16px_30px_-18px_rgba(20,40,26,0.9)] transition hover:-translate-y-0.5 hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60">
              {!submitting && <LogIn size={18} />}
              {submitting ? "Please wait..." : isRegistering ? "Create Account" : isResettingPassword ? "Send Reset Link" : "Log In"}
            </button>
      </form>
    </AuthFrame>
  );
}
