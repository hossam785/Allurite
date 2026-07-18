import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Notification from "@/models/Notification";
import { verifyClientAccess } from "@/lib/client-auth";

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
    await dbConnect();

    const notif = await Notification.findById(id);
    if (!notif) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOTIFICATION_NOT_FOUND",
            message: "Notification does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Authorization check: Employees can only update their own notifications.
    // SuperAdmins can update system/security ones.
    if (auth.role === "Employee" && notif.recipient.toString() !== auth.user._id.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to update this notification",
          },
        },
        { status: 403 }
      );
    }

    notif.read = true;
    notif.readAt = new Date();
    await notif.save();

    return NextResponse.json({
      success: true,
      data: notif,
    });
  } catch (error: any) {
    console.error("Mark notification read error:", error);
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

    const notif = await Notification.findById(id);
    if (!notif) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOTIFICATION_NOT_FOUND",
            message: "Notification does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Authorization check
    if (auth.role === "Employee" && notif.recipient.toString() !== auth.user._id.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to delete this notification",
          },
        },
        { status: 403 }
      );
    }

    // Soft-delete: retain in DB for audit, flag as deleted
    notif.deleted = true;
    await notif.save();

    return NextResponse.json({
      success: true,
      message: "Notification soft-deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete notification error:", error);
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
