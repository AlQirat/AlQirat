import Header from "@/components/Header";
import AllProducts from "@/components/AllProducts";
import Footer from "@/components/Footer";
import { loadCatalogForPage, loadContentForPage } from "@/lib/storefrontServer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gift Sets | Al Qirat Perfumes",
  description: "Considered gift sets from Al Qirat Perfumes, presented for someone special.",
};

export default async function GiftSetsPage({ searchParams }) {
  // The header menu always lists the regular shop catalog; the page body lists the collection.
  const [shopCatalog, collectionCatalog, content] = await Promise.all([
    loadCatalogForPage(),
    loadCatalogForPage("gift-set"),
    loadContentForPage(),
  ]);
  return (
    <>
      <Header initialCatalog={shopCatalog} initialContent={content} />
      <main><AllProducts collection="gift-set" initialCategory={searchParams?.category || ""} initialCatalog={collectionCatalog} /></main>
      <Footer />
    </>
  );
}
