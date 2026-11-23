import Header from "@/components/Header";
import AllProducts from "@/components/AllProducts";
import Footer from "@/components/Footer";
import { loadCatalogForPage, loadContentForPage } from "@/lib/storefrontServer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Attars | Al Qirat Perfumes",
  description: "Traditional concentrated attars from Al Qirat Perfumes, made to be worn close to the skin.",
};

export default async function AttarsPage({ searchParams }) {
  // The header menu always lists the regular shop catalog; the page body lists the collection.
  const [shopCatalog, collectionCatalog, content] = await Promise.all([
    loadCatalogForPage(),
    loadCatalogForPage("attar"),
    loadContentForPage(),
  ]);
  return (
    <>
      <Header initialCatalog={shopCatalog} initialContent={content} />
      <main><AllProducts collection="attar" initialCategory={searchParams?.category || ""} initialCatalog={collectionCatalog} /></main>
      <Footer />
    </>
  );
}
