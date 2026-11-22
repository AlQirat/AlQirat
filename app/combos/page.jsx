import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ComboOfferPage from "@/components/ComboOfferPage";
import { fetchStorefrontComboOffer, loadCatalogForPage, loadContentForPage } from "@/lib/storefrontServer";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Build Your Own Combo Set | Al Qirat Perfumes",
  description: "Pick your favourite fragrances and build your own custom gift & combo set at special bundle pricing.",
};

export default async function CombosPage() {
  const [catalog, content, offer] = await Promise.all([
    loadCatalogForPage(),
    loadContentForPage(),
    fetchStorefrontComboOffer().catch(() => null),
  ]);
  return (
    <>
      <Header initialCatalog={catalog} initialContent={content} />
      <ComboOfferPage initialOffer={offer?.is_active ? offer : null} />
      <Footer />
    </>
  );
}
