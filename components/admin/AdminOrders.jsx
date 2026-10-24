"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Mail, MapPin, Package, Phone } from "lucide-react";
import CatalogDialog from "./CatalogDialog";

const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const paymentStatuses = ["pending", "paid", "failed", "refunded"];
const statusStyles = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-violet-50 text-violet-700",
  shipped: "bg-cyan-50 text-cyan-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatAddress(address) {
  return [address?.address_line_1, address?.address_line_2, address?.city, address?.state, address?.postal_code, address?.country].filter(Boolean).join(", ");
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadOrders(preferredId) {
    setLoading(true);
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.error || "Unable to load orders.");
    setOrders(result.orders);
    setSelected((current) => result.orders.find((order) => order.id === (preferredId || current?.id)) || null);
    setError("");
  }

  useEffect(() => { loadOrders(); }, []);

  const visibleOrders = useMemo(
    () => filter === "all" ? orders : orders.filter((order) => order.status === filter),
    [filter, orders],
  );

  async function updateOrder(field, value) {
    const nextOrder = { ...selected, [field]: value };
    setSaving(true);
    const response = await fetch(`/api/admin/orders/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextOrder.status, payment_status: nextOrder.payment_status }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setError(result.error || "Unable to update the order.");
    setSelected({ ...selected, ...result.order });
    setOrders((current) => current.map((order) => order.id === selected.id ? { ...order, ...result.order } : order));
    setError("");
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark">Sales</p><h2 className="mt-1 text-2xl font-bold">Orders</h2><p className="mt-1 text-sm text-stone-500">Review purchases and manage fulfilment and payment status.</p></div>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-gold"><option value="all">All orders</option>{orderStatuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select>
      </div>
      {error && <p role="alert" className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">{error}</p>}
      {loading ? <p className="p-8 text-sm text-stone-500">Loading orders...</p> : visibleOrders.length === 0 ? <div className="m-7 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center"><Package className="mx-auto text-stone-300" /><p className="mt-3 text-sm text-stone-500">No orders found.</p></div> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-stone-50 text-[11px] uppercase tracking-[0.14em] text-stone-500"><tr><th className="px-7 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Status</th><th className="px-7 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-stone-100">{visibleOrders.map((order) => <tr key={order.id} className="text-sm hover:bg-cream/60"><td className="px-7 py-4 font-semibold">{order.order_number}</td><td className="px-5 py-4"><p className="font-semibold">{order.customers?.full_name || "Guest customer"}</p><p className="mt-0.5 text-xs text-stone-400">{order.customer_email}</p></td><td className="px-5 py-4 text-stone-500">{formatDate(order.created_at)}</td><td className="px-5 py-4 font-semibold">{formatCurrency(order.total)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[order.status]}`}>{order.status}</span></td><td className="px-7 py-4 text-right"><button onClick={() => setSelected(order)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:border-gold hover:bg-cream"><Eye size={14} /> View & Manage</button></td></tr>)}</tbody></table></div>
      )}

      {selected && <CatalogDialog title={`Order ${selected.order_number}`} subtitle={`Placed ${formatDate(selected.created_at)}`} onClose={() => setSelected(null)}><div className="space-y-6 p-5 sm:p-7">
        <div className="grid gap-4 md:grid-cols-2"><article className="rounded-2xl border border-stone-200 p-5"><h3 className="font-bold">Customer</h3><p className="mt-4 font-semibold">{selected.customers?.full_name || "Guest customer"}</p><a href={`mailto:${selected.customer_email}`} className="mt-2 flex items-center gap-2 text-sm text-stone-500 hover:text-gold-dark"><Mail size={15} />{selected.customer_email}</a>{selected.customers?.phone && <a href={`tel:${selected.customers.phone}`} className="mt-2 flex items-center gap-2 text-sm text-stone-500 hover:text-gold-dark"><Phone size={15} />{selected.customers.phone}</a>}</article><article className="rounded-2xl border border-stone-200 p-5"><h3 className="font-bold">Shipping address</h3><p className="mt-4 flex gap-2 text-sm leading-6 text-stone-600"><MapPin size={17} className="mt-1 shrink-0 text-gold-dark" />{formatAddress(selected.shipping_address)}</p></article></div>
        <article className="overflow-hidden rounded-2xl border border-stone-200"><h3 className="border-b bg-stone-50 px-5 py-4 font-bold">Order items</h3><div className="divide-y">{selected.order_items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm"><div><p className="font-semibold">{item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""}</p><p className="mt-1 text-xs text-stone-500">{item.quantity} × {formatCurrency(item.unit_price)}</p></div><p className="font-bold">{formatCurrency(item.line_total)}</p></div>)}</div><div className="space-y-2 border-t bg-cream/50 px-5 py-4 text-sm"><p className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(selected.subtotal)}</span></p><p className="flex justify-between"><span>Shipping</span><span>{formatCurrency(selected.shipping_amount)}</span></p><p className="flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(selected.total)}</span></p></div></article>
        <div className="grid gap-4 rounded-2xl border border-gold/20 bg-cream p-5 sm:grid-cols-2"><label className="text-sm font-semibold">Order status<select disabled={saving} value={selected.status} onChange={(event) => updateOrder("status", event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 font-normal outline-none focus:border-gold">{orderStatuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label><label className="text-sm font-semibold">Payment status<select disabled={saving} value={selected.payment_status} onChange={(event) => updateOrder("payment_status", event.target.value)} className="mt-2 h-11 w-full rounded-xl border bg-white px-3 font-normal outline-none focus:border-gold">{paymentStatuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></label></div>
      </div></CatalogDialog>}
    </section>
  );
}
