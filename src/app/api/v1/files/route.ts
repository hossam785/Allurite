import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { dbConnect } from "@/lib/db";
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
    const search = searchParams.get("search") || "";
    const relatedModule = searchParams.get("relatedModule") || "";
    const relatedId = searchParams.get("relatedId") || "";
    const showArchived = searchParams.get("archived") === "true";

    await dbConnect();

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 20);
    const skipNum = (pageNum - 1) * limitNum;

    // Base query
    const query: any = { archived: showArchived };

    // Apply Employee scoping constraints
    if (auth.role === "Employee") {
      // Find Client IDs managed by the employee
      const managedClients = await Client.find({ manager: auth.employeeId }).select("_id");
      const clientIds = managedClients.map(c => c._id);

      // Find Task IDs assigned to the employee
      const assignedTasks = await Task.find({ assignedTo: auth.employeeId }).select("_id");
      const taskIds = assignedTasks.map(t => t._id);

      query.$or = [
        { owner: auth.employeeId },
        { relatedModule: "Clients", relatedId: { $in: clientIds } },
        { relatedModule: "Tasks", relatedId: { $in: taskIds } },
        { relatedModule: "Employees", relatedId: auth.employeeId }
      ];
    } else {
      // SuperAdmin: can optionally filter by related module or owner
      const filterOwner = searchParams.get("owner") || "";
      if (filterOwner) query.owner = filterOwner;
    }

    // Apply specific filters
    if (category) {
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { category }];
        delete query.$or;
      } else {
        query.category = category;
      }
    }

    if (relatedModule) {
      const modFilter: any = { relatedModule };
      if (relatedId) modFilter.relatedId = relatedId;

      if (query.$and) {
        query.$and.push(modFilter);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, modFilter];
        delete query.$or;
      } else {
        query.relatedModule = relatedModule;
        if (relatedId) query.relatedId = relatedId;
      }
    }

    // Apply text search
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      const searchFilter = {
        $or: [
          { fileName: searchRegex },
          { originalName: searchRegex },
          { tags: searchRegex }
        ]
      };

      if (query.$and) {
        query.$and.push(searchFilter);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, searchFilter];
        delete query.$or;
      } else {
        query.$or = searchFilter.$or;
      }
    }

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

    // Resolve owner
    let ownerId = auth.employeeId;
    if (!ownerId) {
      // SuperAdmin uploads: resolve from linked module manager/assignee, otherwise fetch first Employee
      if (relatedModule === "Clients" && relatedId) {
        const client = await Client.findById(relatedId);
        if (client) ownerId = client.manager.toString();
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
      // Simulation fallback (zero local disk writes)
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
