import { decryptSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const session = await decryptSession(token);

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
