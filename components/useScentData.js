"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribeToStorefrontUpdates } from "@/lib/storefrontSync";

export async function scentFetch(url, options) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to complete this request.");
  return result;
}

export function useScentData(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const result = await scentFetch(url, {});
      setData(result);
      setError("");
    } catch (failure) { setError(failure.message); }
  }, [url]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const update = async () => {
      try {
        const result = await scentFetch(url, { signal: controller.signal });
        if (active) { setData(result); setError(""); }
      } catch (failure) { if (active) setError(failure.message); }
    };
    update();
    const timer = window.setInterval(update, 10000);
    window.addEventListener("focus", update);
    const unsubscribe = subscribeToStorefrontUpdates(update);
    return () => { active = false; controller.abort(); clearInterval(timer); window.removeEventListener("focus", update); unsubscribe(); };
  }, [url]);
  return { data, error, refresh };
}
