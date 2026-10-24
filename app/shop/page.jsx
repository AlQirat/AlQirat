import Header from "@/components/Header";
import AllProducts from "@/components/AllProducts";
import Footer from "@/components/Footer";
import { loadCatalogForPage, loadContentForPage } from "@/lib/storefrontServer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop | Al Qirat Perfumes",
  description: "Shop the complete Al Qirat collection of premium perfumes, attars, gift sets and special editions.",
};

export default async function ShopPage({ searchParams }) {
  const [catalog, content] = await Promise.all([loadCatalogForPage(), loadContentForPage()]);
  return (
    <>
      <Header initialCatalog={catalog} initialContent={content} />
      <main><AllProducts initialCategory={searchParams?.category || ""} initialCatalog={catalog} /></main>
      <Footer />
    </>
  );
}
