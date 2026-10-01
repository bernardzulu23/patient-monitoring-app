import { buildCsp, generateNonce } from "@/lib/csp";
import { isBodyTooLarge } from "@/lib/requestLimits";
import { isCrossSiteMutation } from "@/lib/sameOrigin";
import {
  decryptSession,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

function isDashboard(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

function withNoStore(res: NextResponse) {
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (isApi) {
    if (isCrossSiteMutation(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isBodyTooLarge(req, pathname)) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }
    const res = NextResponse.next();
    // Landing images are public marketing assets and set their own caching.
    if (!pathname.startsWith("/api/landing/images/")) withNoStore(res);
    return res;
  }

  if (isDashboard(pathname)) {
    const session = await decryptSession(req.cookies.get(sessionCookieName())?.value);
    if (!session) {
      const login = NextResponse.redirect(new URL("/login", req.url));
      login.cookies.set(sessionCookieName(), "", {
        ...sessionCookieOptions(),
        maxAge: 0,
      });
      return login;
    }
  }

  const nonce = generateNonce();
  const csp = buildCsp(nonce, {
    dev: process.env.NODE_ENV === "development",
    https: req.nextUrl.protocol === "https:",
  });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  if (isDashboard(pathname) || pathname === "/login") withNoStore(res);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|swe-worker|manifest.webmanifest).*)",
  ],
};
