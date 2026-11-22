import { notFound } from "next/navigation";
import { cache } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductDetails from "@/components/ProductDetails";
import {
  fetchStorefrontComboOffer,
  fetchStorefrontProductBySlug,
  loadCatalogForPage,
  loadContentForPage,
} from "@/lib/storefrontServer";
import { mapStorefrontProduct } from "@/lib/storefrontProducts";

export const dynamic = "force-dynamic";

// generateMetadata and the page both need the product; cache() makes that a single database read per request.
const loadProduct = cache(async (slug) => {
  const [catalog, content, comboOffer] = await Promise.all([
    loadCatalogForPage(),
    loadContentForPage(),
    fetchStorefrontComboOffer().catch(() => null),
  ]);
  let row = catalog.products.find((product) => product.slug === slug) || null;
  if (!row) {
    row = await fetchStorefrontProductBySlug(slug).catch(() => null);
  }
  return {
    catalog,
    content,
    comboOffer: comboOffer?.is_active ? comboOffer : null,
    product: row ? mapStorefrontProduct(row) : null,
  };
});

export async function generateMetadata({ params }) {
  const { product } = await loadProduct(params.slug);
  if (!product) return { title: "Product Not Found | Al Qirat Perfumes" };

  return {
    title: `${product.name} | Al Qirat Perfumes`,
    description: `${product.desc}. Shop ${product.category.toLowerCase()} from Al Qirat Perfumes.`,
  };
}

export default async function ProductPage({ params, searchParams }) {
  const { catalog, content, comboOffer, product } = await loadProduct(params.slug);
  if (!product) notFound();

  const fromCombos = searchParams?.from === "combos" || product.showInShop === false;

  return (
    <>
      <Header initialCatalog={catalog} initialContent={content} />
      <ProductDetails
        product={product}
        initialCatalog={catalog}
        initialComboOffer={comboOffer}
        fromCombos={fromCombos}
      />
      <Footer />
    </>
  );
}
