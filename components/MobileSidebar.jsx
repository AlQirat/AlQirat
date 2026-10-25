"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Heart, X, ShoppingBag } from "lucide-react";
import Logo from "./Logo";
import SmartImage from "./SmartImage";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";
import ProductSearch from "./ProductSearch";

// Slide-in drawer used for the mobile / tablet navigation (light theme).
export default function MobileSidebar({ open, onClose, items }) {
  const [expanded, setExpanded] = useState(null);
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  // lock page scroll while open, close on Esc
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // collapse accordions when the drawer closes
  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  return (
    <div className="lg:hidden" aria-hidden={!open}>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-ink/50 backdrop-blur-sm transition-opacity duration-500 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`fixed right-0 top-0 z-[70] flex h-dvh w-[86vw] max-w-[390px] flex-col overflow-hidden bg-gradient-to-b from-white via-cream to-cream-dark text-ink transition-transform duration-500 ease-[cubic-bezier(.22,.8,.2,1)] ${
          open ? "translate-x-0 shadow-[-30px_0_80px_-10px_rgba(20,40,26,0.45)]" : "translate-x-full"
        }`}
      >
        {/* decoration */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 animate-glow rounded-full bg-[radial-gradient(circle,rgba(232,189,109,0.4),transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 animate-glow rounded-full bg-[radial-gradient(circle,rgba(201,154,75,0.25),transparent_65%)]" />
        <span className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-gold-dark via-gold-light to-gold-dark" />

        {/* top: logo + close */}
        <div className="relative flex items-center justify-between px-6 pb-4 pt-5">
          <Logo className="h-16" />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/50 bg-white text-gold-dark shadow-sm transition duration-300 hover:rotate-90 hover:bg-gold hover:text-ink"
          >
            <X size={22} />
          </button>
        </div>
        <span className="relative mx-6 h-px bg-gradient-to-r from-gold via-gold/40 to-transparent" />

        {/* scrollable body */}
        <div className="relative flex-1 overflow-y-auto px-6 pb-6 pt-5">
          {open && <ProductSearch expanded onNavigate={onClose} />}

          {/* links */}
          <nav className="mt-4">
            {items.map((item, i) => {
              const isOpen = expanded === i;
              const row = (
                <>
                  <span className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold tabular-nums text-gold-dark/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[17px] font-semibold transition hover:text-gold-dark">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="rounded-full bg-gradient-to-b from-gold-light to-gold px-2 py-0.5 text-[9px] font-bold uppercase leading-none text-ink">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  {item.children && (
                    <ChevronDown
                      size={18}
                      className={`text-gold-dark transition duration-300 ${isOpen ? "rotate-180" : ""}`}
                    />
                  )}
                </>
              );

              return (
                <div
                  key={item.label}
                  style={{ transitionDelay: open ? `${150 + i * 55}ms` : "0ms" }}
                  className={`border-b border-stone-200/80 transition-all duration-500 ${
                    open ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
                  }`}
                >
                  {item.children ? (
                    <button
                      onClick={() => setExpanded(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className={`flex w-full items-center justify-between py-4 text-left transition hover:text-gold-dark ${
                        isOpen ? "text-gold-dark" : ""
                      }`}
                    >
                      {row}
                    </button>
                  ) : (
                    <a
                      href={item.href || "#"}
                      onClick={onClose}
                      className="flex items-center justify-between py-4 transition hover:text-gold-dark"
                    >
                      {row}
                    </a>
                  )}

                  {item.children && (
                    <div
                      className={`grid transition-[grid-template-rows] duration-500 ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <ul className="mb-3 space-y-1">
                          {item.children.map((c) => (
                            <li key={c.name}>
                              <a
                                href={c.href}
                                onClick={onClose}
                                className="group/c flex items-center gap-4 rounded-xl p-2 text-[15px] font-medium text-ink transition hover:bg-white hover:text-gold-dark"
                              >
                                {c.image !== undefined && (
                                  <SmartImage
                                    src={c.image}
                                    alt=""
                                    tone="from-sage to-cream"
                                    imageKitTransform="f-auto,q-75,w-160"
                                    className="h-14 w-14 shrink-0 rounded-xl"
                                    imgClassName="h-full w-full object-cover"
                                  />
                                )}
                                <span className="flex-1">{c.name}</span>
                              </a>
                            </li>
                          ))}
                          <li>
                            <a href={item.href} onClick={onClose} className="flex items-center justify-center rounded-xl py-3 text-sm font-semibold text-gold-dark">
                              View all products
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* bottom: CTA */}
        <div className="relative border-t border-gold/30 bg-white/80 px-6 pb-6 pt-5 backdrop-blur-sm">
          <a href="/cart" onClick={onClose} className="group relative flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 pl-6 pr-4 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(21,16,12,0.7)] transition duration-300 hover:-translate-y-0.5 hover:bg-gradient-to-b hover:from-gold-light hover:to-gold hover:text-ink mb-4">
            <ShoppingBag size={18} className="text-gold-light transition group-hover:text-ink" />
            <span>Cart</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-gold-light to-gold text-xs font-bold text-ink transition group-hover:bg-ink group-hover:text-gold-light">
              {itemCount}
            </span>
          </a>
          <a href="/wishlist" onClick={onClose} className="mb-4 flex w-full items-center justify-center gap-2 rounded-full border border-gold/40 bg-white py-3 text-sm font-semibold text-ink transition hover:border-gold hover:bg-gold/10">
            <Heart size={17} fill={wishlistCount ? "currentColor" : "none"} className={wishlistCount ? "text-red-500" : "text-gold-dark"} />
            Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ""}
          </a>
          <a href="/shop" onClick={onClose} className="btn-gold w-full !py-3.5 !text-[15px]">
            Shop Collection
          </a>

        </div>
      </aside>
    </div>
  );
}
