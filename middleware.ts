import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { canAccessPath } from "@/lib/auth/access";
import { env } from "@/lib/env";
import type { RolePermissionMap } from "@/lib/auth/permissions";
import type { AppRole } from "@/types/domain";

const publicPaths = ["/login"];
const cookieName = "besawit_session";
const secret = new TextEncoder().encode(env.SESSION_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(cookieName)?.value;

  if (!token) {
    if (publicPaths.includes(pathname)) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role as AppRole;
    const permissions = payload.permissions as RolePermissionMap | undefined;

    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (publicPaths.includes(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (!canAccessPath(role, permissions, pathname)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(cookieName);
    return response;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
