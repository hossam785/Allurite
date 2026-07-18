import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Department from "@/models/Department";
import { verifyClientAccess } from "@/lib/client-auth";
import { logAuditEvent } from "@/lib/audit-logger";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { name, manager, status } = body;

    await dbConnect();

    const dept = await Department.findById(id);
    if (!dept) {
      return NextResponse.json(
        { success: false, error: { code: "DEPARTMENT_NOT_FOUND", message: "Department does not exist" } },
        { status: 404 }
      );
    }

    let detailLogs = "";

    if (name && name !== dept.name) {
      detailLogs += `Renamed from "${dept.name}" to "${name}". `;
      dept.name = name;
    }

    if (manager !== undefined) {
      detailLogs += `Manager updated. `;
      dept.manager = manager || undefined;
    }

    if (status && status !== dept.status) {
      detailLogs += `Status toggled to ${status}. `;
      dept.status = status;
    }

    await dept.save();

    if (detailLogs) {
      await logAuditEvent({
        action: "DEPARTMENT_UPDATE",
        entityType: "Department",
        entityId: dept._id,
        details: `Updated department "${dept.code}": ${detailLogs}`,
        performedBy: auth.user._id,
        performedEmail: auth.user.email,
      });
    }

    return NextResponse.json({
      success: true,
      data: dept,
    });
  } catch (error: any) {
    console.error("Modify department error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
