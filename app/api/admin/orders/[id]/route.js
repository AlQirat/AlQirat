import { NextResponse } from "next/server";
import { createAdminCatalogClient, isAuthorizedAdminRequest } from "@/lib/adminCatalog";

const orderStatuses = new Set(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]);
const paymentStatuses = new Set(["pending", "paid", "failed", "refunded"]);
const fulfillmentStatuses = new Set(["pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "rto"]);

export async function PATCH(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  const body = await request.json();
  if (body.status !== undefined && !orderStatuses.has(body.status)) return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
  if (body.payment_status !== undefined && !paymentStatuses.has(body.payment_status)) return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
  if (body.fulfillment_status !== undefined && !fulfillmentStatuses.has(body.fulfillment_status)) return NextResponse.json({ error: "Invalid fulfillment status." }, { status: 400 });

  const updates = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.payment_status !== undefined) updates.payment_status = body.payment_status;
  if (body.fulfillment_status !== undefined) updates.fulfillment_status = body.fulfillment_status;
  if (body.shiprocket_courier_name !== undefined) updates.shiprocket_courier_name = body.shiprocket_courier_name?.trim() || null;
  if (body.shiprocket_awb !== undefined) updates.shiprocket_awb = body.shiprocket_awb?.trim() || null;
  if (body.shipping_address !== undefined) {
    if (!body.shipping_address || typeof body.shipping_address !== "object") return NextResponse.json({ error: "Shipping address must be an object." }, { status: 400 });
    updates.shipping_address = body.shipping_address;
  }
  if (body.fulfillment_status !== undefined || body.shiprocket_courier_name !== undefined || body.shiprocket_awb !== undefined) {
    updates.fulfillment_updated_at = new Date().toISOString();
  }
  if (!Object.keys(updates).length) return NextResponse.json({ error: "No order changes were provided." }, { status: 400 });

  const supabase = createAdminCatalogClient();
  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", params.id)
    .select("id,status,payment_status,shipping_address,fulfillment_status,shiprocket_awb,shiprocket_courier_name,fulfillment_updated_at,updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ order: data });
}

export async function DELETE(request, { params }) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  }
  try {
    const supabase = createAdminCatalogClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,order_number,status,payment_method,payment_status,order_items(id,product_id,variant_label,quantity)")
      .eq("id", params.id)
      .maybeSingle();

    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    const shouldRestoreStock =
      order.status !== "delivered" &&
      (order.payment_method === "cod" || order.payment_status === "paid");

    if (shouldRestoreStock && Array.isArray(order.order_items) && order.order_items.length > 0) {
      const itemsByProduct = new Map();
      for (const item of order.order_items) {
        if (!item.product_id) continue;
        const qty = Math.max(0, Number(item.quantity) || 0);
        if (!qty) continue;
        if (!itemsByProduct.has(item.product_id)) {
          itemsByProduct.set(item.product_id, []);
        }
        itemsByProduct.get(item.product_id).push({
          variant_label: item.variant_label || null,
          quantity: qty,
        });
      }

      if (itemsByProduct.size > 0) {
        const { data: products, error: prodError } = await supabase
          .from("products")
          .select("id,stock_quantity,variants")
          .in("id", [...itemsByProduct.keys()]);
        if (prodError) throw new Error(prodError.message);

        for (const product of products || []) {
          const restorableLines = itemsByProduct.get(product.id) || [];
          let nextStock = Math.max(0, Number(product.stock_quantity) || 0);
          let nextVariants = Array.isArray(product.variants) ? [...product.variants] : null;
          let updatedVariantStock = false;

          for (const line of restorableLines) {
            if (line.variant_label && Array.isArray(nextVariants) && nextVariants.length > 0) {
              const idx = nextVariants.findIndex((v) => v?.size === line.variant_label);
              if (idx !== -1 && nextVariants[idx]?.stock !== undefined && nextVariants[idx]?.stock !== null) {
                nextVariants[idx] = {
                  ...nextVariants[idx],
                  stock: Math.max(0, Number(nextVariants[idx].stock) || 0) + line.quantity,
                };
                updatedVariantStock = true;
              } else {
                nextStock += line.quantity;
              }
            } else {
              nextStock += line.quantity;
            }
          }

          if (updatedVariantStock && Array.isArray(nextVariants)) {
            nextStock = nextVariants.reduce(
              (sum, v) => sum + (Math.max(0, Number(v?.stock) || 0)),
              0,
            );
          }

          const productUpdate = updatedVariantStock
            ? { stock_quantity: nextStock, variants: nextVariants }
            : { stock_quantity: nextStock };

          const { error: updateErr } = await supabase
            .from("products")
            .update(productUpdate)
            .eq("id", product.id);
          if (updateErr) throw new Error(updateErr.message);
        }
      }
    }

    const { error: deleteError } = await supabase
      .from("orders")
      .delete()
      .eq("id", params.id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

    return NextResponse.json({
      deleted: true,
      id: params.id,
      stock_restored: shouldRestoreStock,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to delete order." }, { status: 400 });
  }
}
