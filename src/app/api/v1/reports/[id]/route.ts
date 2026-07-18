import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Report from "@/models/Report";
import { verifyClientAccess } from "@/lib/client-auth";

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

    const report = await Report.findById(id);
    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REPORT_NOT_FOUND",
            message: "Report snapshot does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Authorization constraints: Employees can only view reports they initiated/own
    if (auth.role === "Employee" && report.generatedBy.toString() !== auth.user._id.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to view this report snapshot",
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error("Get report snapshot error:", error);
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

export async function POST(
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
    const { format } = await request.json().catch(() => ({ format: "csv" }));

    await dbConnect();
    const report = await Report.findById(id);
    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REPORT_NOT_FOUND",
            message: "Report snapshot does not exist",
          },
        },
        { status: 404 }
      );
    }

    // Authorization constraints
    if (auth.role === "Employee" && report.generatedBy.toString() !== auth.user._id.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You are not authorized to export this report",
          },
        },
        { status: 403 }
      );
    }

    const kpis = report.kpis || {};
    const taskKpi = kpis.tasks || {};
    const fuKpi = kpis.followups || {};
    const cliKpi = kpis.clients || {};

    const columns = [
      ["Metric Category", "Property Name", "Value"],
      ["Summary", "Average Productivity Score", kpis.avgProductivityScore || 100],
      ["Summary", "Total Active Staff Count", kpis.totalEmployeesCount || 0],
      ["Tasks", "Total Tasks Count", taskKpi.total || 0],
      ["Tasks", "Completed Tasks", taskKpi.completed || 0],
      ["Tasks", "Pending Tasks", taskKpi.pending || 0],
      ["Tasks", "Overdue Tasks", taskKpi.overdue || 0],
      ["Tasks", "Rejected Tasks", taskKpi.rejected || 0],
      ["Follow-Ups", "Total Follow-Ups", fuKpi.total || 0],
      ["Follow-Ups", "Completed Follow-Ups", fuKpi.completed || 0],
      ["Follow-Ups", "Missed Follow-Ups", fuKpi.missed || 0],
      ["Follow-Ups", "Overdue Follow-Ups", fuKpi.overdue || 0],
      ["Clients", "Total Clients Registered", cliKpi.total || 0],
      ["Clients", "Active Client Relations", cliKpi.active || 0],
      ["Clients", "Inactive Clients", cliKpi.inactive || 0],
      ["Clients", "Average Client Conversion Rate (%)", cliKpi.conversionRate || 0],
    ];

    // Append staff list details if present in rawMetrics
    const staffList = report.rawMetrics?.productivityDetails || [];
    if (staffList.length > 0) {
      columns.push([]);
      columns.push(["Staff Name", "Department", "Productivity Score (%)", "Tasks Completed", "Follow-ups Completed"]);
      staffList.forEach((s: any) => {
        columns.push([
          s.name,
          s.department || "General",
          s.productivityScore,
          s.tasksCompleted,
          s.followupsCompleted
        ]);
      });
    }

    if (format === "excel" || format === "xlsx") {
      // Tab Separated Values (TSV) is read natively by Excel
      const tsvContent = columns.map(row => row.join("\t")).join("\n");
      return new NextResponse(tsvContent, {
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="Report_${report.category}_Export.xls"`,
        },
      });
    }

    // Default to CSV
    const csvContent = columns.map(row => 
      row.map(cell => {
        const str = String(cell).replace(/"/g, '""');
        return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
      }).join(",")
    ).join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="Report_${report.category}_Export.csv"`,
      },
    });

  } catch (error: any) {
    console.error("Export report snapshot error:", error);
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
