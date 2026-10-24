"use client";

import { useState } from "react";
import { ArrowRight, Check, Mail } from "lucide-react";
import Reveal from "../Reveal";
import Ornament from "./Ornament";

export default function Subscribe() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const honeypot = new FormData(event.currentTarget).get("website");
    setSubmitting(true);
    setStatus({ type: "", message: "" });
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website: honeypot }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We couldn't subscribe you right now. Please try again.");
      setEmail("");
      setStatus({
        type: "success",
        message: result.alreadySubscribed ? "You're already on our list. Thank you!" : "Thank you for subscribing. Welcome to Al Qirat.",
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-sage-light to-cream py-16 lg:py-20">
      <div className="container-site">
        <Reveal className="mx-auto max-w-[620px] text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.5em] text-gold-dark">Stay in the Scent</p>
          <h2 className="mt-4 font-serif text-4xl font-semibold text-ink lg:text-5xl">Subscribe to Our Newsletter</h2>
          <Ornament className="mt-3" />
          <p className="mx-auto mt-4 max-w-[460px] text-sm leading-relaxed text-ink/65">
            Be the first to hear about new fragrances, exclusive offers and gift ideas from Al Qirat Perfumes.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mx-auto mt-8 flex max-w-[520px] flex-col gap-3 sm:flex-row">
            <label htmlFor="subscribe-email" className="sr-only">Email address</label>
            <div className="relative flex-1">
              <Mail size={17} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gold-dark" />
              <input
                id="subscribe-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-full border border-ink/15 bg-white pl-12 pr-5 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-gold focus:ring-4 focus:ring-gold/15"
              />
            </div>
            {/* honeypot: hidden from people, filled in by bots */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <button type="submit" disabled={submitting} className="btn-forest !h-12 !px-7 disabled:opacity-60">
              {submitting ? "Subscribing..." : <>Subscribe <ArrowRight size={16} /></>}
            </button>
          </form>

          <p role="status" aria-live="polite" className={`mt-4 min-h-[20px] text-sm ${status.type === "error" ? "text-red-600" : "text-forest"}`}>
            {status.type === "success" && <Check size={15} className="mr-1.5 inline -translate-y-px" />}
            {status.message}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
