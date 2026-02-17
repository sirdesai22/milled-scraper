import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, USER_EMAIL_COOKIE_NAME } from "@/lib/constants";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@gmail.com";

export async function GET(req: NextRequest) {
  const hasAuth = req.cookies.get(AUTH_COOKIE_NAME)?.value === "1";
  const email = req.cookies.get(USER_EMAIL_COOKIE_NAME)?.value ?? null;
  // Admin: has auth and (email matches admin, or no email cookie = legacy session)
  const isAdmin = hasAuth && (email === ADMIN_EMAIL || !email);

  return NextResponse.json({ email, isAdmin });
}
