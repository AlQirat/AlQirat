"use client";

import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import SmartImage from "./SmartImage";
import Reveal from "./Reveal";
import { getProductPath } from "@/lib/productCatalog";
import { useCart } from "./CartProvider";
import { getWishlistKey, useWishlist } from "./WishlistProvider";
import { useStorefrontCatalog } from "./useStorefrontData";

export default function WishlistPage() {
  const { addItem } = useCart();
  const { keys, removeFromWishlist, clearWishlist } = useWishlist();
  const { products, error } = useStorefrontCatalog();
  const wishlistProducts = products.filter((product) => keys.includes(getWishlistKey(product)));

  return (
    <main className="relative min-h-[70vh] overflow-hidden bg-cream py-16 lg:py-24">
      <div className="pointer-events-none absolute -left-40 top-16 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(232,189,109,0.25),transparent_65%)]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(201,154,75,0.2),transparent_65%)]" />

      <div className="container-site relative">
        <Reveal className="flex flex-wrap items-end justify-between gap-5 border-b border-gold/20 pb-7">
          <div>
            <p className="flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.35em] text-gold-dark">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold-dark" />
              Your collection
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold text-ink sm:text-5xl">
              My <span className="text-shimmer-dark">Wishlist</span>
            </h1>
            <p className="mt-3 text-base text-stone-500">
              {wishlistProducts.length ? `${wishlistProducts.length} saved product${wishlistProducts.length === 1 ? "" : "s"}` : "Save products here while you browse."}
            </p>
          </div>
          {wishlistProducts.length > 0 && (
            <button type="button" onClick={clearWishlist} className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-red-300 hover:text-red-600">
              Clear Wishlist
            </button>
          )}
        </Reveal>

        {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Catalog synchronization failed: {error}</p>}

        {wishlistProducts.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {wishlistProducts.map((product, index) => (
              <Reveal key={getWishlistKey(product)} delay={index * 45}>
                <article className="group relative h-full overflow-hidden rounded-3xl bg-white shadow-[0_14px_35px_-22px_rgba(21,16,12,0.4)] ring-1 ring-stone-200 transition duration-500 hover:-translate-y-2 hover:ring-gold/70">
                  <div className="relative">
                    <SmartImage
                      src={product.src}
                      alt={product.name}
                      tone={product.tone}
                      className="aspect-square w-full"
                      imgClassName="h-full w-full object-contain transition duration-700 group-hover:scale-105"
                    />
                    <a href={getProductPath(product)} aria-label={`View ${product.name} details`} className="absolute inset-0" />
                    <button type="button" onClick={() => removeFromWishlist(product)} aria-label={`Remove ${product.name} from wishlist`} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:scale-110">
                      <Heart size={16} fill="currentColor" />
                    </button>
                  </div>
                  <div className="p-3 sm:p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-dark">{product.subCategory || product.category}</p>
                    <h2 className="mt-1.5 break-words text-sm font-bold leading-snug sm:text-base">
                      <a href={getProductPath(product)} className="transition hover:text-gold-dark">{product.name}</a>
                    </h2>
                    <p className="mt-2 text-xl font-bold"><span className="mr-0.5 text-base text-gold-dark">₹</span>{product.price}</p>
                    <button type="button" onClick={() => addItem(product, 1)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-xs font-semibold text-white transition hover:bg-gradient-to-b hover:from-gold-light hover:to-gold hover:text-ink">
                      <ShoppingCart size={14} /> Add to Cart
                    </button>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal className="mx-auto mt-12 max-w-xl rounded-3xl border border-gold/20 bg-white px-6 py-16 text-center shadow-sm">
            <Heart size={34} className="mx-auto text-gold" />
            <h2 className="mt-5 font-serif text-3xl font-semibold text-ink">Your wishlist is empty</h2>
            <p className="mt-3 text-sm leading-6 text-stone-500">Tap the heart on any product to keep it here for later.</p>
            <a href="/shop" className="btn-gold mt-6 inline-flex">Browse Products</a>
          </Reveal>
        )}
      </div>
    </main>
  );
}
