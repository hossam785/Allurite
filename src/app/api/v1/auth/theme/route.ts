import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { verifyToken } from "@/lib/jwt";
import { logAuditEvent } from "@/lib/audit-logger";

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHENTICATED", message: "Authentication is required" } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_SESSION", message: "Session is invalid or has expired" } },
        { status: 401 }
      );
    }

    const { theme } = await request.json();
    if (theme !== "dark" && theme !== "light") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_FAILED", message: "Theme must be 'dark' or 'light'" } },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findByIdAndUpdate(payload.userId, { theme }, { new: true });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    // Optional: Log dynamic audit logs for visual modifications if desired
    await logAuditEvent({
      action: "SETTINGS_UPDATE",
      entityType: "Settings",
      entityId: user._id,
      details: `User theme preference modified to ${theme}.`,
      performedBy: user._id,
      performedEmail: user.email,
    });

    return NextResponse.json({
      success: true,
      data: {
        theme: user.theme,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
