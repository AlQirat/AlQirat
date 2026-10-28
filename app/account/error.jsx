"use client";

import { useEffect } from "react";

export default function AccountError({ reset }) {
  useEffect(() => {
    console.error("[account] account page failed to render");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-16">
      <section className="w-full max-w-lg rounded-3xl border border-gold/25 bg-white p-8 text-center shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-dark">My account</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-ink">We could not load your account</h1>
        <p className="mt-4 leading-7 text-stone-600">Your session may have expired or the account service is temporarily unavailable. Try again, or sign in again to continue.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => reset()} className="btn-forest">Try again</button>
          <a href="/login?next=/account" className="rounded-full border border-gold/50 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-gold/10">Sign in again</a>
        </div>
      </section>
    </main>
  );
}
