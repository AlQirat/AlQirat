import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CustomerAccount from "@/components/CustomerAccount";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Account & Orders | Al Qirat Perfumes" };

export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const [{ data: customer }, { data: addresses }, { data: orders, error: orderError }] = await Promise.all([
    supabase.from("customers").select("id,full_name,email,phone").eq("auth_user_id", user.id).maybeSingle(),
    supabase.from("delivery_addresses").select("id,address_line_1,address_line_2,city,state,postal_code,country").eq("auth_user_id", user.id).eq("is_default", true).limit(1),
    supabase.from("orders").select("id,order_number,status,payment_status,payment_method,total,created_at,shipping_address,order_items(id,product_name,variant_label,unit_price,quantity,line_total)").order("created_at", { ascending: false }),
  ]);
  if (orderError) throw new Error(`Unable to load order history: ${orderError.message}`);

  return <><Header /><CustomerAccount user={{ id: user.id, email: user.email }} customer={customer} address={addresses?.[0] || null} orders={orders || []} /><Footer /></>;
}
