"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, ExternalLink, Mail, MapPin, Package, Phone, Save, SlidersHorizontal, Truck } from "lucide-react";
import CatalogDialog from "./CatalogDialog";

const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const statusStyles = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-violet-50 text-violet-700",
  shipped: "bg-cyan-50 text-cyan-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};
const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-ink outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function titleCase(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formForOrder(order) {
  return {
    status: order?.status || "pending",
    shiprocket_courier_name: order?.shiprocket_courier_name || "",
    shiprocket_awb: order?.shiprocket_awb || "",
    weight: "0.5",
    length: "10",
    breadth: "10",
    height: "10",
  };
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(formForOrder(null));
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function loadOrders(preferredId) {
    setLoading(true);
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      const errorMessage = result.error || "Unable to load orders.";
      setError(errorMessage);
      setToast({ type: "error", text: errorMessage });
      return;
    }

    setOrders(result.orders);
    const next = result.orders.find((order) => order.id === (preferredId || selected?.id)) || null;
    setSelected(next);
    if (next) {
      setForm((current) => ({ ...formForOrder(next), weight: current.weight, length: current.length, breadth: current.breadth, height: current.height }));
    }
    setError("");
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const visibleOrders = useMemo(
    () => filter === "all" ? orders : orders.filter((order) => order.status === filter),
    [filter, orders],
  );

  function openOrder(order) {
    setSelected(order);
    setForm(formForOrder(order));
    setError("");
    setMessage("");
    setToast(null);
  }

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveOrderManagement(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(`/api/admin/orders/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: form.status,
        shiprocket_courier_name: form.shiprocket_courier_name,
        shiprocket_awb: form.shiprocket_awb,
      }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      const errorMessage = result.error || "Unable to save order changes.";
      setError(errorMessage);
      setToast({ type: "error", text: errorMessage });
      return;
    }

    const nextOrder = { ...selected, ...result.order };
    setSelected(nextOrder);
    setOrders((current) => current.map((order) => order.id === selected.id ? { ...order, ...nextOrder } : order));
    setMessage("Order details saved.");
    setToast({ type: "success", text: "Order status updated successfully." });
  }

  async function createShipment() {
    setCreatingShipment(true);
    setError("");
    setMessage("");
    const response = await fetch(`/api/admin/orders/${selected.id}/shiprocket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: form.weight, length: form.length, breadth: form.breadth, height: form.height }),
    });
    const result = await response.json();
    setCreatingShipment(false);
    if (!response.ok) {
      const errorMessage = result.error || "Unable to create the Shiprocket shipment.";
      setError(errorMessage);
      setToast({ type: "error", text: errorMessage });
      return;
    }
    setMessage("Shiprocket shipment created and AWB assigned.");
    setToast({ type: "success", text: "Shipment created and AWB assigned successfully." });
    await loadOrders(selected.id);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      {toast && <div role="status" aria-live="polite" className={`fixed right-4 top-4 z-[100] flex max-w-[min(92vw,420px)] items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}><span className="flex-1">{toast.text}</span><button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification" className="text-lg leading-none opacity-80 hover:opacity-100">×</button></div>}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-7 sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">Customer fulfillment</p>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-800">Orders</h2>
          <p className="mt-2 text-sm text-slate-500">Review order details and manage each shipment when it is ready.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">{orders.length} orders</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-full border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500">
            <option value="all">All orders</option>
            {orderStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
          </select>
        </div>
      </div>

      {error && <p role="alert" className="mx-5 mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">{error}</p>}
      {message && <p role="status" className="mx-5 mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:mx-7">{message}</p>}
      {loading ? <p className="p-8 text-sm text-slate-500">Loading orders...</p> : visibleOrders.length === 0 ? <div className="m-7 rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><Package className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-500">No orders found.</p></div> : (
        <div className="space-y-4 p-5 sm:p-7">
          {visibleOrders.map((order) => <article key={order.id} className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
            <div className="grid gap-5 px-5 py-5 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-center sm:px-7">
              <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">Order {order.order_number}</p><p className="mt-2 text-lg font-bold text-slate-900">{order.customers?.full_name || "Guest customer"}</p><p className="mt-1 text-sm text-slate-500">{formatDate(order.created_at)}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Payment</p><p className="mt-2 font-semibold text-slate-900">{titleCase(order.payment_method || "Not specified")}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Order total</p><p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(order.total)}</p></div>
              <div className="flex items-center gap-3 md:justify-end"><span className={`rounded-full px-3 py-2 text-xs font-bold uppercase ${statusStyles[order.status] || statusStyles.pending}`}>{titleCase(order.status)}</span><button type="button" onClick={() => openOrder(order)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"><Eye size={16} /> Manage</button></div>
            </div>
            <div className="border-t border-slate-100 px-5 py-4 sm:px-7"><div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="font-semibold text-slate-700">{order.order_items?.length || 0} ordered product{order.order_items?.length === 1 ? "" : "s"}</span><span className="text-slate-500">{order.shiprocket_awb ? `AWB ${order.shiprocket_awb}` : "Shiprocket shipment not created"}</span></div></div>
          </article>)}
        </div>
      )}

      {selected && <CatalogDialog wide title={`Order ${selected.order_number}`} subtitle={`Placed ${formatDate(selected.created_at)}`} onClose={() => setSelected(null)}>
        <div className="space-y-6 bg-slate-50 p-5 sm:p-7">
          <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="flex min-w-0 min-h-[190px] flex-col rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Customer</h3><p className="mt-4 break-words font-bold text-slate-900">{selected.customers?.full_name || "Guest customer"}</p><a href={`mailto:${selected.customer_email}`} className="mt-2 flex min-w-0 items-start gap-2 text-sm text-slate-500 hover:text-blue-600"><Mail size={15} className="mt-0.5 shrink-0" /><span className="min-w-0 break-all">{selected.customer_email}</span></a>{selected.customers?.phone && <a href={`tel:${selected.customers.phone}`} className="mt-2 flex min-w-0 items-start gap-2 text-sm text-slate-500 hover:text-blue-600"><Phone size={15} className="mt-0.5 shrink-0" /><span className="break-words">{selected.customers.phone}</span></a>}</article>
            <article className="flex min-w-0 min-h-[190px] flex-col rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Payment</h3><p className="mt-4 break-words font-bold text-slate-900">{titleCase(selected.payment_method || "Not specified")}</p></article>
            <article className="flex min-w-0 min-h-[190px] flex-col rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Delivery</h3><p className="mt-4 break-words font-bold text-slate-900">{selected.shiprocket_courier_name || "Courier not assigned"}</p><p className="mt-2 break-words text-sm text-slate-500">AWB: {selected.shiprocket_awb || "Not assigned"}</p><p className="mt-1 break-words text-sm text-slate-500">Shiprocket: {selected.shiprocket_status || "Not created"}</p>{selected.shiprocket_tracking_url && <a href={selected.shiprocket_tracking_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">Track <ExternalLink size={13} /></a>}</article>
            <article className="flex min-w-0 min-h-[190px] flex-col rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Shipping address</h3><div className="mt-4 flex min-w-0 items-start gap-3 text-sm leading-6 text-slate-600"><MapPin size={17} className="mt-1 shrink-0 text-blue-600" /><span className="min-w-0 break-words">{[selected.shipping_address?.address_line_1, selected.shipping_address?.address_line_2, selected.shipping_address?.city, selected.shipping_address?.state, selected.shipping_address?.postal_code, selected.shipping_address?.country].filter(Boolean).map((line) => <span key={line} className="block">{line}</span>)}</span></div></article>
          </div>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h3 className="border-b border-slate-200 px-5 py-4 text-lg font-bold text-slate-900">Ordered products</h3><div className="divide-y divide-slate-100">{(selected.order_items || []).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4"><div className="flex min-w-0 items-center gap-4">{item.products?.image_url ? <img src={item.products.image_url} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100"><Package className="text-slate-400" size={22} /></div>}<div><p className="font-semibold text-slate-900">{item.product_name}{item.variant_label ? ` (${item.variant_label})` : ""}</p><p className="mt-1 text-sm text-slate-500">Quantity {item.quantity} · {formatCurrency(item.unit_price)} each</p></div></div><p className="font-bold text-slate-900">{formatCurrency(item.line_total)}</p></div>)}</div><div className="space-y-2 border-t border-slate-100 bg-slate-50 px-5 py-4 text-sm"><p className="flex justify-between text-slate-600"><span>Items subtotal</span><span>{formatCurrency(selected.subtotal)}</span></p><p className="flex justify-between text-slate-600"><span>Shipping</span><span>{Number(selected.shipping_amount) ? formatCurrency(selected.shipping_amount) : "Free"}</span></p><p className="flex justify-between text-base font-bold text-slate-900"><span>Order total</span><span>{formatCurrency(selected.total)}</span></p></div></article>

          <form onSubmit={saveOrderManagement} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-3"><SlidersHorizontal className="text-blue-600" size={22} /><h3 className="text-lg font-bold text-slate-900">Order management</h3></div>
            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.6fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="font-bold text-slate-900">Shipment details</h4>
                <label className="mt-5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Order status<select value={form.status} onChange={(event) => change("status", event.target.value)} className={inputClass}>{orderStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label>
                <label className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Shipping provider<input value={form.shiprocket_courier_name} onChange={(event) => change("shiprocket_courier_name", event.target.value)} placeholder="Courier company" className={inputClass} /></label>
                <label className="mt-4 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">AWB / tracking number<input value={form.shiprocket_awb} onChange={(event) => change("shiprocket_awb", event.target.value)} placeholder="AWB number" className={inputClass} /></label>
                <button disabled={saving} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"><Save size={17} />{saving ? "Saving..." : "Save status"}</button>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="flex items-center gap-2 font-bold text-slate-900"><Truck size={20} className="text-blue-600" /> Shiprocket fulfillment</h4><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${selected.shiprocket_awb ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{selected.shiprocket_awb ? "AWB assigned" : "Not created"}</span></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Weight (kg)<input type="number" min="0.01" step="0.01" value={form.weight} onChange={(event) => change("weight", event.target.value)} className={inputClass} /></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Length (cm)<input type="number" min="1" step="0.1" value={form.length} onChange={(event) => change("length", event.target.value)} className={inputClass} /></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Width (cm)<input type="number" min="1" step="0.1" value={form.breadth} onChange={(event) => change("breadth", event.target.value)} className={inputClass} /></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Height (cm)<input type="number" min="1" step="0.1" value={form.height} onChange={(event) => change("height", event.target.value)} className={inputClass} /></label></div>
                <button type="button" disabled={creatingShipment || Boolean(selected.shiprocket_awb)} onClick={createShipment} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Truck size={17} />{creatingShipment ? "Creating shipment..." : selected.shiprocket_awb ? "AWB already assigned" : "Create shipment & assign AWB"}</button>
                {selected.fulfillment_error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{selected.fulfillment_error}</p>}
              </div>
            </div>
          </form>
        </div>
      </CatalogDialog>}
    </section>
  );
}
