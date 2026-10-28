import crypto from "node:crypto";

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay API credentials are not configured.");
  return { keyId, keySecret };
}

export function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const providedBuffer = Buffer.from(signature || "", "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export function verifyRazorpayWebhookSignature(rawBody, signature, secret) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const providedBuffer = Buffer.from(signature || "", "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function razorpayRequest(path, init = {}) {
  const { keyId, keySecret } = getRazorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { error: { description: text || "Razorpay returned an empty response." } };
  }
  if (!response.ok) {
    throw new Error(body?.error?.description || `Razorpay request failed with status ${response.status}.`);
  }
  return body;
}
