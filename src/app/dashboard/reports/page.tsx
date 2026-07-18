"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../layout";
import { 
  TrendingUp, 
  Users, 
  CheckSquare, 
  Clock, 
  BarChart2, 
  Calendar, 
  User, 
  FileSpreadsheet, 
  Download, 
  Printer, 
  FileText, 
  AlertTriangle,
  Award,
  UsersRound,
  FileDown
} from "lucide-react";

interface EmployeeSummary {
  _id: string;
  firstName: string;
  lastName: string;
  department?: string;
}

interface TrendPoint {
  label: string;
  tasksCompleted: number;
  followupsCompleted: number;
}

interface DistributionItem {
  name: string;
  value: number;
}

interface ReportData {
  _id?: string;
  title: string;
  category: string;
  dateRange: { start: string; end: string };
  kpis: {
    avgProductivityScore: number;
    totalEmployeesCount: number;
    tasks: { total: number; completed: number; pending: number; inProgress: number; overdue: number; rejected: number; cancelled: number };
    followups: { total: number; completed: number; scheduled: number; pending: number; missed: number; cancelled: number; overdue: number };
    clients: { total: number; active: number; inactive: number; pending: number; conversionRate: number };
  };
  chartsData: {
    trend: TrendPoint[];
    sources: DistributionItem[];
    clientStatuses: DistributionItem[];
    taskStatuses: DistributionItem[];
    fuStatuses: DistributionItem[];
  };
  rawMetrics: {
    productivityDetails: Array<{
      employeeId: string;
      name: string;
      department: string;
      tasksCompleted: number;
      tasksPending: number;
      tasksOverdue: number;
      followupsCompleted: number;
      followupsMissed: number;
      clientsCount: number;
      productivityScore: number;
    }>;
  };
}

