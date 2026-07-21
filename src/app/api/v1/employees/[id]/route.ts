import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Employee from "@/models/Employee";
import { verifySuperAdmin } from "@/lib/auth-check";

export async function GET(
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
    await dbConnect();

    const employee = await Employee.findById(id).populate({
      path: "user",
      select: "email role status",
    });

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

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error: any) {
    console.error("Get employee details error:", error);
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

export async function PUT(
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
    const { firstName, lastName, phone, department, position, status } = body;

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

    // Apply updates
    if (firstName !== undefined) employee.firstName = firstName.trim();
    if (lastName !== undefined) employee.lastName = lastName.trim();
    if (phone !== undefined) {
      const { validateEgyptianPhone } = require("@/lib/egypt-helper");
      if (phone.trim() && !validateEgyptianPhone(phone)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "الرجاء إدخال رقم هاتف مصري صحيح (محمول أو أرضي)",
            },
          },
          { status: 400 }
        );
      }
      employee.phone = phone.trim();
    }
    if (department !== undefined) employee.department = department.trim();
    if (position !== undefined) employee.position = position.trim();

    // If status changes, sync user status as well
    if (status !== undefined && status !== employee.status) {
      if (status !== "Active" && status !== "Inactive") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Status must be either 'Active' or 'Inactive'",
            },
          },
          { status: 400 }
        );
      }
      employee.status = status;

      // Update User status (Active -> Active, Inactive -> Suspended)
      const userStatus = status === "Active" ? "Active" : "Suspended";
      await User.findByIdAndUpdate(employee.user, { status: userStatus });
    }

    await employee.save();

    // Log update event
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "EMPLOYEE_UPDATE",
      entityType: "Employee",
      entityId: employee._id,
      details: `Updated employee profile "${employee.firstName} ${employee.lastName}". Status set to: ${employee.status}`,
      performedBy: admin._id,
      performedEmail: admin.email,
      performedRole: admin.role,
      severity: "Medium",
    }, request);

    // Fetch populated employee to return
    const updatedEmployee = await Employee.findById(id).populate({
      path: "user",
      select: "email role status",
    });

    return NextResponse.json({
      success: true,
      data: updatedEmployee,
    });
  } catch (error: any) {
    console.error("Update employee details error:", error);
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

export async function DELETE(
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

    // 1. Check for active references (Clients, Tasks, FollowUps) before permanent deletion
    const Client = require("@/models/Client").default;
    const Task = require("@/models/Task").default;

    const assignedClientsCount = await Client.countDocuments({ assignedAgent: id });
    const assignedTasksCount = await Task.countDocuments({ assignedTo: id });

    const body = await request.json().catch(() => ({}));
    const reassignToId = body?.reassignToId;

    if (assignedClientsCount > 0 || assignedTasksCount > 0) {
      if (!reassignToId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "REASSIGNMENT_REQUIRED",
              message: `Cannot delete employee while they have assigned records (${assignedClientsCount} clients, ${assignedTasksCount} tasks). Please provide 'reassignToId' in request body to transfer ownership.`,
              details: {
                clientsCount: assignedClientsCount,
                tasksCount: assignedTasksCount,
              },
            },
          },
          { status: 400 }
        );
      }

      // Verify target replacement employee exists and is active
      const replacement = await Employee.findById(reassignToId);
      if (!replacement || replacement.status !== "Active") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Selected replacement employee profile does not exist or is not Active",
            },
          },
          { status: 400 }
        );
      }

      // Execute atomic reassignments
      await Client.updateMany({ assignedAgent: id }, { assignedAgent: reassignToId });
      await Task.updateMany({ assignedTo: id }, { assignedTo: reassignToId });
      console.log(`Reassigned ${assignedClientsCount} clients and ${assignedTasksCount} tasks to employee ${reassignToId}`);
    }

    // 2. Safely suspend associated User account and deactivate Employee record
    // preserving historical audit trail, files, and report references.
    if (employee.user) {
      await User.findByIdAndUpdate(employee.user, { status: "Suspended" });
    }

    employee.status = "Inactive";
    await employee.save();

    // 3. Log audit event
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "EMPLOYEE_DELETE",
      entityType: "Employee",
      entityId: employee._id,
      details: `Deactivated employee profile "${employee.firstName} ${employee.lastName}" and suspended login access. Transferred ${assignedClientsCount} clients and ${assignedTasksCount} tasks.`,
      performedBy: admin._id,
      performedEmail: admin.email,
      performedRole: admin.role,
      severity: "High",
    }, request);

    return NextResponse.json({
      success: true,
      message: "Employee profile deactivated and user access suspended successfully. Historical records preserved.",
    });
  } catch (error: any) {
    console.error("Delete employee error:", error);
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
