"use client";

import { useEffect, useState } from "react";
import { Eye, FolderTree, Pencil, Plus, Save, Trash2, Upload } from "lucide-react";
import { uploadImage } from "@/lib/uploadImage";
import SmartImage from "@/components/SmartImage";
import CatalogDialog from "./CatalogDialog";
import { notifyStorefrontUpdate } from "@/lib/storefrontSync";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10";

const storefrontCategoryImages = {
  perfumes: "/images/home/category-perfumes.jpg",
  attars: "/images/home/category-attars.jpg",
  "gift sets": "/images/home/category-gift-sets.jpg",
  "special editions": "/images/home/category-special-editions.jpg",
};

function getCategoryImage(category) {
  return category.image_url || storefrontCategoryImages[category.name.toLowerCase()];
}

function CategoryForm({ category, onSaved, onCancel }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      description: form.get("description"),
      image_url: form.get("image_url"),
      is_active: form.get("is_active") === "on",
    };
    const url = category ? `/api/admin/catalog/categories/${category.id}` : "/api/admin/catalog/categories";
    const response = await fetch(url, { method: category ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setError(result.error || "Unable to save the category.");
    notifyStorefrontUpdate("catalog");
    onSaved();
  }

  async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file, "/al-qirat/categories");
      const input = event.target.form.elements.namedItem("image_url");
      if (input) input.value = url;
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <form onSubmit={save} className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
      {category && (
        <SmartImage
          src={getCategoryImage(category)}
          alt={category.name}
          className="h-56 rounded-2xl border border-gold/20 bg-cream sm:col-span-2"
          imgClassName="h-full w-full object-contain"
          tone="from-cream to-stone-200"
        />
      )}
      <label className="text-sm font-semibold">Category name<input name="name" required defaultValue={category?.name || ""} className={inputClass} /></label>
      <div className="sm:col-span-2">
        <label className="text-sm font-semibold block">Image URL</label>
        <div className="mt-2 flex gap-2">
          <input name="image_url" required defaultValue={category?.image_url || ""} className={`${inputClass} flex-1`} placeholder="/products/... or ImageKit URL" />
          <label className="flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold cursor-pointer transition hover:border-gold hover:bg-cream">
            <Upload size={17} /> Upload
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="sr-only" />
          </label>
        </div>
        {uploading && <p className="mt-1 text-sm text-gold-dark">Uploading...</p>}
      </div>
      <label className="text-sm font-semibold sm:col-span-2">Description<textarea name="description" defaultValue={category?.description || ""} rows={3} className="mt-2 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-gold focus:ring-4 focus:ring-gold/10" /></label>
      <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2"><input name="is_active" type="checkbox" defaultChecked={category?.is_active ?? true} className="h-4 w-4 accent-[#C99A4B]" /> Active on storefront</label>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={onCancel} className="rounded-xl border px-5 py-3 text-sm font-semibold">Cancel</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{saving ? "Saving..." : "Save Category"}</button></div>
    </form>
  );
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");

  async function loadCategories(preferredId) {
    setLoading(true);
    const response = await fetch("/api/admin/catalog/categories", { cache: "no-store" });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.error || "Unable to load categories.");
    setError("");
    setCategories(result.categories);
    setSelected((current) => result.categories.find((category) => category.id === (preferredId || current?.id)) || result.categories[0] || null);
  }

  useEffect(() => { loadCategories(); }, []);

  async function deleteCategory(category = selected) {
    if (!category || !window.confirm(`Delete ${category.name}? This cannot be undone.`)) return;
    const response = await fetch(`/api/admin/catalog/categories/${category.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to delete the category.");
    notifyStorefrontUpdate("catalog");
    if (selected?.id === category.id) setSelected(null);
    await loadCategories();
  }

  async function addSubcategory(event) {
    event.preventDefault();
    if (!selected || !subcategoryName.trim()) return;
    const response = await fetch("/api/admin/catalog/subcategories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category_id: selected.id, name: subcategoryName }) });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to add the subcategory.");
    notifyStorefrontUpdate("catalog");
    setSubcategoryName("");
    await loadCategories(selected.id);
  }

  async function renameSubcategory(subcategory) {
    const name = window.prompt("Subcategory name", subcategory.name)?.trim();
    if (!name || name === subcategory.name) return;
    const response = await fetch(`/api/admin/catalog/subcategories/${subcategory.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to update the subcategory.");
    notifyStorefrontUpdate("catalog");
    await loadCategories(selected.id);
  }

  async function deleteSubcategory(subcategory) {
    if (!window.confirm(`Delete ${subcategory.name}?`)) return;
    const response = await fetch(`/api/admin/catalog/subcategories/${subcategory.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setError(result.error || "Unable to delete the subcategory.");
    notifyStorefrontUpdate("catalog");
    await loadCategories(selected.id);
  }

  function viewCategory(category) {
    setSelected(category);
    window.requestAnimationFrame(() => {
      document.getElementById("admin-category-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function editCategory(category) {
    setSelected(category);
    setDialog("edit");
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark">Storefront collections</p><h2 className="mt-1 text-2xl font-bold">Categories</h2><p className="mt-1 text-sm text-stone-500">Select a category to view its image, details, subcategories, and products.</p></div>
          <button onClick={() => setDialog("create")} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold hover:text-ink"><Plus size={16} /> Add Category</button>
        </div>
        {error && <p role="alert" className="m-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-7">{error}</p>}
        {loading ? <p className="p-8 text-sm text-stone-500">Loading categories...</p> : (
          <div className="divide-y divide-stone-200 px-5 sm:px-7">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`group flex w-full flex-col gap-4 py-5 text-left transition sm:flex-row sm:items-center ${
                  selected?.id === category.id ? "text-gold-dark" : "hover:text-gold-dark"
                }`}
              >
                <SmartImage
                  src={getCategoryImage(category)}
                  alt={category.name}
                  className={`w-full shrink-0 rounded-2xl bg-transparent sm:h-24 sm:w-36 sm:border ${
                    selected?.id === category.id ? "sm:border-gold sm:ring-2 sm:ring-gold/15" : "sm:border-stone-200"
                  }`}
                  imgClassName="block h-auto w-full object-contain transition duration-500 sm:h-full"
                  tone="from-transparent to-transparent"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-ink sm:text-lg">{category.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${category.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                      {category.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-stone-500">{category.description || "No category description has been added."}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 sm:justify-end">
                  <div className="text-xs text-stone-500 sm:text-right">
                    <p><span className="font-bold text-ink">{category.subcategories.length}</span> subcategories</p>
                    <p className="mt-1"><span className="font-bold text-ink">{category.product_count}</span> products</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => viewCategory(category)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gold/30 bg-cream px-3 text-xs font-semibold text-gold-dark transition hover:border-gold hover:bg-gold hover:text-ink"
                  >
                    <Eye size={15} /> View More
                  </button>
                  <button
                    type="button"
                    onClick={() => editCategory(category)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-ink px-3 text-xs font-semibold text-white transition hover:bg-gold hover:text-ink"
                  >
                    <Pencil size={14} /> Edit / Update
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(category)}
                    aria-label={`Delete ${category.name}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <section id="admin-category-details" className="scroll-mt-24 grid overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:grid-cols-[320px_1fr]">
          <SmartImage src={getCategoryImage(selected)} alt={selected.name} className="min-h-[260px] bg-cream" imgClassName="h-full w-full object-contain" tone="from-stone-600 to-ink" />
          <div className="p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-dark">Category details</p><h2 className="mt-2 text-3xl font-bold">{selected.name}</h2></div><div className="flex gap-2"><button onClick={() => setDialog("edit")} className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold hover:border-gold"><Pencil size={15} /> Edit / Update</button><button onClick={deleteCategory} className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete</button></div></div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-500">{selected.description || "No category description has been added."}</p>
            <div className="mt-6 flex flex-wrap gap-2">{selected.subcategories.map((item) => <span key={item.id} className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-cream py-1.5 pl-3 pr-1.5 text-xs font-medium">{item.name}<button type="button" onClick={() => renameSubcategory(item)} aria-label={`Rename ${item.name}`} className="rounded-full p-1 hover:bg-gold/20"><Pencil size={12} /></button><button type="button" onClick={() => deleteSubcategory(item)} aria-label={`Delete ${item.name}`} className="rounded-full p-1 text-red-600 hover:bg-red-50"><Trash2 size={12} /></button></span>)}</div>
            <form onSubmit={addSubcategory} className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row"><input value={subcategoryName} onChange={(event) => setSubcategoryName(event.target.value)} placeholder="New subcategory name" className="h-[52px] min-h-[52px] w-full shrink-0 rounded-full border border-stone-300 px-5 text-base outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10 sm:h-14 sm:min-h-0 sm:w-auto sm:flex-1 sm:rounded-xl" /><button className="flex h-14 items-center justify-center gap-2 rounded-full border border-gold-dark bg-gradient-to-b from-gold-light to-gold px-5 text-base font-semibold text-ink shadow-[0_10px_28px_-14px_rgba(201,154,75,0.8)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-14px_rgba(201,154,75,0.9)] sm:rounded-xl"><Plus size={18} /> Add Subcategory</button></form>
          </div>
        </section>
      )}

      {dialog && <CatalogDialog title={dialog === "create" ? "Add category" : `Edit ${selected.name}`} subtitle="Category images appear in the homepage collection style." onClose={() => setDialog(null)}><CategoryForm category={dialog === "edit" ? selected : null} onCancel={() => setDialog(null)} onSaved={async () => { const id = selected?.id; setDialog(null); await loadCategories(id); }} /></CatalogDialog>}
    </div>
  );
}
