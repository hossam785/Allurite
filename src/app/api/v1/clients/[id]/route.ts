import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Client from "@/models/Client";
import Employee from "@/models/Employee";
import { verifyClientAccess } from "@/lib/client-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyClientAccess(request);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required",
          },
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    await dbConnect();

    const client = await Client.findById(id).populate({
      path: "assignedAgent",
      select: "firstName lastName",
    });

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CLIENT_NOT_FOUND",
            message: "Client profile does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Scoping check: Employees can only view their own assigned clients
    if (auth.role === "Employee" && client.assignedAgent._id.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to view this client profile",
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: client,
    });
  } catch (error: any) {
    console.error("Get client details error:", error);
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
    const auth = await verifyClientAccess(request);
    if (!auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication is required",
          },
        },
        { status: 401 }
      );
    }

    const { id } = await params;
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

    await dbConnect();

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CLIENT_NOT_FOUND",
            message: "Client profile does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Scoping check: Employees can only update their own assigned clients
    if (auth.role === "Employee" && client.assignedAgent.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to edit this client profile",
          },
        },
        { status: 403 }
      );
    }

    // Email validation if changing
    if (email && email.toLowerCase() !== client.email) {
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
      client.email = email.toLowerCase().trim();
    }

    // Apply updates
    if (firstName !== undefined) client.firstName = firstName.trim();
    if (lastName !== undefined) client.lastName = lastName.trim();
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
      client.phone = phone.trim();
    }
    if (companyName !== undefined) client.companyName = companyName.trim();
    if (website !== undefined) client.website = website.trim();
    if (industry !== undefined) client.industry = industry.trim();
    
    if (status !== undefined) {
      if (!["Lead", "Qualified", "ActiveCustomer", "Churned"].includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Invalid client status value",
            },
          },
          { status: 400 }
        );
      }
      client.status = status;
    }

    if (source !== undefined) client.source = source.trim();

    // Reassignment is SuperAdmin privilege only
    if (assignedAgentId !== undefined && assignedAgentId !== client.assignedAgent.toString()) {
      if (auth.role !== "SuperAdmin") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Only Super Admins can reassign client agents",
            },
          },
          { status: 403 }
        );
      }

      // Check if new agent exists
      const agentExists = await Employee.findById(assignedAgentId);
      if (!agentExists) {
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
      client.assignedAgent = assignedAgentId;
    }

    await client.save();

    // Log client update
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "CLIENT_UPDATE",
      entityType: "Client",
      entityId: client._id,
      details: `Updated client profile: ${client.firstName} ${client.lastName}. Status: ${client.status}`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
      performedRole: auth.role,
      severity: "Low",
    }, request);

    const populatedClient = await Client.findById(id).populate({
      path: "assignedAgent",
      select: "firstName lastName",
    });

    return NextResponse.json({
      success: true,
      data: populatedClient,
    });
  } catch (error: any) {
    console.error("Update client details error:", error);
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
    const auth = await verifyClientAccess(request);
    if (!auth || auth.role !== "SuperAdmin") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Super Admin privileges are required to delete client records",
          },
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    await dbConnect();

    const deletedClient = await Client.findByIdAndDelete(id);
    if (!deletedClient) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CLIENT_NOT_FOUND",
            message: "Client profile does not exist",
          },
        },
        { status: 404 }
      );
    }

    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "CLIENT_DELETE",
      entityType: "Client",
      entityId: deletedClient._id,
      details: `Permanently deleted client profile: ${deletedClient.firstName} ${deletedClient.lastName} (${deletedClient.email})`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
      performedRole: auth.role,
      severity: "Medium",
    }, request);

    return NextResponse.json({
      success: true,
      message: "Client profile has been deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete client error:", error);
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
