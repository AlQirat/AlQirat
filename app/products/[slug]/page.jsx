import { notFound } from "next/navigation";
import { cache } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductDetails from "@/components/ProductDetails";
import { loadCatalogForPage } from "@/lib/storefrontServer";
import { mapStorefrontProduct } from "@/lib/storefrontProducts";

export const dynamic = "force-dynamic";

// generateMetadata and the page both need the product; cache() makes that a single database read per request.
const loadProduct = cache(async (slug) => {
  const catalog = await loadCatalogForPage();
  const row = catalog.products.find((product) => product.slug === slug);
  return { catalog, product: row ? mapStorefrontProduct(row) : null };
});

export async function generateMetadata({ params }) {
  const { product } = await loadProduct(params.slug);
  if (!product) return { title: "Product Not Found | Al Qirat Perfumes" };

  return {
    title: `${product.name} | Al Qirat Perfumes`,
    description: `${product.desc}. Shop ${product.category.toLowerCase()} from Al Qirat Perfumes.`,
  };
}

export default async function ProductPage({ params }) {
  const { catalog, product } = await loadProduct(params.slug);
  if (!product) notFound();

  return (
    <>
      <Header initialCatalog={catalog} />
      <ProductDetails product={product} initialCatalog={catalog} />
      <Footer />
    </>
  );
}
