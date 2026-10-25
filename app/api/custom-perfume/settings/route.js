import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scentError, scentHeaders } from "@/lib/customPerfumeServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await createClient().from("custom_perfume_settings").select("enabled,homepage_enabled").eq("id", true).single();
    if (error) throw error;
    return NextResponse.json(data, { headers: scentHeaders });
  } catch (error) { return scentError(error); }
}
