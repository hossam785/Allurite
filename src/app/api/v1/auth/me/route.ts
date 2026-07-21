import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Employee from "@/models/Employee";
import { verifyToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication is required",
          },
        },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SESSION",
            message: "Session is invalid or has expired",
          },
        },
        { status: 401 }
      );
    }

    await dbConnect();
    const user = await User.findById(payload.userId).select("-passwordHash");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User profile no longer exists",
          },
        },
        { status: 404 }
      );
    }

    if (user.status !== "Active") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACCOUNT_INACTIVE",
            message: "User account is suspended or pending approval",
          },
        },
        { status: 403 }
      );
    }

    // Lookup associated Employee profile details
    const employee: any = await Employee.findOne({ user: user._id }).lean();
    const firstName = employee?.firstName || "";
    const lastName = employee?.lastName || "";
    const fullName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : user.email.split("@")[0];

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
        theme: user.theme || "dark",
        createdAt: user.createdAt,
        employeeId: employee?._id ? employee._id.toString() : undefined,
        firstName,
        lastName,
        name: fullName,
        phone: employee?.phone || "",
        department: employee?.department || "",
        position: employee?.position || "",
      },
    });
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
