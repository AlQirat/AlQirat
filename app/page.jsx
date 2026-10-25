import { loadCatalogForPage, loadContentForPage } from "@/lib/storefrontServer";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomeHero from "@/components/home/HomeHero";
import CategoryArches from "@/components/home/CategoryArches";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import StoryBanner from "@/components/home/StoryBanner";
import FeatureStrip from "@/components/home/FeatureStrip";
import CtaBand from "@/components/home/CtaBand";
import InstagramFeed from "@/components/home/InstagramFeed";
import Subscribe from "@/components/home/Subscribe";
import SignatureScent from "@/components/home/SignatureScent";

export const dynamic = "force-dynamic";

// Categories, products, hero slides and announcements all come from the database (managed in /admin).
export default async function Home() {
  const [catalog, content] = await Promise.all([loadCatalogForPage(), loadContentForPage()]);

  return (
    <div className="min-h-screen">
      <Header initialCatalog={catalog} initialContent={content} />
      <main>
        <HomeHero initialContent={content} />
        <CategoryArches categories={catalog.categories} />
        <SignatureScent />
        <FeaturedProducts initialCatalog={catalog} />
        <StoryBanner />
        <FeatureStrip />
        <CtaBand />
        <InstagramFeed />
        <Subscribe />
      </main>
      <Footer />
    </div>
  );
}
