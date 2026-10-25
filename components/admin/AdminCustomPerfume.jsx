"use client";

import { useEffect, useState } from "react";
import { SCENT_STATUSES } from "@/lib/customPerfume.mjs";
import { notifyStorefrontUpdate } from "@/lib/storefrontSync";
import { scentFetch, useScentData } from "../useScentData";
import CatalogDialog from "./CatalogDialog";

const inputClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 font-normal outline-none focus:border-gold";
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value));

function RequestEditor({ request, onSaved, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      await scentFetch(`/api/admin/custom-perfume/requests/${request.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, version: request.version }) });
      notifyStorefrontUpdate("custom-perfume");
      await onSaved();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <CatalogDialog title={request.reference_name} subtitle={`Request from ${request.contact_name}`} onClose={onClose}>
    <div className="p-5 sm:p-7">
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        {[
          ["Reference brand", request.reference_brand], ["Bottle size", `${request.bottle_size} ml`],
          ["Budget", money(request.budget)], ["Submitted", new Date(request.created_at).toLocaleString("en-IN")],
          ["Contact", request.contact_name], ["Email", request.contact_email], ["Phone", request.contact_phone],
          ["Fragrance notes", request.fragrance_notes], ["Preferences", request.scent_preferences], ["Instructions", request.instructions || "None"],
        ].map(([label, value]) => <div key={label}><dt className="font-semibold text-stone-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}
      </dl>
      {request.reference_url && <a href={request.reference_url} target="_blank" rel="noopener noreferrer" className="mt-4 block break-all text-sm text-gold-dark underline">Open customer reference</a>}
      {request.custom_order && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Linked order <strong>{request.custom_order.order_number}</strong> · {request.custom_order.status}</p>}
      <form onSubmit={save} className="mt-6 space-y-5 border-t pt-6">
        <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">Status<select name="status" defaultValue={request.status} className={inputClass}>{Object.entries(SCENT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm font-semibold">Quotation amount (INR)<input name="quotation_amount" type="number" min="0.01" max="1000000" step="0.01" defaultValue={request.quotation_amount ?? ""} className={inputClass} /></label>
          <label className="text-sm font-semibold sm:col-span-2">Quotation details — visible to customer<textarea name="quotation_details" maxLength={3000} rows={4} defaultValue={request.quotation_details} className={inputClass} placeholder="Explain the fragrance profile, price inclusions, delivery costs, lead time, and quotation validity." /></label>
          <label className="text-sm font-semibold sm:col-span-2">Internal notes — admin only<textarea name="internal_notes" maxLength={10000} rows={4} defaultValue={request.custom_perfume_internal_notes?.notes || ""} className={inputClass} /></label>
        </fieldset>
        <p className="text-xs leading-6 text-stone-500">Status and quotation changes are saved to the customer's account update history. Internal notes stay private. Saving a complete quotation while the status is Submitted or Under review publishes it as Quotation ready automatically.</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="btn-forest w-full disabled:opacity-50">{busy ? "Saving…" : "Save Request"}</button>
      </form>
    </div>
  </CatalogDialog>;
}

export default function AdminCustomPerfume() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const settings = useScentData("/api/custom-perfume/settings");
  const [localSettings, setLocalSettings] = useState(null);
  const effectiveSettings = localSettings || settings.data;

  useEffect(() => {
    if (settings.data) setLocalSettings(settings.data);
  }, [settings.data]);
  const requests = useScentData(`/api/admin/custom-perfume/requests?status=${status}&page=${page}`);
  async function toggle(key, value) {
    const previousSettings = effectiveSettings;
    const nextSettings = { ...previousSettings, [key]: value };
    setLocalSettings(nextSettings);
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await scentFetch("/api/admin/custom-perfume/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextSettings) });
      notifyStorefrontUpdate("custom-perfume");
      await settings.refresh();
      setMessage("Availability settings saved.");
    } catch (failure) {
      setLocalSettings(previousSettings);
      setError(failure.message);
    }
    finally { setSaving(false); }
  }
  return <div className="space-y-6">
    <section className="rounded-2xl border bg-white p-5 sm:p-7">
      <h2 className="font-serif text-3xl">Custom Perfume Requests</h2>
      <p className="mt-2 text-sm leading-6 text-stone-500">Manage fragrance inspirations, quotations, and availability. Existing customer requests remain accessible when new submissions are paused.</p>
      {effectiveSettings && <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-xl bg-cream p-4 text-sm font-semibold"><input type="checkbox" checked={effectiveSettings.enabled} disabled={saving} onChange={(event) => toggle("enabled", event.target.checked)} className="h-5 w-5 accent-forest" />Accept new custom perfume requests</label>
        <label className="flex items-center gap-3 rounded-xl bg-cream p-4 text-sm font-semibold"><input type="checkbox" checked={effectiveSettings.homepage_enabled} disabled={saving} onChange={(event) => toggle("homepage_enabled", event.target.checked)} className="h-5 w-5 accent-forest" />Show homepage section when enabled</label>
      </div>}
      <p role="status" className="mt-3 text-sm text-forest">{saving ? "Saving settings…" : message}</p>
    </section>
    {(error || settings.error || requests.error) && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error || settings.error || requests.error}</p>}
    <section className="rounded-2xl border bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="text-sm font-semibold">Filter by status<select aria-label="Filter requests by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={inputClass}><option value="all">All requests</option>{Object.entries(SCENT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" onClick={requests.refresh} className="rounded-full border px-5 py-3 text-sm font-semibold">Refresh Requests</button>
      </div>
      {!requests.data && !requests.error && <p role="status" className="mt-6">Loading requests…</p>}
      {requests.data?.requests.length === 0 && <p className="mt-6 text-stone-500">No requests match this filter.</p>}
      <div className="mt-6 space-y-3">{requests.data?.requests.map((request) => <article key={request.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
        <div className="min-w-0"><h3 className="break-words font-semibold">{request.reference_brand} — {request.reference_name}</h3><p className="mt-1 break-words text-sm text-stone-500">{request.contact_name} · {request.bottle_size} ml · {money(request.budget)}</p><p className="mt-1 text-xs text-stone-500">{new Date(request.created_at).toLocaleDateString("en-IN")}</p></div>
        <div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold">{SCENT_STATUSES[request.status]}</span><button onClick={() => setSelected(request)} className="rounded-full border px-4 py-2 text-center text-sm font-semibold">Manage Request</button></div>
      </article>)}</div>
      {requests.data && <nav aria-label="Request pagination" className="mt-6 flex items-center justify-center gap-4"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-full border px-4 py-2 disabled:opacity-40">Previous</button><span className="text-sm">Page {page} of {Math.max(1, Math.ceil(requests.data.count / 20))}</span><button disabled={page * 20 >= requests.data.count} onClick={() => setPage((value) => value + 1)} className="rounded-full border px-4 py-2 disabled:opacity-40">Next</button></nav>}
    </section>
    {selected && <RequestEditor key={selected.id} request={selected} onClose={() => setSelected(null)} onSaved={async () => { setSelected(null); await requests.refresh(); setMessage("Request saved. Customer updates are available in their account."); }} />}
  </div>;
}
