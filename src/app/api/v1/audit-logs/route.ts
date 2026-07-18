import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import { verifyClientAccess } from "@/lib/client-auth";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "50";
    const search = searchParams.get("search") || "";
    const action = searchParams.get("action") || "";
    const entityType = searchParams.get("entityType") || "";
    const severity = searchParams.get("severity") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const userEmail = searchParams.get("userEmail") || "";

    await dbConnect();

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 50);
    const skipNum = (pageNum - 1) * limitNum;

    const query: any = {};

    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (severity) query.severity = severity;
    if (userEmail) query.performedEmail = userEmail;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { performedEmail: searchRegex },
        { performedName: searchRegex },
        { details: searchRegex },
        { action: searchRegex },
        { entityType: searchRegex }
      ];
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("List audit logs error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
