"use client";

import { useEffect, useRef, useState } from "react";
import { SCENT_STATUSES } from "@/lib/customPerfume.mjs";
import { createClient } from "@/lib/supabase/client";
import { useScentData } from "./useScentData";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value));
const fieldClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-gold";

function CustomOrderForm({ request, user, customer, address }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function placeOrder(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const supabase = createClient();
    try {
      const { error: customerError } = await supabase.from("customers").upsert({
        auth_user_id: user.id,
        full_name: values.recipient_name,
        email: user.email,
        phone: values.phone,
      }, { onConflict: "auth_user_id" });
      if (customerError) throw customerError;

      const addressPayload = {
        auth_user_id: user.id,
        label: "Default",
        recipient_name: values.recipient_name,
        phone: values.phone,
        address_line_1: values.address_line_1,
        address_line_2: values.address_line_2 || null,
        city: values.city,
        state: values.state,
        postal_code: values.postal_code,
        country: "India",
        is_default: true,
      };
      const addressQuery = address?.id
        ? supabase.from("delivery_addresses").update(addressPayload).eq("id", address.id).eq("auth_user_id", user.id).select("id").single()
        : supabase.from("delivery_addresses").upsert(addressPayload, { onConflict: "auth_user_id,label" }).select("id").single();
      const { data: savedAddress, error: addressError } = await addressQuery;
      if (addressError) throw addressError;

      const { error: orderError } = await supabase.rpc("accept_custom_perfume_quote", {
        p_request_id: request.id,
        p_address_id: savedAddress.id,
      });
      if (orderError) throw orderError;
      window.location.reload();
    } catch (failure) {
      setError(failure.message || "Unable to place the custom perfume order.");
      setBusy(false);
    }
  }

  return <form onSubmit={placeOrder} className="mt-5 rounded-2xl border border-forest/20 bg-sage-light/60 p-4 sm:p-5">
    <h4 className="font-semibold">Accept quotation and place your order</h4>
    <p className="mt-1 text-sm leading-6 text-stone-600">This creates a normal COD order linked to your fragrance request. Payment is collected on delivery.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Recipient name<input name="recipient_name" required minLength={2} defaultValue={address?.recipient_name || customer?.full_name || request.contact_name} className={fieldClass} /></label>
      <label className="text-sm font-semibold">Phone<input name="phone" required pattern="[0-9+() \-]{7,20}" defaultValue={address?.phone || customer?.phone || request.contact_phone} className={fieldClass} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Address line 1<input name="address_line_1" required minLength={5} defaultValue={address?.address_line_1 || ""} className={fieldClass} /></label>
      <label className="text-sm font-semibold sm:col-span-2">Address line 2 <span className="font-normal text-stone-500">(optional)</span><input name="address_line_2" defaultValue={address?.address_line_2 || ""} className={fieldClass} /></label>
      <label className="text-sm font-semibold">City<input name="city" required minLength={2} defaultValue={address?.city || ""} className={fieldClass} /></label>
      <label className="text-sm font-semibold">State<input name="state" required minLength={2} defaultValue={address?.state || ""} className={fieldClass} /></label>
      <label className="text-sm font-semibold">PIN code<input name="postal_code" required pattern="[0-9]{6}" inputMode="numeric" defaultValue={address?.postal_code || ""} className={fieldClass} /></label>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="btn-forest mt-5 w-full text-center disabled:opacity-50">{busy ? "Placing Order..." : "Accept Quotation & Place COD Order"}</button>
  </form>;
}

export default function CustomerScentRequests({ user, customer, address }) {
  const { data, error, refresh } = useScentData("/api/custom-perfume/requests");
  const previous = useRef(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!data) return;
    const signature = JSON.stringify(data.requests.map((request) => [request.id, request.status, request.quotation_amount, request.quotation_details]));
    if (previous.current !== null && previous.current !== signature) setNotice("Your fragrance requests have been updated. View the latest status and quotations below.");
    previous.current = signature;
  }, [data]);

  return (
    <section id="custom-perfume-requests" className="mt-10 scroll-mt-28 rounded-3xl border border-gold/25 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs uppercase tracking-[0.2em] text-gold-dark">Made for you</p><h2 className="mt-2 font-serif text-3xl">Your Signature Scent Requests</h2></div>
        <button onClick={refresh} type="button" className="rounded-full border border-gold/40 px-5 py-2 text-center text-sm font-semibold">Refresh Updates</button>
      </div>
      <p className="mt-3 text-sm text-stone-500">Status and quotation changes appear here automatically. Quotations are in INR; no payment is collected here.</p>
      <p role="status" aria-live="polite" className="mt-3 text-sm text-forest">{notice}</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {!data && !error && <p role="status" className="mt-5">Loading your requests…</p>}
      {data?.requests.length === 0 && <p className="mt-6 text-stone-600">You have not submitted a fragrance request yet. <a href="/custom-perfume" className="font-semibold text-gold-dark">Create your signature scent</a>.</p>}
      <div className="mt-5 space-y-5">{data?.requests.map((request) => (
        <article key={request.id} className="rounded-2xl border border-stone-200 bg-cream/40 p-5">
          <div className="flex flex-wrap justify-between gap-3">
            <div><h3 className="font-semibold">{request.reference_brand} — {request.reference_name}</h3><p className="mt-1 text-sm text-stone-500">{request.bottle_size} ml · Budget {money(request.budget)}</p></div>
            <span className="h-fit rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold-dark">{SCENT_STATUSES[request.status]}</span>
          </div>
          <p className="mt-3 break-all text-xs text-stone-500">Reference: {request.id}</p>
          {request.quotation_amount !== null && <div className="mt-4 rounded-xl border border-gold/30 bg-white p-4"><p className="font-semibold">Quotation: {money(request.quotation_amount)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{request.quotation_details}</p><p className="mt-3 text-xs text-stone-500">Our team will coordinate the next steps using your contact details.</p></div>}
          {request.custom_order && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Order <strong>{request.custom_order.order_number}</strong> created. Track it in your order history.</p>}
          {request.quotation_amount !== null && request.status !== "quoted" && !request.custom_order && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Your quotation has been added and is awaiting publication. The delivery form and acceptance button will appear after the request status is updated to <strong>Quotation ready</strong>.</p>}
          {request.status === "quoted" && !request.custom_order && <CustomOrderForm request={request} user={user} customer={customer} address={address} />}
          <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold text-forest">Request details & updates</summary>
            <dl className="mt-3 grid gap-3"><div><dt className="font-semibold">Fragrance notes</dt><dd className="whitespace-pre-wrap break-words">{request.fragrance_notes}</dd></div><div><dt className="font-semibold">Preferences</dt><dd className="whitespace-pre-wrap break-words">{request.scent_preferences}</dd></div><div><dt className="font-semibold">Instructions</dt><dd className="whitespace-pre-wrap break-words">{request.instructions || "None"}</dd></div></dl>
            <ol className="mt-4 space-y-3 border-t pt-4">{[...request.custom_perfume_updates].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((update) => <li key={update.id}><p className="font-semibold">{SCENT_STATUSES[update.status]}{update.quotation_amount !== null ? ` · ${money(update.quotation_amount)}` : ""}</p><time className="text-xs text-stone-500">{new Date(update.created_at).toLocaleString("en-IN")}</time>{update.quotation_details && <p className="whitespace-pre-wrap break-words">{update.quotation_details}</p>}</li>)}</ol>
          </details>
        </article>
      ))}</div>
    </section>
  );
}
