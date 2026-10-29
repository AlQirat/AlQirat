"use client";

import { CheckCircle2, ExternalLink, LogOut, MapPin, PackageCheck, ShoppingBag, Truck, UserRound } from "lucide-react";
import SmartImage from "./SmartImage";
import { createClient } from "@/lib/supabase/client";
import CustomerScentRequests from "./CustomerScentRequests";

const FULFILLMENT_STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
}

function formatDate(value, includeTime = false) {
  if (!value) return "Awaiting update";
  return new Intl.DateTimeFormat("en-IN", includeTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatLabel(value, fallback = "Pending") {
  if (!value) return fallback;
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function getProgressIndex(order) {
  if (order.status === "cancelled" || ["cancelled", "rto"].includes(order.fulfillment_status)) return -1;
  const fulfillmentIndex = {
    pending: 0,
    confirmed: 1,
    packed: 2,
    awb_assigned: 2,
    pickup_pending: 2,
    picked_up: 3,
    in_transit: 3,
    shipped: 3,
    out_for_delivery: 4,
    delivered: 5,
  }[order.fulfillment_status];
  if (fulfillmentIndex !== undefined) return fulfillmentIndex;
  return { pending: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 5 }[order.status] ?? 0;
}

function getTrackingStatus(order) {
  if (order.status === "cancelled" || order.fulfillment_status === "cancelled") return "Cancelled";
  if (order.fulfillment_status === "rto") return "Return to origin";
  return order.shiprocket_status || (order.shiprocket_order_id ? "Shipment created" : "Pending");
}

function formatAddress(address) {
  if (!address) return "Address unavailable";
  return [address.address_line_1, address.address_line_2, address.city, address.state, address.postal_code, address.country].filter(Boolean).join(", ");
}

function OrderProgress({ order }) {
  const progressIndex = getProgressIndex(order);
  const cancelled = progressIndex < 0;

  return (
    <section className="mt-6 rounded-3xl border border-gold/25 bg-[#fffdfa] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Live fulfillment progress</p>
          <p className="mt-1 text-sm text-stone-500">Updated from Shiprocket tracking events</p>
        </div>
        <span className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] ${cancelled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>
          {cancelled ? formatLabel(order.fulfillment_status || order.status) : formatLabel(order.fulfillment_status, formatLabel(order.status))}
        </span>
      </div>
      <div className="mt-7 overflow-x-auto pb-1">
        <div className="relative grid min-w-[660px] grid-cols-6 gap-2">
          <div className="absolute left-[8%] right-[8%] top-3 h-0.5 bg-stone-200" />
          {FULFILLMENT_STEPS.map((step, index) => {
            const complete = !cancelled && index <= progressIndex;
            return (
              <div key={step.key} className="relative z-10 text-center">
                <span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white ${complete ? "border-forest bg-forest text-white" : "border-stone-300 text-stone-300"}`}>
                  {complete ? <CheckCircle2 size={15} /> : <span className="h-2.5 w-2.5 rounded-full bg-current" />}
                </span>
                <p className={`mt-3 text-xs font-semibold sm:text-sm ${complete ? "text-ink" : "text-stone-500"}`}>{step.label}</p>
                <p className="mt-1 text-[11px] leading-4 text-stone-400">{index === 0 ? formatDate(order.created_at, true) : complete ? "Updated" : "Awaiting update"}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ShipmentTracking({ order }) {
  const shipmentCreated = Boolean(order.shiprocket_order_id || order.shiprocket_shipment_id || order.shiprocket_awb);
  const trackingStatus = getTrackingStatus(order);

  return (
    <section className="mt-6 rounded-3xl border border-gold/25 bg-[#fffdfa] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-dark">Shipment tracking</p>
          <div className="mt-2 flex items-center gap-2"><Truck size={19} className="text-gold-dark" /><h3 className="font-serif text-2xl font-semibold">Shiprocket</h3></div>
        </div>
        <span className={`rounded-full px-4 py-2 text-xs font-bold ${shipmentCreated ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>{shipmentCreated ? formatLabel(trackingStatus) : "Pending"}</span>
      </div>
      <div className="mt-5 rounded-2xl bg-cream/70 px-4 py-4 text-sm">
        <div className="flex items-center justify-between gap-4"><span className="font-semibold uppercase tracking-[0.08em] text-stone-500">{formatLabel(trackingStatus)}</span><span className="text-right text-stone-500">{shipmentCreated ? "Live shipment updates enabled" : "Shipment has not been created yet"}</span></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Shiprocket order reference</p><p className="mt-2 font-semibold text-ink">{order.shiprocket_order_id || "Pending assignment"}</p></div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Courier</p><p className="mt-2 font-semibold text-ink">{order.shiprocket_courier_name || "Pending assignment"}</p></div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">AWB number</p><p className="mt-2 font-semibold text-ink">{order.shiprocket_awb || "Pending assignment"}</p></div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">Last update</p><p className="mt-2 font-semibold text-ink">{formatDate(order.shiprocket_last_event_at, true)}</p></div>
      </div>
      {order.shiprocket_tracking_url && <a href={order.shiprocket_tracking_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink">Track shipment <ExternalLink size={15} /></a>}
    </section>
  );
}

function OrderCard({ order }) {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  const paymentStatus = order.payment_status === "paid" ? "Paid" : formatLabel(order.payment_status, "Pending");

  return (
    <article className="rounded-[2rem] border border-gold/25 bg-[#fffdfa] p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-gold-dark">Order #{order.order_number}</p>
          <h3 className="mt-2 font-serif text-3xl font-semibold">{formatLabel(order.status)}</h3>
          <p className="mt-2 text-sm text-stone-500">Placed {formatDate(order.created_at)}</p>
          <p className="mt-3 text-sm text-stone-500">Payment: <span className={order.payment_status === "paid" ? "font-semibold text-emerald-700" : "font-semibold text-stone-700"}>{paymentStatus}</span></p>
        </div>
        <div className="text-right"><p className="text-2xl font-bold text-ink">{formatCurrency(order.total)}</p>{Number(order.discount_amount) > 0 && <p className="mt-1 text-xs font-semibold text-emerald-700">Combo savings {formatCurrency(order.discount_amount)}</p>}</div>
      </div>
      <div className="mt-7 divide-y rounded-2xl border border-stone-200 bg-white">
        {items.map((item) => <div key={item.id} className="flex items-center gap-4 px-4 py-4 sm:px-5"><SmartImage src={item.products?.image_url} alt={item.product_name} className="h-16 w-16 shrink-0 rounded-xl" imgClassName="h-full w-full object-cover" fallback={<div className="flex h-full items-center justify-center text-gold-dark"><ShoppingBag size={22} /></div>} /><div className="min-w-0 flex-1"><p className="font-semibold">{item.product_name}</p><p className="mt-1 text-sm text-stone-500">Quantity {item.quantity}{item.variant_label ? ` - ${item.variant_label}` : ""}</p></div><p className="font-semibold">{formatCurrency(item.line_total)}</p></div>)}
      </div>
      <OrderProgress order={order} />
      <ShipmentTracking order={order} />
    </article>
  );
}

export default function CustomerAccount({ user, customer, address, orders, ordersError }) {
  const safeOrders = Array.isArray(orders) ? orders : [];

  async function signOut() {
    const { error } = await createClient().auth.signOut();
    if (!error) window.location.assign("/");
  }

  return (
    <main className="min-h-[68vh] overflow-x-clip bg-cream px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dark">My account</p><h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">Welcome, {customer?.full_name || "Al Qirat customer"}</h1><p className="mt-2 text-stone-500">{user.email}</p></div>
          <button type="button" onClick={signOut} className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold transition hover:border-gold"><LogOut size={16} /> Sign Out</button>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold-dark"><UserRound size={21} /></span><div><h2 className="font-bold">Customer details</h2><p className="text-sm text-stone-500">{customer?.phone || "Phone number not saved"}</p></div></div></article>
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark"><MapPin size={21} /></span><div><h2 className="font-bold">Default delivery address</h2><p className="mt-1 text-sm leading-6 text-stone-500">{formatAddress(address)}</p></div></div></article>
        </div>

        <CustomerScentRequests user={user} customer={customer} address={address} />
        <section className="mt-8 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b px-5 py-6 sm:px-8"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dark">Order history</p><h2 className="mt-1 font-serif text-3xl font-semibold">Your orders</h2></div><ShoppingBag className="text-gold-dark" /></div>
          {ordersError ? <div className="p-10 text-center"><PackageCheck size={42} className="mx-auto text-gold-dark" /><p className="mt-3 font-semibold text-ink">Order history is temporarily unavailable.</p><p className="mt-2 text-sm text-stone-500">Refresh the page to try loading your orders again.</p><button type="button" onClick={() => window.location.reload()} className="btn-gold mt-5 inline-flex">Refresh account</button></div> : safeOrders.length === 0 ? <div className="p-10 text-center"><PackageCheck size={42} className="mx-auto text-stone-300" /><p className="mt-3 text-stone-500">You have not placed an order yet.</p><a href="/shop" className="btn-gold mt-5 inline-flex">Start Shopping</a></div> : <div className="space-y-6 p-4 sm:p-7">{safeOrders.map((order) => <OrderCard key={order.id} order={order} />)}</div>}
        </section>
      </div>
    </main>
  );
}
