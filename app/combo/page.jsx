import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ComboOfferPage from "@/components/ComboOfferPage";
import { fetchStorefrontComboOffer, loadCatalogForPage, loadContentForPage } from "@/lib/storefrontServer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Choose Any 3 Perfumes | Al Qirat Perfumes" };

export default async function ComboPage() {
  const [catalog, content, offer] = await Promise.all([
    loadCatalogForPage(),
    loadContentForPage(),
    fetchStorefrontComboOffer().catch(() => null),
  ]);
  return <><Header initialCatalog={catalog} initialContent={content} /><ComboOfferPage initialOffer={offer?.is_active ? offer : null} /><Footer /></>;
}
