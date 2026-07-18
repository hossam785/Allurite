import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Task from "@/models/Task";
import { verifyClientAccess } from "@/lib/client-auth";

export async function POST(
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
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Comment content cannot be empty",
          },
        },
        { status: 400 }
      );
    }

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

    // Scoping check: Employees can only comment on tasks assigned to them
    if (auth.role === "Employee" && task.assignedTo.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to comment on this task",
          },
        },
        { status: 403 }
      );
    }

    // Append comment subdocument
    task.comments.push({
      content: content.trim(),
      createdBy: auth.user._id,
      creatorEmail: auth.user.email,
      createdAt: new Date(),
    });

    // Log comment event in activity logs
    task.history.push({
      action: "Comment Added",
      details: `Commented: "${content.trim().substring(0, 40)}${content.trim().length > 40 ? "..." : ""}"`,
      updatedBy: auth.user._id,
      updatedEmail: auth.user.email,
      updatedAt: new Date(),
    });

    await task.save();

    return NextResponse.json({
      success: true,
      data: task.comments,
    });
  } catch (error: any) {
    console.error("Add task comment error:", error);
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
