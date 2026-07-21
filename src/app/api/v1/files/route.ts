import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { dbConnect, escapeRegex } from "@/lib/db";
import File from "@/models/File";
import Employee from "@/models/Employee";
import Client from "@/models/Client";
import Task from "@/models/Task";
import { verifyClientAccess } from "@/lib/client-auth";
import mongoose from "mongoose";

// Resolve File Category from Name / MIME
function getCategoryFromMime(fileName: string, mimeType: string): "PDF" | "Image" | "Document" | "Spreadsheet" | "Archive" | "Other" {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || mimeType.includes("pdf")) return "PDF";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext) || mimeType.startsWith("image/")) return "Image";
  if (["doc", "docx", "txt", "rtf", "odt"].includes(ext) || mimeType.includes("word") || mimeType.includes("text")) return "Document";
  if (["xls", "xlsx", "csv", "ods"].includes(ext) || mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "Spreadsheet";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || mimeType.includes("zip") || mimeType.includes("compressed")) return "Archive";
  return "Other";
}

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
    const limit = searchParams.get("limit") || "20";
    const category = searchParams.get("category") || "";
    const search = (searchParams.get("search") || "").substring(0, 100);
    const relatedModule = searchParams.get("relatedModule") || "";
    const relatedId = searchParams.get("relatedId") || "";
    const showArchived = searchParams.get("archived") === "true";

    await dbConnect();

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 20);
    const skipNum = (pageNum - 1) * limitNum;

    // Build query conditions array
    const conditions: any[] = [{ archived: showArchived }];

    // Apply Employee scoping constraints
    if (auth.role === "Employee") {
      // Find Client IDs managed by the employee
      const managedClients = await Client.find({ assignedAgent: auth.employeeId }).select("_id");
      const clientIds = managedClients.map(c => c._id);

      // Find Task IDs assigned to the employee
      const assignedTasks = await Task.find({ assignedTo: auth.employeeId }).select("_id");
      const taskIds = assignedTasks.map(t => t._id);

      conditions.push({
        $or: [
          { owner: auth.employeeId },
          { relatedModule: "Clients", relatedId: { $in: clientIds } },
          { relatedModule: "Tasks", relatedId: { $in: taskIds } },
          { relatedModule: "Employees", relatedId: auth.employeeId }
        ]
      });
    } else {
      // SuperAdmin: can optionally filter by owner
      const filterOwner = searchParams.get("owner") || "";
      if (filterOwner) conditions.push({ owner: filterOwner });
    }

    // Apply category filter
    if (category) {
      conditions.push({ category });
    }

    // Apply related module filter
    if (relatedModule) {
      const modFilter: any = { relatedModule };
      if (relatedId) modFilter.relatedId = relatedId;
      conditions.push(modFilter);
    }

    // Apply text search
    if (search) {
      const sanitized = escapeRegex(search);
      const searchRegex = { $regex: sanitized, $options: "i" };
      conditions.push({
        $or: [
          { fileName: searchRegex },
          { originalName: searchRegex },
          { tags: searchRegex }
        ]
      });
    }

    const query = conditions.length === 1 ? conditions[0] : { $and: conditions };

    const total = await File.countDocuments(query);
    const files = await File.find(query)
      .populate({
        path: "owner",
        select: "firstName lastName",
      })
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    return NextResponse.json({
      success: true,
      data: files,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("List files error:", error);
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

    // Parse multipart form data
    const formData = await request.formData();
    const filePayload = formData.get("file") as unknown as File;
    const relatedModule = formData.get("relatedModule") as string;
    const relatedId = formData.get("relatedId") as string;
    const tagsRaw = formData.get("tags") as string;

    if (!filePayload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "No file uploaded in the request",
          },
        },
        { status: 400 }
      );
    }

    const fileName = filePayload.name;
    const mimeType = filePayload.type || "application/octet-stream";
    const fileSize = filePayload.size;

    await dbConnect();

    // Verify module access permissions for Employee role
    if (auth.role === "Employee" && relatedModule && relatedId) {
      if (relatedModule === "Clients") {
        const client = await Client.findOne({ _id: relatedId, assignedAgent: auth.employeeId, deleted: { $ne: true } });
        if (!client) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You do not have access to link files to this client profile" } },
            { status: 403 }
          );
        }
      } else if (relatedModule === "Tasks") {
        const task = await Task.findOne({ _id: relatedId, assignedTo: auth.employeeId, deleted: { $ne: true } });
        if (!task) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You do not have access to link files to this task" } },
            { status: 403 }
          );
        }
      }
    }

    // Resolve owner
    let ownerId = auth.employeeId;
    if (!ownerId) {
      // SuperAdmin uploads: resolve from linked module manager/assignee, otherwise fetch first Employee
      if (relatedModule === "Clients" && relatedId) {
        const client = await Client.findById(relatedId);
        if (client) ownerId = client.assignedAgent.toString();
      } else if (relatedModule === "Tasks" && relatedId) {
        const task = await Task.findById(relatedId);
        if (task) ownerId = task.assignedTo.toString();
      }

      if (!ownerId) {
        const fallbackEmp = await Employee.findOne();
        if (fallbackEmp) ownerId = fallbackEmp._id.toString();
      }
    }

    if (!ownerId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "OWNER_REQUIRED",
            message: "Unable to associate an owner employee profile to this file",
          },
        },
        { status: 400 }
      );
    }

    // Parse tags array
    const tags = tagsRaw
      ? tagsRaw
          .split(",")
          .map(t => t.trim().toLowerCase())
          .filter(t => t.length > 0)
      : [];

    // Resolve category
    const category = getCategoryFromMime(fileName, mimeType);

    // Convert file to buffer for storage SDKs
    const bytes = await filePayload.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload using Vercel Blob / simulation fallback
    let blobUrl = "";
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Direct Vercel Blob upload
      const blob = await put(fileName, buffer, { access: "public" });
      blobUrl = blob.url;
    } else {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "STORAGE_CONFIGURATION_ERROR",
              message: "BLOB_READ_WRITE_TOKEN environment variable is required for file storage in production environment",
            },
          },
          { status: 500 }
        );
      }
      // Simulation fallback for local development (zero local disk writes)
      const uniqueId = new mongoose.Types.ObjectId().toString();
      blobUrl = `https://public.blob.vercel-storage.com/simulated-upload/${uniqueId}/${encodeURIComponent(fileName)}`;
    }

    const newFile = new File({
      fileName,
      originalName: fileName,
      fileSize,
      mimeType,
      blobUrl,
      uploadedBy: auth.user._id,
      uploadedEmail: auth.user.email,
      owner: ownerId,
      relatedModule: relatedModule || undefined,
      relatedId: relatedId ? new mongoose.Types.ObjectId(relatedId) : undefined,
      category,
      tags,
      archived: false,
      activityLogs: [],
    });

    // Write initial upload log
    newFile.activityLogs.push({
      action: "Upload",
      details: `File successfully uploaded to cloud storage. Size: ${(fileSize / 1024).toFixed(2)} KB`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
      performedAt: new Date(),
    });

    await newFile.save();

    // Log audit event
    const { logAuditEvent } = require("@/lib/audit-logger");
    await logAuditEvent({
      action: "FILE_UPLOAD",
      entityType: "File",
      entityId: newFile._id,
      details: `Uploaded file "${fileName}". Size: ${(fileSize / 1024).toFixed(2)} KB. Module: ${relatedModule || "General"}`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
      performedRole: auth.role,
      severity: "Low",
    }, request);

    return NextResponse.json(
      {
        success: true,
        data: newFile,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Upload file error:", error);
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
export const config = {
  api: {
    bodyParser: false, // Disabling bodyparser to allow streaming file upload data
  },
};
