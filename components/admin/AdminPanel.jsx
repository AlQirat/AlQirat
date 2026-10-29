"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Boxes,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FolderTree,
  Gift,
  Image as ImageIcon,
  LayoutDashboard,
  Mail,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import Logo from "@/components/Logo";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminCustomers from "@/components/admin/AdminCustomers";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminInquiries from "@/components/admin/AdminInquiries";
import AdminSubscribers from "@/components/admin/AdminSubscribers";
import AdminCustomPerfume from "@/components/admin/AdminCustomPerfume";
import AdminComboOffer from "@/components/admin/AdminComboOffer";
import { AdminContentManager, AdminDeliverySettings, AdminReviews } from "@/components/admin/AdminContent";

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "customers", label: "Customers", icon: Users },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "inquiries", label: "Inquiries", icon: MessageSquare },
  { id: "subscribers", label: "Subscribers", icon: Mail },
  { id: "custom-perfume", label: "Custom Perfume Requests", icon: Star },
  { id: "hero-slides", label: "Hero Slides", icon: ImageIcon },
  { id: "combo-offer", label: "Combo Offer", icon: Gift },
  { id: "announcements", label: "Announcements", icon: BellRing },
  { id: "delivery", label: "Delivery Settings", icon: Truck },
  { id: "faqs", label: "Global FAQs", icon: CircleHelp },
];

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note, tone }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_12px_30px_-25px_rgba(21,16,12,0.55)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
          <p className="mt-1 text-xs text-stone-400">{note}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={21} />
        </span>
      </div>
    </article>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async (url, key) => {
      const response = await fetch(url, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Unable to load ${key}.`);
      return result[key];
    };
    Promise.all([
      load("/api/admin/catalog/categories", "categories"),
      load("/api/admin/catalog/products", "products"),
      load("/api/admin/orders", "orders"),
      load("/api/admin/customers", "customers"),
      load("/api/admin/inquiries", "inquiries"),
      load("/api/admin/subscribers", "subscribers"),
    ])
      .then(([categories, products, orders, customers, inquiries, subscribers]) => {
        if (mounted) setData({ categories, products, orders, customers, inquiries, subscribers });
      })
      .catch((requestError) => {
        if (mounted) setError(requestError.message);
      });
    return () => { mounted = false; };
  }, []);

  const count = (key) => (data ? data[key].length : "…");
  const activeProducts = data ? data.products.filter((product) => product.is_active).length : 0;
  const newInquiries = data ? data.inquiries.filter((inquiry) => inquiry.status === "new").length : 0;
  const pendingOrders = data ? data.orders.filter((order) => order.status === "pending").length : 0;
  const lowStock = data ? data.products.filter((product) => product.is_active && product.stock_quantity <= 5).length : 0;

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Package} label="Products" value={count("products")} note={data ? `${activeProducts} active` : "Loading"} tone="bg-amber-100 text-amber-700" />
        <StatCard icon={FolderTree} label="Categories" value={count("categories")} note="Shown in the Shop menu" tone="bg-blue-100 text-blue-700" />
        <StatCard icon={ClipboardList} label="Orders" value={count("orders")} note={data ? `${pendingOrders} pending` : "Loading"} tone="bg-emerald-100 text-emerald-700" />
        <StatCard icon={Users} label="Customers" value={count("customers")} note="Registered accounts" tone="bg-purple-100 text-purple-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <SectionHeading
            eyebrow="Catalog overview"
            title="Products by category"
            description="Live totals from your database."
          />
          {data && data.categories.length === 0 ? (
            <p className="px-7 py-10 text-center text-sm text-stone-500">No categories yet. Add one under Categories.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left">
                <thead className="bg-stone-50 text-[11px] uppercase tracking-[0.14em] text-stone-500">
                  <tr>
                    <th className="px-7 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Subcategories</th>
                    <th className="px-7 py-3 text-right font-semibold">Products</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(data?.categories || []).map((category) => (
                    <tr key={category.id} className="text-sm">
                      <td className="px-7 py-4 font-semibold text-ink">{category.name}</td>
                      <td className="px-5 py-4 text-stone-500">{category.subcategories.length}</td>
                      <td className="px-7 py-4 text-right font-semibold">{category.product_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dark">Needs attention</p>
          <h3 className="mt-2 text-xl font-bold">Today at a glance</h3>
          <div className="mt-6 space-y-5">
            {[
              ["Pending orders", pendingOrders],
              ["New inquiries", newInquiries],
              ["Low stock products (5 or fewer)", lowStock],
              ["Newsletter subscribers", count("subscribers")],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b border-stone-100 pb-4 text-sm last:border-0 last:pb-0">
                <span className="text-stone-500">{label}</span>
                <span className="font-semibold text-ink">{data ? value : "…"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function renderModule(active) {
  if (active === "dashboard") return <Dashboard />;
  if (active === "categories") return <AdminCategories />;
  if (active === "products") return <AdminProducts />;
  if (active === "orders") return <AdminOrders />;
  if (active === "customers") return <AdminCustomers />;
  if (active === "reviews") return <AdminReviews />;
  if (active === "inquiries") return <AdminInquiries />;
  if (active === "subscribers") return <AdminSubscribers />;
  if (active === "custom-perfume") return <AdminCustomPerfume />;
  if (active === "hero-slides") return <AdminContentManager resource="hero-slides" />;
  if (active === "combo-offer") return <AdminComboOffer />;
  if (active === "announcements") return <AdminContentManager resource="announcements" />;
  if (active === "delivery") return <AdminDeliverySettings />;
  return <AdminContentManager resource="faqs" />;
}

export default function AdminPanel({ initialSection }) {
  const [active, setActive] = useState(initialSection);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeLabel = useMemo(() => navigation.find((item) => item.id === active)?.label || "Dashboard", [active]);

  const selectModule = (id) => {
    setActive(id);
    setMobileMenuOpen(false);
    const url = new URL(window.location.href);
    if (id === "dashboard") url.searchParams.delete("section");
    else url.searchParams.set("section", id);
    window.history.replaceState({}, "", url);
  };

  const logout = async () => {
    const response = await fetch("/api/admin/logout", { method: "POST" });
    if (response.ok) window.location.assign("/admin");
  };

  const sidebar = (
    <aside className="flex h-full flex-col bg-[#0d0c0b] text-stone-300">
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
        <Logo variant="emblem" className="h-10 w-10 rounded-full" />
        <div><p className="font-semibold text-white">Al Qirat Perfumes</p><p className="text-xs text-stone-500">Admin Panel</p></div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectModule(id)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${active === id ? "bg-[#4b250d] text-[#f0a532]" : "hover:bg-white/[0.06] hover:text-white"}`}
          >
            <Icon size={18} strokeWidth={1.7} /> {label}
          </button>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <a href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-white/[0.06] hover:text-white"><Boxes size={18} /> Storefront</a>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f7f7f6] text-ink lg:grid lg:h-screen lg:grid-cols-[220px_1fr] lg:overflow-hidden">
      <div className="hidden h-screen lg:block">{sidebar}</div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative h-full w-[280px] shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0 lg:h-screen lg:overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-stone-200 bg-white px-4 sm:px-7">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} aria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 lg:hidden"><Menu size={20} /></button>
            <div><p className="text-lg font-bold">{activeLabel}</p><p className="hidden text-xs text-stone-400 sm:block">Al Qirat Perfumes administration</p></div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden items-center gap-3 sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100"><UserRound size={17} /></span><span><span className="block text-sm font-medium">Admin</span><span className="block text-xs text-stone-400">Administrator</span></span></span>
            <button onClick={logout} className="flex items-center gap-2 text-sm text-stone-500 transition hover:text-red-600"><LogOut size={17} /><span className="hidden sm:inline">Logout</span></button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-7">
          <div className="mx-auto max-w-[1500px]">{renderModule(active)}</div>
        </main>
      </div>
    </div>
  );
}

