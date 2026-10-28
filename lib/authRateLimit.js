import { createHmac } from "node:crypto";
import { createAdminAuthClient } from "@/lib/supabase/admin";

const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

function getRateLimitSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Supabase service-role authentication is not configured.");
  return secret;
}

function hashRateLimitKey(value) {
  return createHmac("sha256", getRateLimitSecret()).update(value).digest("hex");
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",", 1)[0]?.trim();
  return firstForwardedIp || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function consumeAuthRateLimit({ email, ip, emailLimit, ipLimit }) {
  const supabase = createAdminAuthClient();
  const emailKey = hashRateLimitKey(`email:${email}`);
  const ipKey = hashRateLimitKey(`ip:${ip}`);
  const { data, error } = await supabase.rpc("consume_auth_rate_limit", {
    p_email_key: emailKey,
    p_ip_key: ipKey,
    p_email_limit: emailLimit,
    p_ip_limit: ipLimit,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  });

  if (error) throw new Error(`Unable to enforce authentication rate limit: ${error.message}`);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result.allowed !== "boolean") {
    throw new Error("Authentication rate limiter returned an invalid response.");
  }

  return {
    allowed: result.allowed,
    retryAfterSeconds: Number(result.retry_after_seconds) || RATE_LIMIT_WINDOW_SECONDS,
  };
}
