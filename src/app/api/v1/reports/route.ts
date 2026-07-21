import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Report from "@/models/Report";
import { verifyClientAccess } from "@/lib/client-auth";
import { calculateAnalytics } from "@/lib/analytics-engine";

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
    const category = (searchParams.get("category") || "Productivity") as any;
    const startDateParam = searchParams.get("startDate") || "";
    const endDateParam = searchParams.get("endDate") || "";
    let employeeId = searchParams.get("employeeId") || "";

    await dbConnect();

    // Default dates: last 30 days (Round to nearest 5 minutes for caching compatibility)
    let endDate = endDateParam ? new Date(endDateParam) : new Date();
    if (!endDateParam) {
      const coeff = 1000 * 60 * 5;
      endDate = new Date(Math.floor(endDate.getTime() / coeff) * coeff);
    }
    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Ensure start date is before end date
    if (startDate > endDate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: "Start date must be before or equal to End date",
          },
        },
        { status: 400 }
      );
    }

    // Role-based scoping constraints
    if (auth.role === "Employee") {
      employeeId = auth.employeeId; // Employees are strictly locked to their own analytics data
    }

    // Caching Strategy: Check if a matching report was compiled in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const targetEmpKey = employeeId ? employeeId.toString() : "ALL";

    const cachedReport = await Report.findOne({
      category,
      generatedBy: auth.user._id,
      "rawMetrics.targetEmployeeId": targetEmpKey,
      createdAt: { $gte: fifteenMinutesAgo },
    }).sort({ createdAt: -1 });

    if (cachedReport) {
      console.log(`Serving cached analytics snapshot for category ${category} (targetEmployee: ${targetEmpKey}).`);
      return NextResponse.json({
        success: true,
        cached: true,
        data: cachedReport,
      });
    }

    // Cache miss - compile fresh calculations
    console.log(`Cache miss. Compiling fresh KPIs for category ${category} (targetEmployee: ${targetEmpKey}).`);
    const results = await calculateAnalytics(category, startDate, endDate, employeeId);

    const reportTitle = `${category} Reports Snapshot (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;

    const newReport = new Report({
      title: reportTitle,
      category,
      generatedBy: auth.user._id,
      generatedEmail: auth.user.email,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      kpis: results.kpis,
      chartsData: results.chartsData,
      rawMetrics: {
        targetEmployeeId: targetEmpKey,
        ...results.rawMetrics,
      },
    });

    await newReport.save();

    return NextResponse.json({
      success: true,
      cached: false,
      data: newReport,
    });
  } catch (error: any) {
    console.error("Generate report API error:", error);
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
