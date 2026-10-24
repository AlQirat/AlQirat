"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createProductSlug } from "@/lib/productCatalog";

const STORAGE_KEY = "al_qirat_wishlist";
const WishlistContext = createContext(null);

export function getWishlistKey(product) {
  return product?.slug || product?.productSlug || createProductSlug(product?.name);
}

function readStoredWishlist() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter((value) => typeof value === "string") : [];
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function WishlistProvider({ children }) {
  const [keys, setKeys] = useState([]);

  useEffect(() => {
    setKeys(readStoredWishlist());
    const syncWishlist = (event) => {
      if (event.key === STORAGE_KEY) setKeys(readStoredWishlist());
    };
    window.addEventListener("storage", syncWishlist);
    return () => window.removeEventListener("storage", syncWishlist);
  }, []);

  const toggleWishlist = useCallback((product) => {
    const key = getWishlistKey(product);
    setKeys((currentKeys) => {
      const nextKeys = currentKeys.includes(key)
        ? currentKeys.filter((currentKey) => currentKey !== key)
        : [...currentKeys, key];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextKeys));
      return nextKeys;
    });
  }, []);

  const removeFromWishlist = useCallback((product) => {
    const key = getWishlistKey(product);
    setKeys((currentKeys) => {
      const nextKeys = currentKeys.filter((currentKey) => currentKey !== key);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextKeys));
      return nextKeys;
    });
  }, []);

  const clearWishlist = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setKeys([]);
  }, []);

  const isWishlisted = useCallback((product) => keys.includes(getWishlistKey(product)), [keys]);
  const value = useMemo(
    () => ({ keys, count: keys.length, isWishlisted, toggleWishlist, removeFromWishlist, clearWishlist }),
    [clearWishlist, isWishlisted, keys, removeFromWishlist, toggleWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider.");
  return context;
}
