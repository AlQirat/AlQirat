"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CreditCard,
  Eye,
  Minus,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SmartImage from "./SmartImage";
import PriceDisplay from "./PriceDisplay";
import { useCart } from "./CartProvider";
import { useStorefrontComboOffer } from "./useStorefrontData";
import {
  calculateComboPricing,
  clearComboDraft,
  readComboDraft,
  writeComboDraft,
} from "@/lib/comboPricing";

function currency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function ComboOfferPage({ initialOffer }) {
  const router = useRouter();
  const { addComboItem } = useCart();
  const { data, error } = useStorefrontComboOffer({ offer: initialOffer });
  const offer = data.offer;

  const [quantities, setQuantities] = useState({});
  const [targetSets, setTargetSets] = useState(1);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [toast, setToast] = useState("");
  const prevTotalRef = useRef(0);
  const gridRef = useRef(null);

  // Hydrate saved combo slot selections from localStorage so visiting a Product Details Page never loses selected bottles
  useEffect(() => {
    if (!offer?.id) return;
    const draft = readComboDraft(offer.id);
    const validQuantities = Object.fromEntries(
      Object.entries(draft.quantities || {}).filter(([productId, qty]) =>
        Number(qty) > 0 &&
        offer?.products?.some((product) => String(product.product_id || product.id) === productId),
      ),
    );
    setQuantities(validQuantities);
    setTargetSets(draft.targetSets || 1);
    const initialTotal = Object.values(validQuantities).reduce((sum, q) => sum + (Number(q) || 0), 0);
    prevTotalRef.current = initialTotal;
    setDraftHydrated(true);
  }, [offer?.id]);

  // Keep quantities filtered if eligible products change
  useEffect(() => {
    if (!draftHydrated || !offer) return;
    setQuantities((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([productId]) =>
          offer?.products?.some((product) => String(product.product_id || product.id) === productId),
        ),
      ),
    );
  }, [offer, draftHydrated]);

  // Persist draft selection to localStorage whenever quantities or targetSets change
  useEffect(() => {
    if (!draftHydrated || !offer?.id) return;
    writeComboDraft(offer.id, quantities, targetSets);
  }, [quantities, targetSets, offer?.id, draftHydrated]);

  const bundleQuantity = Math.max(2, Number(offer?.bundle_quantity) || 4);
  const maxQuantity = Math.max(bundleQuantity, Number(offer?.max_quantity) || bundleQuantity * 10);
  const maxPerProduct = Math.max(1, Number(offer?.max_quantity_per_product) || maxQuantity);
  const maxAllowedSets = Math.max(1, Math.floor(maxQuantity / bundleQuantity));

  const selections = useMemo(
    () =>
      (offer?.products || [])
        .map((product) => ({
          ...product,
          product_id: String(product.product_id || product.id),
          quantity: quantities[String(product.product_id || product.id)] || 0,
        }))
        .filter((product) => product.quantity > 0),
    [offer, quantities],
  );

  const pricing = useMemo(() => calculateComboPricing(offer || {}, selections), [offer, selections]);
  const totalSelected = pricing.totalQuantity;

  const minimumSetsForSelection = Math.max(1, Math.ceil(totalSelected / bundleQuantity));
  const currentSetGoal = Math.min(maxAllowedSets, Math.max(targetSets, minimumSetsForSelection));
  const currentTargetBottles = Math.min(maxQuantity, currentSetGoal * bundleQuantity);
  const remainingToGoal = Math.max(0, currentTargetBottles - totalSelected);
  const completedSets = Math.floor(totalSelected / bundleQuantity);
  const isCurrentGoalComplete = totalSelected > 0 && totalSelected === currentTargetBottles;
  const isReadyForCheckout = totalSelected >= bundleQuantity && totalSelected % bundleQuantity === 0;
  const progressPercent = Math.min(100, Math.round((totalSelected / currentTargetBottles) * 100));

  useEffect(() => {
    if (!draftHydrated) return;
    if (totalSelected < prevTotalRef.current) {
      const shrunkSets = Math.max(1, Math.ceil(totalSelected / bundleQuantity));
      if (shrunkSets < targetSets) setTargetSets(shrunkSets);
    }
    if (
      totalSelected > prevTotalRef.current &&
      totalSelected >= bundleQuantity &&
      totalSelected % bundleQuantity === 0
    ) {
      const setsUnlocked = totalSelected / bundleQuantity;
      const saved = pricing.discount;
      setToast(
        saved > 0
          ? `${setsUnlocked > 1 ? `${setsUnlocked} Combo Sets` : "Combo Discount"} unlocked! You saved ${currency(saved)}`
          : `Your ${setsUnlocked > 1 ? `${setsUnlocked} combo sets are` : "combo gift set is"} complete`,
      );
      prevTotalRef.current = totalSelected;
    }
    prevTotalRef.current = totalSelected;
  }, [totalSelected, bundleQuantity, pricing.discount, targetSets, draftHydrated]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 3800);
    return () => clearTimeout(id);
  }, [toast]);

  function canIncrementProduct(product) {
    if (!offer) return false;
    const productId = String(product.product_id || product.id);
    const currentQuantity = quantities[productId] || 0;
    const stock = Number(product.stock_quantity);
    if (stock <= 0 || currentQuantity >= stock) return false;
    if (currentQuantity >= maxPerProduct) return false;
    if (totalSelected >= maxQuantity) return false;
    if (!offer.allow_same_product && currentQuantity >= 1) return false;
    if (!offer.allow_mixed_products && totalSelected > 0 && currentQuantity === 0) return false;
    return true;
  }

  function changeQuantity(product, delta) {
    if (!offer) return;
    const productId = String(product.product_id || product.id);
    const currentQuantity = quantities[productId] || 0;
    const nextQuantity = currentQuantity + delta;
    if (nextQuantity < 0) return;
    if (delta > 0 && !canIncrementProduct(product)) return;

    const nextTotal = totalSelected + delta;
    if (delta > 0 && nextTotal > currentTargetBottles && nextTotal <= maxQuantity) {
      setTargetSets(Math.ceil(nextTotal / bundleQuantity));
    }

    setQuantities((current) => {
      const updated = { ...current, [productId]: nextQuantity };
      if (nextQuantity <= 0) delete updated[productId];
      return updated;
    });
  }

  function handleCheckout() {
    if (!isReadyForCheckout) {
      setToast(`Please add ${remainingToGoal} more bottle${remainingToGoal === 1 ? "" : "s"} to complete your set.`);
      return;
    }
    addComboItem(offer, selections, { replace: true });
    clearComboDraft();
    setToast(`${totalSelected} bottles added to your bag. Redirecting to checkout...`);
    router.push("/checkout");
  }

  function getProductDetailsHref(product) {
    return `/products/${product.slug}?from=combos`;
  }

  if (error) {
    return (
      <main className="min-h-[60vh] bg-cream px-4 py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-100 bg-white p-10 text-center">
          <h1 className="font-serif text-3xl text-ink">Combo Set Unavailable</h1>
          <p className="mt-3 text-stone-500">{error}</p>
        </div>
      </main>
    );
  }

  if (!offer) {
    return (
      <main className="min-h-[60vh] bg-cream px-4 py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-gold/20 bg-white p-10 text-center shadow-sm">
          <Sparkles className="mx-auto text-gold-dark" size={34} />
          <h1 className="mt-4 font-serif text-3xl text-ink">Our Combo Sets Are Taking a Pause</h1>
          <p className="mt-3 text-stone-500">Please check back soon for our next custom gift & combo offer.</p>
          <a href="/shop" className="btn-gold mt-7 inline-flex">
            Continue Shopping
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-cream pb-56 text-ink">
      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 top-24 z-50 -translate-x-1/2 rounded-full border border-gold/40 bg-ink/95 px-5 py-2.5 text-xs font-bold text-gold-light shadow-2xl backdrop-blur-md sm:text-sm"
        >
          {toast}
        </div>
      )}

      {/* Al Qirat Theme Hero Section with Option A Background Banner (Desktop + Mobile) */}
      <section className="relative isolate overflow-hidden border-b border-gold/25 bg-cream-dark">
        <div className="absolute inset-0 -z-20">
          <SmartImage
            src={offer.banner_image_url || "/combo-banner-desktop.jpg"}
            alt={offer.title}
            tone="from-sage to-cream"
            imageKitTransform="f-auto,q-80,w-1920"
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 hidden md:block"
            imgClassName="h-full w-full object-cover object-[78%_center]"
          />
          <SmartImage
            src={offer.mobile_banner_image_url || "/combo-banner-mobile.jpg"}
            alt={offer.title}
            tone="from-sage to-cream"
            imageKitTransform="f-auto,q-80,w-1080"
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 md:hidden"
            imgClassName="h-full w-full object-cover object-bottom"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-cream/85 via-cream/45 to-transparent md:bg-gradient-to-r md:from-cream/85 md:via-cream/45 md:via-45% md:to-transparent md:to-70%" />

        <div className="container-site relative z-10 flex min-h-[460px] flex-col justify-center py-12 sm:py-16 md:min-h-[480px] lg:min-h-[520px]">
          <div className="max-w-[580px]">
            <h1 className="animate-fade-up font-serif text-[clamp(34px,3.25vw,54px)] font-semibold leading-[1.08] text-ink drop-shadow-[0_2px_10px_rgba(246,244,236,0.85)]">
              {offer.title}
            </h1>

            <div className="mt-4 animate-fade-up [animation-delay:150ms]">
              <span aria-hidden="true" className="flex items-center gap-2">
                <span className="h-px w-24 bg-gold/70" />
                <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
                <span className="h-px w-24 bg-gold/70" />
              </span>
              <p className="mt-3.5 text-[11.5px] font-medium uppercase tracking-[0.3em] text-ink/80">
                Build Your Own Luxury Set · Any {bundleQuantity} For {currency(offer.combo_price)}
              </p>
            </div>

            <p className="mt-4 max-w-[440px] animate-fade-up text-[15.5px] leading-relaxed text-ink/75 drop-shadow-[0_1px_8px_rgba(246,244,236,0.9)] [animation-delay:250ms]">
              {offer.subtitle ||
                offer.description ||
                `Pick any ${bundleQuantity} perfumes for just ${currency(offer.combo_price)}`}
            </p>

            <button
              type="button"
              onClick={() => gridRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="btn-forest relative z-20 mt-6 inline-flex animate-fade-up !px-7 [animation-delay:350ms]"
            >
              Start Building Your Set
            </button>
          </div>
        </div>
      </section>

      {/* Product Grid Section */}
      <section ref={gridRef} className="container-site py-8 sm:py-12">
        <div className="grid grid-cols-2 gap-3.5 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {(offer.products || []).map((product) => {
            const productId = String(product.product_id || product.id);
            const quantity = quantities[productId] || 0;
            const soldOut = Number(product.stock_quantity) <= 0;
            const canAddMore = canIncrementProduct(product);
            const reachedSetGoal = totalSelected >= currentTargetBottles && totalSelected >= maxQuantity;
            const displayPrice = Number(product.price || product.unit_price || 0);
            const displayMrp = Number(product.compare_at_price) > displayPrice ? Number(product.compare_at_price) : null;
            const variantLabel =
              product.variant_label && product.variant_label.toLowerCase() !== "standard"
                ? product.variant_label
                : "";
            const productHref = getProductDetailsHref(product);

            return (
              <article
                key={productId}
                className={`group relative flex h-full min-w-0 select-none flex-col overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_-18px_rgba(21,16,12,0.35)] transition duration-500 ${
                  quantity > 0
                    ? "ring-2 ring-gold shadow-[0_20px_45px_-18px_rgba(201,154,75,0.55)]"
                    : reachedSetGoal || soldOut
                      ? "ring-1 ring-stone-200 opacity-60"
                      : "ring-1 ring-stone-200 hover:-translate-y-3 hover:shadow-[0_34px_60px_-20px_rgba(201,154,75,0.6)] hover:ring-gold/70"
                }`}
              >
                {/* Product Image Container — Exact /shop aspect-[2/3] Portrait Poster linking to Product Details Page */}
                <SmartImage
                  src={product.image_url || "/perfumes.png"}
                  alt={product.name}
                  className="relative aspect-[2/3] w-full shrink-0"
                  imgClassName="pointer-events-none block h-full w-full object-contain transition duration-700 group-hover:brightness-105"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
                  <Link
                    href={productHref}
                    aria-label={`View ${product.name} details`}
                    className="absolute inset-0 z-[1]"
                  />

                  {/* Top-left Selected Pill */}
                  {quantity > 0 && (
                    <span className="pointer-events-none absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white shadow-lg">
                      <Check size={13} className="text-gold-light" /> {quantity} selected
                    </span>
                  )}

                  {/* Top-right Sold Out or Badge */}
                  {soldOut ? (
                    <span className="pointer-events-none absolute right-2.5 top-2.5 z-10 rounded-full bg-ink/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                      Sold Out
                    </span>
                  ) : (
                    product.badge && (
                      <span className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-700 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg">
                        {product.badge === "New Arrival" || product.badge === "New" ? "NEW" : product.badge}
                      </span>
                    )
                  )}

                  {/* Quick View Link to Full Product Details Page */}
                  <Link
                    href={productHref}
                    className="absolute inset-x-3 bottom-3 z-10 flex translate-y-6 items-center justify-center gap-1.5 rounded-full bg-white/90 py-1.5 text-[10px] font-semibold text-ink opacity-0 shadow-lg backdrop-blur-xs transition duration-500 hover:bg-gold group-hover:translate-y-0 group-hover:opacity-100"
                  >
                    <Eye size={12} /> View Details
                  </Link>
                </SmartImage>

                {/* Card Content — Exact /shop Product Listing Style */}
                <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 break-words text-base font-bold leading-snug text-ink">
                        <Link href={productHref} className="transition hover:text-gold-dark">
                          {product.name}
                        </Link>
                      </h2>
                      {variantLabel && (
                        <span className="shrink-0 rounded-md border border-gold/30 bg-cream px-2 py-0.5 text-[10px] font-bold text-gold-dark">
                          {variantLabel}
                        </span>
                      )}
                    </div>

                    {(product.short_description || product.description) && (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-stone-500">
                        {product.short_description || product.description}
                      </p>
                    )}

                    <PriceDisplay
                      price={displayPrice}
                      compareAtPrice={displayMrp}
                      showMrpAfterPrice
                      className="mt-2"
                      priceClassName="text-xl font-bold text-ink"
                      mrpClassName="text-xs font-medium text-stone-400"
                    />
                  </div>

                  {/* Interactive Action Control */}
                  <div className="mt-3">
                    {soldOut ? (
                      <button
                        type="button"
                        disabled
                        className="w-full cursor-not-allowed rounded-xl bg-stone-100 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-400"
                      >
                        Sold Out
                      </button>
                    ) : quantity === 0 ? (
                      !canAddMore ? (
                        <button
                          type="button"
                          disabled
                          className="w-full cursor-not-allowed rounded-xl border border-stone-200 bg-stone-100 py-2.5 text-xs font-bold text-stone-400"
                        >
                          Set Full
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => changeQuantity(product, 1)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-xs font-semibold text-white transition hover:bg-forest sm:text-sm"
                        >
                          <Plus size={15} /> Add to Combo
                        </button>
                      )
                    ) : (
                      <div className="flex items-center justify-between rounded-xl border border-gold bg-cream p-1">
                        <button
                          type="button"
                          onClick={() => changeQuantity(product, -1)}
                          aria-label={`Remove one ${product.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink shadow-2xs transition hover:bg-stone-100 sm:h-9 sm:w-9"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold text-ink">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(product, 1)}
                          disabled={!canAddMore}
                          aria-label={`Add one ${product.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white shadow-2xs transition hover:bg-forest disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Al Qirat Theme Sticky Bottom Visual Slot Dock */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-white/95 shadow-[0_-14px_40px_-18px_rgba(20,40,26,0.3)] backdrop-blur-xl">
        <div className="container-site py-3.5 sm:py-4">
          {/* Status Text & Progress Counter Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-ink sm:text-sm">
              {remainingToGoal > 0 ? (
                <>
                  Add{" "}
                  <span className="font-bold text-gold-dark">{remainingToGoal}</span>{" "}
                  more bottle{remainingToGoal === 1 ? "" : "s"} to unlock{" "}
                  {currentSetGoal > 1 ? `Set #${currentSetGoal} ` : ""}special price of{" "}
                  <span className="font-bold text-ink">
                    {currency(currentSetGoal * Number(offer.combo_price || 0))}
                  </span>
                </>
              ) : (
                <span className="font-bold text-forest">
                  {completedSets} Combo Set{completedSets > 1 ? "s" : ""} Unlocked — Special price of{" "}
                  {currency(pricing.total)} applied
                </span>
              )}
            </p>

            <div className="flex items-center gap-3">
              {isCurrentGoalComplete && currentSetGoal < maxAllowedSets && (
                <button
                  type="button"
                  onClick={() => setTargetSets((s) => Math.min(maxAllowedSets, s + 1))}
                  className="rounded-full border border-gold/40 bg-cream px-3 py-1 text-[11px] font-bold text-ink transition hover:border-forest hover:bg-forest hover:text-white"
                >
                  + Add Set #{currentSetGoal + 1} (+{bundleQuantity} slots)
                </button>
              )}
              <span className="text-xs font-bold tabular-nums text-ink sm:text-sm">
                {totalSelected} <span className="text-gold-dark">/ {currentTargetBottles}</span>
              </span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-cream-dark">
            <div
              style={{ width: `${progressPercent}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                isReadyForCheckout
                  ? "bg-gradient-to-r from-forest to-ink"
                  : "bg-gradient-to-r from-gold-dark via-gold to-gold-light"
              }`}
            />
          </div>

          {/* Bottom Row: Visual Slot Boxes (+) & Checkout CTA */}
          <div className="mt-3.5 flex items-center justify-between gap-3">
            {/* Scrollable Slot Thumbnails + Empty '+' Boxes */}
            <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto py-1">
              {selections.map((item) => (
                <div
                  key={item.product_id}
                  className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border-2 border-gold bg-cream shadow-2xs sm:h-16 sm:w-16"
                  title={`${item.name} × ${item.quantity}`}
                >
                  <SmartImage
                    src={item.image_url || "/perfumes.png"}
                    alt={item.name}
                    className="h-full w-full"
                    imgClassName="h-full w-full object-cover"
                  />
                  {item.quantity > 1 && (
                    <span className="absolute bottom-1 right-1 rounded-md bg-ink/90 px-1.5 py-0.5 text-[10px] font-bold text-gold-light">
                      ×{item.quantity}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => changeQuantity(item, -1)}
                    aria-label={`Remove one ${item.name}`}
                    className="absolute inset-0 flex items-center justify-center bg-ink/60 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {/* Empty Dashed '+' Slot Boxes for Remaining Bottles */}
              {Array.from({ length: Math.min(10, remainingToGoal) }).map((_, index) => (
                <button
                  key={`empty-slot-${index}`}
                  type="button"
                  onClick={() => gridRef.current?.scrollIntoView({ behavior: "smooth" })}
                  aria-label={`Empty bottle slot ${index + 1}`}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-gold/45 bg-cream/70 text-gold-dark transition hover:border-gold hover:bg-cream sm:h-16 sm:w-16"
                >
                  <Plus size={18} />
                </button>
              ))}
            </div>

            {/* Right Price Summary + Checkout Button */}
            <div className="flex shrink-0 items-center gap-3 sm:gap-5">
              {isReadyForCheckout && (
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span className="text-base font-bold text-ink sm:text-xl">
                      {currency(pricing.total)}
                    </span>
                    {pricing.discount > 0 && (
                      <span className="hidden text-xs text-stone-400 line-through sm:inline">
                        {currency(pricing.regularSubtotal)}
                      </span>
                    )}
                  </div>
                  {pricing.discount > 0 && (
                    <p className="text-[11px] font-bold text-forest">
                      Saved {currency(pricing.discount)}!
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={!isReadyForCheckout}
                className={`inline-flex h-12 items-center gap-2 rounded-full px-6 text-xs font-bold tracking-wide text-white shadow-md transition sm:h-13 sm:px-8 sm:text-sm ${
                  isReadyForCheckout
                    ? "bg-forest hover:bg-ink"
                    : "cursor-not-allowed bg-forest/45 opacity-80"
                }`}
              >
                <CreditCard size={16} />
                <span>Checkout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
