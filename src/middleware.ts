import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get("token");
  const token = tokenCookie?.value;

  // Verify token validation
  const payload = token ? await verifyToken(token) : null;

  // If trying to access dashboard routes and not authenticated
  if (pathname.startsWith("/dashboard")) {
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      // Pass the original destination path as a redirect parameter
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      // Clean up the cookie if invalid
      if (tokenCookie) {
        response.cookies.delete("token");
      }
      return response;
    }

    // If trying to access employee management directory and role is not SuperAdmin
    if (pathname.startsWith("/dashboard/employees") && payload.role !== "SuperAdmin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // If trying to access login page and already authenticated
  if (pathname === "/login") {
    if (payload) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
