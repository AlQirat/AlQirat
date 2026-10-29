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
  let authResult;
  try {
    authResult = await supabase.auth.getUser();
  } catch (error) {
    console.error("[account] authentication lookup failed", error);
    redirect("/login?next=/account");
  }

  const user = authResult?.data?.user;
  if (!user) redirect("/login?next=/account");

  const [customerResult, addressResult, ordersResult] = await Promise.allSettled([
    supabase.from("customers").select("id,full_name,email,phone").eq("auth_user_id", user.id).maybeSingle(),
    supabase.from("delivery_addresses").select("id,address_line_1,address_line_2,city,state,postal_code,country").eq("auth_user_id", user.id).eq("is_default", true).limit(1),
    supabase.from("orders").select("id,order_number,status,payment_status,payment_method,subtotal,discount_amount,shipping_amount,total,created_at,shipping_address,custom_perfume_request_id,fulfillment_status,shiprocket_order_id,shiprocket_shipment_id,shiprocket_awb,shiprocket_courier_name,shiprocket_status,shiprocket_status_id,shiprocket_label_url,shiprocket_tracking_url,shiprocket_last_event_at,order_items(id,product_id,product_name,variant_label,unit_price,quantity,line_total,combo_offer_id,products(image_url))").order("created_at", { ascending: false }),
  ]);

  const customerResponse = customerResult.status === "fulfilled" ? customerResult.value : null;
  const addressResponse = addressResult.status === "fulfilled" ? addressResult.value : null;
  const ordersResponse = ordersResult.status === "fulfilled" ? ordersResult.value : null;
  const customer = customerResponse?.data || null;
  const address = addressResponse?.data?.[0] || null;
  const orders = Array.isArray(ordersResponse?.data)
    ? ordersResponse.data.map((order) => ({ ...order, order_items: Array.isArray(order.order_items) ? order.order_items : [] }))
    : [];
  const orderError = ordersResponse?.error || (ordersResult.status === "rejected" ? ordersResult.reason : null);

  if (customerResponse?.error || addressResponse?.error || orderError) {
    console.error("[account] account data lookup failed", {
      customer: customerResponse?.error?.message,
      address: addressResponse?.error?.message,
      orders: orderError?.message,
    });
  }

  return <><Header /><CustomerAccount user={{ id: user.id, email: user.email }} customer={customer} address={address} orders={orders} ordersError={orderError?.message || ""} /><Footer /></>;
}
