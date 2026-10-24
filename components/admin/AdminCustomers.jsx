"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Mail, Phone, Save, Search, UserRound } from "lucide-react";
import CatalogDialog from "./CatalogDialog";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal outline-none focus:border-gold focus:ring-4 focus:ring-gold/10";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadCustomers(preferredId) {
    setLoading(true);
    const response = await fetch("/api/admin/customers", { cache: "no-store" });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.error || "Unable to load customers.");
    setCustomers(result.customers);
    setSelected((current) => result.customers.find((customer) => customer.id === (preferredId || current?.id)) || null);
    setError("");
  }

  useEffect(() => { loadCustomers(); }, []);
  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => !query || [customer.full_name, customer.email, customer.phone].some((value) => value?.toLowerCase().includes(query)));
  }, [customers, search]);

  async function saveCustomer(event) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/customers/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name: form.get("full_name"), email: form.get("email"), phone: form.get("phone") }) });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setError(result.error || "Unable to update the customer.");
    setSelected({ ...selected, ...result.customer });
    await loadCustomers(selected.id);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-5 py-5 sm:px-7"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark">Customer records</p><h2 className="mt-1 text-2xl font-bold">Customers</h2><p className="mt-1 text-sm text-stone-500">View customer details, purchase history, and update contact information.</p></div>
      {error && <p role="alert" className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">{error}</p>}
      <div className="border-b p-5 sm:px-7"><label className="flex h-11 max-w-xl items-center gap-3 rounded-xl border px-3 focus-within:border-gold"><Search size={17} className="text-stone-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, or phone" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label></div>
      {loading ? <p className="p-8 text-sm text-stone-500">Loading customers...</p> : visibleCustomers.length === 0 ? <div className="m-7 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center"><UserRound className="mx-auto text-stone-300" /><p className="mt-3 text-sm text-stone-500">No customers found.</p></div> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-stone-50 text-[11px] uppercase tracking-[0.14em] text-stone-500"><tr><th className="px-7 py-3">Customer</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Orders</th><th className="px-5 py-3">Total spent</th><th className="px-7 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-stone-100">{visibleCustomers.map((customer) => { const totalSpent = customer.orders.reduce((total, order) => total + Number(order.total), 0); return <tr key={customer.id} className="text-sm hover:bg-cream/60"><td className="px-7 py-4"><p className="font-semibold">{customer.full_name}</p><p className="mt-0.5 text-xs text-stone-400">{customer.email}</p></td><td className="px-5 py-4 text-stone-600">{customer.phone || "Not provided"}</td><td className="px-5 py-4 font-semibold">{customer.orders.length}</td><td className="px-5 py-4 font-semibold">{formatCurrency(totalSpent)}</td><td className="px-7 py-4 text-right"><button onClick={() => setSelected(customer)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:border-gold hover:bg-cream"><Eye size={14} /> View & Edit</button></td></tr>; })}</tbody></table></div>
      )}

      {selected && <CatalogDialog title={selected.full_name} subtitle="View and update this customer profile." onClose={() => setSelected(null)}><form onSubmit={saveCustomer} className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7"><label className="text-sm font-semibold">Full name<input name="full_name" required defaultValue={selected.full_name} className={inputClass} /></label><label className="text-sm font-semibold">Email address<input name="email" type="email" required defaultValue={selected.email} className={inputClass} /></label><label className="text-sm font-semibold sm:col-span-2">Phone number<input name="phone" required defaultValue={selected.phone || ""} className={inputClass} /></label><div className="flex flex-wrap gap-3 text-sm sm:col-span-2"><a href={`mailto:${selected.email}`} className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-gold-dark"><Mail size={15} /> Email customer</a>{selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-gold-dark"><Phone size={15} /> Call customer</a>}</div><div className="sm:col-span-2"><h3 className="font-bold">Order history</h3><div className="mt-3 divide-y rounded-2xl border">{selected.orders.length ? selected.orders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"><div><p className="font-semibold">{order.order_number}</p><p className="mt-0.5 text-xs capitalize text-stone-500">{order.status}</p></div><p className="font-bold">{formatCurrency(order.total)}</p></div>) : <p className="p-4 text-sm text-stone-500">No orders placed yet.</p>}</div></div>{error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</p>}<div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setSelected(null)} className="rounded-xl border px-5 py-3 text-sm font-semibold">Cancel</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{saving ? "Saving..." : "Save Customer"}</button></div></form></CatalogDialog>}
    </section>
  );
}
