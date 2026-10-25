import { NextResponse } from "next/server";
import { createAdminCatalogClient, isAuthorizedAdminRequest } from "@/lib/adminCatalog";
import { requireSameOrigin, scentError, scentHeaders } from "@/lib/customPerfumeServer";
import { ScentValidationError } from "@/lib/customPerfume.mjs";

export const dynamic = "force-dynamic";

export async function PUT(request) {
  if (!isAuthorizedAdminRequest(request)) return NextResponse.json({ error: "Administrator authentication is required." }, { status: 401 });
  try {
    requireSameOrigin(request);
    const body = await request.json();
    if (typeof body.enabled !== "boolean" || typeof body.homepage_enabled !== "boolean") throw new ScentValidationError("Both settings must be true or false.");
    const { data, error } = await createAdminCatalogClient().from("custom_perfume_settings").update({ enabled: body.enabled, homepage_enabled: body.homepage_enabled }).eq("id", true).select("enabled,homepage_enabled").single();
    if (error) throw error;
    return NextResponse.json(data, { headers: scentHeaders });
  } catch (error) { return scentError(error); }
}
