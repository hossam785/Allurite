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
    const { fileName, fileUrl, fileSize } = body;

    if (!fileName || !fileUrl) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "File name and URL are required",
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

    // Scoping check: Employees can only upload deliverables to tasks assigned to them
    if (auth.role === "Employee" && task.assignedTo.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to upload deliverables for this task",
          },
        },
        { status: 403 }
      );
    }

    // Append attachment subdocument
    task.attachments.push({
      fileName: fileName.trim(),
      fileUrl: fileUrl.trim(),
      fileSize: fileSize ? parseInt(fileSize) : undefined,
      uploadedBy: auth.user._id,
      uploadedEmail: auth.user.email,
      uploadedAt: new Date(),
    });

    // Log upload event in activity logs
    task.history.push({
      action: "Attachment Uploaded",
      details: `Uploaded file deliverables: "${fileName.trim()}"`,
      updatedBy: auth.user._id,
      updatedEmail: auth.user.email,
      updatedAt: new Date(),
    });

    await task.save();

    return NextResponse.json({
      success: true,
      data: task.attachments,
    });
  } catch (error: any) {
    console.error("Add task attachment error:", error);
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
