import Header from "@/components/Header";
import WishlistPage from "@/components/WishlistPage";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Wishlist | Al Qirat Perfumes",
  description: "View and manage your saved Al Qirat Perfumes products.",
};

export default function WishlistRoute() {
  return (
    <>
      <Header />
      <WishlistPage />
      <Footer />
    </>
  );
}
