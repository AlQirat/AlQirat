"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, LogIn, Mail, RefreshCw, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import AuthFrame from "./AuthFrame";

const primaryButtonClass =
  "flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-forest px-4 py-3 text-center text-[13px] font-bold uppercase leading-tight tracking-[0.08em] text-white shadow-[0_16px_30px_-18px_rgba(20,40,26,0.9)] transition hover:-translate-y-0.5 hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:text-sm sm:tracking-[0.12em]";

export default function CustomerAuth({ nextPath, initialError, initialMode = "login" }) {
  const [mode] = useState(initialMode);
  const [status, setStatus] = useState({ type: initialError ? "error" : "", message: initialError || "" });
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpType, setOtpType] = useState("magiclink");
  const [otpLength, setOtpLength] = useState(6);
  const [passwordResetMode, setPasswordResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const isRegistering = mode === "register";

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function requestOtp(email, fullName) {
    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, fullName }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "We could not send your verification code.");
    setOtpEmail(email);
    setOtpType(result.verificationType === "signup" ? "signup" : "magiclink");
    setOtpLength(Number.isInteger(result.otpLength) && result.otpLength >= 4 && result.otpLength <= 10 ? result.otpLength : 6);
    setOtpSent(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const fullName = String(form.get("fullName") || "").trim();

    if (!isSupabaseConfigured()) {
      setStatus({ type: "error", message: "Customer accounts are not available yet. Please check back soon." });
      setSubmitting(false);
      return;
    }

    try {
      await requestOtp(email, fullName);
      setStatus({ type: "success", message: `We sent a verification code to ${email}.` });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "We could not send your verification code." });
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });
    const form = new FormData(event.currentTarget);
    const token = String(form.get("otp") || "").trim();
    if (!new RegExp(`^\\d{${otpLength}}$`).test(token)) {
      setStatus({ type: "error", message: `Enter the ${otpLength}-digit code from your email.` });
      setSubmitting(false);
      return;
    }

    try {
      const { error } = await createClient().auth.verifyOtp({ email: otpEmail, token, type: otpType });
      if (error) {
        setStatus({ type: "error", message: "That code is invalid or expired. Request a new code and try again." });
        return;
      }
      window.location.assign(nextPath);
    } catch {
      setStatus({ type: "error", message: "We could not verify the code. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function resendOtp() {
    setSubmitting(true);
    setStatus({ type: "", message: "" });
    try {
      await requestOtp(otpEmail, "");
      setStatus({ type: "success", message: `A new code was sent to ${otpEmail}.` });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "We could not send your verification code." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordReset(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });
    const form = new FormData(event.currentTarget);
    const email = String(form.get("resetEmail") || "").trim().toLowerCase();
    setResetEmail(email);

    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not send a password reset link.");
      setStatus({ type: "success", message: result.message || "If an account exists for that email, a password reset link is on its way." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "We could not send a password reset link." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame
      eyebrow={passwordResetMode ? "Password Recovery" : isRegistering ? "Join Al Qirat Perfumes" : "Welcome Back"}
      title={passwordResetMode ? "Reset your password" : isRegistering ? "Create your account" : "Log in to Al Qirat"}
      description={passwordResetMode ? "Enter your email and we will send a secure link to choose a new password." : isRegistering ? "Create an account to save your delivery details and enjoy a faster checkout." : "Enter your email and we will send a secure one-time verification code."}
      footer={(
        passwordResetMode ? (
          <button type="button" onClick={() => { setPasswordResetMode(false); setStatus({ type: "", message: "" }); }} className="font-bold text-gold-dark transition hover:text-ink">Return to sign in</button>
        ) : <>
          {isRegistering ? "Already have an account? " : "New to Al Qirat? "}
          <a href={`${isRegistering ? "/login" : "/register"}?next=${encodeURIComponent(nextPath)}`} className="font-bold text-gold-dark transition hover:text-ink">
            {isRegistering ? "Sign in" : "Create an account"}
          </a>
        </>
      )}
    >
      {passwordResetMode ? (
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <label className="block">
            <span className="sr-only">Email address</span>
            <span className="flex h-14 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 shadow-sm transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/10">
              <Mail size={18} className="text-gold-dark" />
              <input name="resetEmail" type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required autoComplete="email" className="h-full w-full bg-transparent text-sm outline-none placeholder:text-stone-400" placeholder="Email address" />
            </span>
          </label>
          {status.message && <p role={status.type === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${status.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{status.message}</p>}
          <button disabled={submitting} className={primaryButtonClass}>
            {!submitting && <Mail size={18} className="shrink-0" aria-hidden="true" />}
            <span className="text-center">{submitting ? "Sending link..." : "Send reset link"}</span>
          </button>
        </form>
      ) : otpSent ? (
        <form onSubmit={verifyOtp} className="space-y-4">
          <div className="rounded-2xl bg-gold/10 px-4 py-3 text-sm text-stone-600">Enter the {otpLength}-digit code we sent to <strong className="text-ink">{otpEmail}</strong>.</div>
          <label className="block">
            <span className="sr-only">Verification code</span>
            <input name="otp" inputMode="numeric" pattern={`[0-9]{${otpLength}}`} minLength={otpLength} maxLength={otpLength} autoComplete="one-time-code" required className="h-14 w-full rounded-2xl border border-stone-200 bg-white px-4 text-center text-2xl font-bold tracking-[0.45em] outline-none shadow-sm transition focus:border-gold focus:ring-4 focus:ring-gold/10" placeholder={"0".repeat(otpLength)} />
          </label>
          {status.message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${status.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{status.message}</p>}
          <button disabled={submitting} className={primaryButtonClass}>
            {!submitting && <LogIn size={18} className="shrink-0" aria-hidden="true" />}
            <span className="text-center">{submitting ? "Verifying..." : "Verify & Continue"}</span>
          </button>
          <div className="flex items-center justify-between gap-4 text-sm">
            <button type="button" onClick={() => { setOtpSent(false); setStatus({ type: "", message: "" }); }} className="inline-flex items-center gap-1.5 font-semibold text-stone-500 transition hover:text-ink"><ArrowLeft size={15} /> Change email</button>
            <button type="button" disabled={submitting} onClick={resendOtp} className="inline-flex items-center gap-1.5 font-semibold text-gold-dark transition hover:text-ink"><RefreshCw size={15} /> Send again</button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} data-auth-ready={hydrated ? "true" : "false"} className="space-y-4">
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
          {status.message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${status.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{status.message}</p>}
          <button disabled={submitting} className={primaryButtonClass}>
            {!submitting && <Mail size={18} className="shrink-0" aria-hidden="true" />}
            <span className="text-center">{submitting ? "Sending code..." : "Send verification code"}</span>
          </button>
          {!isRegistering && <button type="button" onClick={() => { setPasswordResetMode(true); setStatus({ type: "", message: "" }); }} className="w-full text-right text-sm font-semibold text-gold-dark transition hover:text-ink">Forgot password?</button>}
        </form>
      )}
    </AuthFrame>
  );
}
