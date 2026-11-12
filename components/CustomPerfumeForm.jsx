"use client";

import { useRef, useState } from "react";
import { validateScentRequest } from "@/lib/customPerfume.mjs";
import { scentFetch, useScentData } from "./useScentData";

const inputClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 font-normal outline-none focus:border-gold focus:ring-2 focus:ring-gold/20";
const requiredMark = <span aria-hidden="true" className="ml-1 text-red-600">*</span>;

export default function CustomPerfumeForm({ user }) {
  const { data: settings, error: settingsError } = useScentData("/api/custom-perfume/settings");
  const submissionId = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      submissionId.current ||= crypto.randomUUID();
      const form = new FormData(event.currentTarget);
      const payload = validateScentRequest({ ...Object.fromEntries(form), id: submissionId.current });
      const result = await scentFetch("/api/custom-perfume/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setConfirmed(result.request.id);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return (
    <main className="bg-cream px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-gold-dark">Made for you</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">Create Your Signature Scent</h1>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-stone-600">Tell us the fragrance you love and how to reach you. We will prepare a similar profile and a personal quotation. No account or payment is required.</p>
        </div>
        {confirmed ? <section role="status" className="rounded-3xl border border-gold/30 bg-white p-8 text-center">
          <h2 className="font-serif text-3xl">Your inspiration is with us</h2>
          <p className="mt-4">Your request has been received. Our team will contact you using the details you provided.</p>
          <p className="mt-3 break-all text-sm text-stone-500">Reference: {confirmed}</p>
          {user && <a href="/account#custom-perfume-requests" className="btn-forest mt-6">View My Requests</a>}
        </section> : settingsError ? <p role="alert" className="rounded-2xl bg-red-50 p-6 text-red-700">{settingsError}</p> : !settings ? <p role="status" className="text-center">Loading availability...</p> : !settings.enabled ? <section className="rounded-3xl bg-white p-8 text-center"><h2 className="font-serif text-3xl">New requests are currently paused</h2><p className="mt-3">Existing requests will continue to be handled by the Al Qirat team.</p></section> : (
          <form onSubmit={submit} className="space-y-6 rounded-3xl border border-gold/25 bg-white p-5 shadow-sm sm:p-8">
            <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-serif text-2xl sm:col-span-2">Tell us what you love</legend>
              <label className="text-sm font-semibold">Brand{requiredMark}<input name="reference_brand" required aria-required="true" maxLength={120} autoComplete="organization" className={inputClass} placeholder="e.g. Al Qirat" /></label>
              <label className="text-sm font-semibold">Model / fragrance name{requiredMark}<input name="reference_name" required aria-required="true" maxLength={160} className={inputClass} placeholder="e.g. Oud Al Qirat" /></label>
              <label className="text-sm font-semibold">Email address{requiredMark}<input name="contact_email" type="email" autoComplete="email" required aria-required="true" maxLength={254} className={inputClass} placeholder="you@example.com" defaultValue={user?.email || ""} /></label>
              <label className="text-sm font-semibold">Phone number{requiredMark}<input name="contact_phone" autoComplete="tel" type="tel" required aria-required="true" pattern="[0-9+\(\) \-]{7,20}" maxLength={20} inputMode="tel" className={inputClass} placeholder="Your contact number" /></label>
            </fieldset>
            <p className="text-xs text-stone-500"><span aria-hidden="true" className="text-red-600">*</span> Required fields</p>
            <p className="text-sm leading-6 text-stone-500">Your details are shared securely with the Al Qirat team so we can respond to your request.</p>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
            <button disabled={busy} className="btn-forest w-full text-center disabled:opacity-50">{busy ? "Submitting..." : "Submit My Request"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
