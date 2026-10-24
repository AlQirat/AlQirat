"use client";

import { useEffect, useMemo, useReducer } from "react";
import { subscribeToStorefrontUpdates } from "@/lib/storefrontSync";
import { getProductKey, mapStorefrontProduct } from "@/lib/storefrontProducts";

export { mapStorefrontProduct };

const emptyCatalog = { products: [], categories: [] };
const emptyContent = { hero_slides: [], announcements: [], delivery_settings: null, faqs: [] };
const POLL_MS = 10000;

// One shared store per endpoint, so the header, cart, featured products and the shop page all read the
// same data from a single request instead of each polling the API on their own.
const stores = new Map();

function isEmpty(value) {
  return Object.values(value).every((item) => (Array.isArray(item) ? item.length === 0 : !item));
}

function getStore(url, initialValue) {
  let store = stores.get(url);
  if (!store) {
    store = { data: initialValue, signature: JSON.stringify(initialValue), error: "", live: false, inflight: null, listeners: new Set(), timer: 0 };
    stores.set(url, store);
  } else if (!store.live && isEmpty(store.data) && !isEmpty(initialValue)) {
    // Data rendered on the server seeds the store before the first live response arrives.
    store.data = initialValue;
    store.signature = JSON.stringify(initialValue);
  }
  return store;
}

const notify = (store) => store.listeners.forEach((listener) => listener());

function refreshStore(url, store) {
  if (store.inflight) return store.inflight;
  store.inflight = (async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Unable to load ${url}.`);
      store.live = true;
      store.error = "";
      const signature = JSON.stringify(result);
      if (signature !== store.signature) {
        store.signature = signature;
        store.data = result;
      }
    } finally {
      store.inflight = null;
      notify(store);
    }
  })();
  return store.inflight;
}

function useLiveEndpoint(url, initialValue) {
  // The server renders from the initial value only; the shared store exists in the browser.
  const store = typeof window === "undefined" ? null : getStore(url, initialValue);
  const [, rerender] = useReducer((count) => count + 1, 0);

  useEffect(() => {
    if (!store) return undefined;
    const update = () => refreshStore(url, store).catch((error) => { store.error = error.message; });
    store.listeners.add(rerender);
    if (store.listeners.size === 1) {
      update();
      store.timer = window.setInterval(update, POLL_MS);
    } else if (!store.live) {
      update();
    }
    const unsubscribe = subscribeToStorefrontUpdates(update);
    return () => {
      unsubscribe();
      store.listeners.delete(rerender);
      if (!store.listeners.size) window.clearInterval(store.timer);
    };
  }, [url, store]);

  return {
    data: store ? store.data : initialValue,
    error: store ? store.error : "",
    refresh: () => (store ? refreshStore(url, store) : Promise.resolve()),
  };
}

export function useStorefrontCatalog(initialCatalog = emptyCatalog) {
  const { data, error, refresh } = useLiveEndpoint("/api/storefront/catalog", initialCatalog);
  const products = useMemo(() => {
    const seen = new Set();
    return data.products
      .map(mapStorefrontProduct)
      .filter((product) => {
        const key = getProductKey(product);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [data.products]);
  return { products, categories: data.categories, error, refresh };
}

export function useStorefrontCategories(initialCatalog) {
  const { categories, error, refresh } = useStorefrontCatalog(initialCatalog);
  return { categories, error, refresh };
}

export function useStorefrontContent(initialValue = emptyContent) {
  return useLiveEndpoint("/api/storefront/content", initialValue);
}
