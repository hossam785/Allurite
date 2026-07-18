"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../layout";
import { useLanguage } from "@/context/LanguageContext";
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
  const { t, isRtl } = useLanguage();
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

  const translateAction = (actionStr: string) => {
    const mapping: Record<string, string> = {
      "SETTINGS_UPDATE": "تحديث الإعدادات",
      "AUTH_LOGIN_SUCCESS": "تسجيل دخول ناجح",
      "AUTH_LOGIN_FAILED": "فشل تسجيل الدخول",
      "AUTH_LOGOUT": "تسجيل خروج من النظام",
      "EMPLOYEE_CREATE": "إضافة موظف جديد",
      "EMPLOYEE_UPDATE": "تعديل بيانات موظف",
      "EMPLOYEE_DELETE": "تعطيل حساب موظف",
      "CLIENT_CREATE": "إنشاء ملف عميل",
      "CLIENT_UPDATE": "تعديل بيانات عميل",
      "CLIENT_DELETE": "حذف ملف عميل",
      "TASK_CREATE": "إنشاء مهمة جديدة",
      "TASK_UPDATE": "تحديث حالة/تفاصيل مهمة",
      "TASK_DELETE": "حذف مهمة",
      "FILE_UPLOAD": "رفع ملف مرفق جديد",
      "FILE_DELETE": "حذف ملف مرفق",
      "BACKUP_CREATE": "إنشاء نسخة احتياطية",
      "BACKUP_RESTORE": "استعادة قاعدة البيانات",
      "BACKUP_DELETE": "حذف نسخة احتياطية",
      "ROLE_UPDATE": "تحديث صلاحيات الأدوار",
      "DEPARTMENT_CREATE": "إنشاء قسم جديد",
      "DEPARTMENT_UPDATE": "تعديل بيانات قسم"
    };
    return mapping[actionStr] || actionStr;
  };

  const translateEntityType = (entity: string) => {
    const mapping: Record<string, string> = {
      "User": "مستخدم",
      "Employee": "موظف",
      "Client": "عميل",
      "Follow-Up": "متابعة",
      "Task": "مهمة",
      "File": "ملف مرفق",
      "Backup": "نسخة احتياطية",
      "Settings": "إعدادات النظام",
      "Role": "الصلاحيات"
    };
    return mapping[entity] || entity;
  };

  const translateDetails = (details: string) => {
    if (!details) return "-";
    let t = details;
    t = t.replace(/User theme preference modified to light/gi, "تم تغيير سمة المظهر للمستخدم إلى الوضع الفاتح");
    t = t.replace(/User theme preference modified to dark/gi, "تم تغيير سمة المظهر للمستخدم إلى الوضع الداكن");
    t = t.replace(/Successful user authentication login:/gi, "تسجيل دخول ناجح للمستخدم:");
    t = t.replace(/User successfully logged out:/gi, "تم تسجيل خروج المستخدم بنجاح:");
    t = t.replace(/Failed login attempt for user:/gi, "محاولة تسجيل دخول فاشلة للمستخدم:");
    t = t.replace(/System settings modified by administrator/gi, "تم تعديل إعدادات النظام بواسطة المدير");
    t = t.replace(/New department registered:/gi, "تم تسجيل قسم جديد باسم:");
    t = t.replace(/Department details modified:/gi, "تم تعديل تفاصيل القسم:");
    t = t.replace(/Permissions for role/gi, "صلاحيات الدور");
    t = t.replace(/updated successfully/gi, "تم تحديثها بنجاح");
    t = t.replace(/Created new employee profile:/gi, "تم إنشاء ملف موظف جديد:");
    t = t.replace(/Updated employee profile:/gi, "تم تحديث ملف الموظف:");
    t = t.replace(/Created new client profile:/gi, "تم إنشاء ملف عميل جديد:");
    t = t.replace(/Updated client profile:/gi, "تم تحديث ملف العميل:");
    t = t.replace(/Created new task:/gi, "تم إنشاء مهمة جديدة:");
    t = t.replace(/Updated task details\/status:/gi, "تم تحديث تفاصيل/حالة المهمة:");
    t = t.replace(/Uploaded new document attachment:/gi, "تم رفع مستند مرفق جديد:");
    t = t.replace(/Created new database backup snapshot:/gi, "تم إنشاء نسخة احتياطية لقاعدة البيانات:");
    t = t.replace(/Restored database backup snapshot:/gi, "تم استعادة نسخة احتياطية لقاعدة البيانات:");
    t = t.replace(/Deleted database backup snapshot:/gi, "تم حذف نسخة احتياطية لقاعدة البيانات:");
    return t;
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
            تم رفض الوصول (403 غير مسموح)
          </h2>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            المشرفين العامين على النظام فقط مخول لهم بالاطلاع على سجلات التدقيق والمتابعة الأمنية للنظام.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="responsive-main">
      
      {/* Search and Filters panel */}
      <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
        <div className="responsive-audit-grid">
          
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", right: isRtl ? "12px" : "auto", left: isRtl ? "auto" : "12px", top: "50%", transform: "translateY(-50%)", color: "var(--clr-text-muted)" }} />
            <input 
              type="text" 
              placeholder="ابحث في العمليات، البريد الإلكتروني، التفاصيل..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ paddingRight: isRtl ? "36px" : "12px", paddingLeft: isRtl ? "12px" : "36px", textAlign: "right" }}
            />
          </div>

          <div>
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ background: "var(--clr-bg-primary)" }}
            >
              <option value="">-- كل الكيانات --</option>
              <option value="User">حساب مستخدم</option>
              <option value="Employee">ملف موظف</option>
              <option value="Client">ملف عميل</option>
              <option value="Follow-Up">جدول متابعة</option>
              <option value="Task">لوحة المهام</option>
              <option value="File">ملف مرفق</option>
              <option value="Backup">نسخة احتياطية</option>
              <option value="Settings">إعدادات النظام</option>
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
              <option value="">-- كل المستويات --</option>
              <option value="Low">منخفضة</option>
              <option value="Medium">متوسطة</option>
              <option value="High">مرتفعة</option>
              <option value="Critical">حرجة</option>
            </select>
          </div>

          <div>
            <input
              type={startDate ? "date" : "text"}
              placeholder="تاريخ البدء"
              value={startDate}
              onFocus={(e) => { e.target.type = "date"; }}
              onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ textAlign: "right", direction: "rtl" }}
            />
          </div>

          <div>
            <input
              type={endDate ? "date" : "text"}
              placeholder="تاريخ الانتهاء"
              value={endDate}
              onFocus={(e) => { e.target.type = "date"; }}
              onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ textAlign: "right", direction: "rtl" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--sp-2)", borderTop: "1px solid var(--clr-border)" }}>
          <div style={{ display: "flex", gap: "var(--sp-4)" }}>
            <input
              type="text"
              placeholder="البحث بالبريد الإلكتروني..."
              value={userEmail}
              onChange={(e) => { setUserEmail(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ width: "240px", height: "32px", fontSize: "12px", textAlign: "right" }}
            />
            <input
              type="text"
              placeholder="البحث بنوع العملية..."
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ width: "240px", height: "32px", fontSize: "12px", textAlign: "right" }}
            />
          </div>

          <div style={{ display: "flex", gap: "var(--sp-3)" }}>
            <button 
              onClick={handleResetFilters}
              className="c-btn c-btn--secondary"
              style={{ padding: "6px 12px", fontSize: "11px", gap: "4px" }}
            >
              <Sliders size={13} />
              <span>إعادة تعيين الفلاتر</span>
            </button>
            <button 
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="c-btn c-btn--secondary"
              style={{ padding: "6px 12px", fontSize: "11px", gap: "4px" }}
            >
              <Download size={13} />
              <span>تصدير CSV</span>
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
          <span>نظرة عامة على لوحة التحكم</span>
        </button>
        <button 
          onClick={() => { setActiveTab("timeline"); handleResetFilters(); }}
          className={`tab-btn-header ${activeTab === "timeline" ? "active" : ""}`}
        >
          <History size={15} />
          <span>الخط الزمني للأنشطة</span>
        </button>
        <button 
          onClick={() => { setActiveTab("user"); handleResetFilters(); }}
          className={`tab-btn-header ${activeTab === "user" ? "active" : ""}`}
        >
          <User size={15} />
          <span>مستكشف أنشطة المستخدمين</span>
        </button>
        <button 
          onClick={() => { setActiveTab("security"); handleResetFilters(); }}
          className={`tab-btn-header ${activeTab === "security" ? "active" : ""}`}
        >
          <ShieldAlert size={15} />
          <span>سجل التدقيق الأمني</span>
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
          <div className="responsive-grid-3" style={{ textAlign: "right" }}>
            <div className="c-card c-card--glow">
              <span style={{ fontSize: "10px", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>إجمالي العمليات المراقبة</span>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block", marginTop: "4px" }}>{stats.total} سجل</span>
            </div>

            <div className="c-card c-card--glow" style={{ borderColor: "rgba(229, 62, 62, 0.4)" }}>
              <span style={{ fontSize: "10px", color: "var(--clr-error)", fontWeight: "var(--fw-bold)" }}>تنبيهات أمنية حرجة</span>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block", marginTop: "4px", color: "var(--clr-error)" }}>{stats.critical} تنبيه</span>
            </div>

            <div className="c-card c-card--glow" style={{ borderColor: "rgba(221, 107, 32, 0.4)" }}>
              <span style={{ fontSize: "10px", color: "#DD6B20", fontWeight: "var(--fw-bold)" }}>عمليات عالية الأهمية</span>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block", marginTop: "4px", color: "#DD6B20" }}>{stats.high} حدث</span>
            </div>

            <div className="c-card c-card--glow">
              <span style={{ fontSize: "10px", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>المشرفين والمستخدمين النشطين</span>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block", marginTop: "4px" }}>{stats.uniqueUsers} مستخدم</span>
            </div>
          </div>

          {/* Quick list of critical events */}
          <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
            <div style={{ borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
              <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", margin: 0 }}>شريط العمليات الأخير</h3>
            </div>
            
            <div style={{ border: "1px solid var(--clr-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <div className="c-table-container">
                <table className="c-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "rgba(4, 13, 33, 0.4)", borderBottom: "2px solid var(--clr-border)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                      <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>مستوى الخطورة</th>
                      <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>رمز العملية</th>
                      <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>البريد الإلكتروني</th>
                      <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>التفاصيل</th>
                      <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>عنوان IP / المتصفح</th>
                      <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                          جاري تحميل سجلات التدقيق والنظام...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                          لم يتم تسجيل أي عمليات حالياً.
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => {
                        const sev = getSeverityStyle(log.severity);
                        
                        let severityLabel: string = log.severity;
                        if (log.severity === "Low") severityLabel = "منخفضة";
                        else if (log.severity === "Medium") severityLabel = "متوسطة";
                        else if (log.severity === "High") severityLabel = "مرتفعة";
                        else if (log.severity === "Critical") severityLabel = "حرجة";

                        return (
                          <tr key={log._id} style={{ borderBottom: "1px solid var(--clr-border)", fontSize: "12px" }}>
                            <td style={{ padding: "10px var(--sp-3)", textAlign: "right" }}>
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
                                {severityLabel}
                              </span>
                            </td>
                            <td style={{ padding: "10px var(--sp-3)", textAlign: "right" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {getActionIcon(log.action)}
                                <span>{translateAction(log.action)}</span>
                              </div>
                            </td>
                            <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)", textAlign: "right" }}>{log.performedEmail}</td>
                            <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-primary)", textAlign: "right" }}>{translateDetails(log.details || "")}</td>
                            <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)", fontSize: "11px", textAlign: "right" }}>
                              <strong>{log.ipAddress}</strong> <span style={{ opacity: 0.7 }}>({log.deviceInfo?.split(" ")[0]})</span>
                            </td>
                            <td style={{ padding: "10px var(--sp-3)", textAlign: "left", color: "var(--clr-text-muted)" }}>{new Date(log.createdAt).toLocaleString("ar-EG")}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
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
                  الصفحة {page} من {totalPages}
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
          <h2 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", textAlign: "right" }}>
            الخط الزمني الرأسي المتسلسل لعمليات النظام
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", position: "relative", paddingRight: "var(--sp-8)", paddingLeft: 0, marginTop: "var(--sp-4)", textAlign: "right" }}>
            <div style={{ position: "absolute", right: "15px", left: "auto", top: "10px", bottom: "10px", width: "2px", backgroundColor: "var(--clr-border)" }} />

            {loading ? (
              <div style={{ padding: "var(--sp-12)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                جاري تحميل الخط الزمني للأنشطة...
              </div>
            ) : logs.length === 0 ? (
              <div style={{ padding: "var(--sp-12)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                لا توجد أحداث لعرضها في الخط الزمني.
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
                        right: "-25px", 
                        left: "auto",
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
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "var(--fw-bold)", fontSize: "13px", color: "var(--clr-text-primary)" }}>{translateAction(log.action)}</span>
                        <span style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>{new Date(log.createdAt).toLocaleString("ar-EG")}</span>
                      </div>
                      <p style={{ margin: "6px 0", fontSize: "12px", color: "var(--clr-text-primary)" }}>{translateDetails(log.details || "")}</p>
                      <div style={{ display: "flex", gap: "var(--sp-4)", fontSize: "11px", color: "var(--clr-text-muted)", flexWrap: "wrap" }}>
                        <span>منفذ بواسطة: <strong>{log.performedEmail}</strong> ({log.performedRole === "SuperAdmin" ? "مشرف عام" : "موظف"})</span>
                        <span>عنوان IP: <strong>{log.ipAddress}</strong></span>
                        <span>الجهاز المستخدم: <span style={{ opacity: 0.8 }}>{log.deviceInfo}</span></span>
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
                الصفحة {page} من {totalPages}
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
        <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
          <div style={{ borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", margin: 0 }}>
              تحليلات وسجلات عمليات المستخدمين
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <span style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>البحث بالبريد الإلكتروني:</span>
              <input
                type="email"
                placeholder="مثال: staff@allurite.com"
                value={userEmail}
                onChange={(e) => { setUserEmail(e.target.value); setPage(1); }}
                className="c-input__field"
                style={{ width: "240px", height: "30px", fontSize: "12px", textAlign: "right" }}
              />
            </div>
          </div>

          <div style={{ border: "1px solid var(--clr-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: "var(--sp-2)" }}>
            <div className="c-table-container">
              <table className="c-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(4, 13, 33, 0.4)", borderBottom: "2px solid var(--clr-border)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                    <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>اسم المستخدم</th>
                    <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>الدور الوظيفي</th>
                    <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>البريد الإلكتروني</th>
                    <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>رمز العملية</th>
                    <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>تفاصيل الحدث</th>
                    <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                        جاري تحميل سجلات المستخدمين...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                        لا توجد عمليات مسجلة للبريد الإلكتروني المحدد.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log._id} style={{ borderBottom: "1px solid var(--clr-border)", fontSize: "12px" }}>
                        <td style={{ padding: "10px var(--sp-3)", fontWeight: "var(--fw-bold)", textAlign: "right" }}>{log.performedName || log.performedEmail.split("@")[0]}</td>
                        <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-accent-primary)", textAlign: "right" }}>{log.performedRole === "SuperAdmin" ? "مشرف عام" : "موظف"}</td>
                        <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)", textAlign: "right" }}>{log.performedEmail}</td>
                        <td style={{ padding: "10px var(--sp-3)", textAlign: "right" }}>
                          <span className="c-badge" style={{ textTransform: "none" }}>{translateAction(log.action)}</span>
                        </td>
                        <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)", textAlign: "right" }}>{translateDetails(log.details || "")}</td>
                        <td style={{ padding: "10px var(--sp-3)", textAlign: "left", color: "var(--clr-text-muted)" }}>{new Date(log.createdAt).toLocaleString("ar-EG")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
                الصفحة {page} من {totalPages}
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
        <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
          <div style={{ borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <ShieldAlert size={18} style={{ color: "var(--clr-error)" }} />
              <h2 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-error)", margin: 0 }}>
                الأحداث الأمنية والعمليات عالية الخطورة
              </h2>
            </div>
            <span style={{ fontSize: "10px", color: "var(--clr-error)", backgroundColor: "rgba(229,62,62,0.1)", border: "1px dashed var(--clr-error)", padding: "2px 8px", borderRadius: "4px" }}>
              عرض مخصص للأحداث الحرجة والمرتفعة فقط
            </span>
          </div>

          <div style={{ border: "1px solid var(--clr-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: "var(--sp-2)" }}>
            <div className="c-table-container">
              <table className="c-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(229, 62, 62, 0.03)", borderBottom: "2px solid var(--clr-border)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                    <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>مستوى الخطورة</th>
                    <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>رمز الحدث</th>
                    <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>البريد الإلكتروني للمنفذ</th>
                    <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>تفاصيل الحدث الأمني</th>
                    <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>عنوان IP المصدر</th>
                    <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>وقت الحدوث</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                        جاري تحميل سجلات الأحداث الأمنية الحرجة...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                        لم يتم العثور على أي أحداث أمنية حرجة أو مشبوهة.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => {
                      const sev = getSeverityStyle(log.severity);
                      
                      let severityLabel: string = log.severity;
                      if (log.severity === "Low") severityLabel = "منخفضة";
                      else if (log.severity === "Medium") severityLabel = "متوسطة";
                      else if (log.severity === "High") severityLabel = "مرتفعة";
                      else if (log.severity === "Critical") severityLabel = "حرجة";

                      return (
                        <tr key={log._id} style={{ borderBottom: "1px solid var(--clr-border)", fontSize: "12px", backgroundColor: "rgba(229, 62, 62, 0.01)" }}>
                          <td style={{ padding: "10px var(--sp-3)", textAlign: "right" }}>
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
                              {severityLabel}
                            </span>
                          </td>
                          <td style={{ padding: "10px var(--sp-3)", textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <AlertTriangle size={14} style={{ color: sev.color }} />
                              <span style={{ fontWeight: "bold", color: "var(--clr-text-primary)" }}>{translateAction(log.action)}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px var(--sp-3)", textAlign: "right" }}>{log.performedEmail}</td>
                          <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-primary)", textAlign: "right" }}>{translateDetails(log.details || "")}</td>
                          <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)", textAlign: "right" }}>
                            <strong>{log.ipAddress}</strong>
                          </td>
                          <td style={{ padding: "10px var(--sp-3)", textAlign: "left", color: "var(--clr-text-muted)" }}>{new Date(log.createdAt).toLocaleString("ar-EG")}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
                الصفحة {page} من {totalPages}
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
