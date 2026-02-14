import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin@123";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (
      String(email).trim() === ADMIN_EMAIL &&
      String(password) === ADMIN_PASSWORD
    ) {
      const res = NextResponse.json({ success: true });
      res.cookies.set(AUTH_COOKIE_NAME, "1", {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return res;
    }

    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
