"use client";

import { useRef, useState } from "react";
import { BOTTLE_SIZES, SCENT_DISCLAIMER, validateScentRequest } from "@/lib/customPerfume.mjs";
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
      const payload = validateScentRequest({ ...Object.fromEntries(form), id: submissionId.current, profile_acknowledged: form.get("profile_acknowledged") === "on" });
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
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-stone-600">Share your inspiration and preferences. We will prepare a similar fragrance profile and a personal quotation. No order or payment is created at this stage.</p>
        </div>
        {confirmed ? <section role="status" className="rounded-3xl border border-gold/30 bg-white p-8 text-center">
          <h2 className="font-serif text-3xl">Your inspiration is with us</h2>
          <p className="mt-4">Your request has been received. Follow its progress and view quotations in your account.</p>
          <p className="mt-3 break-all text-sm text-stone-500">Reference: {confirmed}</p>
          <a href="/account#custom-perfume-requests" className="btn-forest mt-6">View My Requests</a>
        </section> : settingsError ? <p role="alert" className="rounded-2xl bg-red-50 p-6 text-red-700">{settingsError}</p> : !settings ? <p role="status" className="text-center">Loading availability…</p> : !settings.enabled ? <section className="rounded-3xl bg-white p-8 text-center"><h2 className="font-serif text-3xl">New requests are currently paused</h2><p className="mt-3">You can still view existing requests and quotations in your account.</p><a className="btn-forest mt-6" href="/account#custom-perfume-requests">View My Requests</a></section> : !user ? <section className="rounded-3xl bg-white p-8 text-center"><h2 className="font-serif text-3xl">Your scent journey starts here</h2><p className="mt-3">Sign in to save your request securely and receive status and quotation updates in your account.</p><a className="btn-forest mt-6" href="/login?next=/custom-perfume">Sign In to Customize</a><p className="mt-4"><a className="font-semibold text-gold-dark" href="/register?next=/custom-perfume">Create an account</a></p></section> : (
          <form onSubmit={submit} className="space-y-6 rounded-3xl border border-gold/25 bg-white p-5 shadow-sm sm:p-8">
            <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-serif text-2xl">Your scent</legend>
              <label className="text-sm font-semibold">Reference brand{requiredMark}<input name="reference_brand" required aria-required="true" maxLength={120} className={inputClass} placeholder="Brand or your own inspiration" /></label>
              <label className="text-sm font-semibold">Reference fragrance / name{requiredMark}<input name="reference_name" required aria-required="true" maxLength={160} className={inputClass} placeholder="Fragrance name or a personal concept" /></label>
              <label className="text-sm font-semibold sm:col-span-2">Fragrance notes{requiredMark}<textarea name="fragrance_notes" required aria-required="true" minLength={3} maxLength={2000} rows={2} className={inputClass} placeholder="Rose, oud, amber, citrus, or any notes you like." /></label>
              <label className="text-sm font-semibold sm:col-span-2">Scent preferences{requiredMark}<textarea name="scent_preferences" required aria-required="true" minLength={3} maxLength={2000} rows={2} className={inputClass} placeholder="Fresh or warm? Soft or intense? Everyday or special occasion?" /></label>
              <label className="text-sm font-semibold">Bottle size{requiredMark}<select name="bottle_size" required aria-required="true" className={inputClass} defaultValue="50">{BOTTLE_SIZES.map((size) => <option key={size} value={size}>{size} ml</option>)}</select></label>
              <label className="text-sm font-semibold">Budget (INR){requiredMark}<input name="budget" type="number" required aria-required="true" min="0.01" max="1000000" step="0.01" className={inputClass} placeholder="Your approximate budget" /></label>
              <label className="text-sm font-semibold sm:col-span-2">Reference URL <span className="font-normal text-stone-500">(optional)</span><input name="reference_url" type="url" maxLength={2000} className={inputClass} placeholder="https://" /></label>
            </fieldset>
            <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 font-serif text-2xl">Your details</legend>
              <label className="text-sm font-semibold">Your name{requiredMark}<input name="contact_name" autoComplete="name" defaultValue={user.name} required aria-required="true" minLength={2} maxLength={120} className={inputClass} /></label>
              <label className="text-sm font-semibold">Phone{requiredMark}<input name="contact_phone" autoComplete="tel" type="tel" required aria-required="true" pattern="[0-9+\(\) \-]{7,20}" maxLength={20} className={inputClass} /></label>
              <input type="hidden" name="contact_email" value={user.email || ""} readOnly />
              <label className="text-sm font-semibold sm:col-span-2">Additional instructions <span className="font-normal text-stone-500">(optional)</span><textarea name="instructions" maxLength={3000} rows={2} className={inputClass} placeholder="Anything else we should know?" /></label>
              <label className="flex items-start gap-3 rounded-xl bg-cream p-4 text-sm leading-6 sm:col-span-2"><input type="checkbox" name="profile_acknowledged" required aria-required="true" className="mt-1 h-4 w-4 shrink-0 accent-forest" /><span>I understand{requiredMark}: {SCENT_DISCLAIMER}</span></label>
            </fieldset>
            <p className="text-xs text-stone-500"><span aria-hidden="true" className="text-red-600">*</span> Required fields</p>
            <p className="text-sm leading-6 text-stone-500">Your details are shared with the Al Qirat team to respond to this request. Status and quotation updates are available in your account.</p>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
            <button disabled={busy} className="btn-forest w-full text-center disabled:opacity-50">{busy ? "Submitting…" : "Submit My Request"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
