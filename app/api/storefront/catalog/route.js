import { NextResponse } from "next/server";
import { fetchStorefrontCatalog } from "@/lib/storefrontServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await fetchStorefrontCatalog(), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
