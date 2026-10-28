import { NextResponse } from "next/server";
import { escapeHtml } from "@/lib/authEmail";
import { consumeAuthRateLimit, getClientIp } from "@/lib/authRateLimit";
import { isBrevoConfigured, sendBrevoEmail } from "@/lib/brevo";
import { createAdminAuthClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (fullName && fullName.length < 2) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Customer accounts are not available yet. Please check back soon." }, { status: 503 });
  }
  if (!isBrevoConfigured()) {
    return NextResponse.json({ error: "Email authentication is not configured yet. Please check back soon." }, { status: 503 });
  }

  try {
    const rateLimit = await consumeAuthRateLimit({ email, ip: getClientIp(request), emailLimit: 5, ipLimit: 20 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const supabase = createAdminAuthClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    if (error || !data?.properties?.email_otp) {
      throw new Error(error?.message || "Supabase did not return an email OTP.");
    }

    const code = data.properties.email_otp;
    await sendBrevoEmail({
      to: email,
      subject: "Your Al Qirat verification code",
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#263326;max-width:560px;margin:auto"><p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9a752d">Al Qirat Perfumes</p><h1 style="font-size:28px;margin:18px 0 8px">Your verification code</h1><p>Use this one-time code to securely sign in to your Al Qirat account:</p><p style="font-size:36px;letter-spacing:10px;font-weight:700;color:#9a752d;margin:24px 0">${escapeHtml(code)}</p><p>This code expires according to our authentication settings. If you did not request it, you can safely ignore this email.</p></div>`,
      textContent: `Your Al Qirat verification code is ${code}. This code expires according to our authentication settings. If you did not request it, you can safely ignore this email.`,
    });

    return NextResponse.json({
      success: true,
      verificationType: data.properties.verification_type,
      otpLength: String(code).length,
    });
  } catch (error) {
    console.error("Email OTP request failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "We could not send your verification code. Please try again." }, { status: 502 });
  }
}
