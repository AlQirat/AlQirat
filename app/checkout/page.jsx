import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CustomerCheckout from "@/components/CustomerCheckout";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout | Al Qirat Perfumes" };

export default async function CheckoutPage() {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/checkout");

  const [{ data: customer }, { data: addresses }] = await Promise.all([
    supabase.from("customers").select("full_name, phone").eq("auth_user_id", user.id).maybeSingle(),
    supabase.from("delivery_addresses").select("id, recipient_name, phone, address_line_1, address_line_2, city, state, postal_code, country").eq("auth_user_id", user.id).eq("is_default", true).limit(1),
  ]);

  return (
    <>
      <Header />
      <CustomerCheckout user={{ id: user.id, email: user.email }} customer={customer} address={addresses?.[0] || null} />
      <Footer />
    </>
  );
}
