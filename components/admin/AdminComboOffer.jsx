"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Edit3,
  ExternalLink,
  Gift,
  Layers,
  Package,
  PackageCheck,
  PackagePlus,
  PackageX,
  Plus,
  Radio,
  Save,
  Sparkles,
  Store,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { uploadImage } from "@/lib/uploadImage";
import { notifyStorefrontUpdate } from "@/lib/storefrontSync";

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/10";

function initialForm(offer) {
  if (!offer) return null;
  const bundleQty = Number(offer.bundle_quantity) || 4;
  return {
    name: offer.name || offer.title || "Create Your Own Combo Set",
    title: offer.title || "Create Your Own Combo Set",
    subtitle: offer.subtitle || "",
    description: offer.description || "",
    banner_image_url: offer.banner_image_url || "",
    mobile_banner_image_url: offer.mobile_banner_image_url || "",
    cta_label: offer.cta_label || "Checkout",
    cta_href: offer.cta_href || "/combos",
    default_unit_price: offer.default_unit_price ?? 249,
    combo_price: offer.combo_price ?? 799,
    bundle_quantity: bundleQty,
    min_quantity: offer.min_quantity ?? bundleQty,
    max_quantity: offer.max_quantity ?? Math.max(bundleQty * 10, 40),
    max_quantity_per_product: offer.max_quantity_per_product ?? Math.max(bundleQty * 10, 40),
    allow_same_product: offer.allow_same_product !== false,
    allow_mixed_products: offer.allow_mixed_products !== false,
    showcase_badge: offer.showcase_badge || "Combo Set",
    showcase_heading: offer.showcase_heading || offer.title || "Build Your Own Combo",
    showcase_description:
      offer.showcase_description ||
      offer.subtitle ||
      `Pick any ${bundleQty} bottles for ₹${offer.combo_price ?? 799}`,
    is_active: offer.is_active === true,
  };
}

const emptyNewItem = {
  name: "",
  variant_label: "6ml",
  stock_quantity: "25",
  price: "249",
  compare_at_price: "349",
  description: "",
  images: [],
};

