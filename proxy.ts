import { decryptSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const session = await decryptSession(token);

  if (!session) {
    const login = NextResponse.redirect(new URL("/login", req.url));
    login.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return login;
  }

  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
