// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.AUTH_SECRET;

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret });
  const { pathname } = req.nextUrl;

  const isPublicPath =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/test" ||
    pathname === "/verify";

  if (isPublicPath) {
    return NextResponse.next();
  }

  if (!token?.email || !token?.id) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (!token || !(token.status === "verified")) {
    const verifyUrl = req.nextUrl.clone();
    verifyUrl.pathname = "/verify";
    return NextResponse.redirect(verifyUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next|static|favicon.ico).*)"],
};
