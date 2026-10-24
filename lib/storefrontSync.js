export const STOREFRONT_SYNC_KEY = "al_qirat_storefront_sync";

export function notifyStorefrontUpdate(scope) {
  const update = JSON.stringify({ scope, timestamp: Date.now() });
  window.localStorage.setItem(STOREFRONT_SYNC_KEY, update);
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(STOREFRONT_SYNC_KEY);
    channel.postMessage(update);
    channel.close();
  }
}

export function subscribeToStorefrontUpdates(callback) {
  const onStorage = (event) => { if (event.key === STOREFRONT_SYNC_KEY) callback(); };
  window.addEventListener("storage", onStorage);
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(STOREFRONT_SYNC_KEY) : null;
  if (channel) channel.onmessage = callback;
  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}
