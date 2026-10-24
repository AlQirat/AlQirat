import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  AdminConfigurationError,
  createAdminSessionToken,
  verifyAdminCredentials,
} from "@/lib/adminAuth";

export async function POST(request) {
  let credentials;

  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const email = typeof credentials.email === "string" ? credentials.email : "";
  const password = typeof credentials.password === "string" ? credentials.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    if (!verifyAdminCredentials(email, password)) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: createAdminSessionToken(email.trim().toLowerCase()),
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    if (error instanceof AdminConfigurationError) {
      return NextResponse.json(
        { error: "Admin login is not configured. Add the required variables to .env." },
        { status: 503 },
      );
    }
    throw error;
  }
}

