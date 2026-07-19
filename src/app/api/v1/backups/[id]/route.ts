import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
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
import bcrypt from "bcryptjs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    await dbConnect();

    const backup = await Backup.findById(id);
    if (!backup) {
      return NextResponse.json(
        { success: false, error: { code: "BACKUP_NOT_FOUND", message: "Backup snapshot does not exist" } },
        { status: 404 }
      );
    }

    // 1. Download Backup JSON Payload & Verification
    let data: any = null;
    try {
      const fetchRes = await fetch(backup.blobUrl);
      if (!fetchRes.ok) throw new Error("Fetch failed");
      data = await fetchRes.json();
    } catch (err) {
      console.warn("Could not download backup file from Vercel Blob. Checking simulation mode...");
      if (backup.blobUrl.includes("simulated-backups")) {
        // Mock payload for testing restores in sandbox environment
        data = {
          version: "1.0.0",
          collections: {
            users: [],
            employees: [],
            clients: [],
            followups: [],
            tasks: [],
            notifications: [],
            files: [],
            settings: [],
          },
        };
      } else {
        return NextResponse.json(
          { success: false, error: { code: "FETCH_FAILED", message: "Failed to download backup snapshot from cloud storage" } },
          { status: 400 }
        );
      }
    }

    // 2. Verify Integrity Check
    if (!data || data.version !== "1.0.0" || !data.collections) {
      return NextResponse.json(
        { success: false, error: { code: "INTEGRITY_CHECK_FAILED", message: "Backup file is corrupt or uses invalid version schema" } },
        { status: 400 }
      );
    }

    const collections = data.collections;
    if (
      !collections.users || 
      !collections.employees || 
      !collections.clients || 
      !collections.followups || 
      !collections.tasks || 
      !collections.settings
    ) {
      return NextResponse.json(
        { success: false, error: { code: "INTEGRITY_CHECK_FAILED", message: "Backup file is missing required database collections" } },
        { status: 400 }
      );
    }

    // 3. Execute Restore
    console.log("Executing database recovery. Wiping current collections...");
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Client.deleteMany({});
    await FollowUp.deleteMany({});
    await Task.deleteMany({});
    await Notification.deleteMany({});
    await File.deleteMany({});
    await CompanySettings.deleteMany({});

    // Populating database collections
    if (collections.users?.length > 0) await User.insertMany(collections.users);
    if (collections.employees?.length > 0) await Employee.insertMany(collections.employees);
    if (collections.clients?.length > 0) await Client.insertMany(collections.clients);
    if (collections.followups?.length > 0) await FollowUp.insertMany(collections.followups);
    if (collections.tasks?.length > 0) await Task.insertMany(collections.tasks);
    if (collections.notifications?.length > 0) await Notification.insertMany(collections.notifications);
    if (collections.files?.length > 0) await File.insertMany(collections.files);
    if (collections.settings?.length > 0) await CompanySettings.insertMany(collections.settings);

    // 4. Critical Lockout Safety Net
    // Ensure the default SuperAdmin is re-seeded if missing from the backup users
    const hasAdmin = await User.findOne({ role: "SuperAdmin", status: "Active" });
    if (!hasAdmin) {
      console.log("No active SuperAdmin found after restore. Checking email presence to prevent E11000 clash...");
      const existingYoussef = await User.findOne({ email: "youssef@allurite.com" });
      const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || "Youssef2005";
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(initialPassword, salt);

      if (existingYoussef) {
        existingYoussef.status = "Active";
        existingYoussef.role = "SuperAdmin";
        existingYoussef.passwordHash = passwordHash;
        await existingYoussef.save();
        console.log("Re-activated existing youssef@allurite.com account as SuperAdmin.");
      } else {
        await User.create({
          email: "youssef@allurite.com",
          passwordHash,
          role: "SuperAdmin",
          status: "Active",
        });
        console.log("Created default youssef@allurite.com superadmin account.");
      }
    }

    // 5. Update Backup Record Status
    backup.status = "Restored";
    backup.restoredAt = new Date();
    backup.restoredBy = auth.user._id;
    backup.restoredEmail = auth.user.email;
    await backup.save();

    // 6. Write Audit Log
    await logAuditEvent({
      action: "BACKUP_RESTORE",
      entityType: "Backup",
      entityId: backup._id,
      details: `Database successfully restored from backup snapshot "${backup.name}".`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
    });

    return NextResponse.json({
      success: true,
      message: "Database restored successfully",
    });
  } catch (error: any) {
    console.error("Restore backup error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
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

    const { id } = await params;
    await dbConnect();

    const backup = await Backup.findById(id);
    if (!backup) {
      return NextResponse.json(
        { success: false, error: { code: "BACKUP_NOT_FOUND", message: "Backup snapshot does not exist" } },
        { status: 404 }
      );
    }

    // 1. Delete from Vercel Blob cloud storage
    if (process.env.BLOB_READ_WRITE_TOKEN && backup.blobUrl.startsWith("https://")) {
      try {
        await del(backup.blobUrl);
        console.log(`Deleted backup file from Vercel Blob storage: ${backup.blobUrl}`);
      } catch (err) {
        console.error("Failed to delete physical backup file from Vercel Blob:", err);
      }
    }

    // 2. Delete document metadata from MongoDB
    await Backup.deleteOne({ _id: id });

    // 3. Write Audit Log
    await logAuditEvent({
      action: "BACKUP_DELETE",
      entityType: "Backup",
      entityId: backup._id,
      details: `Permanently deleted backup snapshot "${backup.name}" from catalog.`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
    });

    return NextResponse.json({
      success: true,
      message: "Backup permanently deleted",
    });
  } catch (error: any) {
    console.error("Delete backup error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
