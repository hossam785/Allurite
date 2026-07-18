import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import FollowUp from "@/models/FollowUp";
import Employee from "@/models/Employee";
import Client from "@/models/Client";
import { verifyClientAccess } from "@/lib/client-auth";
import { sendSystemNotification } from "@/lib/notification-service";

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

    const followup = await FollowUp.findById(id)
      .populate({
        path: "client",
        select: "firstName lastName email phone companyName",
      })
      .populate({
        path: "assignedAgent",
        select: "firstName lastName",
      });

    if (!followup) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FOLLOWUP_NOT_FOUND",
            message: "Follow-up schedule does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Scoping check: Employees can only view their own follow-ups
    if (auth.role === "Employee" && followup.assignedAgent._id.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to view this follow-up",
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: followup,
    });
  } catch (error: any) {
    console.error("Get followup details error:", error);
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
    const { title, description, type, status, scheduledAt, notes } = body;

    await dbConnect();

    const followup = await FollowUp.findById(id);
    if (!followup) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FOLLOWUP_NOT_FOUND",
            message: "Follow-up schedule does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Scoping check: Employees can only edit their own follow-ups
    if (auth.role === "Employee" && followup.assignedAgent.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to edit this follow-up",
          },
        },
        { status: 403 }
      );
    }

    const previousStatus = followup.status;
    const previousDate = new Date(followup.scheduledAt);

    // Business Rule Check: Completed or Cancelled followups cannot be reverted to Scheduled/Pending
    if (
      (previousStatus === "Completed" || previousStatus === "Cancelled") &&
      status &&
      status !== previousStatus
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RULE_VIOLATION",
            message: "Completed or Cancelled follow-ups cannot be reverted or rescheduled",
          },
        },
        { status: 400 }
      );
    }

    // Verify scheduled date isn't set in the past if changing
    let parsedDate = previousDate;
    if (scheduledAt !== undefined) {
      parsedDate = new Date(scheduledAt);
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
      
      // Allow reschedule if changing date (must be in future)
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const parsedMidnight = new Date(parsedDate);
      parsedMidnight.setHours(0, 0, 0, 0);

      if (parsedDate.getTime() !== previousDate.getTime() && parsedMidnight < todayMidnight) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Cannot reschedule a follow-up to a date in the past",
            },
          },
          { status: 400 }
        );
      }
      followup.scheduledAt = parsedDate;
    }

    // Update textual properties
    if (title !== undefined) followup.title = title.trim();
    if (description !== undefined) followup.description = description.trim();
    if (type !== undefined) followup.type = type;

    // Handle status transitions
    let statusChanged = false;
    let rescheduleHappened = parsedDate.getTime() !== previousDate.getTime();

    if (status !== undefined && status !== previousStatus) {
      if (!["Pending", "Scheduled", "Completed", "Missed", "Cancelled"].includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Invalid follow-up status value",
            },
          },
          { status: 400 }
        );
      }
      followup.status = status;
      statusChanged = true;
    }

    // Outcome/Cancellation notes validation
    if (statusChanged && (status === "Completed" || status === "Cancelled")) {
      if (!notes || !notes.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: `Closure notes are required when marking a follow-up as ${status}`,
            },
          },
          { status: 400 }
        );
      }
      followup.notes = notes.trim();
    } else if (notes !== undefined) {
      followup.notes = notes.trim();
    }

    // Audit Log History Tracking
    if (statusChanged || rescheduleHappened) {
      // Append entry to history tracking
      const changeNote = rescheduleHappened && statusChanged
        ? `Status updated to ${status} and rescheduled to ${parsedDate.toLocaleString()}`
        : rescheduleHappened
        ? `Rescheduled from ${previousDate.toLocaleString()} to ${parsedDate.toLocaleString()}`
        : `Status updated from ${previousStatus} to ${status}`;

      followup.history.push({
        status: followup.status,
        scheduledAt: parsedDate,
        notes: notes?.trim() || changeNote,
        updatedBy: auth.user._id,
        updatedEmail: auth.user.email,
        updatedAt: new Date(),
      });
    }

    await followup.save();

    // Trigger Notification for reschedules
    if (rescheduleHappened && followup.status === "Scheduled") {
      const clientRecord = await Client.findById(followup.client);
      const clientName = clientRecord 
        ? `${clientRecord.firstName} ${clientRecord.lastName}`
        : "Client";

      // Query Employee to get their User ID
      const employee = await Employee.findById(followup.assignedAgent);
      if (employee) {
        await sendSystemNotification({
          recipient: employee.user,
          title: "Follow-Up Rescheduled ⏰",
          message: `The follow-up "${followup.title}" for ${clientName} has been rescheduled to ${parsedDate.toLocaleString()}.`,
          category: "Follow-Up",
          priority: "Normal",
          actionUrl: `/dashboard/followups/${id}`,
        });
      }
    }

    // Log followup update
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "FOLLOWUP_UPDATE",
      entityType: "Follow-Up",
      entityId: followup._id,
      details: `Updated follow-up "${followup.title}": status is ${followup.status}`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
      performedRole: auth.role,
      severity: "Low",
    }, request);

    const populatedFollowUp = await FollowUp.findById(id)
      .populate({
        path: "client",
        select: "firstName lastName email phone companyName",
      })
      .populate({
        path: "assignedAgent",
        select: "firstName lastName",
      });

    return NextResponse.json({
      success: true,
      data: populatedFollowUp,
    });
  } catch (error: any) {
    console.error("Update followup details error:", error);
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
