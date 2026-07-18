import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Department from "@/models/Department";
import { verifyClientAccess } from "@/lib/client-auth";
import { logAuditEvent } from "@/lib/audit-logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyClientAccess(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication is required" } },
        { status: 401 }
      );
    }

    if (auth.role !== "SuperAdmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    await dbConnect();
    const departments = await Department.find()
      .populate({
        path: "manager",
        select: "firstName lastName email",
      })
      .sort({ name: 1 });

    return NextResponse.json({
      success: true,
      data: departments,
    });
  } catch (error: any) {
    console.error("List departments error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyClientAccess(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication is required" } },
        { status: 401 }
      );
    }

    if (auth.role !== "SuperAdmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, manager, status } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_FAILED", message: "Name and Code are required" } },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check duplicate code
    const existing = await Department.findOne({ code: code.toUpperCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_CODE", message: "Department code already exists" } },
        { status: 400 }
      );
    }

    const dept = new Department({
      name,
      code: code.toUpperCase(),
      manager: manager || undefined,
      status: status || "Active",
    });

    await dept.save();

    await logAuditEvent({
      action: "DEPARTMENT_CREATE",
      entityType: "Department",
      entityId: dept._id,
      details: `Created department "${name}" (Code: ${dept.code})`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
    });

    return NextResponse.json(
      { success: true, data: dept },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create department error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
