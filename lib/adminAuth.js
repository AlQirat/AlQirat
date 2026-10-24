import { createHash, createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "al_qirat_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

export class AdminConfigurationError extends Error {
  constructor() {
    super("Admin authentication is not configured.");
    this.name = "AdminConfigurationError";
  }
}

export function readAdminConfiguration() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new AdminConfigurationError();
  }

  const sessionSecret = createHash("sha256")
    .update(`al-qirat-admin-session:${password}`)
    .digest("hex");

  return { email, password, sessionSecret };
}

function constantTimeEqual(value, expected) {
  const valueHash = createHash("sha256").update(value).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(valueHash, expectedHash);
}

function signPayload(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyAdminCredentials(email, password) {
  const configuration = readAdminConfiguration();
  return (
    constantTimeEqual(email.trim().toLowerCase(), configuration.email.trim().toLowerCase()) &&
    constantTimeEqual(password, configuration.password)
  );
}

export function createAdminSessionToken(email) {
  const { sessionSecret } = readAdminConfiguration();
  const payload = Buffer.from(
    JSON.stringify({ email, expiresAt: Date.now() + ADMIN_SESSION_MAX_AGE * 1000 }),
  ).toString("base64url");
  const signature = signPayload(payload, sessionSecret);
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token) {
  if (!token) return false;

  try {
    const { email, sessionSecret } = readAdminConfiguration();
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return false;

    const expectedSignature = signPayload(payload, sessionSecret);
    if (!constantTimeEqual(signature, expectedSignature)) return false;

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return (
      typeof session.email === "string" &&
      constantTimeEqual(session.email.trim().toLowerCase(), email.trim().toLowerCase()) &&
      typeof session.expiresAt === "number" &&
      session.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

