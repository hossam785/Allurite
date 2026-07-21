import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import Employee from "@/models/Employee";
import Client from "@/models/Client";
import { verifyClientAccess } from "@/lib/client-auth";
import { checkOverdueFollowUps } from "@/lib/followup-check";
import { sendSystemNotification } from "@/lib/notification-service";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const filterAgent = searchParams.get("assignedAgent") || "";

    await dbConnect();

    // Trigger overdue updates asynchronously in background without blocking response
    checkOverdueFollowUps().catch(err => console.error("FollowUp overdue check error:", err));

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skipNum = (pageNum - 1) * limitNum;

    // Build query filters
    const query: any = {};

    // Apply RBAC scoping
    if (auth.role === "Employee") {
      query.assignedAgent = auth.employeeId;
    } else if (auth.role === "SuperAdmin" && filterAgent) {
      query.assignedAgent = filterAgent;
    }

    // Apply status and type filters
    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }

    const total = await FollowUp.countDocuments(query);
    const followups = await FollowUp.find(query)
      .populate({
        path: "client",
        select: "firstName lastName email companyName",
      })
      .populate({
        path: "assignedAgent",
        select: "firstName lastName",
      })
      .sort({ scheduledAt: 1 }) // Order by upcoming due date
      .skip(skipNum)
      .limit(limitNum);

    return NextResponse.json({
      success: true,
      data: followups,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("List followups error:", error);
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
            message: "Authentication is required",
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { client, title, description, type, scheduledAt, assignedAgentId } = body;

    // Field Validations
    if (!client || !title || !scheduledAt) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Required fields: client (Client ID), title, scheduledAt",
          },
        },
        { status: 400 }
      );
    }

    const parsedDate = new Date(scheduledAt);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Please enter a valid schedule date and time",
          },
        },
        { status: 400 }
      );
    }

    if (parsedDate.getTime() < Date.now() - 60 * 1000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "A follow-up cannot be scheduled in the past",
          },
        },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify client exists and resolve name
    const clientRecord = await Client.findById(client);
    if (!clientRecord) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CLIENT_NOT_FOUND",
            message: "Selected client does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Verify Employee ID is valid and resolve Employee user account
    let agentId: string;
    let agentUserId: string;

    if (auth.role === "Employee") {
      agentId = auth.employeeId!;
      agentUserId = auth.user._id.toString();
    } else {
      if (!assignedAgentId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Please select an assigned employee agent",
            },
          },
          { status: 400 }
        );
      }
      const employee = await Employee.findById(assignedAgentId);
      if (!employee) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "EMPLOYEE_NOT_FOUND",
              message: "Selected employee agent does not exist",
            },
          },
          { status: 404 }
        );
      }
      agentId = assignedAgentId;
      agentUserId = employee.user.toString();
    }

    const newFollowUp = new FollowUp({
      client,
      assignedAgent: agentId,
      title: title.trim(),
      description: description?.trim() || "",
      type: type || "Call",
      scheduledAt: parsedDate,
      status: "Scheduled",
      notes: "",
      history: [],
    });

    // Append initial creation event to history logs
    newFollowUp.history.push({
      status: "Scheduled",
      scheduledAt: parsedDate,
      notes: "Schedule created and assigned",
      updatedBy: auth.user._id,
      updatedEmail: auth.user.email,
      updatedAt: new Date(),
    });

    await newFollowUp.save();

    // Generate Automatic Notification/Reminder
    const clientName = `${clientRecord.firstName} ${clientRecord.lastName}`;
    await sendSystemNotification({
      recipient: agentUserId,
      title: "New Follow-Up Scheduled 📅",
      message: `You have a new follow-up "${title}" scheduled for client ${clientName} on ${parsedDate.toLocaleString()}.`,
      category: "Follow-Up",
      priority: "Normal",
      actionUrl: `/dashboard/followups/${newFollowUp._id}`,
    });

    // Log followup creation audit log
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "FOLLOWUP_CREATE",
      entityType: "Follow-Up",
      entityId: newFollowUp._id,
      details: `Created new follow-up appointment "${title}" for client ${clientName}`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
      performedRole: auth.role,
      severity: "Low",
    }, request);

    const populatedFollowUp = await FollowUp.findById(newFollowUp._id)
      .populate({
        path: "client",
        select: "firstName lastName email companyName",
      })
      .populate({
        path: "assignedAgent",
        select: "firstName lastName",
      });

    return NextResponse.json(
      {
        success: true,
        data: populatedFollowUp,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create followup error:", error);
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
