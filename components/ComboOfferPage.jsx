"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import SmartImage from "./SmartImage";
import { useCart } from "./CartProvider";
import { useStorefrontComboOffer } from "./useStorefrontData";
import { calculateComboPricing } from "@/lib/comboPricing";

function currency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function ComboOfferPage({ initialOffer }) {
  const router = useRouter();
  const { addComboItem } = useCart();
  const { data, error } = useStorefrontComboOffer({ offer: initialOffer });
  const offer = data.offer;
  const [quantities, setQuantities] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    setQuantities((current) => Object.fromEntries(
      Object.entries(current).filter(([productId]) => offer?.products?.some((product) => String(product.product_id || product.id) === productId)),
    ));
  }, [offer]);

  const selections = useMemo(
    () => (offer?.products || []).map((product) => ({
      ...product,
      product_id: product.product_id || product.id,
      quantity: quantities[String(product.product_id || product.id)] || 0,
    })).filter((product) => product.quantity > 0),
    [offer, quantities],
  );
  const pricing = useMemo(() => calculateComboPricing(offer || {}, selections), [offer, selections]);
  const minQuantity = Math.max(1, Number(offer?.min_quantity) || 1);
  const maxQuantity = Math.max(minQuantity, Number(offer?.max_quantity) || minQuantity);
  const maxPerProduct = Number(offer?.max_quantity_per_product || maxQuantity || 1);

  function changeQuantity(product, delta) {
    const productId = String(product.product_id || product.id);
    const currentQuantity = quantities[productId] || 0;
    const nextQuantity = currentQuantity + delta;
    if (nextQuantity < 0 || nextQuantity > maxPerProduct) return;
    if (delta > 0 && pricing.totalQuantity >= maxQuantity) return;
    if (delta > 0 && product.stock_quantity > 0 && nextQuantity > product.stock_quantity) return;
    if (delta > 0 && !offer.allow_same_product && nextQuantity > 1) return;
    if (delta > 0 && !offer.allow_mixed_products && pricing.totalQuantity > 0 && currentQuantity === 0) return;
    setMessage("");
    setQuantities((current) => ({ ...current, [productId]: nextQuantity }));
  }

  function addToCart() {
    if (pricing.totalQuantity < minQuantity) {
      setMessage(`Select at least ${minQuantity} perfumes to continue.`);
      return;
    }
    addComboItem(offer, selections);
    router.push("/cart");
  }

  if (error) {
    return <main className="min-h-[60vh] bg-cream px-4 py-20"><div className="mx-auto max-w-xl rounded-3xl border border-red-100 bg-white p-10 text-center"><h1 className="font-serif text-3xl">Combo offer unavailable</h1><p className="mt-3 text-stone-500">{error}</p></div></main>;
  }

  if (!offer) {
    return <main className="min-h-[60vh] bg-cream px-4 py-20"><div className="mx-auto max-w-xl rounded-3xl border border-gold/20 bg-white p-10 text-center shadow-sm"><Sparkles className="mx-auto text-gold-dark" size={34} /><h1 className="mt-4 font-serif text-3xl">This combo is taking a pause</h1><p className="mt-3 text-stone-500">Please check back soon for our next fragrance offer.</p><a href="/shop" className="btn-gold mt-7 inline-flex">Continue Shopping</a></div></main>;
  }

  return (
    <main className="overflow-x-clip bg-cream pb-36">
      <section className="relative isolate hidden overflow-hidden border-b border-gold/20 bg-ink sm:block">
        <SmartImage src={offer.banner_image_url} alt={offer.title} className="absolute inset-0" imgClassName="h-full w-full object-cover" tone="from-ink to-sage" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/35 to-transparent" />
        <div className="container-site relative z-10 py-20 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-gold-light">Build your own box</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight text-white sm:text-6xl">{offer.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">{offer.description || offer.subtitle}</p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold text-white/90">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">{offer.bundle_quantity} perfumes · {currency(offer.combo_price)}</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">{currency(offer.default_unit_price)} individual price by default</span>
          </div>
        </div>
      </section>

      <section className="container-site py-8 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-dark sm:text-xs">Choose your fragrances</p><h2 className="mt-2 font-serif text-2xl font-semibold text-ink sm:text-4xl">Pick any combination</h2><p className="mt-2 hidden max-w-2xl text-sm text-stone-500 sm:block">Same or mixed perfumes are supported. Each card shows its admin-configured individual price.</p></div>
          <div className="rounded-2xl border border-gold/30 bg-white px-3 py-2 text-right shadow-sm sm:px-5 sm:py-3"><p className="text-[10px] uppercase tracking-[0.18em] text-stone-500 sm:text-xs">Selected</p><p className="mt-1 text-xl font-bold text-ink sm:text-2xl">{pricing.totalQuantity}<span className="text-xs font-medium text-stone-500 sm:text-sm"> / {maxQuantity}</span></p></div>
        </div>

        <div className="mt-6 grid grid-cols-2 items-start gap-3 sm:mt-9 sm:gap-5 xl:grid-cols-4">
          {offer.products.map((product) => {
            const productId = String(product.product_id || product.id);
            const quantity = quantities[productId] || 0;
            const soldOut = Number(product.stock_quantity) <= 0;
            return (
              <article key={productId} className={`group min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition sm:rounded-3xl ${quantity ? "border-gold ring-2 ring-gold/20" : "border-stone-200 hover:-translate-y-1 hover:border-gold/60"}`}>
                <div className="relative aspect-square bg-cream"><SmartImage src={product.image_url || "/perfumes.png"} alt={product.name} className="h-full w-full" imgClassName="h-full w-full object-contain transition duration-700 group-hover:brightness-105" />{quantity > 0 && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white"><Check size={13} /> {quantity} selected</span>}</div>
                <div className="p-3 sm:p-5"><h3 className="min-h-10 break-words text-sm font-semibold leading-5 text-ink sm:min-h-12 sm:text-base sm:leading-6">{product.name}</h3><div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="text-lg font-bold text-ink sm:text-xl">{currency(product.unit_price)}</span>{Number(product.price) > Number(product.unit_price) && <span className="text-[10px] text-stone-400 line-through sm:text-sm">{currency(product.price)}</span>}</div><p className="mt-1 text-[10px] text-stone-500 sm:text-xs">{product.stock_quantity > 0 ? `${product.stock_quantity} available` : "Currently unavailable"}</p><div className="mt-3 flex items-center justify-between rounded-xl border border-stone-200 bg-cream/50 p-1 sm:mt-4 sm:p-1.5"><button type="button" onClick={() => changeQuantity(product, -1)} disabled={quantity === 0} aria-label={`Remove one ${product.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition hover:bg-white disabled:opacity-30 sm:h-9 sm:w-9"><Minus size={14} /></button><span className="text-sm font-bold text-ink">{quantity}</span><button type="button" onClick={() => changeQuantity(product, 1)} disabled={soldOut || pricing.totalQuantity >= maxQuantity || quantity >= maxPerProduct} aria-label={`Add one ${product.name}`} className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-ink transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9"><Plus size={14} /></button></div></div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/20 bg-white/95 shadow-[0_-18px_40px_-28px_rgba(20,40,26,0.7)] backdrop-blur">
        <div className="container-site flex items-center gap-3 py-2.5 sm:py-4">
          <div className="min-w-0"><p className="text-sm font-semibold text-ink">{pricing.totalQuantity} selected</p><p className="mt-1 truncate text-xs text-stone-500">{pricing.lines.length ? pricing.lines.map((line) => `${line.name} × ${line.quantity}`).join(" · ") : "Choose one or more perfumes"}</p></div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-5"><div className="text-right"><p className="hidden text-xs text-stone-500 sm:block">Combo total</p><p className="text-lg font-bold text-ink sm:text-2xl">{currency(pricing.total)}</p>{pricing.discount > 0 && <p className="hidden text-xs font-semibold text-emerald-700 sm:block">You save {currency(pricing.discount)}</p>}</div><button type="button" onClick={addToCart} disabled={pricing.totalQuantity < minQuantity} className="btn-gold inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-[11px] disabled:cursor-not-allowed disabled:opacity-45 sm:h-auto sm:gap-2 sm:px-5 sm:py-3 sm:text-sm"><ShoppingBag size={15} /> <span className="max-w-[86px] truncate sm:max-w-none">{offer.cta_label || "Add Combo"}</span></button></div>
        </div>
        {message && <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-xs font-semibold text-red-700">{message}</p>}
      </div>
    </main>
  );
}
