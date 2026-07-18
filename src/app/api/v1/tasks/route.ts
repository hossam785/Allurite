import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Task from "@/models/Task";
import Employee from "@/models/Employee";
import Client from "@/models/Client";
import { verifyClientAccess } from "@/lib/client-auth";
import { checkOverdueTasks } from "@/lib/task-check";
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
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const priority = searchParams.get("priority") || "";
    const filterAgent = searchParams.get("assignedTo") || "";
    const filterClient = searchParams.get("client") || "";

    await dbConnect();

    // Trigger overdue updates on search queries
    await checkOverdueTasks();

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skipNum = (pageNum - 1) * limitNum;

    // Build filters
    const query: any = {};

    // Apply RBAC scoping
    if (auth.role === "Employee") {
      query.assignedTo = auth.employeeId;
    } else if (auth.role === "SuperAdmin" && filterAgent) {
      query.assignedTo = filterAgent;
    }

    // Apply filter conditions
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (filterClient) query.client = filterClient;

    // Apply text search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate({
        path: "client",
        select: "firstName lastName companyName",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName",
      })
      .sort({ dueDate: 1 }) // Order by upcoming due date
      .skip(skipNum)
      .limit(limitNum);

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("List tasks error:", error);
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
    const { title, description, dueDate, assignedToId, priority, client, followUp } = body;

    // Validations
    if (!title || !dueDate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Required fields: title, dueDate",
          },
        },
        { status: 400 }
      );
    }

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

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const parsedMidnight = new Date(parsedDate);
    parsedMidnight.setHours(0, 0, 0, 0);

    if (parsedMidnight < todayMidnight) {
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

    await dbConnect();

    // Verify assignee
    let agentId: string;
    let agentUserId: string;

    if (auth.role === "Employee") {
      agentId = auth.employeeId!;
      agentUserId = auth.user._id.toString();
    } else {
      if (!assignedToId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: "Please select an assigned agent",
            },
          },
          { status: 400 }
        );
      }
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
      agentId = assignedToId;
      agentUserId = employee.user.toString();
    }

    // Verify client if linked
    if (client) {
      const clientExists = await Client.findById(client);
      if (!clientExists) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "CLIENT_NOT_FOUND",
              message: "Linked client profile does not exist",
            },
          },
          { status: 404 }
        );
      }
    }

    const newTask = new Task({
      title: title.trim(),
      description: description?.trim() || "",
      status: "Pending",
      priority: priority || "Medium",
      dueDate: parsedDate,
      assignedTo: agentId,
      createdBy: auth.user._id,
      client: client || undefined,
      followUp: followUp || undefined,
      attachments: [],
      comments: [],
      history: [],
    });

    // Write initial creation history log
    newTask.history.push({
      action: "Task Created",
      details: "Task scheduled and assigned initial Pending state",
      updatedBy: auth.user._id,
      updatedEmail: auth.user.email,
      updatedAt: new Date(),
    });

    await newTask.save();

    // Send "New task assigned" notification
    await sendSystemNotification({
      recipient: agentUserId,
      title: "New Task Assigned 📋",
      message: `You have been assigned a new task: "${title}". Due date: ${parsedDate.toLocaleDateString()}.`,
      category: "Task",
      priority: "Normal",
      actionUrl: `/dashboard/tasks/${newTask._id}`,
    });

    // Log audit event
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "TASK_CREATE",
      entityType: "Task",
      entityId: newTask._id,
      details: `Created new task "${title}" and assigned to employee ID: ${agentId}`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
      performedRole: auth.role,
      severity: "Low",
    }, request);

    const populatedTask = await Task.findById(newTask._id)
      .populate({
        path: "client",
        select: "firstName lastName companyName",
      })
      .populate({
        path: "assignedTo",
        select: "firstName lastName",
      });

    return NextResponse.json(
      {
        success: true,
        data: populatedTask,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create task error:", error);
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
