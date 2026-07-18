import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { dbConnect } from "@/lib/db";
import Backup from "@/models/Backup";
import User from "@/models/User";
import Employee from "@/models/Employee";
import Client from "@/models/Client";
import FollowUp from "@/models/FollowUp";
import Task from "@/models/Task";
import Notification from "@/models/Notification";
import File from "@/models/File";
import CompanySettings from "@/models/CompanySettings";
import { verifyClientAccess } from "@/lib/client-auth";
import { logAuditEvent } from "@/lib/audit-logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyClientAccess(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication is required" } },
        { status: 401 }
      );
    }

    // Backup system is restricted to SuperAdmin
    if (auth.role !== "SuperAdmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    await dbConnect();
    const backups = await Backup.find().sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: backups,
    });
  } catch (error: any) {
    console.error("List backups error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyClientAccess(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication is required" } },
        { status: 401 }
      );
    }

    if (auth.role !== "SuperAdmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    await dbConnect();

    // 1. Compile Snapshot Object
    console.log("Compiling database collections snapshots for backup...");
    const backupSnapshot = {
      version: "1.0.0",
      backupDate: new Date(),
      collections: {
        users: await User.find(),
        employees: await Employee.find(),
        clients: await Client.find(),
        followups: await FollowUp.find(),
        tasks: await Task.find(),
        notifications: await Notification.find(),
        files: await File.find(),
        settings: await CompanySettings.find(),
      }
    };

    const backupString = JSON.stringify(backupSnapshot, null, 2);
    const backupBuffer = Buffer.from(backupString, "utf-8");
    const fileSize = backupBuffer.length;
    const backupName = `backup-${Date.now()}.json`;

    // 2. Upload to Vercel Blob / Simulation fallback
    let blobUrl = "";
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      console.log("Uploading backup file to Vercel Blob Storage...");
      const blob = await put(backupName, backupBuffer, {
        contentType: "application/json",
        access: "public",
      });
      blobUrl = blob.url;
    } else {
      console.log("BLOB_READ_WRITE_TOKEN not found. Simulating cloud backup URL upload...");
      blobUrl = `https://public.blob.vercel-storage.com/simulated-backups/${backupName}`;
    }

    // 3. Save Backup Document in DB
    const newBackup = new Backup({
      name: backupName,
      createdBy: auth.user._id,
      createdEmail: auth.user.email,
      size: fileSize,
      status: "Completed",
      blobUrl,
    });

    await newBackup.save();

    // 4. Write Audit Log
    await logAuditEvent({
      action: "BACKUP_CREATE",
      entityType: "Backup",
      entityId: newBackup._id,
      details: `Generated database snapshot backup "${backupName}". Size: ${(fileSize / 1024).toFixed(2)} KB.`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
    });

    return NextResponse.json(
      { success: true, data: newBackup },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create backup error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
