"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createProductSlug } from "@/lib/productCatalog";
import { calculateComboPricing, mergeComboSelections } from "@/lib/comboPricing";
import { useStorefrontCatalog, useStorefrontComboOffer } from "./useStorefrontData";

const STORAGE_KEY = "al_qirat_cart";
const CartContext = createContext(null);

function normalizeCartItem(product, quantity) {
  const variant = product.variant;
  const productSlug = product.slug || createProductSlug(product.name);
  const variantKey = variant ? `-${variant.size}` : "";
  return {
    slug: productSlug + variantKey,
    productSlug,
    name: product.name + (variant ? ` (${variant.size})` : ""),
    price: Number(variant?.price ?? product.price),
    src: product.src,
    quantity: Math.max(1, Number(quantity) || 1),
    variant: variant ? { size: variant.size, price: variant.price } : null,
  };
}

function normalizeComboCartItem(offer, selections) {
  const pricing = calculateComboPricing(offer, selections);
  return {
    kind: "combo",
    slug: `combo-${offer.id}`,
    offerId: offer.id,
    offerSlug: offer.slug,
    name: offer.name || offer.title,
    src: offer.banner_image_url,
    quantity: 1,
    totalQuantity: pricing.totalQuantity,
    price: pricing.total,
    selections: pricing.lines.map((selection) => ({
      product_id: selection.product_id,
      name: selection.name,
      slug: selection.slug,
      src: selection.image_url || selection.src,
      stock_quantity: selection.stock_quantity,
      unit_price: selection.unit_price,
      quantity: selection.quantity,
    })),
  };
}

export function getCartLineTotal(item) {
  return item.kind === "combo" ? Number(item.price) : Number(item.price) * Number(item.quantity);
}

