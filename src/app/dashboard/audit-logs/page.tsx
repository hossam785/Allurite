"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../layout";
import { 
  ShieldAlert, 
  History, 
  Search, 
  Sliders, 
  User, 
  Lock, 
  Database, 
  Briefcase, 
  Users2, 
  Calendar, 
  Download,
  AlertTriangle,
  ServerCrash,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Fingerprint
} from "lucide-react";

interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  performedEmail: string;
  performedName?: string;
  performedRole?: string;
  ipAddress?: string;
  deviceInfo?: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  createdAt: string;
}

export default function AuditLogsPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Tab State
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "user" | "security">("overview");

  // Logs and Filters State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Filter values
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [severity, setSeverity] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Statistics for Overview
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    uniqueUsers: 0
  });

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        search,
        action,
        entityType,
        severity: activeTab === "security" ? (severity || "High,Critical") : severity,
        userEmail,
        startDate,
        endDate
      });

      // Filter empty parameters
      const res = await fetch(`/api/v1/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load audit logs");
      
      setLogs(json.data);
      setTotalPages(json.pagination.pages || 1);
      setTotalLogs(json.pagination.total || 0);

      // Simple dynamic stats calculations based on retrieved / total parameters
      if (activeTab === "overview") {
        const uniqueUsers = new Set(json.data.map((l: AuditLog) => l.performedEmail)).size;
        
        // Fetch a broader set for stats or calculate from current response
        const criticalCount = json.data.filter((l: AuditLog) => l.severity === "Critical").length;
        const highCount = json.data.filter((l: AuditLog) => l.severity === "High").length;
        const mediumCount = json.data.filter((l: AuditLog) => l.severity === "Medium").length;
        const lowCount = json.data.filter((l: AuditLog) => l.severity === "Low").length;

        setStats({
          total: json.pagination.total || json.data.length,
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
          uniqueUsers: Math.max(1, uniqueUsers)
        });
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchLogs();
    }
  }, [page, activeTab, search, action, entityType, severity, userEmail, startDate, endDate, isSuperAdmin]);

  // Reset filters
  const handleResetFilters = () => {
    setSearch("");
    setAction("");
    setEntityType("");
    setSeverity("");
    setUserEmail("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Severity style helper
  const getSeverityStyle = (level: string) => {
    switch (level) {
      case "Critical":
        return { color: "var(--clr-error)", bg: "rgba(229, 62, 62, 0.15)", border: "1px solid rgba(229, 62, 62, 0.3)" };
      case "High":
        return { color: "#DD6B20", bg: "rgba(221, 107, 32, 0.15)", border: "1px solid rgba(221, 107, 32, 0.3)" };
      case "Medium":
        return { color: "#D69E2E", bg: "rgba(214, 158, 46, 0.15)", border: "1px solid rgba(214, 158, 46, 0.3)" };
      default:
        return { color: "var(--clr-success)", bg: "rgba(56, 161, 105, 0.15)", border: "1px solid rgba(56, 161, 105, 0.3)" };
    }
  };

  // Action category icon helper
  const getActionIcon = (actionStr: string) => {
    const act = actionStr.toUpperCase();
    if (act.includes("AUTH") || act.includes("LOGIN") || act.includes("SECURITY")) {
      return <Lock size={15} style={{ color: "#DD6B20" }} />;
    }
    if (act.includes("BACKUP")) {
      return <Database size={15} style={{ color: "var(--clr-accent-primary)" }} />;
    }
    if (act.includes("EMPLOYEE") || act.includes("ROLE") || act.includes("DEPARTMENT")) {
      return <Users2 size={15} style={{ color: "#805AD5" }} />;
    }
    if (act.includes("CLIENT")) {
      return <User size={15} style={{ color: "var(--clr-success)" }} />;
    }
    return <Fingerprint size={15} style={{ color: "var(--clr-text-muted)" }} />;
  };

  // Export logs to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    const headers = ["Timestamp", "Performed By", "Role", "Severity", "Action", "Entity Type", "Entity ID", "IP Address", "Browser Info", "Details"];
    const rows = logs.map(log => [
      new Date(log.createdAt).toISOString(),
      log.performedEmail,
      log.performedRole || "",
      log.severity,
      log.action,
      log.entityType,
      log.entityId || "",
      log.ipAddress || "",
      `"${(log.deviceInfo || "").replace(/"/g, '""')}"`,
      `"${(log.details || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit-trail-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If Employee, block access
  if (!isSuperAdmin) {
    return (
      <main style={{ flex: 1, padding: "var(--sp-12)", display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: "var(--sp-4)" }}>
        <ServerCrash size={48} style={{ color: "var(--clr-error)" }} />
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "var(--fs-h2)", color: "var(--clr-text-primary)", marginBottom: "var(--sp-1)" }}>
            Access Denied (403 Forbidden)
          </h2>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            Only System Super Administrators are authorized to view security audit logs and event tracking dashboards.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      
      {/* Search and Filters panel */}
      <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "var(--sp-4)" }}>
          
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--clr-text-muted)" }} />
            <input 
              type="text" 
              placeholder="Search actions, emails, details..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ paddingLeft: "36px" }}
            />
          </div>

          <div>
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ background: "var(--clr-bg-primary)" }}
            >
              <option value="">-- All Entities --</option>
              <option value="User">User Account</option>
              <option value="Employee">Employee Profile</option>
              <option value="Client">Client Portfolio</option>
              <option value="Follow-Up">Follow-Up Schedule</option>
              <option value="Task">Task Board</option>
              <option value="File">Storage File</option>
              <option value="Backup">Database Backup</option>
              <option value="Settings">System Settings</option>
            </select>
          </div>

          <div>
            <select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ background: "var(--clr-bg-primary)" }}
              disabled={activeTab === "security"}
            >
              <option value="">-- All Severities --</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="c-input__field"
            />
          </div>

          <div>
            <input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="c-input__field"
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--sp-2)", borderTop: "1px solid var(--clr-border)" }}>
          <div style={{ display: "flex", gap: "var(--sp-4)" }}>
            <input
              type="text"
              placeholder="Filter by email: e.g. admin@..."
              value={userEmail}
              onChange={(e) => { setUserEmail(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ width: "240px", height: "32px", fontSize: "12px" }}
            />
            <input
              type="text"
              placeholder="Filter by action: e.g. AUTH_LOGIN..."
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ width: "240px", height: "32px", fontSize: "12px" }}
            />
          </div>

          <div style={{ display: "flex", gap: "var(--sp-3)" }}>
            <button 
              onClick={handleResetFilters}
              className="c-btn c-btn--secondary"
              style={{ padding: "6px 12px", fontSize: "11px", gap: "4px" }}
            >
              <Sliders size={13} />
              <span>Reset Filters</span>
            </button>
            <button 
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="c-btn c-btn--secondary"
              style={{ padding: "6px 12px", fontSize: "11px", gap: "4px" }}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tabs navigation */}
      <div style={{ display: "flex", gap: "var(--sp-2)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "1px" }}>
        <button 
          onClick={() => { setActiveTab("overview"); handleResetFilters(); }}
          className={`tab-btn-header ${activeTab === "overview" ? "active" : ""}`}
        >
          <TrendingUp size={15} />
          <span>Dashboard Overview</span>
        </button>
        <button 
          onClick={() => { setActiveTab("timeline"); handleResetFilters(); }}
          className={`tab-btn-header ${activeTab === "timeline" ? "active" : ""}`}
        >
          <History size={15} />
          <span>Activity Timeline</span>
        </button>
        <button 
          onClick={() => { setActiveTab("user"); handleResetFilters(); }}
          className={`tab-btn-header ${activeTab === "user" ? "active" : ""}`}
        >
          <User size={15} />
          <span>User Activity Explorer</span>
        </button>
        <button 
          onClick={() => { setActiveTab("security"); handleResetFilters(); }}
          className={`tab-btn-header ${activeTab === "security" ? "active" : ""}`}
        >
          <ShieldAlert size={15} />
          <span>Security Audit Log</span>
        </button>

        <style jsx>{`
          .tab-btn-header {
            display: flex;
            align-items: center;
            gap: var(--sp-2);
            padding: var(--sp-3) var(--sp-5);
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            color: var(--clr-text-muted);
            font-size: var(--fs-body-sm);
            font-weight: var(--fw-medium);
            cursor: pointer;
            transition: var(--transition-fast);
          }
          .tab-btn-header:hover {
            color: var(--clr-text-primary);
          }
          .tab-btn-header.active {
            color: var(--clr-accent-primary);
            border-bottom-color: var(--clr-accent-primary);
            font-weight: var(--fw-bold);
          }
        `}</style>
      </div>

      {/* Dynamic Tab Contents */}
      
      {/* 1. Dashboard Overview */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "var(--sp-6)" }}>
            <div className="c-card c-card--glow">
              <span style={{ fontSize: "10px", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>TOTAL EVENTS MONITORED</span>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block", marginTop: "4px" }}>{stats.total} Logs</span>
            </div>

            <div className="c-card c-card--glow" style={{ borderColor: "rgba(229, 62, 62, 0.4)" }}>
              <span style={{ fontSize: "10px", color: "var(--clr-error)", fontWeight: "var(--fw-bold)" }}>CRITICAL ANOMALIES</span>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block", marginTop: "4px", color: "var(--clr-error)" }}>{stats.critical} Alerts</span>
            </div>

            <div className="c-card c-card--glow" style={{ borderColor: "rgba(221, 107, 32, 0.4)" }}>
              <span style={{ fontSize: "10px", color: "#DD6B20", fontWeight: "var(--fw-bold)" }}>HIGH SEVERITY ACTIONS</span>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block", marginTop: "4px", color: "#DD6B20" }}>{stats.high} Events</span>
            </div>

            <div className="c-card c-card--glow">
              <span style={{ fontSize: "10px", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>ACTIVE ADMINS/USERS</span>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block", marginTop: "4px" }}>{stats.uniqueUsers} Users</span>
            </div>
          </div>

          {/* Quick list of critical events */}
          <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            <div style={{ borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
              <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", margin: 0 }}>Recent Activity Stream</h3>
            </div>
            
            <div style={{ border: "1px solid var(--clr-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(4, 13, 33, 0.4)", borderBottom: "1px solid var(--clr-border)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                    <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Severity</th>
                    <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Action Code</th>
                    <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>User Email</th>
                    <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Details</th>
                    <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>IP / Client Agent</th>
                    <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                        Loading overview telemetry stream...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                        No audit logs captured.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => {
                      const sev = getSeverityStyle(log.severity);
                      return (
                        <tr key={log._id} style={{ borderBottom: "1px solid var(--clr-border)", fontSize: "12px" }}>
                          <td style={{ padding: "10px var(--sp-3)" }}>
                            <span 
                              style={{ 
                                display: "inline-block", 
                                color: sev.color, 
                                backgroundColor: sev.bg, 
                                border: sev.border,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: "bold"
                              }}
                            >
                              {log.severity}
                            </span>
                          </td>
                          <td style={{ padding: "10px var(--sp-3)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {getActionIcon(log.action)}
                              <span>{log.action}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)" }}>{log.performedEmail}</td>
                          <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-primary)" }}>{log.details || "-"}</td>
                          <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)", fontSize: "11px" }}>
                            <strong>{log.ipAddress}</strong> <span style={{ opacity: 0.7 }}>({log.deviceInfo?.split(" ")[0]})</span>
                          </td>
                          <td style={{ padding: "10px var(--sp-3)", textAlign: "right", color: "var(--clr-text-muted)" }}>{new Date(log.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)" }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="c-btn c-btn--secondary"
                  style={{ padding: "4px 8px" }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ alignSelf: "center", fontSize: "12px", color: "var(--clr-text-muted)" }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="c-btn c-btn--secondary"
                  style={{ padding: "4px 8px" }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* 2. Activity Timeline */}
      {activeTab === "timeline" && (
        <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          <h2 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
            Vertical Chronological System Activity Timeline
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", position: "relative", paddingLeft: "var(--sp-8)", marginTop: "var(--sp-4)" }}>
            <div style={{ position: "absolute", left: "15px", top: "10px", bottom: "10px", width: "2px", backgroundColor: "var(--clr-border)" }} />

            {loading ? (
              <div style={{ padding: "var(--sp-12)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                Loading activity logs timeline...
              </div>
            ) : logs.length === 0 ? (
              <div style={{ padding: "var(--sp-12)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                No events captured for timeline.
              </div>
            ) : (
              logs.map((log) => {
                const sev = getSeverityStyle(log.severity);
                return (
                  <div key={log._id} style={{ position: "relative", display: "flex", gap: "var(--sp-4)", backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid var(--clr-border)", borderRadius: "var(--radius-md)", padding: "var(--sp-4)" }}>
                    {/* Circle marker */}
                    <div 
                      style={{ 
                        position: "absolute", 
                        left: "-25px", 
                        top: "50%", 
                        transform: "translateY(-50%)", 
                        width: "16px", 
                        height: "16px", 
                        borderRadius: "50%", 
                        backgroundColor: sev.color,
                        boxShadow: `0 0 10px ${sev.color}`,
                        border: "3px solid var(--clr-bg-primary)",
                        zIndex: 10
                      }} 
                    />
                    
                    {/* Icon container */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "var(--radius-sm)", backgroundColor: sev.bg, border: sev.border, flexShrink: 0 }}>
                      {getActionIcon(log.action)}
                    </div>

                    {/* Details content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "var(--fw-bold)", fontSize: "13px", color: "var(--clr-text-primary)" }}>{log.action}</span>
                        <span style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: "6px 0", fontSize: "12px", color: "var(--clr-text-primary)" }}>{log.details}</p>
                      <div style={{ display: "flex", gap: "var(--sp-4)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                        <span>Performed By: <strong>{log.performedEmail}</strong> ({log.performedRole || "Staff"})</span>
                        <span>IP Address: <strong>{log.ipAddress}</strong></span>
                        <span>Device: <span style={{ opacity: 0.8 }}>{log.deviceInfo}</span></span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)", marginTop: "var(--sp-4)" }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="c-btn c-btn--secondary"
                style={{ padding: "4px 8px" }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ alignSelf: "center", fontSize: "12px", color: "var(--clr-text-muted)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="c-btn c-btn--secondary"
                style={{ padding: "4px 8px" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}

      {/* 3. User Activity Explorer */}
      {activeTab === "user" && (
        <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          <div style={{ borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", margin: 0 }}>
              User Action Analytics & Audit Logs
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <span style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>Filter by Email:</span>
              <input
                type="email"
                placeholder="e.g. youssef@allurite.com"
                value={userEmail}
                onChange={(e) => { setUserEmail(e.target.value); setPage(1); }}
                className="c-input__field"
                style={{ width: "240px", height: "30px", fontSize: "12px" }}
              />
            </div>
          </div>

          <div style={{ border: "1px solid var(--clr-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: "var(--sp-2)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(4, 13, 33, 0.4)", borderBottom: "1px solid var(--clr-border)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                  <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>User Name</th>
                  <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Role</th>
                  <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Email Address</th>
                  <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Action Code</th>
                  <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Event Details</th>
                  <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                      Loading user activity logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                      No actions logged for the selected user email.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log._id} style={{ borderBottom: "1px solid var(--clr-border)", fontSize: "12px" }}>
                      <td style={{ padding: "10px var(--sp-3)", fontWeight: "var(--fw-bold)" }}>{log.performedName || log.performedEmail.split("@")[0]}</td>
                      <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-accent-primary)" }}>{log.performedRole || "Staff"}</td>
                      <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)" }}>{log.performedEmail}</td>
                      <td style={{ padding: "10px var(--sp-3)" }}>
                        <span className="c-badge" style={{ textTransform: "none" }}>{log.action}</span>
                      </td>
                      <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)" }}>{log.details || "-"}</td>
                      <td style={{ padding: "10px var(--sp-3)", textAlign: "right", color: "var(--clr-text-muted)" }}>{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)" }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="c-btn c-btn--secondary"
                style={{ padding: "4px 8px" }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ alignSelf: "center", fontSize: "12px", color: "var(--clr-text-muted)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="c-btn c-btn--secondary"
                style={{ padding: "4px 8px" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. Security Events Page */}
      {activeTab === "security" && (
        <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          <div style={{ borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <ShieldAlert size={18} style={{ color: "var(--clr-error)" }} />
              <h2 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-error)", margin: 0 }}>
                High-Severity and Security Log Events
              </h2>
            </div>
            <span style={{ fontSize: "10px", color: "var(--clr-text-muted)", backgroundColor: "rgba(229,62,62,0.1)", border: "1px dashed var(--clr-error)", padding: "2px 8px", borderRadius: "4px" }}>
              High & Critical Events Locked View
            </span>
          </div>

          <div style={{ border: "1px solid var(--clr-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: "var(--sp-2)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(229, 62, 62, 0.03)", borderBottom: "1px solid var(--clr-border)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                  <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Severity</th>
                  <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Event Code</th>
                  <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Operator Email</th>
                  <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Anomalies Details</th>
                  <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>Source IP Address</th>
                  <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>Occurred At</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                      Loading critical security events logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                      No critical anomalies or high-severity events found in the audit trail.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => {
                    const sev = getSeverityStyle(log.severity);
                    return (
                      <tr key={log._id} style={{ borderBottom: "1px solid var(--clr-border)", fontSize: "12px", backgroundColor: "rgba(229, 62, 62, 0.01)" }}>
                        <td style={{ padding: "10px var(--sp-3)" }}>
                          <span 
                            style={{ 
                              color: sev.color, 
                              backgroundColor: sev.bg, 
                              border: sev.border,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: "bold"
                            }}
                          >
                            {log.severity}
                          </span>
                        </td>
                        <td style={{ padding: "10px var(--sp-3)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <AlertTriangle size={14} style={{ color: sev.color }} />
                            <span style={{ fontWeight: "bold", color: "var(--clr-text-primary)" }}>{log.action}</span>
                          </div>
                        </td>
                        <td style={{ padding: "10px var(--sp-3)" }}>{log.performedEmail}</td>
                        <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-primary)" }}>{log.details || "-"}</td>
                        <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)" }}>
                          <strong>{log.ipAddress}</strong>
                        </td>
                        <td style={{ padding: "10px var(--sp-3)", textAlign: "right", color: "var(--clr-text-muted)" }}>{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)" }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="c-btn c-btn--secondary"
                style={{ padding: "4px 8px" }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ alignSelf: "center", fontSize: "12px", color: "var(--clr-text-muted)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="c-btn c-btn--secondary"
                style={{ padding: "4px 8px" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}

    </main>
  );
}
