import { NextRequest, NextResponse } from "next/server";
import { verifyClientAccess } from "@/lib/client-auth";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyClientAccess(request);

    const response = NextResponse.json({
      success: true,
      data: {
        message: "Successfully logged out",
      },
    });

    // Clear the token cookie
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Immediately expire
      path: "/",
    });

    if (auth) {
      await logAuditEvent({
        action: "AUTH_LOGOUT",
        entityType: "User",
        entityId: auth.user._id,
        details: `User successfully logged out: ${auth.user.email}`,
        performedBy: auth.user._id,
        performedEmail: auth.user.email,
        performedRole: auth.role,
        severity: "Low",
      }, request);
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}
