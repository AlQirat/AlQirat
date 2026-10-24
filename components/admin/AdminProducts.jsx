"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, PackagePlus, Plus, Save, Search, Trash2, Upload, X } from "lucide-react";
import { uploadImage } from "@/lib/uploadImage";
import SmartImage from "@/components/SmartImage";
import CatalogDialog from "./CatalogDialog";
import { notifyStorefrontUpdate } from "@/lib/storefrontSync";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10";

function normalizeVariants(variants) {
  return Array.isArray(variants)
    ? variants.map((variant) => ({
        size: String(variant?.size || ""),
        price: variant?.price ?? "",
        stock: variant?.stock ?? "",
      }))
    : [];
}

function ProductForm({ product, categories, onSaved, onCancel }) {
  const [categoryId, setCategoryId] = useState(product?.category_id || categories[0]?.id || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState(() => [...new Set([product?.image_url, ...(product?.gallery_urls || [])].filter(Boolean))]);
  const [variants, setVariants] = useState(() => normalizeVariants(product?.variants));
  const category = categories.find((item) => item.id === categoryId);
  
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    if (!imageUrls.length) {
      setError("Add at least one product image.");
      setSaving(false);
      return;
    }
    const normalizedVariants = variants
        .map((variant) => ({
          size: variant.size.trim(),
          price: Number(variant.price),
          ...(variant.stock === "" ? {} : { stock: Number(variant.stock) }),
        }))
        .filter((variant) => variant.size || Number.isFinite(variant.price) || variant.stock !== undefined);
    const variantSizes = new Set();
    for (const [index, variant] of normalizedVariants.entries()) {
      if (!variant.size) {
        setError(`Enter a size for option ${index + 1}.`);
        setSaving(false);
        return;
      }
      const sizeKey = variant.size.toLowerCase();
      if (variantSizes.has(sizeKey)) {
        setError(`Each size must be unique. “${variant.size}” is repeated.`);
        setSaving(false);
        return;
      }
      variantSizes.add(sizeKey);
      if (!Number.isFinite(variant.price) || variant.price < 0) {
        setError(`Enter a valid price for ${variant.size}.`);
        setSaving(false);
        return;
      }
      if (variant.stock !== undefined && (!Number.isInteger(variant.stock) || variant.stock < 0)) {
        setError(`Enter a valid stock quantity for ${variant.size}.`);
        setSaving(false);
        return;
      }
    }
    const payload = {
      name: form.get("name"), category_id: categoryId, subcategory_id: form.get("subcategory_id") || null,
      short_description: form.get("short_description"), description: form.get("description"),
      price: normalizedVariants[0]?.price ?? form.get("price"), stock_quantity: form.get("stock_quantity"), image_url: imageUrls[0], gallery_urls: imageUrls.slice(1), variants: normalizedVariants,
      badge: form.get("badge"), is_active: form.get("is_active") === "on", is_featured: form.get("is_featured") === "on",
    };
    const url = product ? `/api/admin/catalog/products/${product.id}` : "/api/admin/catalog/products";
    const response = await fetch(url, { method: product ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setError(result.error || "Unable to save the product.");
    notifyStorefrontUpdate("catalog");
    onSaved();
  }

  async function handleImageUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = await Promise.all(files.map((file) => uploadImage(file, "/al-qirat/products")));
      setImageUrls((current) => [...new Set([...current, ...urls])]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function addImageUrl() {
    const url = newImageUrl.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
      setError("Enter a valid image URL.");
      return;
    }
    setImageUrls((current) => [...new Set([...current, url])]);
    setNewImageUrl("");
    setError("");
  }

  function makePrimary(index) {
    setImageUrls((current) => [current[index], ...current.filter((_, imageIndex) => imageIndex !== index)]);
  }

  return (
    <form onSubmit={save} className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
      {imageUrls.length > 0 && <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">{imageUrls.map((url, index) => <div key={url} className={`overflow-hidden rounded-2xl border bg-cream ${index === 0 ? "border-gold ring-2 ring-gold/20" : "border-stone-200"}`}><SmartImage src={url} alt={`${product?.name || "Product"} image ${index + 1}`} className="aspect-square" imgClassName="h-full w-full object-contain" /><div className="flex items-center justify-between gap-2 border-t bg-white p-2"><button type="button" disabled={index === 0} onClick={() => makePrimary(index)} className="text-[11px] font-semibold text-gold-dark disabled:text-emerald-600">{index === 0 ? "Primary" : "Set primary"}</button><button type="button" onClick={() => setImageUrls((current) => current.filter((item) => item !== url))} className="text-[11px] font-semibold text-red-600">Remove</button></div></div>)}</div>}
      <label className="text-sm font-semibold">Product name<input name="name" required defaultValue={product?.name || ""} className={inputClass} /></label>
      <div className="sm:col-span-2">
        <label className="text-sm font-semibold block">Product images</label>
        <div className="mt-2 flex gap-2">
          <input value={newImageUrl} onChange={(event) => setNewImageUrl(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-gold" placeholder="ImageKit or image URL" />
          <button type="button" onClick={addImageUrl} className="h-11 rounded-xl border px-4 text-sm font-semibold hover:border-gold">Add URL</button>
          <label className="flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold cursor-pointer transition hover:border-gold hover:bg-cream">
            <Upload size={17} /> Upload
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} className="sr-only" />
          </label>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-stone-500">First image is primary. Recommended: <span className="font-semibold text-stone-700">1:1 · 1000 × 1000 px · JPG, PNG, or WebP</span></p>
        {uploading && <p className="mt-1 text-sm text-gold-dark">Uploading images...</p>}
      </div>
      <label className="text-sm font-semibold">Category<select name="category_id" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={inputClass}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Subcategory<select name="subcategory_id" defaultValue={product?.subcategory_id || ""} className={inputClass}><option value="">No subcategory</option>{category?.subcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Price (₹)<input name="price" type="number" min="0" step="0.01" required defaultValue={product?.price || ""} className={inputClass} /></label>
      <label className="text-sm font-semibold">Stock quantity<input name="stock_quantity" type="number" min="0" step="1" required defaultValue={product?.stock_quantity ?? 0} className={inputClass} /></label>
      <div className="rounded-2xl border border-gold/25 bg-cream/50 p-4 sm:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-sm font-semibold">Size-wise pricing</p><p className="mt-1 text-xs leading-relaxed text-stone-500">Optional. Add options such as 50ml ₹2,499 and 100ml ₹3,999. The first option becomes the product’s listing price.</p></div>
          <button type="button" onClick={() => setVariants((current) => [...current, { size: "", price: "", stock: "" }])} className="inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-white px-3 py-2 text-xs font-semibold text-gold-dark hover:bg-cream"><Plus size={15} /> Add size</button>
        </div>
        {variants.length > 0 ? <div className="mt-4 grid gap-3">{variants.map((variant, index) => <div key={index} className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="text-xs font-semibold text-stone-700">Size<input value={variant.size} onChange={(event) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, size: event.target.value } : item))} placeholder="50ml" className={inputClass} /></label>
          <label className="text-xs font-semibold text-stone-700">Price (₹)<input value={variant.price} onChange={(event) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item))} type="number" min="0" step="0.01" placeholder="2499" className={inputClass} /></label>
          <label className="text-xs font-semibold text-stone-700">Stock (optional)<input value={variant.stock} onChange={(event) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, stock: event.target.value } : item))} type="number" min="0" step="1" placeholder="100" className={inputClass} /></label>
          <button type="button" onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove size option ${index + 1}`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50"><X size={17} /></button>
        </div>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white px-3 py-4 text-center text-sm text-stone-500">No size options added yet.</p>}
      </div>
      <label className="text-sm font-semibold">Short description<input name="short_description" required defaultValue={product?.short_description || ""} className={inputClass} /></label>
      <label className="text-sm font-semibold">Badge<input name="badge" defaultValue={product?.badge || ""} className={inputClass} placeholder="Optional" /></label>
      <label className="text-sm font-semibold sm:col-span-2">Full description<textarea name="description" defaultValue={product?.description || ""} rows={4} className="mt-2 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-gold focus:ring-4 focus:ring-gold/10" /></label>
      <div className="flex flex-wrap gap-5 sm:col-span-2">
        <label className="flex items-center gap-3 text-sm font-semibold"><input name="is_active" type="checkbox" defaultChecked={product?.is_active ?? true} className="h-4 w-4 accent-[#C99A4B]" /> Product is active</label>
        <label className="flex items-center gap-3 text-sm font-semibold"><input name="is_featured" type="checkbox" defaultChecked={product?.is_featured ?? false} className="h-4 w-4 accent-[#C99A4B]" /> Featured on homepage</label>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={onCancel} className="rounded-xl border px-5 py-3 text-sm font-semibold">Cancel</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{saving ? "Saving..." : "Save Product"}</button></div>
    </form>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCatalog() {
    setLoading(true);
    const [productResponse, categoryResponse] = await Promise.all([fetch("/api/admin/catalog/products", { cache: "no-store" }), fetch("/api/admin/catalog/categories", { cache: "no-store" })]);
    const [productResult, categoryResult] = await Promise.all([productResponse.json(), categoryResponse.json()]);
    setLoading(false);
    if (!productResponse.ok || !categoryResponse.ok) return setError(productResult.error || categoryResult.error || "Unable to load the catalog.");
    setProducts(productResult.products);
    setCategories(categoryResult.categories);
    setError("");
  }

  useEffect(() => { loadCatalog(); }, []);

  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    const response = await fetch(`/api/admin/catalog/products/${product.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to delete the product.");
    notifyStorefrontUpdate("catalog");
    if (selected?.id === product.id) setSelected(null);
    await loadCatalog();
  }

  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = categoryFilter === "All" || product.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  }), [products, search, categoryFilter]);

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark">Catalog</p><h2 className="mt-1 text-2xl font-bold">Products</h2><p className="mt-1 text-sm text-stone-500">{filteredProducts.length} of {products.length} products shown.</p></div>
        <div className="grid grid-cols-2 gap-3 sm:flex"><a href="/all-products" target="_blank" className="flex min-w-0 items-center justify-center rounded-xl border px-4 py-2.5 text-center text-sm font-semibold hover:border-gold sm:w-auto sm:shrink-0">Open Storefront</a><button onClick={() => setCreating(true)} className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-gold hover:text-ink sm:w-auto sm:shrink-0"><PackagePlus size={17} className="shrink-0" /> Add Product</button></div>
      </div>
      {error && <p role="alert" className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">{error}</p>}
      <div className="flex flex-col gap-3 border-b border-stone-200 p-5 sm:flex-row sm:px-7"><label className="flex h-11 w-full min-w-0 items-center gap-3 rounded-xl border px-3 focus-within:border-gold sm:flex-1"><Search size={17} className="shrink-0 text-stone-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" className="w-full min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-11 w-full shrink-0 rounded-xl border bg-white px-3 text-sm sm:w-auto sm:min-w-[160px]"><option value="All">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      {loading ? <p className="p-8 text-sm text-stone-500">Loading products...</p> : (
        <div className="max-h-[650px] overflow-auto"><table className="w-full min-w-[920px] text-left"><thead className="sticky top-0 z-10 bg-stone-50 text-[11px] uppercase tracking-[0.14em] text-stone-500"><tr><th className="px-7 py-3">Product</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Status</th><th className="px-7 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-stone-100">{filteredProducts.map((product) => <tr key={product.id} className="text-sm hover:bg-cream/60"><td className="px-7 py-3"><div className="flex items-center gap-3"><SmartImage src={product.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg" imgClassName="h-full w-full object-cover" /><div><p className="font-semibold">{product.name}</p><p className="mt-0.5 text-xs text-stone-400">{product.subcategories?.name || "No subcategory"}</p></div></div></td><td className="px-5 py-3 text-stone-600">{product.categories?.name}</td><td className="px-5 py-3 font-semibold">₹{product.price}</td><td className="px-5 py-3">{product.stock_quantity}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{product.is_active ? "Active" : "Inactive"}</span></td><td className="px-7 py-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => setSelected(product)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold hover:border-gold hover:bg-cream"><Eye size={14} /> View & Edit</button><button onClick={() => deleteProduct(product)} aria-label={`Delete ${product.name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>
      )}
      {(selected || creating) && <CatalogDialog title={creating ? "Add new product" : selected.name} subtitle={creating ? "Create a new item in the Al Qirat Perfumes catalog." : "View and update this product."} onClose={() => { setSelected(null); setCreating(false); }}><ProductForm product={creating ? null : selected} categories={categories} onCancel={() => { setSelected(null); setCreating(false); }} onSaved={async () => { setSelected(null); setCreating(false); await loadCatalog(); }} /></CatalogDialog>}
    </section>
  );
}
