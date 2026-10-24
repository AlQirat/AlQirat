import { redirect } from "next/navigation";

// The shop page lists every product; keep the old address working.
export default function AllProductsPage() {
  redirect("/shop");
}
