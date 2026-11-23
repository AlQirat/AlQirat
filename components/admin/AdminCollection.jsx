"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, ExternalLink, Gift, Package, PackageCheck, PackagePlus, PackageX, Plus, Radio, Search, Sparkles, Trash2 } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import CatalogDialog from "./CatalogDialog";
import { ProductForm } from "./AdminProducts";
import { COLLECTIONS } from "@/lib/collections";
import { notifyStorefrontUpdate } from "@/lib/storefrontSync";

function StatCard({ icon: Icon, tone, value, label }) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon size={22} />
      </span>
      <div>
        <p className="text-2xl font-bold text-ink">{value}</p>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">{label}</p>
      </div>
    </article>
  );
}

// Admin section for one collection (Special Edition / Gift Set). Its products are listed separately from the
// regular shop catalog, have no categories, and are shown on their own storefront page.
export default function AdminCollection({ collection }) {
  const info = COLLECTIONS[collection];
  const [firstWords, lastWord] = useMemo(() => {
    const words = info.label.split(" ");
    return [words.slice(0, -1).join(" "), words[words.length - 1]];
  }, [info.label]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProducts() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/catalog/products?collection=${encodeURIComponent(collection)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load products.");
      setProducts(result.products);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProducts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    const response = await fetch(`/api/admin/catalog/products/${product.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setError(result.error || "Unable to delete the product.");
    notifyStorefrontUpdate("catalog");
    await loadProducts();
  }

  const closeDialog = () => { setSelected(null); setCreating(false); };
  const inStock = (product) => Number(product.stock_quantity) > 0;
  const inStockCount = products.filter(inStock).length;
  const liveCount = products.filter((product) => product.is_active).length;
  const filteredProducts = useMemo(
    () => products.filter((product) => product.name.toLowerCase().includes(search.trim().toLowerCase())),
    [products, search],
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-r from-cream via-cream-dark to-sage-light p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-white/85 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dark shadow-sm">
              <Sparkles size={13} /> {info.eyebrow}
            </span>
            <h1 className="mt-3 font-serif text-3xl font-bold text-ink sm:text-4xl">
              {firstWords} <span className="text-gold-dark">{lastWord}</span> Manager
            </h1>
            <div className="mt-2 h-1 w-12 rounded-full bg-gold" />
            <p className="mt-3 text-sm text-ink/75 sm:text-base">
              Add and price your {info.plural.toLowerCase()} here. They are listed separately from the Shop at{" "}
              <a href={info.path} target="_blank" rel="noreferrer" className="font-semibold text-gold-dark underline decoration-gold/50 underline-offset-4 hover:text-ink">
                {info.path}
              </a>
              .
            </p>
          </div>
          <a
            href={info.path}
            target="_blank"
            rel="noreferrer"
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/25 bg-white/90 text-forest shadow-sm transition hover:scale-105 hover:bg-white"
            title={`Open ${info.path} storefront page`}
          >
            <PackagePlus size={26} />
          </a>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Package} tone="bg-cream text-gold-dark" value={products.length} label="Total Products" />
        <StatCard icon={PackageCheck} tone="bg-emerald-50 text-emerald-600" value={inStockCount} label="In Stock" />
        <StatCard icon={PackageX} tone="bg-rose-50 text-rose-600" value={products.length - inStockCount} label="Out of Stock" />
        <StatCard icon={Radio} tone={liveCount ? "bg-purple-50 text-purple-600" : "bg-stone-100 text-stone-400"} value={liveCount ? "Live" : "Empty"} label={`${info.plural} Page`} />
      </div>

      {/* Product list */}
      <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-gold-dark">
              <Gift size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ink">{info.label} Products</h2>
              <p className="text-xs text-stone-500">Set each product&apos;s Rate and MRP, photos, sizes and stock</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={info.path}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 transition hover:border-gold hover:text-ink"
            >
              Preview <ExternalLink size={13} />
            </a>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-gold hover:text-ink"
            >
              <Plus size={15} /> Add Product
            </button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <label className="flex h-11 w-full items-center gap-3 rounded-xl border border-stone-200 px-3 focus-within:border-gold">
            <Search size={17} className="shrink-0 text-stone-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${info.plural.toLowerCase()}`} className="w-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>

          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          {loading ? (
            <p className="py-8 text-center text-sm text-stone-500">Loading products...</p>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center">
              <Gift size={28} className="mx-auto text-stone-400" />
              <p className="mt-2 text-sm font-semibold text-ink">No {info.plural.toLowerCase()} yet</p>
              <p className="mt-1 text-xs text-stone-500">Click &ldquo;Add Product&rdquo; to list your first one. It will appear at {info.path}.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-500">No products match your search.</p>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product) => {
                const rate = Number(product.price);
                const mrp = Number(product.compare_at_price);
                const discount = mrp > rate ? Math.round(((mrp - rate) / mrp) * 100) : 0;
                const variantCount = Array.isArray(product.variants) ? product.variants.length : 0;
                return (
                  <article key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm transition hover:border-gold/60">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <SmartImage src={product.image_url} alt={product.name} className="h-16 w-16 shrink-0 rounded-xl bg-cream" imgClassName="h-full w-full object-cover" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="truncate text-sm font-bold text-ink">{product.name}</h3>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${product.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                            {product.is_active ? "Active" : "Hidden"}
                          </span>
                          {variantCount > 0 && <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">{variantCount} {variantCount === 1 ? "size" : "sizes"}</span>}
                          {product.badge && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-gold-dark">{product.badge}</span>}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-ink">₹{rate}</span>
                          {mrp > rate && <span className="text-stone-400 line-through">MRP ₹{mrp}</span>}
                          {discount > 0 && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">{discount}% off</span>}
                          <span className="text-stone-300">•</span>
                          <span className={`font-semibold ${inStock(product) ? "text-emerald-600" : "text-rose-600"}`}>
                            {inStock(product) ? `${product.stock_quantity} in stock` : "Out of stock"}
                          </span>
                        </div>

                        {(product.description || product.short_description) && (
                          <p className="mt-1 line-clamp-1 text-xs text-stone-500">{product.description || product.short_description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelected(product)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 transition hover:border-gold hover:text-ink"
                        title="Edit product"
                        aria-label={`Edit ${product.name}`}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete product"
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {(selected || creating) && (
        <CatalogDialog
          title={creating ? `Add ${info.label} product` : selected.name}
          subtitle={creating ? `This product will be listed at ${info.path}.` : "View and update this product."}
          onClose={closeDialog}
        >
          <ProductForm
            product={creating ? null : selected}
            categories={[]}
            collection={collection}
            onCancel={closeDialog}
            onSaved={async () => { closeDialog(); await loadProducts(); }}
          />
        </CatalogDialog>
      )}
    </div>
  );
}
