"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "./layout";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Users, 
  CheckSquare, 
  Calendar, 
  TrendingUp, 
  UserPlus, 
  PlusCircle, 
  Clock, 
  ShieldAlert, 
  Database, 
  Settings, 
  ArrowLeft,
  Activity,
  User,
  ShieldCheck,
  CheckCircle2,
  FolderPlus,
  BarChart3,
  Loader2
} from "lucide-react";

interface KPIData {
  avgProductivityScore: number;
  totalEmployeesCount: number;
  tasks: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    overdue: number;
  };
  followups: {
    total: number;
    completed: number;
    scheduled: number;
    pending: number;
    missed: number;
    overdue: number;
  };
  clients: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    conversionRate: number;
  };
}

interface Client {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  status: string;
  source?: string;
  createdAt: string;
}

interface Task {
  _id: string;
  title: string;
  status: string;
  dueDate: string;
  assignedTo?: {
    firstName: string;
    lastName: string;
  } | string;
  client?: {
    firstName: string;
    lastName: string;
  } | string;
}

interface FollowUp {
  _id: string;
  title: string;
  status: string;
  date: string;
  client?: {
    firstName: string;
    lastName: string;
  } | string;
}

interface AuditLog {
  _id: string;
  action: string;
  performedEmail: string;
  details?: string;
  createdAt: string;
  severity: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { isRtl } = useLanguage();
  const isSuperAdmin = user?.role === "SuperAdmin";

  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState("");
  
