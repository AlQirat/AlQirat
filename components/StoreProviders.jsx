"use client";

import { CartProvider } from "./CartProvider";
import { WishlistProvider } from "./WishlistProvider";

export default function StoreProviders({ children }) {
  return <WishlistProvider><CartProvider>{children}</CartProvider></WishlistProvider>;
}
