import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Local-only visual review for the migrated prototype. Production builds
  // always require the authentication cookie, regardless of this variable.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.SCHOOL_PROTOTYPE_PREVIEW === "true"
  ) {
    return NextResponse.next();
  }

  // Do not protect login.
  if (pathname === "/login") {
    return NextResponse.next();
  }

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/schools") ||
    pathname.startsWith("/students") ||
    pathname.startsWith("/settings");

  if (isProtectedRoute) {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/users/:path*",
    "/schools/:path*",
    "/students/:path*",
    "/settings/:path*",
  ],
};
