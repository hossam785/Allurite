import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Task from "@/models/Task";
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

    const task = await Task.findById(id)
      .populate({
        path: "client",
        select: "firstName lastName email phone companyName",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName user",
      })
      .populate({
        path: "followUp",
        select: "title scheduledAt status",
      });

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: "Task profile does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Scoping check: Employees can only view tasks assigned to them
    if (auth.role === "Employee" && task.assignedTo._id.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to view this task",
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error("Get task details error:", error);
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
    const { title, description, status, priority, dueDate, assignedToId } = body;

    await dbConnect();

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: "Task profile does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Scoping check: Employees can only edit tasks assigned to them
    if (auth.role === "Employee" && task.assignedTo.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to edit this task",
          },
        },
        { status: 403 }
      );
    }

    // Verify completed/cancelled task restriction for employees
    if (auth.role === "Employee" && (task.status === "Completed" || task.status === "Cancelled")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RULE_VIOLATION",
            message: "Completed or Cancelled tasks cannot be modified by employees",
          },
        },
        { status: 400 }
      );
    }

    const previousStatus = task.status;
    const previousPriority = task.priority;
    const previousDueDate = new Date(task.dueDate);
    const previousAssigneeId = task.assignedTo.toString();

    let historyDetails = "";
    let alertRecipientUserId: string | null = null;
    let alertTitle = "";
    let alertMessage = "";

    // 1. Process Assignee Reassignment (SuperAdmin privilege only)
    if (assignedToId !== undefined && assignedToId !== previousAssigneeId) {
      if (auth.role !== "SuperAdmin") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Only Super Admins can reassign tasks to other employees",
            },
          },
          { status: 403 }
        );
      }

      // Check employee
      const employee = await Employee.findById(assignedToId);
      if (!employee) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "EMPLOYEE_NOT_FOUND",
              message: "Selected assigned agent employee does not exist",
            },
          },
          { status: 404 }
        );
      }

      task.assignedTo = assignedToId;
      historyDetails += `Reassigned task from agent ${previousAssigneeId} to ${assignedToId}. `;
      
      // Notify new assignee
      alertRecipientUserId = employee.user.toString();
      alertTitle = "Task Reassigned 📋";
      alertMessage = `The task "${task.title}" has been reassigned to you.`;
    }

    // 2. Process Due Date Changes (SuperAdmin privilege only)
    if (dueDate !== undefined) {
      const parsedDate = new Date(dueDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Please enter a valid due date",
            },
          },
          { status: 400 }
        );
      }

      if (parsedDate.getTime() !== previousDueDate.getTime()) {
        if (auth.role !== "SuperAdmin") {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "FORBIDDEN",
                message: "Only Super Admins can change task due dates",
              },
            },
            { status: 403 }
          );
        }

        if (parsedDate < new Date()) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "VALIDATION_FAILED",
                message: "A task due date cannot be set in the past",
              },
            },
            { status: 400 }
          );
        }

        task.dueDate = parsedDate;
        historyDetails += `Due date rescheduled from ${previousDueDate.toLocaleDateString()} to ${parsedDate.toLocaleDateString()}. `;
      }
    }

    // 3. Process Status updates (Review process mapping)
    if (status !== undefined && status !== previousStatus) {
      if (!["Pending", "In Progress", "Under Review", "Completed", "Rejected", "Cancelled", "Overdue"].includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Invalid task status value",
            },
          },
          { status: 400 }
        );
      }

      // Review gates validations
      if (auth.role === "Employee") {
        // Employees can only set to "In Progress" or "Under Review" (submit for review)
        if (status === "Completed" || status === "Rejected") {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "FORBIDDEN",
                message: "Only Super Admins can Approve (Complete) or Reject tasks under review",
              },
            },
            { status: 403 }
          );
        }
      }

      task.status = status;
      historyDetails += `Status updated from ${previousStatus} to ${status}. `;

      // Trigger notifications for status events
      const employee = await Employee.findById(task.assignedTo);
      if (employee) {
        if (status === "Under Review") {
          // Notify SuperAdmins (we'll notify the creator, or write a general message)
          // For simplicity, log it. But we can notify the employee as well as validation trigger
          alertRecipientUserId = employee.user.toString();
          alertTitle = "Task Under Review 🔍";
          alertMessage = `Your task "${task.title}" has been successfully submitted for review.`;
        } else if (status === "Completed") {
          alertRecipientUserId = employee.user.toString();
          alertTitle = "Task Approved! 🎉";
          alertMessage = `The task "${task.title}" has been approved and completed by the administrator.`;
        } else if (status === "Rejected") {
          alertRecipientUserId = employee.user.toString();
          alertTitle = "Task Rejected ❌";
          alertMessage = `The task "${task.title}" has been rejected. Please review feedback and resubmit.`;
        }
      }
    }

    // 4. Process Priority updates
    if (priority !== undefined && priority !== previousPriority) {
      if (!["Low", "Medium", "High", "Critical"].includes(priority)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Invalid task priority value",
            },
          },
          { status: 400 }
        );
      }
      task.priority = priority;
      historyDetails += `Priority updated from ${previousPriority} to ${priority}. `;
    }

    // Update texts
    if (title !== undefined) {
      if (auth.role === "SuperAdmin") {
        task.title = title.trim();
      }
    }
    if (description !== undefined) task.description = description.trim();

    // 5. Save History & Dispatch Alerts
    // 5. Save History & Dispatch Alerts
    if (historyDetails.trim()) {
      task.history.push({
        action: "Task Updated",
        details: historyDetails.trim(),
        updatedBy: auth.user._id,
        updatedEmail: auth.user.email,
        updatedAt: new Date(),
      });

      await task.save();

      // Dispatch notification if defined
      if (alertRecipientUserId) {
        await sendSystemNotification({
          recipient: alertRecipientUserId,
          title: alertTitle,
          message: alertMessage,
          category: "Task",
          priority: status === "Completed" ? "Normal" : "High",
          actionUrl: `/dashboard/tasks/${id}`,
        });
      }

      // Log task updates
      const { logAuditEvent } = require("@/lib/audit-logger");
      await logAuditEvent({
        action: "TASK_UPDATE",
        entityType: "Task",
        entityId: task._id,
        details: `Updated task "${task.title}": ${historyDetails.trim()}`,
        performedBy: auth.user._id,
        performedEmail: auth.user.email,
        performedRole: auth.role,
        severity: status === "Completed" ? "Low" : "Medium",
      }, request);
    } else {
      await task.save();
    }

    const populatedTask = await Task.findById(id)
      .populate({
        path: "client",
        select: "firstName lastName email phone companyName",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName user",
      })
      .populate({
        path: "followUp",
        select: "title scheduledAt status",
      });

    return NextResponse.json({
      success: true,
      data: populatedTask,
    });
  } catch (error: any) {
    console.error("Update task details error:", error);
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
            message: "Super Admin privileges are required to delete task records",
          },
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    await dbConnect();

    const deletedTask = await Task.findByIdAndDelete(id);
    if (!deletedTask) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: "Task profile does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Log audit event
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "TASK_DELETE",
      entityType: "Task",
      entityId: deletedTask._id,
      details: `Permanently deleted task: "${deletedTask.title}"`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
      performedRole: auth.role,
      severity: "Medium",
    }, request);

    return NextResponse.json({
      success: true,
      message: "Task profile has been deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete task error:", error);
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
