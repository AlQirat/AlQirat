"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { getProductPath } from "@/lib/productCatalog";
import { useCart } from "./CartProvider";
import SmartImage from "./SmartImage";

function searchableText(product) {
  return [product.name, product.desc, product.description, product.category, product.subCategory]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function ProductSearch({ expanded = false, onNavigate }) {
  const { catalogProducts: products } = useCart();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    return products
      .filter((product) => searchableText(product).includes(normalizedQuery))
      .sort((first, second) => Number(second.name.toLowerCase().startsWith(normalizedQuery)) - Number(first.name.toLowerCase().startsWith(normalizedQuery)))
      .slice(0, 6);
  }, [normalizedQuery, products]);

  useEffect(() => {
    if (open || expanded) inputRef.current?.focus();
  }, [expanded, open]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!expanded && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [expanded]);

  function submit(event) {
    event.preventDefault();
    if (results[0]) {
      onNavigate?.();
      window.location.assign(getProductPath(results[0]));
    }
  }

  const isOpen = expanded || open;

  return (
    <div ref={rootRef} className="relative">
      <form
        onSubmit={submit}
        className={`flex items-center overflow-hidden rounded-full border transition-all duration-300 ${expanded ? "w-full border-gold/40 bg-white pl-4 shadow-sm" : isOpen ? "w-[190px] border-gold/50 bg-cream pl-3 sm:w-[270px]" : "w-10 border-transparent sm:w-11"}`}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && !expanded && setOpen(false)}
          type="search"
          placeholder="Search products..."
          aria-label="Search products"
          tabIndex={isOpen ? 0 : -1}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
        />
        <button
          type={expanded ? "submit" : "button"}
          aria-label={expanded ? "Search products" : isOpen ? "Close search" : "Open product search"}
          aria-expanded={isOpen}
          onClick={expanded ? undefined : () => setOpen((value) => !value)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-gold/15 hover:text-gold-dark sm:h-11 sm:w-11"
        >
          {!expanded && isOpen ? <X size={20} /> : <Search size={21} />}
        </button>
      </form>

      {isOpen && normalizedQuery.length >= 2 && (
        <div className={expanded ? "absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-2xl border border-gold/25 bg-white shadow-[0_24px_60px_-18px_rgba(21,16,12,0.45)]" : "fixed left-4 right-4 top-[132px] z-[70] overflow-hidden rounded-2xl border border-gold/25 bg-white shadow-[0_24px_60px_-18px_rgba(21,16,12,0.45)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-[360px]"}>
          {results.length ? (
            <div className="divide-y divide-stone-100">
              {results.map((product) => (
                <Link key={product.slug || product.name} href={getProductPath(product)} onClick={() => { setOpen(false); onNavigate?.(); }} className="flex items-center gap-3 p-3 transition hover:bg-cream">
                  <SmartImage src={product.src} alt="" className="h-12 w-12 shrink-0 rounded-xl" imgClassName="h-full w-full object-contain" tone={product.tone} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{product.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-stone-500">{product.category} · {product.subCategory}</span>
                  </span>
                  <span className="text-sm font-bold text-gold-dark">₹{product.price}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-5 py-6 text-center text-sm text-stone-500">No products match “{query.trim()}”.</p>
          )}
        </div>
      )}
    </div>
  );
}