export default function ReportsCenterPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Filter params state
  const [category, setCategory] = useState<"Productivity" | "Client" | "Follow-Up" | "Task">("Productivity");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  // Data states
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  // Load staff list for admin filter dropdown
  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/v1/employees?limit=100");
      const json = await res.json();
      if (res.ok) setEmployees(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Compile / Fetch Analytics Report
  const generateReport = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        category,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      if (selectedEmployee) params.append("employeeId", selectedEmployee);

      const res = await fetch(`/api/v1/reports?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to compile report");

      setReport(json.data);
    } catch (err: any) {
      setError(err.message || "An error occurred compiling report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadEmployees();
  }, [isSuperAdmin]);

  useEffect(() => {
    generateReport();
  }, [category, selectedEmployee]);

  // Download CSV / Excel exports
  const handleExport = async (format: "csv" | "excel") => {
    if (!report?._id || exportLoading) return;
    setExportLoading(true);
    try {
      const res = await fetch(`/api/v1/reports/${report._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      
      if (!res.ok) throw new Error("Export failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Report_${category}_Export.${format === "excel" ? "xls" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Error exporting report: " + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Print Report PDF
  const handlePrint = () => {
    window.print();
  };

  // Custom Trend Line Plot Calculation helper
  const renderTrendSVG = () => {
    if (!report?.chartsData?.trend || report.chartsData.trend.length === 0) return null;
    const trend = report.chartsData.trend;

    const maxVal = Math.max(
      ...trend.map(t => Math.max(t.tasksCompleted, t.followupsCompleted)), 
      1
    );

    const pointsTasks = trend.map((t, idx) => {
      const x = (idx / (trend.length - 1)) * 400 + 40;
      const y = 180 - (t.tasksCompleted / maxVal) * 140;
      return `${x},${y}`;
    }).join(" ");

    const pointsFollowups = trend.map((t, idx) => {
      const x = (idx / (trend.length - 1)) * 400 + 40;
      const y = 180 - (t.followupsCompleted / maxVal) * 140;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg viewBox="0 0 480 220" style={{ width: "100%", height: "240px" }} className="svg-trend-chart">
        <defs>
          <linearGradient id="tasksGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--clr-accent-primary)" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="var(--clr-accent-primary)" stopOpacity="0.0"/>
          </linearGradient>
          <linearGradient id="fuGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#805AD5" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#805AD5" stopOpacity="0.0"/>
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1="40" y1="40" x2="440" y2="40" stroke="var(--clr-border)" strokeDasharray="4" />
        <line x1="40" y1="110" x2="440" y2="110" stroke="var(--clr-border)" strokeDasharray="4" />
        <line x1="40" y1="180" x2="440" y2="180" stroke="var(--clr-border)" />

        {/* Areas */}
        <polygon 
          points={`40,180 ${pointsTasks} 440,180`} 
          fill="url(#tasksGrad)" 
        />
        <polygon 
          points={`40,180 ${pointsFollowups} 440,180`} 
          fill="url(#fuGrad)" 
        />

        {/* Trend Polylines */}
        <polyline 
          points={pointsTasks} 
          fill="none" 
          stroke="var(--clr-accent-primary)" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
        <polyline 
          points={pointsFollowups} 
          fill="none" 
          stroke="#805AD5" 
          strokeWidth="3" 
          strokeLinecap="round"
        />

        {/* Draw vertices */}
        {trend.map((t, idx) => {
          const x = (idx / (trend.length - 1)) * 400 + 40;
          const yT = 180 - (t.tasksCompleted / maxVal) * 140;
          const yF = 180 - (t.followupsCompleted / maxVal) * 140;

          return (
            <g key={idx}>
              <circle cx={x} cy={yT} r="4" fill="var(--clr-accent-primary)" stroke="#020917" strokeWidth="2" />
              <circle cx={x} cy={yF} r="4" fill="#805AD5" stroke="#020917" strokeWidth="2" />
              <text x={x} y="200" fill="var(--clr-text-muted)" fontSize="9" textAnchor="middle">{t.label}</text>
            </g>
          );
        })}

        {/* Value labels */}
        <text x="35" y="45" fill="var(--clr-text-muted)" fontSize="9" textAnchor="end">{maxVal}</text>
        <text x="35" y="115" fill="var(--clr-text-muted)" fontSize="9" textAnchor="end">{Math.round(maxVal / 2)}</text>
        <text x="35" y="185" fill="var(--clr-text-muted)" fontSize="9" textAnchor="end">0</text>
      </svg>
    );
  };

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }} className="print-container">
      
      {/* Filters & Export Panel (Hidden in print) */}
      <div 
        className="c-card filters-panel-hide" 
        style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          gap: "var(--sp-4)", 
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--sp-4)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
          {/* Start Date */}
          <div className="c-input" style={{ width: "150px", marginBottom: 0 }}>
            <label className="c-input__label" style={{ fontSize: "10px" }}>Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="c-input__field"
              style={{ height: "38px" }}
            />
          </div>

          {/* End Date */}
          <div className="c-input" style={{ width: "150px", marginBottom: 0 }}>
            <label className="c-input__label" style={{ fontSize: "10px" }}>End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="c-input__field"
              style={{ height: "38px" }}
            />
          </div>

          {/* Employee filter (SuperAdmin only) */}
          {isSuperAdmin && (
            <div className="c-input" style={{ width: "200px", marginBottom: 0 }}>
              <label className="c-input__label" style={{ fontSize: "10px" }}>Scoped Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="c-input__field"
                style={{ height: "38px", background: "var(--clr-bg-primary)" }}
              >
                <option value="">-- All Organization --</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Generate and Export triggers */}
        <div style={{ display: "flex", gap: "var(--sp-3)", marginTop: "auto", height: "38px" }}>
          <button 
            onClick={generateReport}
            className="c-btn c-btn--primary"
            style={{ padding: "0 var(--sp-4)" }}
          >
            Refresh KPIs
          </button>
          
          <button 
            onClick={() => handleExport("csv")}
            disabled={!report || exportLoading}
            className="c-btn c-btn--secondary"
            style={{ padding: "0 var(--sp-3)", gap: "var(--sp-1)" }}
            title="Download CSV"
          >
            <FileDown size={15} />
            <span>CSV</span>
          </button>

          <button 
            onClick={() => handleExport("excel")}
            disabled={!report || exportLoading}
            className="c-btn c-btn--secondary"
            style={{ padding: "0 var(--sp-3)", gap: "var(--sp-1)" }}
            title="Download Excel Sheet"
          >
            <FileSpreadsheet size={15} />
            <span>Excel</span>
          </button>

          <button 
            onClick={handlePrint}
            disabled={!report}
            className="c-btn c-btn--secondary"
            style={{ padding: "0 var(--sp-3)", gap: "var(--sp-1)" }}
            title="Print PDF Document"
          >
            <Printer size={15} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Categories Tab Selector */}
      <div className="filters-panel-hide" style={{ display: "flex", borderBottom: "1px solid var(--clr-border)", gap: "var(--sp-4)" }}>
        {(["Productivity", "Client", "Follow-Up", "Task"] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: "var(--sp-2) var(--sp-4)",
              background: "none",
              border: "none",
              borderBottom: category === cat ? "3px solid var(--clr-accent-primary)" : "3px solid transparent",
              color: category === cat ? "var(--clr-text-primary)" : "var(--clr-text-muted)",
              fontWeight: category === cat ? "var(--fw-bold)" : "var(--fw-medium)",
              cursor: "pointer",
              fontSize: "var(--fs-body-sm)"
            }}
            className="tab-btn"
          >
            {cat} Metrics
          </button>
        ))}
      </div>

      {/* Print-only Report Header (Visible only when exporting/printing) */}
      <div className="print-header-only" style={{ display: "none" }}>
        <h1 style={{ fontSize: "24px", color: "#00D2FF", marginBottom: "4px" }}>ALLURITE CRM REPORT SUMMARY</h1>
        <p style={{ fontSize: "12px", color: "#64748B", borderBottom: "2px solid #00D2FF", paddingBottom: "12px" }}>
          Report Category: {category} Reports | Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
        </p>
      </div>

      {/* Main KPI Dashboard View */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", gap: "var(--sp-4)" }}>
          <div style={{ width: "36px", height: "36px", border: "3px solid var(--clr-border)", borderTop: "3px solid var(--clr-accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <span style={{ color: "var(--clr-text-muted)" }}>Running analytics engines...</span>
        </div>
      ) : error ? (
        <div className="c-card" style={{ borderColor: "var(--clr-error)", textAlign: "center", padding: "var(--sp-8)" }}>
          <p style={{ color: "var(--clr-error)", fontWeight: "var(--fw-medium)" }}>{error}</p>
        </div>
      ) : !report ? (
        <div className="c-card" style={{ textAlign: "center", padding: "var(--sp-12)" }}>
          No data available. Adjust filters to compile reports.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
          
          {/* KPI Dashboard Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--sp-5)" }}>
            
            {/* Average Productivity Score Card */}
            <div className="c-card c-card--glow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--clr-text-muted)" }}>
                <span style={{ fontSize: "var(--fs-caption)", fontWeight: "var(--fw-bold)" }}>ORGANIZATION PRODUCTIVITY</span>
                <Award size={18} style={{ color: "var(--clr-warning)" }} />
              </div>
              <div>
                <span style={{ fontSize: "32px", fontWeight: "var(--fw-bold)", fontFamily: "Outfit" }}>
                  {report.kpis.avgProductivityScore}%
                </span>
              </div>
              {/* Score bar */}
              <div style={{ width: "100%", height: "6px", backgroundColor: "var(--clr-border)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${report.kpis.avgProductivityScore}%`, height: "100%", backgroundColor: "var(--clr-warning)" }} />
              </div>
            </div>

            {/* Task completions Card */}
            <div className="c-card c-card--glow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--clr-text-muted)" }}>
                <span style={{ fontSize: "var(--fs-caption)", fontWeight: "var(--fw-bold)" }}>TASK SUCCESS RATE</span>
                <CheckSquare size={18} style={{ color: "var(--clr-accent-primary)" }} />
              </div>
              <div>
                <span style={{ fontSize: "32px", fontWeight: "var(--fw-bold)", fontFamily: "Outfit" }}>
                  {report.kpis.tasks.total > 0 
                    ? Math.round((report.kpis.tasks.completed / report.kpis.tasks.total) * 100)
                    : 100}%
                </span>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                  {report.kpis.tasks.completed} completed of {report.kpis.tasks.total} assigned
                </div>
              </div>
            </div>

            {/* Follow-up success rate Card */}
            <div className="c-card c-card--glow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--clr-text-muted)" }}>
                <span style={{ fontSize: "var(--fs-caption)", fontWeight: "var(--fw-bold)" }}>FOLLOW-UP ACCURACY</span>
                <Clock size={18} style={{ color: "#805AD5" }} />
              </div>
              <div>
                <span style={{ fontSize: "32px", fontWeight: "var(--fw-bold)", fontFamily: "Outfit" }}>
                  {report.kpis.followups.total > 0 
                    ? Math.round((report.kpis.followups.completed / report.kpis.followups.total) * 100)
                    : 100}%
                </span>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                  {report.kpis.followups.completed} met of {report.kpis.followups.total} scheduled
                </div>
              </div>
            </div>

            {/* Clients conversion rate Card */}
            <div className="c-card c-card--glow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--clr-text-muted)" }}>
                <span style={{ fontSize: "var(--fs-caption)", fontWeight: "var(--fw-bold)" }}>LEADS CONVERSION RATE</span>
                <Users size={18} style={{ color: "var(--clr-success)" }} />
              </div>
              <div>
                <span style={{ fontSize: "32px", fontWeight: "var(--fw-bold)", fontFamily: "Outfit" }}>
                  {report.kpis.clients.conversionRate}%
                </span>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                  {report.kpis.clients.active} converted of {report.kpis.clients.total} leads
                </div>
              </div>
            </div>

          </div>

          {/* Grid Layout: Visual charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "var(--sp-6)", alignItems: "flex-start" }} className="grid-print-split">
            
            {/* Chart Left Panel: Trend lines and details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
              {/* Trend Plot */}
              <section className="c-card">
                <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", marginBottom: "var(--sp-4)" }}>
                  Activities Completion Trend (Timeline)
                </h3>
                
                {renderTrendSVG()}

                {/* Legend */}
                <div style={{ display: "flex", gap: "var(--sp-4)", justifyContent: "center", marginTop: "var(--sp-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                    <div style={{ width: "12px", height: "12px", backgroundColor: "var(--clr-accent-primary)", borderRadius: "2px" }} />
                    <span style={{ color: "var(--clr-text-muted)" }}>Tasks Completed</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                    <div style={{ width: "12px", height: "12px", backgroundColor: "#805AD5", borderRadius: "2px" }} />
                    <span style={{ color: "var(--clr-text-muted)" }}>Followups Met</span>
                  </div>
                </div>
              </section>

              {/* Scoped Details table / list */}
              {category === "Productivity" && (
                <section className="c-card">
                  <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", marginBottom: "var(--sp-4)" }}>
                    Staff Productivity Scoring Details
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--clr-border)", color: "var(--clr-text-muted)", fontSize: "11px" }}>
                          <th style={{ textAlign: "left", padding: "8px" }}>Name</th>
                          <th style={{ textAlign: "left", padding: "8px" }}>Department</th>
                          <th style={{ textAlign: "center", padding: "8px" }}>Tasks Done</th>
                          <th style={{ textAlign: "center", padding: "8px" }}>Followups Done</th>
                          <th style={{ textAlign: "right", padding: "8px" }}>Score (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.rawMetrics?.productivityDetails?.map((staff) => (
                          <tr key={staff.employeeId} style={{ borderBottom: "1px solid var(--clr-border)", fontSize: "12px" }}>
                            <td style={{ padding: "8px", fontWeight: "var(--fw-medium)" }}>{staff.name}</td>
                            <td style={{ padding: "8px", color: "var(--clr-text-muted)" }}>{staff.department || "General"}</td>
                            <td style={{ padding: "8px", textAlign: "center" }}>{staff.tasksCompleted}</td>
                            <td style={{ padding: "8px", textAlign: "center" }}>{staff.followupsCompleted}</td>
                            <td style={{ padding: "8px", textAlign: "right", fontWeight: "var(--fw-bold)", color: "var(--clr-warning)" }}>
                              {staff.productivityScore}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>

            {/* Chart Right Panel: Donut distribution and bar comparisons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
              {/* Task Status distribution (Bar scale) */}
              <section className="c-card">
                <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", marginBottom: "var(--sp-4)" }}>
                  Task Status Allocation
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                  {report.chartsData.taskStatuses.map(item => {
                    const pct = report.kpis.tasks.total > 0 
                      ? Math.round((item.value / report.kpis.tasks.total) * 100) 
                      : 0;
                    return (
                      <div key={item.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                          <span>{item.name}</span>
                          <span style={{ color: "var(--clr-text-muted)" }}>{item.value} ({pct}%)</span>
                        </div>
                        <div style={{ width: "100%", height: "8px", backgroundColor: "var(--clr-border)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", backgroundColor: item.name === "Completed" ? "var(--clr-success)" : item.name === "Overdue" ? "var(--clr-error)" : "var(--clr-accent-primary)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Client Lead Source Donut simulator (percentages lists) */}
              <section className="c-card">
                <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", marginBottom: "var(--sp-4)" }}>
                  Lead Acquisition Channel Distribution
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                  {report.chartsData.sources.length === 0 ? (
                    <div style={{ color: "var(--clr-text-muted)", fontSize: "12px", textAlign: "center", padding: "16px" }}>
                      No client leads registered in this range
                    </div>
                  ) : (
                    report.chartsData.sources.map(src => {
                      const pct = report.kpis.clients.total > 0
                        ? Math.round((src.value / report.kpis.clients.total) * 100)
                        : 0;
                      return (
                        <div key={src.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--clr-accent-primary)" }} />
                            <span>{src.name}</span>
                          </span>
                          <span style={{ fontWeight: "var(--fw-bold)" }}>{src.value} leads ({pct}%)</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Follow-up outcomes */}
              <section className="c-card">
                <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", marginBottom: "var(--sp-4)" }}>
                  Follow-Up Outcomes Allocation
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                  {report.chartsData.fuStatuses.map(item => {
                    const pct = report.kpis.followups.total > 0
                      ? Math.round((item.value / report.kpis.followups.total) * 100)
                      : 0;
                    return (
                      <div key={item.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                          <span>{item.name}</span>
                          <span style={{ color: "var(--clr-text-muted)" }}>{item.value} ({pct}%)</span>
                        </div>
                        <div style={{ width: "100%", height: "8px", backgroundColor: "var(--clr-border)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", backgroundColor: item.name === "Completed" ? "var(--clr-success)" : item.name === "Missed" ? "var(--clr-error)" : "#805AD5" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

          </div>

        </div>
      )}

      {/* Print PDF document styling rules */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media print {
          body {
            background: #FFFFFF !important;
            color: #000000 !important;
          }
          .filters-panel-hide {
            display: none !important;
          }
          .print-header-only {
            display: block !important;
            margin-bottom: 20px !important;
          }
          .c-card {
            border: 1px solid #CBD5E1 !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
          }
          .grid-print-split {
            display: block !important;
          }
          .grid-print-split > * {
            width: 100% !important;
            margin-bottom: 20px !important;
          }
          .svg-trend-chart text {
            fill: #000000 !important;
          }
          .svg-trend-chart line, .svg-trend-chart polyline {
            stroke: #000000 !important;
          }
          header, sidebar, aside, nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}} />
    </main>
  );
}