function persistCart(items) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }) {
  const { products: catalogProducts, error: catalogError } = useStorefrontCatalog();
  const { data: comboData } = useStorefrontComboOffer();
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedItems = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(storedItems)) {
        itemsRef.current = storedItems;
        setItems(storedItems);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || !catalogProducts.length) return;
    const currentItems = itemsRef.current;
    const nextItems = currentItems.map((item) => {
      if (item.kind === "combo") {
        if (!comboData.offer || comboData.offer.id !== item.offerId) return item;
        const eligibleIds = new Set(comboData.offer.products.map((product) => String(product.product_id || product.id)));
        const stale = item.selections.some((selection) => !eligibleIds.has(String(selection.product_id)));
        const refreshed = normalizeComboCartItem(comboData.offer, item.selections);
        return { ...refreshed, stale };
      }
        const itemProductSlug = item.productSlug || item.slug.replace(/-(6ml|12ml)$/, "");
        const product = catalogProducts.find(
          (candidate) => (candidate.slug || createProductSlug(candidate.name)) === itemProductSlug,
        );

        // A temporary catalog/API mismatch must never erase a customer's cart.
        if (!product) return item;

        const variant = item.variant
          ? product.variants?.find((candidate) => candidate.size === item.variant.size)
          : null;
        const availableStock = variant?.stock ?? product.stockQuantity;
        const quantity = Number.isFinite(availableStock) && availableStock > 0
          ? Math.min(item.quantity, availableStock)
          : item.quantity;

        return {
          ...item,
          productSlug: itemProductSlug,
          name: product.name + (variant ? ` (${variant.size})` : ""),
          price: Number(variant?.price ?? product.price),
          src: product.src,
          quantity,
        };
    });

    if (JSON.stringify(nextItems) !== JSON.stringify(currentItems)) {
      itemsRef.current = nextItems;
      persistCart(nextItems);
      setItems(nextItems);
    }
  }, [catalogProducts, comboData.offer, loaded]);

  const addItem = useCallback((product, quantity = 1) => {
    const nextItem = normalizeCartItem(product, quantity);
    const currentItems = itemsRef.current;
    const existing = currentItems.find((item) => item.slug === nextItem.slug);
    const nextItems = !existing ? [...currentItems, nextItem] : currentItems.map((item) =>
      item.slug === nextItem.slug
        ? { ...item, quantity: item.quantity + nextItem.quantity }
        : item,
    );
    itemsRef.current = nextItems;
    persistCart(nextItems);
    setItems(nextItems);
  }, []);

  const addComboItem = useCallback((offer, selections) => {
    const currentItems = itemsRef.current;
    const existing = currentItems.find((item) => item.kind === "combo" && item.offerId === offer.id);
    const mergedSelections = existing ? mergeComboSelections(existing.selections, selections) : selections;
    const nextCombo = normalizeComboCartItem(offer, mergedSelections);
    const nextItems = existing
      ? currentItems.map((item) => item.slug === existing.slug ? nextCombo : item)
      : [...currentItems, nextCombo];
    itemsRef.current = nextItems;
    persistCart(nextItems);
    setItems(nextItems);
  }, []);

  const updateComboSelection = useCallback((slug, productId, quantity) => {
    const offer = comboData.offer;
    const currentItems = itemsRef.current;
    const item = currentItems.find((candidate) => candidate.kind === "combo" && candidate.slug === slug);
    const product = offer?.products?.find((candidate) => String(candidate.product_id || candidate.id) === String(productId));
    if (!offer || !item || !product) return;

    const currentSelection = item.selections.find((selection) => String(selection.product_id) === String(productId));
    const currentQuantity = Number(currentSelection?.quantity || 0);
    const maximumTotal = Math.max(1, Number(offer.max_quantity) || 1);
    const maximumPerProduct = Math.max(1, Number(offer.max_quantity_per_product) || maximumTotal);
    const availableStock = Number(product.stock_quantity);
    const stockLimit = Number.isFinite(availableStock) && availableStock > 0 ? availableStock : currentQuantity;
    const requestedQuantity = Math.max(0, Number(quantity) || 0);
    const maximumByOffer = Math.max(0, maximumTotal - (item.totalQuantity - currentQuantity));
    const sameProductLimit = offer.allow_same_product === false ? 1 : maximumPerProduct;
    if (!currentSelection && offer.allow_mixed_products === false && item.selections.length > 0) return;
    const nextQuantity = Math.min(requestedQuantity, sameProductLimit, stockLimit, maximumByOffer);
    const nextSelections = item.selections
      .map((selection) => String(selection.product_id) === String(productId) ? { ...product, ...selection, product_id: String(productId), quantity: nextQuantity } : selection)
      .filter((selection) => selection.quantity > 0);

    if (!currentSelection && nextQuantity > 0) nextSelections.push({ ...product, product_id: String(productId), quantity: nextQuantity });
    const nextItems = nextSelections.length === 0
      ? currentItems.filter((candidate) => candidate.slug !== slug)
      : currentItems.map((candidate) => candidate.slug === slug ? normalizeComboCartItem(offer, nextSelections) : candidate);
    itemsRef.current = nextItems;
    persistCart(nextItems);
    setItems(nextItems);
  }, [comboData.offer]);

  const updateQuantity = useCallback((slug, quantity) => {
    const nextItems = itemsRef.current
      .map((item) => item.slug === slug ? { ...item, quantity: Math.max(0, quantity) } : item)
      .filter((item) => item.quantity > 0);
    itemsRef.current = nextItems;
    persistCart(nextItems);
    setItems(nextItems);
  }, []);

  const removeItem = useCallback((slug) => {
    const nextItems = itemsRef.current.filter((item) => item.slug !== slug);
    itemsRef.current = nextItems;
    persistCart(nextItems);
    setItems(nextItems);
  }, []);

  const clearCart = useCallback(() => {
    itemsRef.current = [];
    persistCart([]);
    setItems([]);
  }, []);
  const itemCount = items.reduce((total, item) => total + (item.kind === "combo" ? item.totalQuantity : item.quantity), 0);
  const subtotal = items.reduce((total, item) => total + getCartLineTotal(item), 0);
  const value = useMemo(
    () => ({ items, itemCount, subtotal, catalogProducts, catalogError, addItem, addComboItem, updateComboSelection, updateQuantity, removeItem, clearCart }),
    [items, itemCount, subtotal, catalogProducts, catalogError, addItem, addComboItem, updateComboSelection, updateQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}
