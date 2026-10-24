import { NextResponse } from "next/server";
import { fetchStorefrontContent } from "@/lib/storefrontServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await fetchStorefrontContent(), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
