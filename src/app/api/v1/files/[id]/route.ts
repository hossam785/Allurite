import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { dbConnect } from "@/lib/db";
import File from "@/models/File";
import { verifyClientAccess } from "@/lib/client-auth";
import mongoose from "mongoose";

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

    const file = await File.findById(id).populate({
      path: "owner",
      select: "firstName lastName",
    });

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: "File does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Scoping check for Employees
    if (auth.role === "Employee" && file.owner.toString() !== auth.employeeId) {
      // Allow employee to view if linked to a Client they manage or Task assigned to them
      // We will allow this dynamically or check references if they match.
      // For simplicity, verify client or task assignment:
      let isAuthorized = false;
      if (file.relatedModule === "Clients" && file.relatedId) {
        const client = await mongoose.model("Client").findById(file.relatedId);
        if (client && client.manager.toString() === auth.employeeId) isAuthorized = true;
      } else if (file.relatedModule === "Tasks" && file.relatedId) {
        const task = await mongoose.model("Task").findById(file.relatedId);
        if (task && task.assignedTo.toString() === auth.employeeId) isAuthorized = true;
      } else if (file.relatedModule === "Employees" && file.relatedId?.toString() === auth.employeeId) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "You are not authorized to access this file",
            },
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: file,
    });
  } catch (error: any) {
    console.error("Get file error:", error);
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
    const { fileName, tags, archived } = body;

    await dbConnect();

    const file = await File.findById(id);
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: "File does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Scoping checks: Employees can only edit their own files
    if (auth.role === "Employee" && file.owner.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to modify this file",
          },
        },
        { status: 403 }
      );
    }

    let logMessage = "";

    // Handle rename
    if (fileName !== undefined && fileName.trim() !== file.fileName) {
      const oldName = file.fileName;
      file.fileName = fileName.trim();
      logMessage += `Renamed from "${oldName}" to "${fileName.trim()}". `;
      file.activityLogs.push({
        action: "Rename",
        details: `Renamed from "${oldName}" to "${fileName.trim()}"`,
        performedBy: auth.user._id,
        performedEmail: auth.user.email,
        performedAt: new Date(),
      });
    }

    // Handle tag updates
    if (tags !== undefined) {
      file.tags = Array.isArray(tags) ? tags : [];
      logMessage += "Tags updated. ";
    }

    // Handle archiving / restoring
    if (archived !== undefined && archived !== file.archived) {
      file.archived = archived;
      if (archived) {
        file.archivedAt = new Date();
        file.activityLogs.push({
          action: "Archive",
          details: "File moved to Archive",
          performedBy: auth.user._id,
          performedEmail: auth.user.email,
          performedAt: new Date(),
        });
      } else {
        file.archivedAt = undefined;
        file.activityLogs.push({
          action: "Restore",
          details: "File restored to Active files list",
          performedBy: auth.user._id,
          performedEmail: auth.user.email,
          performedAt: new Date(),
        });
      }
    }

    await file.save();

    // Log file update
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "FILE_UPDATE",
      entityType: "File",
      entityId: file._id,
      details: `Updated file properties / status for "${file.fileName}". Archived: ${file.archived}`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
      performedRole: auth.role,
      severity: "Low",
    }, request);

    return NextResponse.json({
      success: true,
      data: file,
    });
  } catch (error: any) {
    console.error("Update file error:", error);
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

    const file = await File.findById(id);
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FILE_NOT_FOUND",
            message: "File does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Authorization checks: Employees can only delete files they uploaded/own
    if (auth.role === "Employee" && file.owner.toString() !== auth.employeeId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to delete this file",
          },
        },
        { status: 403 }
      );
    }

    // Delete from Vercel Blob cloud storage if token and URL are present
    if (process.env.BLOB_READ_WRITE_TOKEN && file.blobUrl.startsWith("https://")) {
      try {
        await del(file.blobUrl);
        console.log(`Deleted blob url ${file.blobUrl} from Vercel storage.`);
      } catch (err) {
        console.error("Failed to delete physical file from Vercel Blob storage:", err);
      }
    }

    // Delete metadata document from MongoDB Atlas
    await File.deleteOne({ _id: id });

    // Log file delete
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "FILE_DELETE",
      entityType: "File",
      entityId: file._id,
      details: `Permanently deleted file "${file.fileName}" from storage catalog.`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
      performedRole: auth.role,
      severity: "Medium",
    }, request);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully from storage and database metadata",
    });
  } catch (error: any) {
    console.error("Delete file error:", error);
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
