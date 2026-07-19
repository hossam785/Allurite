import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import Employee from "@/models/Employee";
import { verifySuperAdmin } from "@/lib/auth-check";
import { hashPassword } from "@/lib/auth";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const status = searchParams.get("status") || "";

    await dbConnect();

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skipNum = (pageNum - 1) * limitNum;

    // Build base match stage for Employee
    const matchStage: any = {};
    if (status) {
      matchStage.status = status;
    }
    if (department) {
      matchStage.department = department;
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users", // MongoDB collection name for User model
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
    ];

    // If search filter is active, perform text match
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { department: { $regex: search, $options: "i" } },
            { position: { $regex: search, $options: "i" } },
            { "userDetails.email": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Add sort, facet for pagination metadata + data
    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: skipNum },
            { $limit: limitNum },
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                phone: 1,
                department: 1,
                position: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
                user: {
                  _id: "$userDetails._id",
                  email: "$userDetails.email",
                  role: "$userDetails.role",
                  status: "$userDetails.status",
                },
              },
            },
          ],
        },
      }
    );

    const result = await Employee.aggregate(pipeline);
    const total = result[0]?.metadata[0]?.total || 0;
    const employees = result[0]?.data || [];

    return NextResponse.json({
      success: true,
      data: employees,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("List employees error:", error);
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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { firstName, lastName, email, password, role, phone, department, position } = body;

    // Field Validations
    if (!firstName || !lastName || !email || !password || !department || !position) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Required fields: firstName, lastName, email, password, department, position",
          },
        },
        { status: 400 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Please enter a valid email address",
          },
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Password must be at least 6 characters long",
          },
        },
        { status: 400 }
      );
    }

    const { validateEgyptianPhone } = require("@/lib/egypt-helper");
    if (phone && !validateEgyptianPhone(phone)) {
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

    await dbConnect();

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_TAKEN",
            message: "A user account with this email already exists",
          },
        },
        { status: 400 }
      );
    }

    // Create User record
    const hashedPassword = await hashPassword(password);
    const newUser = await User.create({
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      role: role || "Employee",
      status: "Active",
    });

    // Create Employee record referencing User (with atomic rollback)
    let newEmployee;
    try {
      newEmployee = await Employee.create({
        user: newUser._id,
        firstName,
        lastName,
        phone: phone || "",
        department,
        position,
        status: "Active",
      });
    } catch (empError: any) {
      await User.deleteOne({ _id: newUser._id });
      throw empError;
    }

    // Log employee creation event
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "EMPLOYEE_CREATE",
      entityType: "Employee",
      entityId: newEmployee._id,
      details: `Created new employee profile: ${firstName} ${lastName} (${email})`,
      performedBy: admin._id,
      performedEmail: admin.email,
      performedRole: admin.role,
      severity: "Medium",
    }, request);

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: newEmployee._id,
          firstName: newEmployee.firstName,
          lastName: newEmployee.lastName,
          phone: newEmployee.phone,
          department: newEmployee.department,
          position: newEmployee.position,
          status: newEmployee.status,
          createdAt: newEmployee.createdAt,
          user: {
            _id: newUser._id,
            email: newUser.email,
            role: newUser.role,
            status: newUser.status,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create employee error:", error);
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
