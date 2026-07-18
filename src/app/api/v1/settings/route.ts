import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
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

    // Settings API is strictly restricted to SuperAdmin
    if (auth.role !== "SuperAdmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    await dbConnect();

    // Find singleton settings, otherwise initialize defaults
    let settings = await CompanySettings.findOne({ key: "global_settings" });
    if (!settings) {
      settings = new CompanySettings({ key: "global_settings" });
      await settings.save();
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error("Get company settings error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    await dbConnect();

    let settings = await CompanySettings.findOne({ key: "global_settings" });
    if (!settings) {
      settings = new CompanySettings({ key: "global_settings" });
    }

    // Overwrite fields
    const fieldsToUpdate = [
      "companyName", "companyEmail", "companyPhone", "companyAddress", "companyWebsite",
      "timezone", "language", "currency", "followupIntervalDays", "reminderOffsetMinutes",
      "notificationRetentionDays", "emailNotificationsEnabled", "passwordMinLength",
      "maxLoginAttempts", "sessionTimeoutMinutes", "country", "workWeekStart", "workWeekEnd"
    ];

    fieldsToUpdate.forEach(field => {
      if (body[field] !== undefined) {
        (settings as any)[field] = body[field];
      }
    });

    await settings.save();

    // Log the audit event
    await logAuditEvent({
      action: "SETTINGS_UPDATE",
      entityType: "Settings",
      entityId: settings._id,
      details: `Company & System settings updated. Max attempts: ${settings.maxLoginAttempts}, Timeout: ${settings.sessionTimeoutMinutes}m.`,
      performedBy: auth.user._id,
      performedEmail: auth.user.email,
    });

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
