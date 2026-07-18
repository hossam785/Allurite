import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Employee from "@/models/Employee";
import { verifySuperAdmin } from "@/lib/auth-check";
import { hashPassword } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Super Admin privileges are required to perform this action",
          },
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "New password is required and must be at least 6 characters long",
          },
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMPLOYEE_NOT_FOUND",
            message: "Employee profile does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Hash and update password
    const hashedPassword = await hashPassword(newPassword);
    await User.findByIdAndUpdate(employee.user, {
      passwordHash: hashedPassword,
    });

    return NextResponse.json({
      success: true,
      message: "Employee password has been reset successfully",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
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
