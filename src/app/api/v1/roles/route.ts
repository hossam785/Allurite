import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Role from "@/models/Role";
import { verifyClientAccess } from "@/lib/client-auth";
import { logAuditEvent } from "@/lib/audit-logger";

const DEFAULT_CATEGORIES = [
  "Users", "Employees", "Clients", "Follow-Ups", "Tasks", "Notifications", "Files", "Reports", "Settings", "Backups"
];

// Helper to seed initial default roles if none are found in DB
async function seedDefaultRoles() {
  const count = await Role.countDocuments();
  if (count > 0) return;

  // 1. SuperAdmin: Full access to all Categories with all actions
  const adminPermissions = DEFAULT_CATEGORIES.map(category => ({
    category,
    actions: ["View", "Create", "Edit", "Delete", "Approve", "Export"],
  }));

  const superAdminRole = new Role({
    name: "SuperAdmin",
    description: "System Administrator with global privileges",
    permissions: adminPermissions,
    isDefault: true,
  });
  await superAdminRole.save();

  // 2. Employee: Limited permissions (Cannot delete, approve or manage settings/backups)
  const employeePermissions = DEFAULT_CATEGORIES.map(category => {
    const isRestricted = ["Settings", "Backups", "Users"].includes(category);
    return {
      category,
      actions: isRestricted ? [] : ["View", "Create", "Edit"],
    };
  });

  const employeeRole = new Role({
    name: "Employee",
    description: "Staff member with access to assigned tasks, clients and reminders",
    permissions: employeePermissions,
    isDefault: true,
  });
  await employeeRole.save();

  console.log("Seeded default SuperAdmin and Employee roles successfully.");
}

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
    await seedDefaultRoles();

    const roles = await Role.find().sort({ name: 1 });

    return NextResponse.json({
      success: true,
      data: roles,
    });
  } catch (error: any) {
    console.error("List roles error:", error);
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
    const { name, description, permissions } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_FAILED", message: "Role name is required" } },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find if role exists (if exists, update it, otherwise create new)
    let role = await Role.findOne({ name });
    let isNew = false;

    if (!role) {
      isNew = true;
      role = new Role({
        name,
        description,
        permissions: permissions || [],
        isDefault: false,
      });
    } else {
      if (description !== undefined) role.description = description;
      if (permissions !== undefined) role.permissions = permissions;
    }

    await role.save();

    await logAuditEvent({
      action: isNew ? "ROLE_CREATE" : "ROLE_MODIFY",
      entityType: "Role",
      entityId: role._id,
      details: `${isNew ? "Created" : "Modified"} role "${name}" permissions matrix.`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
    });

    return NextResponse.json({
      success: true,
      data: role,
    });
  } catch (error: any) {
    console.error("Save role error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
