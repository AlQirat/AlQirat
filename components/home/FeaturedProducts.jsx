"use client";

import { useState } from "react";
import { ArrowRight, Check, Heart, ShoppingCart, Star, StarHalf } from "lucide-react";
import Reveal from "../Reveal";
import SmartImage from "../SmartImage";
import Ornament from "./Ornament";
import { getProductPath } from "@/lib/productCatalog";
import { useCart } from "../CartProvider";
import { useWishlist } from "../WishlistProvider";
import { useStorefrontCatalog } from "../useStorefrontData";

const MAX_FEATURED = 8;

function Stars({ value }) {
  return (
    <div className="flex items-center text-gold">
      {[1, 2, 3, 4, 5].map((i) => {
        if (value >= i) return <Star key={i} size={12} fill="currentColor" />;
        if (value >= i - 0.5) return <StarHalf key={i} size={12} fill="currentColor" />;
        return <Star key={i} size={12} className="text-stone-300" />;
      })}
    </div>
  );
}

export default function FeaturedProducts({ initialCatalog }) {
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { products } = useStorefrontCatalog(initialCatalog);
  const [justAdded, setJustAdded] = useState("");

  // Featured products first; if none are flagged yet, show the newest ones instead of an empty section.
  const featured = products.filter((product) => product.isFeatured);
  const shown = (featured.length ? featured : products).slice(0, MAX_FEATURED);
  if (!shown.length) return null;

  const add = (product) => {
    addItem(product, 1);
    setJustAdded(product.name);
    setTimeout(() => setJustAdded((current) => (current === product.name ? "" : current)), 1600);
  };

  return (
    <section className="bg-cream pb-16 lg:pb-20">
      <div className="container-site">
        <Reveal className="relative text-center">
          <h2 className="font-serif text-4xl font-semibold text-ink lg:text-5xl">Featured Products</h2>
          <Ornament className="mt-3" />
          <p className="mt-3 text-sm text-ink/60">Our most loved fragrances, chosen by our customers.</p>
          <a
            href="/shop"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold px-5 py-2 text-xs font-medium text-ink transition hover:bg-gold hover:text-ink md:absolute md:right-0 md:top-3 md:mt-0"
          >
            View All <ArrowRight size={14} />
          </a>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {shown.map((product, index) => {
            const liked = isWishlisted(product);
            const added = justAdded === product.name;
            return (
              <Reveal key={product.id || product.slug || product.name} delay={index * 70}>
                <article className="group h-full overflow-hidden rounded-2xl bg-white shadow-[0_14px_36px_-26px_rgba(20,40,26,0.55)] ring-1 ring-black/[0.04] transition duration-500 hover:-translate-y-1.5">
                  <div className="relative">
                    <SmartImage
                      src={product.src}
                      alt={product.name}
                      tone={product.tone || "from-sage to-cream"}
                      imageKitTransform="f-auto,q-80,w-700"
                      className="aspect-square w-full"
                      imgClassName="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    >
                      <a href={getProductPath(product)} aria-label={`View ${product.name}`} className="absolute inset-0 z-[1]" />
                    </SmartImage>
                    <button
                      type="button"
                      aria-label={liked ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                      aria-pressed={liked}
                      onClick={() => toggleWishlist(product)}
                      className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow transition hover:scale-110 ${
                        liked ? "text-red-500" : "text-ink/70 hover:text-red-500"
                      }`}
                    >
                      <Heart size={15} fill={liked ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="px-4 pb-4 pt-4 text-center">
                    <h3 className="font-serif text-xl font-semibold leading-tight text-ink">
                      <a href={getProductPath(product)} className="transition hover:text-gold-dark">{product.name}</a>
                    </h3>
                    <p className="mt-1 text-[12.5px] text-ink/60">{product.desc}</p>
                    {product.reviews > 0 && (
                      <div className="mt-2 flex items-center justify-center gap-1.5">
                        <Stars value={product.rating} />
                        <span className="text-[11.5px] text-ink/50">({product.reviews})</span>
                      </div>
                    )}
                    <p className="mt-2 text-lg font-semibold text-ink">₹ {Number(product.price).toLocaleString("en-IN")}</p>
                    <button
                      type="button"
                      onClick={() => add(product)}
                      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-[13px] font-medium text-white transition duration-300 ${
                        added ? "bg-forest" : "bg-ink hover:bg-forest"
                      }`}
                    >
                      {added ? <><Check size={15} /> Added</> : <><ShoppingCart size={15} /> Add to Cart</>}
                    </button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
