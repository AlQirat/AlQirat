import Header from "@/components/Header";
import AllProducts from "@/components/AllProducts";
import Footer from "@/components/Footer";
import { loadCatalogForPage, loadContentForPage } from "@/lib/storefrontServer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Special Edition | Al Qirat Perfumes",
  description: "Exclusive, limited-run fragrances from Al Qirat Perfumes, crafted for true connoisseurs.",
};

export default async function SpecialEditionsPage({ searchParams }) {
  // The header menu always lists the regular shop catalog; the page body lists the collection.
  const [shopCatalog, collectionCatalog, content] = await Promise.all([
    loadCatalogForPage(),
    loadCatalogForPage("special-edition"),
    loadContentForPage(),
  ]);
  return (
    <>
      <Header initialCatalog={shopCatalog} initialContent={content} />
      <main><AllProducts collection="special-edition" initialCategory={searchParams?.category || ""} initialCatalog={collectionCatalog} /></main>
      <Footer />
    </>
  );
}
