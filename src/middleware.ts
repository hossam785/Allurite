import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tokenCookie = request.cookies.get("token");
  const token = tokenCookie?.value;

  // Verify token validation
  const payload = token ? await verifyToken(token) : null;

  // 1. API Protection Layer (/api/v1/*)
  if (pathname.startsWith("/api/v1")) {
    // Exclude public authentication endpoints (e.g. login)
    if (pathname === "/api/v1/auth/login") {
      return NextResponse.next();
    }

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required to access this endpoint",
          },
        },
        { status: 401 }
      );
    }

    // Check SuperAdmin restrictions on sensitive API paths
    const isAdminApiRoute =
      pathname.startsWith("/api/v1/employees") ||
      pathname.startsWith("/api/v1/departments") ||
      pathname.startsWith("/api/v1/audit-logs") ||
      pathname.startsWith("/api/v1/backups") ||
      pathname.startsWith("/api/v1/settings") ||
      pathname.startsWith("/api/v1/roles");

    if (isAdminApiRoute && payload.role !== "SuperAdmin") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Super Admin privileges are required for this resource",
          },
        },
        { status: 403 }
      );
    }
  }

  // 2. Dashboard Interface Protection Layer (/dashboard/*)
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

    // If trying to access admin-restricted directories and role is not SuperAdmin
    const isAdminRoute = 
      pathname.startsWith("/dashboard/employees") ||
      pathname.startsWith("/dashboard/departments") ||
      pathname.startsWith("/dashboard/audit-logs") ||
      pathname.startsWith("/dashboard/backups") ||
      pathname.startsWith("/dashboard/settings");

    if (isAdminRoute && payload.role !== "SuperAdmin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 3. Login Page Redirection (/login)
  if (pathname === "/login") {
    if (payload) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/v1/:path*", "/login"],
};
