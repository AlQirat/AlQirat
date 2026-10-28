import { NextResponse } from "next/server";
import { escapeHtml } from "@/lib/authEmail";
import { consumeAuthRateLimit, getClientIp } from "@/lib/authRateLimit";
import { isBrevoConfigured, sendBrevoEmail } from "@/lib/brevo";
import { createAdminAuthClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function genericResponse() {
  return NextResponse.json({
    success: true,
    message: "If an account exists for that email, a password reset link is on its way.",
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Customer accounts are not available yet. Please check back soon." }, { status: 503 });
  }
  if (!isBrevoConfigured()) {
    return NextResponse.json({ error: "Email authentication is not configured yet. Please check back soon." }, { status: 503 });
  }

  try {
    const rateLimit = await consumeAuthRateLimit({ email, ip: getClientIp(request), emailLimit: 3, ipLimit: 10 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many reset requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const supabase = createAdminAuthClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (error) {
      if (error.code === "user_not_found" || /user.*not found/i.test(error.message || "")) return genericResponse();
      throw new Error(error.message);
    }

    const hashedToken = data?.properties?.hashed_token;
    if (!hashedToken) throw new Error("Supabase did not return a password reset token.");
    const resetLink = new URL("/auth/confirm", request.url);
    resetLink.searchParams.set("token_hash", hashedToken);
    resetLink.searchParams.set("type", data.properties.verification_type || "recovery");
    resetLink.searchParams.set("next", "/reset-password");
    const actionLink = resetLink.toString();

    await sendBrevoEmail({
      to: email,
      subject: "Reset your Al Qirat password",
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#263326;max-width:560px;margin:auto"><p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9a752d">Al Qirat Perfumes</p><h1 style="font-size:28px;margin:18px 0 8px">Reset your password</h1><p>We received a request to reset your Al Qirat account password. This link expires according to your authentication settings.</p><p style="margin:28px 0"><a href="${escapeHtml(actionLink)}" style="display:inline-block;background:#263326;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:700">Choose a new password</a></p><p>If you did not request this, you can safely ignore this email.</p></div>`,
      textContent: `Reset your Al Qirat password by opening this link: ${actionLink}\n\nIf you did not request this, you can safely ignore this email.`,
    });

    return genericResponse();
  } catch (error) {
    console.error("Password reset request failed", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "We could not send a password reset link. Please try again." }, { status: 502 });
  }
}
