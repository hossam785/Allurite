import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { verifyClientAccess } from "@/lib/client-auth";

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
    const priority = searchParams.get("priority") || "";
    const read = searchParams.get("read") || "";
    const search = searchParams.get("search") || "";
    const personalOnly = searchParams.get("personal") === "true";

    await dbConnect();

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 20);
    const skipNum = (pageNum - 1) * limitNum;

    // Standardized Query Builder to resolve soft-deletion and RBAC filter bypasses
    const andConditions: any[] = [{ deleted: false }];

    // Role-based filtering
    if (auth.role === "Employee" || personalOnly) {
      andConditions.push({ recipient: auth.user._id });
    } else {
      andConditions.push({
        $or: [
          { recipient: auth.user._id },
          { category: { $in: ["System", "Security"] } },
        ]
      });
    }

    if (category) {
      andConditions.push({ category });
    }

    if (priority) {
      andConditions.push({ priority });
    }

    if (read) {
      andConditions.push({ read: read === "true" });
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      andConditions.push({
        $or: [
          { title: searchRegex },
          { message: searchRegex }
        ]
      });
    }

    const query = { $and: andConditions };

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("List notifications error:", error);
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

export async function PUT(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const { id, preferences } = body;

    await dbConnect();

    // 1. If payload updates User Preferences
    if (preferences) {
      const updatedUser = await User.findByIdAndUpdate(
        auth.user._id,
        { notificationPreferences: preferences },
        { new: true }
      );
      if (!updatedUser) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "USER_NOT_FOUND",
              message: "User session account not found",
            },
          },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Preferences updated successfully",
        data: updatedUser.notificationPreferences,
      });
    }

    // 2. Mark single notification read
    if (id) {
      const updated = await Notification.findOneAndUpdate(
        { _id: id, recipient: auth.user._id },
        { read: true, readAt: new Date() },
        { new: true }
      );
      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "NOTIFICATION_NOT_FOUND",
              message: "Notification does not exist or unauthorized",
            },
          },
          { status: 404 }
        );
      }
    } else {
      // 3. Mark all unread notifications read
      await Notification.updateMany(
        { recipient: auth.user._id, read: false },
        { read: true, readAt: new Date() }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notifications updated successfully",
    });
  } catch (error: any) {
    console.error("Update notifications error:", error);
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
