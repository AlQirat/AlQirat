"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

const inputClass = "mt-2 h-12 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10";

export default function ContactForm() {
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) return setStatus({ type: "error", message: result.error || "Unable to send your message." });
    form.reset();
    setStatus({ type: "success", message: "Thank you. Your message has been sent to the Al Qirat Perfumes team." });
  }

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <input name="website" tabIndex="-1" autoComplete="off" className="hidden" aria-hidden="true" />
      <label className="text-sm font-semibold">Full name<input name="name" required maxLength={120} className={inputClass} placeholder="Your name" /></label>
      <label className="text-sm font-semibold">Email address<input name="email" type="email" required maxLength={254} className={inputClass} placeholder="you@example.com" /></label>
      <label className="text-sm font-semibold">Phone number <span className="font-normal text-stone-400">(optional)</span><input name="phone" type="tel" maxLength={30} className={inputClass} placeholder="Your phone number" /></label>
      <label className="text-sm font-semibold">Subject<input name="subject" required maxLength={160} className={inputClass} placeholder="How can we help?" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Message<textarea name="message" required maxLength={3000} rows={6} className="mt-2 w-full rounded-xl border border-stone-200 bg-white p-4 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10" placeholder="Write your query here..." /></label>
      {status.message && <p role="status" className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm sm:col-span-2 ${status.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{status.type === "success" && <CheckCircle2 size={18} />}{status.message}</p>}
      <button disabled={submitting} className="flex h-13 items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-gold hover:text-ink disabled:opacity-60 sm:col-span-2"><Send size={17} />{submitting ? "Sending..." : "Send Message"}</button>
    </form>
  );
}
