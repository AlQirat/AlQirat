"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, ShoppingBag, User } from "lucide-react";
import Logo from "./Logo";
import MobileSidebar from "./MobileSidebar";
import ProductSearch from "./ProductSearch";
import SmartImage from "./SmartImage";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";
import { useStorefrontCategories, useStorefrontContent } from "./useStorefrontData";
import { brand } from "@/lib/brand";

// The Shop menu lists the categories managed in the admin dashboard.
function buildNavItems(categories, comboOffer) {
  const items = [
    { label: "Home", href: "/" },
    {
      label: "Shop",
      href: "/shop",
      children: categories.length
        ? categories.map((category) => ({
            name: category.name,
            href: `/shop?category=${category.slug}`,
            image: category.image_url || "",
          }))
        : undefined,
    },
  ];
  if (comboOffer?.is_active) {
    items.push({
      label: "Combos",
      href: "/combos",
      isCombo: true,
      badge: "Offer",
    });
  }
  items.push(
    { label: "Special Edition", href: "/special-editions" },
    { label: "Gift Sets", href: "/gift-sets" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  );
  return items;
}

// Hover / keyboard-focus dropdown listing every category with its picture.
function ShopMenu({ item, active, comboOffer }) {
  return (
    <div className="group relative">
      <a
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex items-center gap-1 py-2 text-[13.5px] font-medium tracking-wide transition duration-300 hover:text-gold-dark ${
          active ? "text-ink" : "text-ink/75"
        }`}
      >
        {item.label}
        <ChevronDown size={14} className="transition duration-300 group-hover:rotate-180 group-focus-within:rotate-180" />
        <span
          className={`absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-ink transition-transform duration-300 ${
            active ? "scale-x-100" : "scale-x-0"
          }`}
        />
      </a>

      <div className="invisible absolute left-1/2 top-full z-50 w-[320px] max-w-[calc(100vw-2rem)] -translate-x-1/2 translate-y-2 pt-4 opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 xl:w-[360px] 2xl:w-[400px]">
        <div className="overflow-hidden rounded-2xl border border-gold/20 bg-white shadow-[0_26px_60px_-24px_rgba(20,40,26,0.5)]">
          <ul className="dropdown-scrollbar max-h-[min(272px,55vh)] overflow-y-auto overscroll-contain p-2 xl:max-h-[min(320px,60vh)] 2xl:max-h-[min(336px,62vh)]">
            {item.children.map((category) => (
              <li key={category.href}>
                <a href={category.href} className="group/row flex items-center gap-3.5 rounded-xl p-2 transition hover:bg-cream xl:gap-4 xl:p-2.5 2xl:p-3">
                  <SmartImage
                    src={category.image}
                    alt=""
                    tone="from-sage to-cream"
                    imageKitTransform="f-auto,q-75,w-160"
                    className="h-12 w-12 shrink-0 rounded-xl xl:h-14 xl:w-14"
                    imgClassName="h-full w-full object-cover"
                  />
                  <span className="flex-1 text-[14px] font-medium text-ink xl:text-[15px]">{category.name}</span>
                </a>
              </li>
            ))}
          </ul>
          {comboOffer?.is_active && (
            <div className="border-t border-stone-100 p-2.5">
              <a
                href="/combos"
                className="block rounded-xl border border-gold/30 bg-gradient-to-r from-cream to-sage-light p-3 transition hover:border-gold"
              >
                <span className="inline-block rounded-full bg-forest px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-light">
                  {comboOffer.showcase_badge || "Combo Set"}
                </span>
                <p className="mt-1.5 text-[13.5px] font-bold text-ink">
                  {comboOffer.showcase_heading || comboOffer.title || "Build Your Own Combo"}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink/70">
                  {comboOffer.showcase_description ||
                    comboOffer.subtitle ||
                    `Pick any ${comboOffer.bundle_quantity || 3} bottles for ₹${comboOffer.combo_price || 499}`}
                </p>
              </a>
            </div>
          )}
          <a href={item.href} className="flex items-center justify-center border-t border-stone-100 bg-cream/60 py-3 text-[13px] font-medium text-ink transition hover:text-gold-dark">
            View all products
          </a>
        </div>
      </div>
    </div>
  );
}

// One announcement at a time, rotating. Only rendered when the admin has added announcements.
function AnnouncementBar({ messages }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (messages.length < 2) return undefined;
    const id = setInterval(() => setIndex((value) => (value + 1) % messages.length), 4000);
    return () => clearInterval(id);
  }, [messages.length]);

  if (!messages.length) return null;
  return (
    <div className="bg-ink text-center text-[12px] font-medium tracking-[0.12em] text-gold-light">
      <p key={index % messages.length} className="animate-fade-in px-4 py-2.5">
        {messages[index % messages.length]}
      </p>
    </div>
  );
}

// initialCatalog / initialContent are optional: pages that already loaded them pass them in so the menu
// and announcement bar are present on first paint instead of appearing after a client fetch.
export default function Header({ initialCatalog, initialContent }) {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { data: storefrontContent } = useStorefrontContent(initialContent);
  const { categories: liveCategories } = useStorefrontCategories(initialCatalog);
  const comboOffer = storefrontContent.combo_offer;
  const navItems = buildNavItems(liveCategories, comboOffer);
  const announcements = (storefrontContent.announcements || []).map((item) => item.message).filter(Boolean);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef(null);
  const closeMenu = useCallback(() => {
    menuButtonRef.current?.focus();
    setOpen(false);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    if (href === "/shop") return pathname.startsWith("/shop") || pathname.startsWith("/products") || pathname === "/all-products";
    if (href === "/combos") return pathname === "/combos" || pathname === "/combo";
    return pathname === href;
  };

  return (
    <>
      <AnnouncementBar messages={announcements} />

      <header className="sticky top-0 z-50">
        <div
          className={`border-b transition duration-300 ${
            scrolled ? "border-gold/25 bg-cream/95 shadow-[0_10px_30px_-18px_rgba(20,40,26,0.35)] backdrop-blur" : "border-transparent bg-cream"
          }`}
        >
          <div className="container-site flex h-[76px] items-center justify-between gap-2 sm:h-[96px] sm:gap-4">
            <a href="/" aria-label={`${brand.name} home`} className="shrink-0">
              <Logo className="h-14 sm:h-[76px]" />
            </a>

            <nav aria-label="Main" className="hidden items-center gap-6 xl:gap-9 lg:flex">
              {navItems.map((item) => item.children ? (
                <ShopMenu key={item.label} item={item} active={isActive(item.href)} comboOffer={comboOffer} />
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`relative flex items-center gap-1.5 py-2 text-[13.5px] font-medium tracking-wide transition duration-300 hover:text-gold-dark ${
                    isActive(item.href) ? "text-ink" : "text-ink/75"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-ink transition-transform duration-300 ${
                      isActive(item.href) ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-0.5 text-ink sm:gap-1">
              <ProductSearch />

              <a
                href="/account"
                aria-label="Account"
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-gold/15 hover:text-gold-dark"
              >
                <User size={19} />
              </a>

              <Link
                href="/wishlist"
                aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} saved` : ""}`}
                className="relative hidden h-10 w-10 items-center justify-center rounded-full transition hover:bg-gold/15 hover:text-gold-dark sm:flex"
              >
                <Heart size={19} fill={wishlistCount ? "currentColor" : "none"} />
                {wishlistCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </Link>

              <Link
                href="/cart"
                aria-label={`Cart, ${itemCount} items`}
                className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-gold/15 hover:text-gold-dark"
              >
                <ShoppingBag size={19} />
                <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[9px] font-bold text-gold-light">
                  {itemCount}
                </span>
              </Link>

              <a href="/shop" className="btn-forest ml-3 hidden !px-6 !py-3 sm:inline-flex">
                Shop Now
              </a>

              <button
                ref={menuButtonRef}
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                className="relative ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/35 text-ink transition duration-300 hover:border-gold hover:bg-gold/15 lg:hidden"
                onClick={() => setOpen((value) => !value)}
              >
                <span className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-1.5"}`} />
                <span className={`absolute h-0.5 w-5 rounded-full bg-current transition-all duration-200 ${open ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100"}`} />
                <span className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-1.5"}`} />
              </button>
            </div>
          </div>
        </div>

        <MobileSidebar open={open} onClose={closeMenu} items={navItems} />
      </header>
    </>
  );
}
