import { NextRequest, NextResponse } from "next/server";
import { dbConnect, escapeRegex } from "@/lib/db";
import Client from "@/models/Client";
import Employee from "@/models/Employee";
import { verifyClientAccess } from "@/lib/client-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyClientAccess(request);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required to access client directory",
          },
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const search = (searchParams.get("search") || "").substring(0, 100);
    const status = searchParams.get("status") || "";
    const source = searchParams.get("source") || "";
    const filterAgent = searchParams.get("assignedAgent") || "";

    await dbConnect();

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skipNum = (pageNum - 1) * limitNum;

    // Base filter: exclude soft-deleted clients
    const query: any = { deleted: { $ne: true } };

    // Apply RBAC scoping
    if (auth.role === "Employee") {
      query.assignedAgent = auth.employeeId;
    } else if (auth.role === "SuperAdmin" && filterAgent) {
      query.assignedAgent = filterAgent;
    }

    // Apply status and source filters
    if (status) {
      query.status = status;
    }
    if (source) {
      query.source = source;
    }

    // Apply sanitized search matches
    if (search) {
      const sanitized = escapeRegex(search);
      query.$or = [
        { firstName: { $regex: sanitized, $options: "i" } },
        { lastName: { $regex: sanitized, $options: "i" } },
        { email: { $regex: sanitized, $options: "i" } },
        { companyName: { $regex: sanitized, $options: "i" } },
        { industry: { $regex: sanitized, $options: "i" } },
      ];
    }

    // Execute query with pagination & agent profile populate
    const total = await Client.countDocuments(query);
    const clients = await Client.find(query)
      .populate({
        path: "assignedAgent",
        select: "firstName lastName",
      })
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    return NextResponse.json({
      success: true,
      data: clients,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("List clients error:", error);
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
    const auth = await verifyClientAccess(request);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required to register new clients",
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      companyName, 
      website, 
      industry, 
      status, 
      source, 
      assignedAgentId 
    } = body;

    // Field Validations
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Required fields: firstName, lastName, email",
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

    // Check email uniqueness
    const existingClient = await Client.findOne({ email: email.toLowerCase() });
    if (existingClient) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CLIENT_EXISTS",
            message: "A client record with this email address already exists",
          },
        },
        { status: 400 }
      );
    }

    let agentId: string;

    if (auth.role === "Employee") {
      // Employees can only assign clients to themselves
      agentId = auth.employeeId!;
    } else {
      // SuperAdmins must provide a valid assigned agent
      if (!assignedAgentId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Please select an assigned agent for this client",
            },
          },
          { status: 400 }
        );
      }
      // Check if employee exists
      const employeeExists = await Employee.findById(assignedAgentId);
      if (!employeeExists) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "EMPLOYEE_NOT_FOUND",
              message: "Selected assigned agent does not exist",
            },
          },
          { status: 400 }
        );
      }
      agentId = assignedAgentId;
    }

    // Create client
    const newClient = await Client.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || "",
      companyName: companyName?.trim() || "",
      website: website?.trim() || "",
      industry: industry?.trim() || "",
      status: status || "Lead",
      source: source || "Other",
      assignedAgent: agentId,
      notes: [],
    });

    const populatedClient = await Client.findById(newClient._id).populate({
      path: "assignedAgent",
      select: "firstName lastName",
    });

    // Log client creation
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "CLIENT_CREATE",
      entityType: "Client",
      entityId: newClient._id,
      details: `Created new client profile: ${firstName} ${lastName} (${email})`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
      performedRole: auth.role,
      severity: "Low",
    }, request);

    return NextResponse.json(
      {
        success: true,
        data: populatedClient,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create client error:", error);
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
