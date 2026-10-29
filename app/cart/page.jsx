"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmartImage from "@/components/SmartImage";
import { useCart } from "@/components/CartProvider";
import { useStorefrontContent } from "@/components/useStorefrontData";

function ComboCartRow({ item, removeItem, updateComboSelection }) {
  return <div className="flex gap-4 border-b border-stone-100 pb-4 last:border-0 last:pb-0">
    <Link href="/combo" className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-50" aria-label={`Edit ${item.name}`}><SmartImage src={item.src} alt={item.name} className="h-full w-full" imgClassName="h-full w-full object-cover" /></Link>
    <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><Link href="/combo" className="font-semibold text-ink hover:text-gold-dark">{item.name}</Link><p className="mt-1 text-sm text-gold-dark">{item.totalQuantity} perfumes selected</p></div><p className="font-bold text-ink">₹{item.price}</p></div><div className="mt-3 space-y-2">{item.selections.map((selection) => <div key={selection.product_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-cream/40 px-3 py-2"><span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-600">{selection.name}</span><div className="flex items-center gap-2"><button type="button" onClick={() => updateComboSelection(item.slug, selection.product_id, selection.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 disabled:opacity-40" disabled={item.stale} aria-label={`Decrease ${selection.name}`}><Minus size={13} /></button><span className="w-5 text-center text-xs font-bold text-ink">{selection.quantity}</span><button type="button" onClick={() => updateComboSelection(item.slug, selection.product_id, selection.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-ink disabled:cursor-not-allowed disabled:opacity-40" disabled={item.stale || (Number(selection.stock_quantity) > 0 && selection.quantity >= Number(selection.stock_quantity))} aria-label={`Increase ${selection.name}`}><Plus size={13} /></button></div></div>)}</div>{item.stale && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">This offer changed. Edit the combo before checkout.</p>}<button type="button" onClick={() => removeItem(item.slug)} className="mt-3 text-xs font-semibold text-stone-400 hover:text-red-600">Remove combo</button></div>
  </div>;
}

function RegularCartRow({ item, updating, handleQuantityChange, removeItem }) {
  return <div className="flex gap-4 border-b border-stone-100 pb-4 last:border-0 last:pb-0">
    <Link href={`/products/${item.productSlug || item.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-stone-50" aria-label={`View ${item.name}`}><SmartImage src={item.src} alt={item.name} className="h-full w-full" imgClassName="h-full w-full object-cover" /></Link>
    <div className="min-w-0 flex-1"><Link href={`/products/${item.productSlug || item.slug}`} className="block truncate font-semibold text-ink transition hover:text-gold-dark">{item.name}</Link><p className="mt-1 text-sm font-medium text-gold-dark">₹{item.price}</p><div className="mt-3 flex items-center gap-2"><button type="button" disabled={updating === item.slug || item.quantity <= 1} onClick={() => handleQuantityChange(item.slug, item.quantity - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Decrease quantity of ${item.name}`}><Minus size={14} /></button><span className="w-8 text-center text-sm font-medium text-ink">{item.quantity}</span><button type="button" disabled={updating === item.slug} onClick={() => handleQuantityChange(item.slug, item.quantity + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Increase quantity of ${item.name}`}><Plus size={14} /></button><button type="button" onClick={() => removeItem(item.slug)} className="ml-auto text-stone-400 transition hover:text-red-600" aria-label={`Remove ${item.name}`}><Trash2 size={18} /></button></div><p className="mt-2 text-sm font-semibold text-ink">Line total: ₹{item.price * item.quantity}</p></div>
  </div>;
}

export default function CartPage() {
  const { items, itemCount, subtotal, updateComboSelection, updateQuantity, removeItem, clearCart } = useCart();
  const { data: storefrontContent } = useStorefrontContent();
  const [updating, setUpdating] = useState(null);
  const deliverySettings = storefrontContent?.delivery_settings;
  const codEnabled = deliverySettings?.cod_enabled !== false;
  const freeShippingThreshold = Number(deliverySettings?.free_shipping_threshold ?? 999);
  const standardShippingAmount = Number(deliverySettings?.standard_shipping_amount ?? 90);
  const shipping = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : standardShippingAmount;
  const total = subtotal + shipping;

  const handleQuantityChange = (slug, newQuantity) => {
    setUpdating(slug);
    updateQuantity(slug, newQuantity);
    setTimeout(() => setUpdating(null), 200);
  };

  return <><Header /><main className="overflow-x-clip bg-cream px-4 py-12 sm:py-16"><div className="mx-auto max-w-7xl"><div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dark">Shopping Cart</p><h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">Your Cart</h1><p className="mt-2 text-sm text-stone-500">{itemCount} item{itemCount !== 1 ? "s" : ""} in cart</p></div>{items.length > 0 && <button onClick={clearCart} className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 hover:text-red-600"><Trash2 size={16} /> Clear Cart</button>}</div>
    {items.length === 0 ? <div className="rounded-[28px] border border-stone-200 bg-white p-12 text-center shadow-sm"><ShoppingBag size={48} className="mx-auto text-stone-300" /><h2 className="mt-4 font-serif text-2xl font-semibold text-ink">Your cart is empty</h2><p className="mt-2 text-stone-500">Looks like you haven't added any products yet.</p><Link href="/shop" className="btn-gold mt-6 inline-flex">Continue Shopping</Link></div> : <div className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr]"><section className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8"><div className="mb-6 flex items-center gap-2"><ShoppingBag size={20} className="text-gold-dark" /><h2 className="text-xl font-bold">Cart Items</h2></div><div className="space-y-4">{items.map((item) => item.kind === "combo" ? <ComboCartRow key={item.slug} item={item} removeItem={removeItem} updateComboSelection={updateComboSelection} /> : <RegularCartRow key={item.slug} item={item} updating={updating} handleQuantityChange={handleQuantityChange} removeItem={removeItem} />)}</div></section><section className="sticky top-24 h-fit rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8"><div className="mb-6 flex items-center gap-2"><ShoppingBag size={20} className="text-gold-dark" /><h2 className="text-xl font-bold">Order Summary</h2></div><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-stone-600">Subtotal ({itemCount} items)</span><span className="font-medium text-ink">₹{subtotal}</span></div><div className="flex justify-between"><span className="text-stone-600">Shipping</span><span className="font-medium text-ink">{shipping === 0 ? <span className="text-emerald-600">Free</span> : `₹${shipping}`}</span></div>{shipping > 0 && <p className="text-xs text-stone-500">Free shipping on orders above ₹{freeShippingThreshold}</p>}<div className="flex justify-between border-t border-stone-200 pt-3 text-lg font-bold text-ink"><span>Total</span><span>₹{total}</span></div></div><Link href="/checkout" className="btn-gold mt-6 block w-full text-center">Proceed to Checkout</Link><p className="mt-4 text-center text-xs text-stone-500">Secure checkout · {codEnabled ? "COD available" : "Online payment only"} · No login required to view cart</p></section></div>}
  </div></main><Footer /></>;
}
