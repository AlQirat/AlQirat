"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Mail, MessageSquare, Phone, Trash2 } from "lucide-react";
import CatalogDialog from "./CatalogDialog";

const statusStyles = {
  new: "bg-amber-50 text-amber-700",
  in_progress: "bg-blue-50 text-blue-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadInquiries() {
    setLoading(true);
    const response = await fetch("/api/admin/inquiries", { cache: "no-store" });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.error || "Unable to load inquiries.");
    setInquiries(result.inquiries);
    setSelected((current) => result.inquiries.find((item) => item.id === current?.id) || null);
    setError("");
  }

  useEffect(() => { loadInquiries(); }, []);
  const visible = useMemo(() => filter === "all" ? inquiries : inquiries.filter((item) => item.status === filter), [inquiries, filter]);

  async function updateStatus(status) {
    const response = await fetch(`/api/admin/inquiries/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to update the inquiry.");
    setSelected({ ...selected, status });
    await loadInquiries();
  }

  async function removeInquiry() {
    if (!window.confirm("Delete this inquiry permanently?")) return;
    const response = await fetch(`/api/admin/inquiries/${selected.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to delete the inquiry.");
    setSelected(null);
    await loadInquiries();
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark">Customer support</p><h2 className="mt-1 text-2xl font-bold">Contact inquiries</h2><p className="mt-1 text-sm text-stone-500">Messages submitted from the storefront contact page.</p></div><select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm"><option value="all">All inquiries</option><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></div>
      {error && <p role="alert" className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">{error}</p>}
      {loading ? <p className="p-8 text-sm text-stone-500">Loading inquiries...</p> : visible.length === 0 ? <div className="m-7 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center"><MessageSquare className="mx-auto text-stone-300" /><p className="mt-3 text-sm text-stone-500">No inquiries found.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-stone-50 text-[11px] uppercase tracking-[0.14em] text-stone-500"><tr><th className="px-7 py-3">Customer</th><th className="px-5 py-3">Subject</th><th className="px-5 py-3">Received</th><th className="px-5 py-3">Status</th><th className="px-7 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-stone-100">{visible.map((inquiry) => <tr key={inquiry.id} className="text-sm hover:bg-cream/60"><td className="px-7 py-4"><p className="font-semibold">{inquiry.name}</p><p className="mt-0.5 text-xs text-stone-400">{inquiry.email}</p></td><td className="px-5 py-4 text-stone-600">{inquiry.subject}</td><td className="px-5 py-4 text-stone-500">{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(inquiry.created_at))}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[inquiry.status]}`}>{inquiry.status.replace("_", " ")}</span></td><td className="px-7 py-4 text-right"><button onClick={() => setSelected(inquiry)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:border-gold"><Eye size={14} /> View</button></td></tr>)}</tbody></table></div>}
      {selected && <CatalogDialog title={selected.subject} subtitle={`From ${selected.name}`} onClose={() => setSelected(null)}><div className="p-5 sm:p-7"><div className="flex flex-wrap gap-3 text-sm"><a href={`mailto:${selected.email}`} className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-gold-dark"><Mail size={15} />{selected.email}</a>{selected.phone && <a href={`tel:${selected.phone}`} className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-gold-dark"><Phone size={15} />{selected.phone}</a>}</div><p className="mt-6 whitespace-pre-wrap rounded-2xl border border-stone-200 bg-stone-50 p-5 text-sm leading-7 text-stone-700">{selected.message}</p><div className="mt-6 flex flex-wrap items-end justify-between gap-4"><label className="text-sm font-semibold">Status<select value={selected.status} onChange={(event) => updateStatus(event.target.value)} className="mt-2 block h-11 rounded-xl border bg-white px-3"><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label><button onClick={removeInquiry} className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete Inquiry</button></div></div></CatalogDialog>}
    </section>
  );
}