  // Dashboard Metrics & Streams State
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [chartsData, setChartsData] = useState<any>(null);
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentFollowups, setRecentFollowups] = useState<FollowUp[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  // Selected tab for Activity Center
  const [activeActivityTab, setActiveActivityTab] = useState<"clients" | "tasks" | "followups" | "logs">("clients");

  useEffect(() => {
    // Dynamic Date & Time
    const updateTime = () => {
      const now = new Date();
      setCurrentDateTime(now.toLocaleDateString("ar-EG", {
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch reports analytics (covers most KPI calculations)
        const reportsRes = await fetch("/api/v1/reports?category=Productivity");
        if (reportsRes.ok) {
          const reportsJson = await reportsRes.json();
          setKpis(reportsJson.data?.kpis || null);
          setChartsData(reportsJson.data?.chartsData || null);
        }

        // 2. Fetch recent clients
        const clientsRes = await fetch("/api/v1/clients?limit=5");
        if (clientsRes.ok) {
          const clientsJson = await clientsRes.json();
          setRecentClients(clientsJson.data || []);
        }

        // 3. Fetch recent tasks
        const tasksRes = await fetch("/api/v1/tasks?limit=5");
        if (tasksRes.ok) {
          const tasksJson = await tasksRes.json();
          setRecentTasks(tasksJson.data || []);
        }

        // 4. Fetch recent followups
        const followupsRes = await fetch("/api/v1/followups?limit=5");
        if (followupsRes.ok) {
          const followupsJson = await followupsRes.json();
          setRecentFollowups(followupsJson.data || []);
        }

        // 5. Fetch recent audit logs (Admin only)
        if (isSuperAdmin) {
          const logsRes = await fetch("/api/v1/audit-logs?limit=5");
          if (logsRes.ok) {
            const logsJson = await logsRes.json();
            setRecentLogs(logsJson.data || []);
          }
        }
      } catch (err) {
        console.error("Error loading dashboard data streams:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user, isSuperAdmin]);

  // Log translations helper
  const translateAction = (actionStr: string) => {
    const mapping: Record<string, string> = {
      "SETTINGS_UPDATE": "تحديث الإعدادات",
      "AUTH_LOGIN_SUCCESS": "تسجيل دخول ناجح",
      "AUTH_LOGIN_FAILED": "فشل تسجيل الدخول",
      "AUTH_LOGOUT": "تسجيل خروج من النظام",
      "EMPLOYEE_CREATE": "إضافة موظف جديد",
      "EMPLOYEE_UPDATE": "تعديل بيانات موظف",
      "CLIENT_CREATE": "إنشاء ملف عميل",
      "CLIENT_UPDATE": "تعديل بيانات عميل",
      "TASK_CREATE": "إنشاء مهمة جديدة",
      "TASK_UPDATE": "تحديث حالة مهمة",
      "FILE_UPLOAD": "رفع ملف جديد",
      "BACKUP_CREATE": "إنشاء نسخة احتياطية"
    };
    return mapping[actionStr] || actionStr;
  };

  const getClientStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <span className="c-badge c-badge--success" style={{ fontSize: "10px" }}>نشط</span>;
      case "Inactive":
        return <span className="c-badge c-badge--secondary" style={{ fontSize: "10px" }}>غير نشط</span>;
      default:
        return <span className="c-badge c-badge--info" style={{ fontSize: "10px" }}>قيد الانتظار</span>;
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <span className="c-badge c-badge--success" style={{ fontSize: "10px" }}>مكتملة</span>;
      case "In Progress":
        return <span className="c-badge c-badge--info" style={{ fontSize: "10px" }}>قيد التنفيذ</span>;
      case "Overdue":
        return <span className="c-badge c-badge--danger" style={{ fontSize: "10px" }}>متأخرة</span>;
      default:
        return <span className="c-badge c-badge--warning" style={{ fontSize: "10px" }}>معلقة</span>;
    }
  };

  const getSeverityStyle = (level: string) => {
    switch (level) {
      case "Critical":
      case "High":
        return { color: "var(--clr-error)", background: "rgba(229, 62, 62, 0.12)" };
      case "Medium":
        return { color: "var(--clr-warning)", background: "rgba(245, 158, 11, 0.12)" };
      default:
        return { color: "var(--clr-success)", background: "rgba(16, 185, 129, 0.12)" };
    }
  };

  // Safe fallback KPI values if API fails/loads
  const defaultKPIs: KPIData = {
    avgProductivityScore: 0,
    totalEmployeesCount: 0,
    tasks: { total: 0, completed: 0, pending: 0, inProgress: 0, overdue: 0 },
    followups: { total: 0, completed: 0, scheduled: 0, pending: 0, missed: 0, overdue: 0 },
    clients: { total: 0, active: 0, inactive: 0, pending: 0, conversionRate: 0 }
  };

  const activeKPIs = kpis || defaultKPIs;

  // Calculative Performance Rates
  const taskCompletionRate = activeKPIs.tasks.total > 0 
    ? Math.round((activeKPIs.tasks.completed / activeKPIs.tasks.total) * 100)
    : 0;

  const followupSuccessRate = activeKPIs.followups.total > 0
    ? Math.round((activeKPIs.followups.completed / activeKPIs.followups.total) * 100)
    : 0;

  return (
    <main className="responsive-main">
      
      {/* 1. Header Overview Bar */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        flexWrap: "wrap",
        gap: "var(--sp-4)",
        borderBottom: "1px solid var(--clr-border)",
        paddingBottom: "var(--sp-4)"
      }}>
        <div style={{ textAlign: "right" }}>
          <h1 style={{ fontSize: "var(--fs-h2)", fontWeight: "var(--fw-bold)", color: "var(--clr-text-primary)", margin: 0 }}>
            لوحة التحكم التنفيذية
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", marginTop: "4px" }}>
            مرحباً بك مجدداً، {user?.email.split("@")[0]}. إليك التحليلات الشاملة لجميع عمليات الـ CRM لليوم.
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "var(--sp-3)" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "var(--sp-2)", 
            padding: "var(--sp-2) var(--sp-4)", 
            backgroundColor: "var(--clr-bg-surface)", 
            border: "1px solid var(--clr-border)", 
            borderRadius: "var(--radius-md)",
            fontSize: "12px",
            color: "var(--clr-text-muted)"
          }}>
            <Calendar size={14} style={{ color: "var(--clr-accent-primary)" }} />
            <span>{currentDateTime}</span>
          </div>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "var(--sp-2)", 
            padding: "var(--sp-2) var(--sp-4)", 
            backgroundColor: "rgba(16, 185, 129, 0.08)", 
            border: "1px solid rgba(16, 185, 129, 0.2)", 
            borderRadius: "var(--radius-md)",
            fontSize: "12px",
            color: "var(--clr-success)"
          }}>
            <ShieldCheck size={14} />
            <span>جلسة نشطة وآمنة</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: "var(--sp-4)" }}>
          <Loader2 size={36} className="animate-spin" style={{ color: "var(--clr-accent-primary)", animation: "spin 1s linear infinite" }} />
          <span style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>جاري تحميل وتهيئة لوحة التحكم والتحليلات الحية...</span>
        </div>
      ) : (
        <>
          {/* 2. Executive Overview KPIs Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--sp-5)" }}>
            
            {/* Total Clients Widget */}
            <div className="c-card c-card--glow" style={{ position: "relative", overflow: "hidden", textAlign: "right" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-3)" }}>
                <span style={{ fontSize: "12px", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>إجمالي العملاء المسجلين</span>
                <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(0, 210, 255, 0.1)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "var(--clr-accent-primary)" }}>
                  <Users size={16} />
                </div>
              </div>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block" }}>{activeKPIs.clients.total}</span>
              <div style={{ display: "flex", gap: "var(--sp-3)", marginTop: "var(--sp-2)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                <span>النشطين: <strong style={{ color: "var(--clr-success)" }}>{activeKPIs.clients.active}</strong></span>
                <span>قيد الانتظار: <strong>{activeKPIs.clients.pending}</strong></span>
              </div>
            </div>

            {/* Pending Tasks Widget */}
            <div className="c-card c-card--glow" style={{ position: "relative", overflow: "hidden", textAlign: "right" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-3)" }}>
                <span style={{ fontSize: "12px", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>مهام الفريق المعلقة</span>
                <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(245, 158, 11, 0.1)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "var(--clr-warning)" }}>
                  <CheckSquare size={16} />
                </div>
              </div>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block" }}>{activeKPIs.tasks.pending + activeKPIs.tasks.inProgress}</span>
              <div style={{ display: "flex", gap: "var(--sp-3)", marginTop: "var(--sp-2)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                <span>المتأخرة: <strong style={{ color: "var(--clr-error)" }}>{activeKPIs.tasks.overdue}</strong></span>
                <span>قيد التنفيذ: <strong style={{ color: "var(--clr-accent-primary)" }}>{activeKPIs.tasks.inProgress}</strong></span>
              </div>
            </div>

            {/* Follow-ups Due Today Widget */}
            <div className="c-card c-card--glow" style={{ position: "relative", overflow: "hidden", textAlign: "right" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-3)" }}>
                <span style={{ fontSize: "12px", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>متابعات اليوم المجدولة</span>
                <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "var(--clr-success)" }}>
                  <Clock size={16} />
                </div>
              </div>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block" }}>{activeKPIs.followups.scheduled + activeKPIs.followups.pending}</span>
              <div style={{ display: "flex", gap: "var(--sp-3)", marginTop: "var(--sp-2)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                <span>الفائتة: <strong style={{ color: "var(--clr-error)" }}>{activeKPIs.followups.missed}</strong></span>
                <span>المكتملة: <strong style={{ color: "var(--clr-success)" }}>{activeKPIs.followups.completed}</strong></span>
              </div>
            </div>

            {/* Team Productivity Widget */}
            <div className="c-card c-card--glow" style={{ position: "relative", overflow: "hidden", textAlign: "right" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-3)" }}>
                <span style={{ fontSize: "12px", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>متوسط إنتاجية الفريق</span>
                <div style={{ width: "32px", height: "32px", borderRadius: "var(--radius-sm)", backgroundColor: "rgba(128, 90, 213, 0.1)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "#805ad5" }}>
                  <TrendingUp size={16} />
                </div>
              </div>
              <span style={{ fontSize: "28px", fontWeight: "var(--fw-bold)", display: "block", color: "var(--clr-accent-primary)" }}>
                {activeKPIs.avgProductivityScore}%
              </span>
              <div style={{ display: "flex", gap: "var(--sp-3)", marginTop: "var(--sp-2)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                <span>عدد الكادر النشط: <strong>{activeKPIs.totalEmployeesCount} موظف</strong></span>
              </div>
            </div>

          </div>

          {/* 3. Quick Actions & Performance Section */}
          <div className="responsive-split-grid">
            
            {/* Quick Actions Hub */}
            <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
              <h2 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", margin: 0 }}>
                الإجراءات والعمليات السريعة
              </h2>
              <div className="responsive-grid-3" style={{ flex: 1 }}>
                
                <Link href="/dashboard/clients" className="action-button-card">
                  <UserPlus size={20} style={{ color: "var(--clr-success)" }} />
                  <span>إضافة عميل</span>
                </Link>

                <Link href="/dashboard/tasks" className="action-button-card">
                  <PlusCircle size={20} style={{ color: "var(--clr-accent-primary)" }} />
                  <span>إنشاء مهمة</span>
                </Link>

                <Link href="/dashboard/followups" className="action-button-card">
                  <Clock size={20} style={{ color: "var(--clr-warning)" }} />
                  <span>جدولة متابعة</span>
                </Link>

                <Link href="/dashboard/employees" className="action-button-card">
                  <Users size={20} style={{ color: "#319795" }} />
                  <span>إضافة موظف</span>
                </Link>

                <Link href="/dashboard/files" className="action-button-card">
                  <FolderPlus size={20} style={{ color: "#805ad5" }} />
                  <span>رفع مستند</span>
                </Link>

                <Link href="/dashboard/reports" className="action-button-card">
                  <BarChart3 size={20} style={{ color: "var(--clr-accent-primary)" }} />
                  <span>فتح التقارير</span>
                </Link>

              </div>
            </section>

            {/* General Performance gauges */}
            <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
              <h2 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", margin: 0 }}>
                معدلات نجاح العمليات
              </h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", justifyContent: "center", flex: 1 }}>
                
                {/* Task Completion Rate */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                    <span style={{ fontWeight: "var(--fw-bold)" }}>{taskCompletionRate}%</span>
                    <span style={{ color: "var(--clr-text-muted)" }}>معدل إنجاز المهام الكلي</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", borderRadius: "4px", backgroundColor: "var(--clr-border)", overflow: "hidden" }}>
                    <div style={{ width: `${taskCompletionRate}%`, height: "100%", borderRadius: "4px", backgroundColor: "var(--clr-accent-primary)", transition: "width 1s ease-in-out" }} />
                  </div>
                </div>

                {/* Follow-up Success Rate */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                    <span style={{ fontWeight: "var(--fw-bold)" }}>{followupSuccessRate}%</span>
                    <span style={{ color: "var(--clr-text-muted)" }}>معدل نجاح وموثوقية المتابعة</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", borderRadius: "4px", backgroundColor: "var(--clr-border)", overflow: "hidden" }}>
                    <div style={{ width: `${followupSuccessRate}%`, height: "100%", borderRadius: "4px", backgroundColor: "var(--clr-success)", transition: "width 1s ease-in-out" }} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", padding: "10px", backgroundColor: "rgba(0, 210, 255, 0.05)", borderRadius: "var(--radius-sm)", border: "1px dashed rgba(0, 210, 255, 0.2)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                  <Activity size={14} style={{ color: "var(--clr-accent-primary)", flexShrink: 0 }} />
                  <span>تعتمد الإحصائيات على دورات المتابعة والمهام المكتملة لآخر 30 يوماً.</span>
                </div>

              </div>
            </section>

          </div>

          {/* 4. Activity Center & Business Intelligence Grid */}
          <div className="responsive-split-grid--wide">
            
            {/* Left Column: Activity Streams */}
            <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              
              {/* Tab Navigation header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", flexWrap: "wrap", gap: "var(--sp-2)" }}>
                
                {/* Tabs triggers */}
                <div className="responsive-tab-list">
                  <button 
                    onClick={() => setActiveActivityTab("clients")}
                    className={`activity-tab-btn ${activeActivityTab === "clients" ? "active" : ""}`}
                  >
                    أحدث العملاء
                  </button>
                  <button 
                    onClick={() => setActiveActivityTab("tasks")}
                    className={`activity-tab-btn ${activeActivityTab === "tasks" ? "active" : ""}`}
                  >
                    أحدث المهام
                  </button>
                  <button 
                    onClick={() => setActiveActivityTab("followups")}
                    className={`activity-tab-btn ${activeActivityTab === "followups" ? "active" : ""}`}
                  >
                    المتابعات
                  </button>
                  {isSuperAdmin && (
                    <button 
                      onClick={() => setActiveActivityTab("logs")}
                      className={`activity-tab-btn ${activeActivityTab === "logs" ? "active" : ""}`}
                    >
                      سجلات الأحداث
                    </button>
                  )}
                </div>

                <h2 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)", margin: 0 }}>
                  مركز الأنشطة الأخير
                </h2>
              </div>

              {/* Tab Contents */}
              <div style={{ minHeight: "260px" }}>
                
                {/* Clients Activity Tab */}
                {activeActivityTab === "clients" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                    {recentClients.length === 0 ? (
                      <div style={{ padding: "var(--sp-12)", textAlign: "center", color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>لا توجد بيانات عملاء مسجلة حالياً.</div>
                    ) : (
                      recentClients.map(c => (
                        <div key={c._id} className="stream-row">
                          <span style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>
                            {new Date(c.createdAt).toLocaleDateString("ar-EG")}
                          </span>
                          <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
                            {getClientStatusBadge(c.status)}
                            <strong style={{ color: "var(--clr-text-primary)" }}>{c.firstName} {c.lastName}</strong>
                            {c.company && <span style={{ color: "var(--clr-text-muted)", fontSize: "11px" }}>({c.company})</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tasks Activity Tab */}
                {activeActivityTab === "tasks" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                    {recentTasks.length === 0 ? (
                      <div style={{ padding: "var(--sp-12)", textAlign: "center", color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>لا توجد مهام موكلة حالياً.</div>
                    ) : (
                      recentTasks.map(t => (
                        <div key={t._id} className="stream-row">
                          <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
                            {getTaskStatusBadge(t.status)}
                            <span style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>
                              تاريخ الاستحقاق: {new Date(t.dueDate).toLocaleDateString("ar-EG")}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
                            <strong style={{ color: "var(--clr-text-primary)" }}>{t.title}</strong>
                            {t.client && typeof t.client === "object" && (
                              <span style={{ color: "var(--clr-accent-primary)", fontSize: "11px" }}>
                                للعميل: {t.client.firstName} {t.client.lastName}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Followups Activity Tab */}
                {activeActivityTab === "followups" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                    {recentFollowups.length === 0 ? (
                      <div style={{ padding: "var(--sp-12)", textAlign: "center", color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>لا توجد مواعيد متابعة مجدولة.</div>
                    ) : (
                      recentFollowups.map(f => (
                        <div key={f._id} className="stream-row">
                          <span style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>
                            الموعد: {new Date(f.date).toLocaleDateString("ar-EG")}
                          </span>
                          <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
                            <span className="c-badge" style={{ fontSize: "10px" }}>{f.status === "Completed" ? "مكتملة" : "مجدولة"}</span>
                            <strong style={{ color: "var(--clr-text-primary)" }}>{f.title}</strong>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Audit Logs Tab */}
                {activeActivityTab === "logs" && isSuperAdmin && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                    {recentLogs.length === 0 ? (
                      <div style={{ padding: "var(--sp-12)", textAlign: "center", color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>لا توجد سجلات أمان حالياً.</div>
                    ) : (
                      recentLogs.map(l => {
                        const sev = getSeverityStyle(l.severity);
                        return (
                          <div key={l._id} className="stream-row">
                            <span style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>
                              {new Date(l.createdAt).toLocaleTimeString("ar-EG")}
                            </span>
                            <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
                              <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "3px", color: sev.color, backgroundColor: sev.background, fontWeight: "bold" }}>
                                {translateAction(l.action)}
                              </span>
                              <span style={{ color: "var(--clr-text-primary)", fontSize: "12px" }}>
                                {l.performedEmail.split("@")[0]}: {l.details ? l.details.slice(0, 50) + "..." : "-"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

              </div>
            </section>

            {/* Right Column: Business Intelligence (BI) */}
            <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
              <h2 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", margin: 0 }}>
                مؤشرات ذكاء الأعمال والنمو
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)", flex: 1, justifyContent: "center" }}>
                
                {/* Lead Conversion Widget */}
                <div style={{ padding: "var(--sp-3)", backgroundColor: "var(--clr-bg-card-darker)", borderRadius: "var(--radius-md)", border: "1px solid var(--clr-border)" }}>
                  <span style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>معدل تحويل العملاء المتوقعين</span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "4px" }}>
                    <span className="c-badge c-badge--success" style={{ fontSize: "10px" }}>نمو مستمر</span>
                    <span style={{ fontSize: "22px", fontWeight: "var(--fw-bold)" }}>
                      {activeKPIs.clients.conversionRate}%
                    </span>
                  </div>
                </div>

                {/* Sources breakdown meters */}
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                  <span style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>أهم قنوات استقطاب العملاء</span>
                  
                  {(() => {
                    const totalSources = chartsData?.sources?.reduce((acc: number, curr: any) => acc + curr.value, 0) || 0;
                    
                    if (chartsData?.sources && chartsData.sources.length > 0) {
                      return chartsData.sources.map((src: any, index: number) => {
                        const pct = totalSources > 0 ? Math.round((src.value / totalSources) * 100) : 0;
                        const colors = ["var(--clr-accent-primary)", "var(--clr-success)", "#805ad5", "#319795", "var(--clr-warning)"];
                        const barColor = colors[index % colors.length];

                        const translateSource = (name: string) => {
                          const mapping: Record<string, string> = {
                            "Google": "البحث المباشر (Google)",
                            "Social": "شبكات التواصل الاجتماعي",
                            "Referral": "إحالة صديق / توصية",
                            "Other": "أخرى / غير محدد",
                            "Website": "الموقع الإلكتروني"
                          };
                          return mapping[name] || name;
                        };

                        return (
                          <div key={src.name}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                              <span>{pct}% ({src.value})</span>
                              <span>{translateSource(src.name)}</span>
                            </div>
                            <div style={{ width: "100%", height: "4px", backgroundColor: "var(--clr-border)", borderRadius: "2px" }}>
                              <div style={{ width: `${pct}%`, height: "100%", backgroundColor: barColor, borderRadius: "2px" }} />
                            </div>
                          </div>
                        );
                      });
                    }

                    return (
                      <div style={{ fontSize: "11px", color: "var(--clr-text-muted)", textAlign: "center", padding: "var(--sp-4)" }}>
                        لا توجد بيانات قنوات استقطاب مسجلة حالياً.
                      </div>
                    );
                  })()}
                </div>

              </div>
            </section>

          </div>
        </>
      )}

      {/* Scoped CSS styling rules */}
      <style jsx global>{`
        .action-button-card {
          background-color: var(--clr-bg-card-darker);
          border: 1px solid var(--clr-border);
          border-radius: var(--radius-md);
          padding: var(--sp-4) var(--sp-2);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--sp-2);
          color: var(--clr-text-primary);
          font-size: 12px;
          font-weight: var(--fw-medium);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .action-button-card:hover {
          transform: translateY(-2px);
          border-color: var(--clr-accent-primary);
          box-shadow: 0 4px 12px var(--shadow-glow-accent);
          background-color: var(--clr-bg-hover);
        }
        .activity-tab-btn {
          background: none;
          border: none;
          padding: 6px 12px;
          font-size: 12px;
          color: var(--clr-text-muted);
          font-weight: var(--fw-medium);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .activity-tab-btn:hover {
          color: var(--clr-text-primary);
          background-color: var(--clr-bg-hover);
        }
        .activity-tab-btn.active {
          color: var(--clr-accent-primary);
          background-color: rgba(0, 210, 255, 0.08);
          font-weight: var(--fw-bold);
        }
        .stream-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--sp-3) var(--sp-2);
          border-bottom: 1px dashed var(--clr-border);
          font-size: 13px;
        }
        .stream-row:last-child {
          border-bottom: none;
        }
      `}</style>
    </main>
  );
}