export default function AdminComboOffer() {
  const [offer, setOffer] = useState(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Right column states: "active" | "create" | "catalog"
  const [productTab, setProductTab] = useState("create");
  const [newItem, setNewItem] = useState(emptyNewItem);
  const [creatingItem, setCreatingItem] = useState(false);
  const [uploadingItemImage, setUploadingItemImage] = useState(false);
  const [itemError, setItemError] = useState("");
  const [itemMessage, setItemMessage] = useState("");

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [togglingCatalogId, setTogglingCatalogId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/combo-offer", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load combo builder.");
      setOffer(result.offer);
      setForm(initialForm(result.offer));
      setProducts(result.products || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeComboProducts = useMemo(
    () => products.filter((product) => product.combo_active),
    [products],
  );
  const shopCatalogProducts = useMemo(
    () => products.filter((product) => product.show_in_shop !== false),
    [products],
  );
  const inStockCount = useMemo(
    () => activeComboProducts.filter((product) => Number(product.stock_quantity) > 0).length,
    [activeComboProducts],
  );
  const outOfStockCount = useMemo(
    () => activeComboProducts.filter((product) => Number(product.stock_quantity) <= 0).length,
    [activeComboProducts],
  );

  function setField(name, value) {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "bundle_quantity") {
        const n = Math.max(2, Number(value) || 2);
        next.min_quantity = n;
        if (Number(next.max_quantity) < n) {
          next.max_quantity = n * 10;
          next.max_quantity_per_product = n * 10;
        }
      }
      return next;
    });
  }

  async function uploadBanner(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    setError("");
    try {
      const url = await uploadImage(file, "/al-qirat/combo-offers");
      setField(field, url);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploadingField("");
      event.target.value = "";
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSavingSettings(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/combo-offer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer: form }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save combo settings.");
      setOffer(result.offer);
      setForm(initialForm(result.offer));
      setProducts(result.products || []);
      setMessage("Combo settings saved and synced to /combos.");
      notifyStorefrontUpdate("combo");
      notifyStorefrontUpdate("content");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleNewItemImages(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploadingItemImage(true);
    setItemError("");
    try {
      const uploaded = [];
      for (const file of files) {
        const url = await uploadImage(file, "/al-qirat/combo-items");
        uploaded.push(url);
      }
      setNewItem((current) => ({
        ...current,
        images: [...current.images, ...uploaded],
      }));
    } catch (uploadError) {
      setItemError(uploadError.message);
    } finally {
      setUploadingItemImage(false);
      event.target.value = "";
    }
  }

  async function createComboProduct(event) {
    event.preventDefault();
    if (!newItem.images.length) {
      setItemError("Please upload at least one product image.");
      return;
    }
    setCreatingItem(true);
    setItemError("");
    setItemMessage("");
    try {
      const [coverImage, ...galleryImages] = newItem.images;
      const response = await fetch("/api/admin/combo-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name,
          variant_label: newItem.variant_label || "Standard",
          stock_quantity: Number(newItem.stock_quantity),
          price: Number(form?.default_unit_price || 180),
          compare_at_price: null,
          description: newItem.description,
          image_url: coverImage,
          gallery_urls: galleryImages,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to add combo product.");
      setOffer(result.offer);
      setProducts(result.products || []);
      setNewItem({
        ...emptyNewItem,
        price: String(form?.default_unit_price || 249),
      });
      setItemMessage("Product added to combo set!");
      notifyStorefrontUpdate("combo");
    } catch (createError) {
      setItemError(createError.message);
    } finally {
      setCreatingItem(false);
    }
  }

  async function toggleCatalogProduct(product, enabled) {
    setTogglingCatalogId(product.id);
    setItemError("");
    try {
      const response = await fetch("/api/admin/combo-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_catalog_product",
          product_id: product.id,
          enabled,
          unit_price: form?.default_unit_price ?? product.combo_unit_price ?? product.price,
          variant_label: product.combo_variant_label || product.variant_label || "",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update catalog product.");
      setProducts(result.products || []);
      notifyStorefrontUpdate("combo");
    } catch (toggleError) {
      setItemError(toggleError.message);
    } finally {
      setTogglingCatalogId("");
    }
  }

  async function removeComboProduct(product) {
    const isExclusive = product.show_in_shop === false;
    const confirmText = isExclusive
      ? `Delete "${product.name}" permanently from Combo Products?`
      : `Remove "${product.name}" from the Combos page? (It will remain in your main Shop catalog.)`;
    if (!window.confirm(confirmText)) return;

    setItemError("");
    setItemMessage("");
    try {
      const response = await fetch(`/api/admin/combo-offer?product_id=${encodeURIComponent(product.id)}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to remove product.");
      setProducts(result.products || []);
      setItemMessage(`"${product.name}" removed from combo set.`);
      notifyStorefrontUpdate("combo");
    } catch (deleteError) {
      setItemError(deleteError.message);
    }
  }

  function openEditModal(product) {
    const allImages = [
      product.image_url,
      ...(Array.isArray(product.gallery_urls) ? product.gallery_urls : []),
    ].filter(Boolean);
    setEditingItem({
      id: product.id,
      show_in_shop: product.show_in_shop !== false,
      name: product.name || "",
      variant_label: product.combo_variant_label || product.variant_label || "Standard",
      stock_quantity: String(product.stock_quantity ?? 0),
      price: String(product.combo_unit_price ?? product.price ?? 0),
      compare_at_price: product.compare_at_price ? String(product.compare_at_price) : "",
      description: product.description || product.short_description || "",
      images: [...new Set(allImages)],
      sort_order: product.combo_sort_order ?? 0,
    });
  }

  async function handleEditModalImages(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !editingItem) return;
    setUploadingEditImage(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const url = await uploadImage(file, "/al-qirat/combo-items");
        uploaded.push(url);
      }
      setEditingItem((current) => ({
        ...current,
        images: [...current.images, ...uploaded],
      }));
    } catch (uploadError) {
      setItemError(uploadError.message);
    } finally {
      setUploadingEditImage(false);
      event.target.value = "";
    }
  }

  async function saveEditedItem(event) {
    event.preventDefault();
    if (!editingItem) return;
    if (!editingItem.images.length) {
      setItemError("Product must have at least one image.");
      return;
    }
    setSavingEdit(true);
    setItemError("");
    try {
      const [coverImage, ...galleryImages] = editingItem.images;
      const response = await fetch("/api/admin/combo-offer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: editingItem.id,
          name: editingItem.name,
          variant_label: editingItem.variant_label,
          stock_quantity: Number(editingItem.stock_quantity),
          price: Number(form?.default_unit_price || editingItem.price || 180),
          compare_at_price: null,
          description: editingItem.description,
          image_url: coverImage,
          gallery_urls: galleryImages,
          sort_order: editingItem.sort_order,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update product.");
      setProducts(result.products || []);
      setEditingItem(null);
      setItemMessage("Combo product updated!");
      notifyStorefrontUpdate("combo");
      notifyStorefrontUpdate("catalog");
    } catch (editError) {
      setItemError(editError.message);
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading || !form) {
    return <p className="p-8 text-sm text-stone-500">Loading Combo Set Builder...</p>;
  }

  const bottlePresets = [2, 3, 4, 5, 6, 10];
  const allowsMultipleSets = Number(form.max_quantity) > Number(form.bundle_quantity);

  return (
    <div className="space-y-6">
      {/* Al Qirat Theme Hero Banner Card */}
      <section className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-r from-cream via-cream-dark to-sage-light p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-white/85 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dark shadow-sm">
              <Sparkles size={13} /> Gift & Combo Sets
            </span>
            <h1 className="mt-3 font-serif text-3xl font-bold text-ink sm:text-4xl">
              Combo Set <span className="text-gold-dark">Builder</span>
            </h1>
            <div className="mt-2 h-1 w-12 rounded-full bg-gold" />
            <p className="mt-3 text-sm text-ink/75 sm:text-base">
              Let customers pick any <strong className="text-ink">{form.bundle_quantity}</strong> bottles (or multiple sets) and build their own gift combo at{" "}
              <a
                href="/combos"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-gold-dark underline decoration-gold/50 underline-offset-4 hover:text-ink"
              >
                /combos
              </a>
              .
            </p>
          </div>
          <a
            href="/combos"
            target="_blank"
            rel="noreferrer"
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/25 bg-white/90 text-forest shadow-sm transition hover:scale-105 hover:bg-white"
            title="Open /combos storefront page"
          >
            <PackagePlus size={26} />
          </a>
        </div>
      </section>

      {/* 4 Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cream text-gold-dark">
            <Package size={22} />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{activeComboProducts.length}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">Total Products</p>
          </div>
        </article>

        <article className="flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <PackageCheck size={22} />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{inStockCount}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">In Stock</p>
          </div>
        </article>

        <article className="flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <PackageX size={22} />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{outOfStockCount}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">Out of Stock</p>
          </div>
        </article>

        <article className="flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              form.is_active ? "bg-purple-50 text-purple-600" : "bg-stone-100 text-stone-400"
            }`}
          >
            <Radio size={22} />
          </span>
          <div>
            <p className="text-2xl font-bold text-ink">{form.is_active ? "Live" : "Hidden"}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">Combos Page</p>
          </div>
        </article>
      </div>

      {/* Main Two-Column Builder Layout */}
      <div className="grid items-start gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        {/* LEFT COLUMN: Combo Settings */}
        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-gold-dark">
                <Sparkles size={19} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink">Combo Settings</h2>
                <p className="text-xs text-stone-500">Rules, pricing, hero copy & navigation visibility</p>
              </div>
            </div>
            <a
              href="/combos"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-gold hover:text-ink"
            >
              Preview <ExternalLink size={13} />
            </a>
          </div>

          <form onSubmit={saveSettings} className="space-y-5 p-6">
            {/* Enable / Disable Toggle Card */}
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-[#fdf8f0] p-4">
              <div>
                <p className="text-sm font-bold text-ink">Show the &apos;Combos&apos; page and nav link</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  When enabled, customers see Combos in the header, Shop menu, and at /combos.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setField("is_active", event.target.checked)}
                className="h-5 w-5 accent-[#C99A4B]"
              />
            </label>

            {/* Bottles to Pick (N) + Presets */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="bundle-qty-input" className="text-sm font-bold text-ink">
                  Bottles per Combo Set (N)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {bottlePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setField("bundle_quantity", preset)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        Number(form.bundle_quantity) === preset
                          ? "bg-forest text-white shadow-sm"
                          : "border border-stone-200 bg-white text-stone-600 hover:border-gold"
                      }`}
                    >
                      Pick {preset}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-stone-600">
                  Bottles in 1 Set
                  <input
                    id="bundle-qty-input"
                    type="number"
                    min="2"
                    max="50"
                    step="1"
                    required
                    value={form.bundle_quantity}
                    onChange={(event) => setField("bundle_quantity", event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-semibold text-stone-600">
                  Fixed Set Price (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.combo_price}
                    onChange={(event) => setField("combo_price", event.target.value)}
                    className={inputClass}
                    placeholder="e.g. 799"
                  />
                </label>
              </div>
              <p className="mt-2.5 text-xs text-stone-500">
                Customers picking <strong className="text-ink">{form.bundle_quantity} bottles</strong> pay{" "}
                <strong className="text-ink">₹{form.combo_price || 0}</strong> per complete set (e.g. 2 sets ={" "}
                {Number(form.bundle_quantity) * 2} bottles for ₹{(Number(form.combo_price) || 0) * 2}).
              </p>
            </div>

            {/* Multiple Sets & Quantity Controls */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-stone-600">
                Default Individual Bottle Price (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.default_unit_price}
                  onChange={(event) => {
                    const val = event.target.value;
                    setField("default_unit_price", val);
                    setNewItem((curr) => ({ ...curr, price: String(val) }));
                  }}
                  className={inputClass}
                />
                <span className="mt-1 block text-[11px] font-normal text-stone-400">
                  Applies uniformly to all bottles on /combos (existing & newly created).
                </span>
              </label>

              <label className="text-xs font-semibold text-stone-600">
                Max Total Bottles per Order
                <input
                  type="number"
                  min={form.bundle_quantity || 2}
                  step="1"
                  required
                  value={form.max_quantity}
                  onChange={(event) => {
                    const val = event.target.value;
                    setForm((curr) => ({
                      ...curr,
                      max_quantity: val,
                      max_quantity_per_product: val,
                    }));
                  }}
                  className={inputClass}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-4 rounded-2xl border border-stone-200 p-3.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={allowsMultipleSets}
                  onChange={(event) => {
                    const n = Math.max(2, Number(form.bundle_quantity) || 4);
                    const nextMax = event.target.checked ? Math.max(n * 10, 40) : n;
                    setForm((curr) => ({
                      ...curr,
                      min_quantity: n,
                      max_quantity: nextMax,
                      max_quantity_per_product: nextMax,
                    }));
                  }}
                  className="h-4 w-4 accent-[#C99A4B]"
                />
                Allow multiple sets in one order (up to {Math.floor(Number(form.max_quantity) / Math.max(1, Number(form.bundle_quantity)))} sets)
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={form.allow_same_product}
                  onChange={(event) => setField("allow_same_product", event.target.checked)}
                  className="h-4 w-4 accent-[#C99A4B]"
                />
                Allow duplicate bottles of same fragrance
              </label>
            </div>

            {/* Hero Title & Subtitle */}
            <div className="space-y-3 border-t border-stone-100 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Page Hero & Copy</h3>
              <label className="block text-xs font-semibold text-stone-600">
                Hero Title
                <input
                  value={form.title}
                  onChange={(event) => setField("title", event.target.value)}
                  required
                  placeholder="Create Your Own Gift Set"
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-semibold text-stone-600">
                Hero Subtitle
                <input
                  value={form.subtitle}
                  onChange={(event) => setField("subtitle", event.target.value)}
                  placeholder={`Pick any ${form.bundle_quantity} attars (6ml each) for just ₹${form.combo_price}`}
                  className={inputClass}
                />
              </label>
              <label className="block text-xs font-semibold text-stone-600">
                Additional Description (optional)
                <textarea
                  value={form.description}
                  onChange={(event) => setField("description", event.target.value)}
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-gold"
                />
              </label>
            </div>

            {/* Shop Mega-Menu Showcase Card */}
            <div className="space-y-3 border-t border-stone-100 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">
                Shop Dropdown Showcase Card
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-stone-600">
                  Badge Text
                  <input
                    value={form.showcase_badge}
                    onChange={(event) => setField("showcase_badge", event.target.value)}
                    placeholder="Combo Set"
                    className={inputClass}
                  />
                </label>
                <label className="block text-xs font-semibold text-stone-600">
                  Card Heading
                  <input
                    value={form.showcase_heading}
                    onChange={(event) => setField("showcase_heading", event.target.value)}
                    placeholder="Build Your Own Gift Set"
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-stone-600">
                Card Subtext
                <input
                  value={form.showcase_description}
                  onChange={(event) => setField("showcase_description", event.target.value)}
                  placeholder={`Pick any ${form.bundle_quantity} bottles for ₹${form.combo_price}`}
                  className={inputClass}
                />
              </label>
            </div>

            {/* Banner Image Uploaders */}
            <div className="space-y-3 border-t border-stone-100 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">
                Top Banner Image (Optional)
              </h3>
              {[
                ["banner_image_url", "Desktop Banner"],
                ["mobile_banner_image_url", "Mobile Banner"],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-stone-600">
                    {label}
                    <div className="mt-1.5 flex gap-2">
                      <input
                        value={form[field]}
                        onChange={(event) => setField(field, event.target.value)}
                        className={`${inputClass} mt-0 flex-1`}
                        placeholder="Image URL or upload"
                      />
                      <label className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 text-xs font-semibold text-ink transition hover:border-gold hover:bg-white">
                        <Upload size={14} />
                        {uploadingField === field ? "Uploading..." : "Upload"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => uploadBanner(event, field)}
                          className="hidden"
                          disabled={Boolean(uploadingField)}
                        />
                      </label>
                    </div>
                  </label>
                  {form[field] && (
                    <div
                      className={`relative mt-2.5 overflow-hidden rounded-xl border border-stone-200 bg-cream ${
                        field === "mobile_banner_image_url"
                          ? "aspect-[9/16] w-40 sm:w-44"
                          : "aspect-[16/7] w-full"
                      }`}
                    >
                      <SmartImage
                        src={form[field]}
                        alt={label}
                        className="h-full w-full"
                        imgClassName="h-full w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setField(field, "")}
                        className="absolute right-2 top-2 rounded-full bg-black/65 p-1 text-white hover:bg-black"
                        title="Remove banner"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={savingSettings}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-ink disabled:opacity-50"
            >
              <Save size={16} />
              {savingSettings ? "Saving Settings..." : "Save Combo Settings"}
            </button>
          </form>
        </section>

        {/* RIGHT COLUMN: Combo Products Manager (Both Dedicated Creation + Catalog Import) */}
        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-gold-dark">
                  <Layers size={19} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-ink">Combo Products</h2>
                  <p className="text-xs text-stone-500">
                    Create dedicated combo bottles or pick from your Shop catalog
                  </p>
                </div>
              </div>

              {/* Dual-Mode Switcher */}
              <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-1">
                <button
                  type="button"
                  onClick={() => setProductTab("create")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    productTab === "create"
                      ? "bg-white text-gold-dark shadow-sm"
                      : "text-stone-600 hover:text-ink"
                  }`}
                >
                  <Plus size={13} /> Add New Product
                </button>
                <button
                  type="button"
                  onClick={() => setProductTab("catalog")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    productTab === "catalog"
                      ? "bg-white text-gold-dark shadow-sm"
                      : "text-stone-600 hover:text-ink"
                  }`}
                >
                  <Store size={13} /> From Shop ({shopCatalogProducts.length})
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">
            {itemError && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                {itemError}
              </p>
            )}
            {itemMessage && (
              <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                {itemMessage}
              </p>
            )}

            {/* TAB 1: Create Dedicated Combo-Only Product (Zaylune style) */}
            {productTab === "create" && (
              <form
                onSubmit={createComboProduct}
                className="space-y-4 rounded-2xl border border-gold/25 bg-[#fdf8f0]/70 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Add Dedicated Combo Product</h3>
                    <p className="text-xs text-stone-500">
                      Appears only on <code className="font-semibold text-gold-dark">/combos</code> (hidden from main /shop page)
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-dark">
                    Combo Exclusive
                  </span>
                </div>

                {/* Multi-Image Uploader with Cover Picker */}
                <div>
                  <span className="block text-xs font-semibold text-stone-600">
                    Product Images (First image is Cover)
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    {newItem.images.map((url, idx) => (
                      <div
                        key={url}
                        className={`group relative h-20 w-20 overflow-hidden rounded-xl border-2 bg-white ${
                          idx === 0 ? "border-gold" : "border-stone-200"
                        }`}
                      >
                        <SmartImage
                          src={url}
                          alt=""
                          className="h-full w-full"
                          imgClassName="h-full w-full object-cover"
                        />
                        {idx === 0 ? (
                          <span className="absolute bottom-0 inset-x-0 bg-forest py-0.5 text-center text-[9px] font-bold uppercase text-white">
                            Cover
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setNewItem((curr) => {
                                const rest = curr.images.filter((_, i) => i !== idx);
                                return { ...curr, images: [url, ...rest] };
                              })
                            }
                            className="absolute bottom-0 inset-x-0 bg-black/70 py-0.5 text-center text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
                          >
                            Set Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setNewItem((curr) => ({
                              ...curr,
                              images: curr.images.filter((_, i) => i !== idx),
                            }))
                          }
                          className="absolute right-1 top-1 rounded-full bg-black/65 p-0.5 text-white hover:bg-red-600"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 bg-white text-xs font-semibold text-stone-500 transition hover:border-gold hover:text-gold-dark">
                      <Upload size={16} />
                      <span>{uploadingItemImage ? "Wait..." : "Upload"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleNewItemImages}
                        className="hidden"
                        disabled={uploadingItemImage}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-stone-600 sm:col-span-1">
                    Fragrance Name *
                    <input
                      required
                      value={newItem.name}
                      onChange={(e) => setNewItem((curr) => ({ ...curr, name: e.target.value }))}
                      placeholder="e.g. Saffron Oud"
                      className={inputClass}
                    />
                  </label>
                  <label className="text-xs font-semibold text-stone-600">
                    Size / Variant Label
                    <input
                      value={newItem.variant_label}
                      onChange={(e) => setNewItem((curr) => ({ ...curr, variant_label: e.target.value }))}
                      placeholder="e.g. 50ml or Standard"
                      className={inputClass}
                    />
                  </label>
                  <label className="text-xs font-semibold text-stone-600">
                    Stock Quantity *
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={newItem.stock_quantity}
                      onChange={(e) => setNewItem((curr) => ({ ...curr, stock_quantity: e.target.value }))}
                      placeholder="25"
                      className={inputClass}
                    />
                  </label>
                </div>

                <p className="text-[11px] font-medium text-stone-500">
                  Individual bottle price is automatically set to the Default Individual Bottle Price (<strong className="text-ink">₹{form.default_unit_price}</strong>).
                </p>

                <label className="block text-xs font-semibold text-stone-600">
                  Short Notes / Description
                  <textarea
                    rows={2}
                    value={newItem.description}
                    onChange={(e) => setNewItem((curr) => ({ ...curr, description: e.target.value }))}
                    placeholder="Rich woody agarwood blended with warm amber and smoky spice..."
                    className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm outline-none focus:border-gold"
                  />
                </label>

                <button
                  type="submit"
                  disabled={creatingItem || uploadingItemImage}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-stone-800 disabled:opacity-50"
                >
                  <Plus size={15} />
                  {creatingItem ? "Adding Product..." : "Add Product to Combo Set"}
                </button>
              </form>
            )}

            {/* TAB 2: Toggle Existing Shop Catalog Products */}
            {productTab === "catalog" && (
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Include Existing Shop Perfumes</h3>
                    <p className="text-xs text-stone-500">
                      Check any product from your main Shop catalog to make it selectable on /combos.
                    </p>
                  </div>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {shopCatalogProducts.map((product) => {
                    const active = Boolean(product.combo_active);
                    const busy = togglingCatalogId === product.id;
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border bg-white p-2.5 transition ${
                          active ? "border-gold ring-1 ring-gold/25" : "border-stone-200"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <input
                            type="checkbox"
                            checked={active}
                            disabled={busy}
                            onChange={(e) => toggleCatalogProduct(product, e.target.checked)}
                            className="h-4 w-4 accent-[#C99A4B]"
                          />
                          <SmartImage
                            src={product.image_url}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-lg"
                            imgClassName="h-full w-full object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-ink">{product.name}</p>
                            <p className="text-[11px] text-stone-500">
                              Shop ₹{product.price} · Stock: {product.stock_quantity}
                            </p>
                          </div>
                        </div>
                        {active && (
                          <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            Combo ₹{product.combo_unit_price ?? form.default_unit_price}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Combo Products List */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink">
                  Active Bottles on /combos ({activeComboProducts.length})
                </h3>
                <span className="text-xs text-stone-400">Click Edit to change photos, size, price or stock</span>
              </div>

              {activeComboProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center">
                  <Gift size={28} className="mx-auto text-stone-400" />
                  <p className="mt-2 text-sm font-semibold text-ink">No bottles in this combo set yet</p>
                  <p className="mt-1 text-xs text-stone-500">
                    Add a dedicated combo bottle above or import from your Shop catalog.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeComboProducts.map((product) => {
                    const isExclusive = product.show_in_shop === false;
                    const unitPrice = Number(product.combo_unit_price ?? form.default_unit_price ?? product.price ?? 0);
                    const cutPrice = isExclusive ? Number(product.compare_at_price ?? 0) : 0;
                    const inStock = Number(product.stock_quantity) > 0;
                    const sizeBadge =
                      (product.combo_variant_label || product.variant_label || "").trim();
                    const showSizeBadge = sizeBadge && sizeBadge.toLowerCase() !== "standard";
                    return (
                      <article
                        key={product.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm transition hover:border-gold/60"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <SmartImage
                            src={product.image_url}
                            alt={product.name}
                            className="h-16 w-16 shrink-0 rounded-xl bg-cream"
                            imgClassName="h-full w-full object-cover"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h4 className="truncate text-sm font-bold text-ink">{product.name}</h4>
                              {showSizeBadge && (
                                <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                                  {sizeBadge}
                                </span>
                              )}
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  isExclusive
                                    ? "bg-amber-50 text-gold-dark"
                                    : "bg-blue-50 text-blue-700"
                                }`}
                              >
                                {isExclusive ? "Combo Only" : "Shop Catalog"}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold text-ink">₹{unitPrice}</span>
                              <span className="text-stone-300">•</span>
                              <span
                                className={`font-semibold ${
                                  inStock ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {inStock ? `${product.stock_quantity} in stock` : "Out of stock"}
                              </span>
                            </div>

                            {(product.description || product.short_description) && (
                              <p className="mt-1 line-clamp-1 text-xs text-stone-500">
                                {product.description || product.short_description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {isExclusive && (
                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 transition hover:border-gold hover:text-ink"
                              title="Edit combo-only product"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeComboProduct(product)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            title={isExclusive ? "Delete combo product" : "Remove from combo"}
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
          </div>
        </section>
      </div>

      {/* Edit Combo Product Modal */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-ink">Edit Combo Product</h3>
                <p className="text-xs text-stone-500">
                  {editingItem.show_in_shop
                    ? "Shop Catalog Product — customize its combo price, size label & stock"
                    : "Combo-Exclusive Product — customize all details & gallery images"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={saveEditedItem} className="mt-4 space-y-4">
              <div>
                <span className="block text-xs font-semibold text-stone-600">Product Images</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {editingItem.images.map((url, idx) => (
                    <div
                      key={url}
                      className={`group relative h-16 w-16 overflow-hidden rounded-xl border-2 ${
                        idx === 0 ? "border-gold" : "border-stone-200"
                      }`}
                    >
                      <SmartImage
                        src={url}
                        alt=""
                        className="h-full w-full"
                        imgClassName="h-full w-full object-cover"
                      />
                      {idx === 0 ? (
                        <span className="absolute bottom-0 inset-x-0 bg-forest py-0.5 text-center text-[8px] font-bold uppercase text-white">
                          Cover
                        </span>
                      ) : (
                        editingItem.show_in_shop === false && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingItem((curr) => {
                                const rest = curr.images.filter((_, i) => i !== idx);
                                return { ...curr, images: [url, ...rest] };
                              })
                            }
                            className="absolute bottom-0 inset-x-0 bg-black/70 py-0.5 text-center text-[8px] font-semibold text-white opacity-0 group-hover:opacity-100"
                          >
                            Cover
                          </button>
                        )
                      )}
                      {editingItem.show_in_shop === false && editingItem.images.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingItem((curr) => ({
                              ...curr,
                              images: curr.images.filter((_, i) => i !== idx),
                            }))
                          }
                          className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-red-600"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                  {editingItem.show_in_shop === false && (
                    <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 text-[10px] font-semibold text-stone-500 hover:border-gold">
                      <Upload size={14} />
                      <span>{uploadingEditImage ? "..." : "Add"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditModalImages}
                        className="hidden"
                        disabled={uploadingEditImage}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-stone-600">
                  Product Name
                  <input
                    required
                    disabled={editingItem.show_in_shop}
                    value={editingItem.name}
                    onChange={(e) => setEditingItem((curr) => ({ ...curr, name: e.target.value }))}
                    className={`${inputClass} disabled:bg-stone-100`}
                  />
                </label>
                <label className="text-xs font-semibold text-stone-600">
                  Size / Variant Label
                  <input
                    value={editingItem.variant_label}
                    onChange={(e) => setEditingItem((curr) => ({ ...curr, variant_label: e.target.value }))}
                    placeholder="e.g. 50ml or Standard"
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-semibold text-stone-600">
                  Stock Quantity
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={editingItem.stock_quantity}
                    onChange={(e) => setEditingItem((curr) => ({ ...curr, stock_quantity: e.target.value }))}
                    className={inputClass}
                  />
                </label>
              </div>

              {editingItem.show_in_shop === false && (
                <label className="block text-xs font-semibold text-stone-600">
                  Description
                  <textarea
                    rows={3}
                    value={editingItem.description}
                    onChange={(e) => setEditingItem((curr) => ({ ...curr, description: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-gold"
                  />
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-1.5 rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-white hover:bg-ink disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
