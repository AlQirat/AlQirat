import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid contact information." }, { status: 400 });
  }

  if (body.website) return NextResponse.json({ success: true });
  const inquiry = {
    name: text(body.name, 120),
    email: text(body.email, 254).toLowerCase(),
    phone: text(body.phone, 30) || null,
    subject: text(body.subject, 160),
    message: text(body.message, 3000),
  };
  if (!inquiry.name || !inquiry.subject || !inquiry.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
    return NextResponse.json({ error: "Name, valid email, subject, and message are required." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Our contact form is not available yet. Please reach out to us directly." }, { status: 503 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await supabase.from("inquiries").insert(inquiry);
  if (error) return NextResponse.json({ error: "Your message could not be submitted. Please try again." }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
