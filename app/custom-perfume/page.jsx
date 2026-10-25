import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CustomPerfumeForm from "@/components/CustomPerfumeForm";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create Your Signature Scent | Al Qirat Perfumes", description: "Share your fragrance inspiration and request a personal quotation for a similar scent profile." };

export default async function CustomPerfumePage() {
  let user = null;
  if (isSupabaseConfigured()) {
    const result = await createClient().auth.getUser();
    user = result.data.user;
  }
  return <><Header /><CustomPerfumeForm user={user ? { email: user.email, name: user.user_metadata?.full_name || "" } : null} /><Footer /></>;
}
