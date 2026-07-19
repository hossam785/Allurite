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

    // 1. Delete associated User account
    if (employee.user) {
      await User.deleteOne({ _id: employee.user });
    }

    // 2. Delete Employee record
    await Employee.deleteOne({ _id: id });

    // 3. Log audit event
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "EMPLOYEE_DELETE",
      entityType: "Employee",
      entityId: employee._id,
      details: `Permanently deleted employee: "${employee.firstName} ${employee.lastName}" and associated login account.`,
      performedBy: admin._id,
      performedEmail: admin.email,
      performedRole: admin.role,
      severity: "High",
    }, request);

    return NextResponse.json({
      success: true,
      message: "Employee profile and associated user account have been deleted successfully",
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
