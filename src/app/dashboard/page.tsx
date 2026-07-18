"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "./layout";
import Link from "next/link";
import { 
  Users2, 
  Clock, 
  ClipboardList, 
  FolderOpen, 
  BarChart3, 
  ShieldAlert, 
  Database, 
  Settings, 
  ArrowLeft,
  Activity,
  User,
  ShieldCheck,
  CheckCircle2,
  Calendar
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [currentDateTime, setCurrentDateTime] = useState("");

  useEffect(() => {
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

  const dashboardItems = [
    {
      title: "قائمة العملاء",
      description: "إدارة بيانات العملاء، الشركات، وحالاتهم الإدارية والتنفيذية بالتفصيل.",
      href: "/dashboard/clients",
      icon: Users2,
      color: "rgba(56, 161, 105, 0.15)",
      iconColor: "var(--clr-success)",
      badge: "العملاء"
    },
    {
      title: "متابعات اليوم",
      description: "تنظيم مواعيد وتفاصيل المتابعة الدورية والاتصال الهاتفي والاجتماعات اليومية.",
      href: "/dashboard/followups",
      icon: Clock,
      color: "rgba(221, 107, 32, 0.15)",
      iconColor: "#DD6B20",
      badge: "المتابعات"
    },
    {
      title: "لوحة المهام",
      description: "مراقبة وإسناد المهام لأفراد الفريق وتتبع دورات تسليم وتنفيذ المشاريع.",
      href: "/dashboard/tasks",
      icon: ClipboardList,
      color: "rgba(0, 210, 255, 0.15)",
      iconColor: "var(--clr-accent-primary)",
      badge: "المهام اليومية"
    },
    {
      title: "مستودع الملفات",
      description: "أرشفة وتنظيم ومشاركة العقود، الفواتير، ومرفقات العملاء بشكل آمن.",
      href: "/dashboard/files",
      icon: FolderOpen,
      color: "rgba(128, 90, 213, 0.15)",
      iconColor: "#805AD5",
      badge: "المستندات"
    },
    {
      title: "التقارير الذكية",
      description: "إصدار وإلقاء نظرة على تقارير الأداء ومعدل تحويل العملاء ونشاط المبيعات.",
      href: "/dashboard/reports",
      icon: BarChart3,
      color: "rgba(0, 210, 255, 0.15)",
      iconColor: "var(--clr-accent-primary)",
      badge: "التحليلات"
    },
    {
      title: "دليل الموظفين",
      description: "إدارة الموظفين وهيكل الإدارات والأقسام وتعيين المسؤولين عن المتابعة.",
      href: "/dashboard/employees",
      icon: User,
      color: "rgba(49, 151, 149, 0.15)",
      iconColor: "#319795",
      badge: "الفريق"
    },
    {
      title: "سجلات التدقيق والأمن",
      description: "مراجعة العمليات، عناوين IP، وتفاصيل الأمان وحركات الدخول للنظام.",
      href: "/dashboard/audit-logs",
      icon: ShieldAlert,
      color: "rgba(229, 62, 62, 0.15)",
      iconColor: "var(--clr-error)",
      badge: "الأمان",
      adminOnly: true
    },
    {
      title: "النسخ الاحتياطي",
      description: "إدارة النسخ الاحتياطية لقاعدة البيانات واستعادتها لحماية البيانات من الفقدان.",
      href: "/dashboard/backups",
      icon: Database,
      color: "rgba(0, 210, 255, 0.15)",
      iconColor: "var(--clr-accent-primary)",
      badge: "النظام",
      adminOnly: true
    },
    {
      title: "الإعدادات العامة",
      description: "تخصيص سياسات أمان كلمات المرور والمصادقة والبيانات الأساسية للمؤسسة.",
      href: "/dashboard/settings",
      icon: Settings,
      color: "rgba(113, 128, 150, 0.15)",
      iconColor: "var(--clr-text-muted)",
      badge: "الإدارة",
      adminOnly: true
    }
  ];

  const filteredItems = dashboardItems.filter(item => {
    if (item.adminOnly && user?.role !== "SuperAdmin") return false;
    return true;
  });

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {/* Welcome header */}
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
            مرحباً بك، {user?.email.split("@")[0]} 👋
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", marginTop: "4px" }}>
            إليك لوحة التحكم والوصول السريع لجميع عمليات وإدارات نظام الـ CRM.
          </p>
        </div>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "var(--sp-2)", 
          padding: "var(--sp-2) var(--sp-4)", 
          backgroundColor: "var(--clr-bg-card)", 
          border: "1px solid var(--clr-border)", 
          borderRadius: "var(--radius-md)",
          fontSize: "12px",
          color: "var(--clr-text-muted)"
        }}>
          <Calendar size={14} style={{ color: "var(--clr-accent-primary)" }} />
          <span>{currentDateTime}</span>
        </div>
      </div>

      {/* Grid of Clickable operations cards */}
      <div className="dashboard-grid">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.title} 
              href={item.href}
              className="dashboard-card"
              style={{ textDecoration: "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--sp-4)" }}>
                <div style={{ 
                  width: "42px", 
                  height: "42px", 
                  borderRadius: "var(--radius-md)", 
                  backgroundColor: item.color, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: item.iconColor
                }}>
                  <Icon size={20} />
                </div>
                <span className="c-badge" style={{ fontSize: "9px", padding: "2px 6px", textTransform: "none" }}>
                  {item.badge}
                </span>
              </div>
              <h3 style={{ fontSize: "var(--fs-body-md)", fontWeight: "var(--fw-bold)", color: "var(--clr-text-primary)", margin: "0 0 8px 0", textAlign: "right" }}>
                {item.title}
              </h3>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", margin: 0, lineHeight: "1.5", textAlign: "right" }}>
                {item.description}
              </p>
              <div className="card-arrow">
                <span>انتقال سريع</span>
                <ArrowLeft size={14} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* System status and profile details */}
      {user && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "var(--sp-6)", marginTop: "var(--sp-4)" }}>
          <section className="c-card c-card--glow" style={{ textAlign: "right" }}>
            <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", marginBottom: "var(--sp-4)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
              <ShieldCheck size={18} style={{ color: "var(--clr-accent-primary)" }} />
              <h2 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)", margin: 0 }}>
                تفاصيل جلسة الوصول الحالية
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "var(--sp-3)", fontSize: "var(--fs-body-sm)" }}>
              <span style={{ color: "var(--clr-text-muted)" }}>البريد الإلكتروني:</span>
              <span style={{ fontWeight: "var(--fw-medium)" }}>{user.email}</span>

              <span style={{ color: "var(--clr-text-muted)" }}>صلاحية الوصول:</span>
              <span style={{ fontWeight: "var(--fw-bold)", color: "var(--clr-accent-primary)" }}>
                {user.role === "SuperAdmin" ? "مشرف عام النظام" : user.role === "Manager" ? "مدير إداري" : "موظف"}
              </span>

              <span style={{ color: "var(--clr-text-muted)" }}>حالة الاتصال بالنظام:</span>
              <span>
                <span className="c-badge c-badge--success" style={{ padding: "1px 8px" }}>
                  {user.status === "Active" ? "نشط وآمن" : user.status}
                </span>
              </span>

              <span style={{ color: "var(--clr-text-muted)" }}>وقت بدء الجلسة:</span>
              <span style={{ direction: "ltr", textAlign: "right" }}>{new Date(user.createdAt).toLocaleString("ar-EG")}</span>
            </div>
          </section>

          <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", textAlign: "right" }}>
            <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", marginBottom: "var(--sp-2)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
              <Activity size={18} style={{ color: "var(--clr-success)" }} />
              <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)", margin: 0 }}>
                حالة نظام التشغيل الأساسية
              </h3>
            </div>
            <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", margin: 0, lineHeight: "1.6" }}>
              جميع حمايات النظام وقواعد الجلسات ومسارات التحقق التلقائي والاتصال المباشر بقاعدة البيانات تعمل بكفاءة تامة دون أي مشاكل.
            </p>
            <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", color: "var(--clr-success)", fontSize: "var(--fs-caption)", marginTop: "auto" }}>
              <CheckCircle2 size={14} />
              <span style={{ fontWeight: "bold" }}>قاعدة البيانات والخدمات متصلة بالكامل</span>
            </div>
          </section>
        </div>
      )}

      {/* Styled micro-animations */}
      <style jsx global>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--sp-6);
        }
        .dashboard-card {
          background-color: var(--clr-bg-card);
          border: 1px solid var(--clr-border);
          border-radius: var(--radius-md);
          padding: var(--sp-5);
          display: flex;
          flex-direction: column;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }
        .dashboard-card:hover {
          transform: translateY(-4px);
          border-color: var(--clr-accent-primary);
          box-shadow: 0 8px 24px rgba(0, 210, 255, 0.1);
          background-color: rgba(255, 255, 255, 0.02);
        }
        .card-arrow {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--clr-accent-primary);
          font-size: 11px;
          font-weight: bold;
          margin-top: var(--sp-5);
          opacity: 0;
          transform: translateX(10px);
          transition: all 0.2s ease;
          justify-content: flex-end;
        }
        .dashboard-card:hover .card-arrow {
          opacity: 1;
          transform: translateX(0);
        }
      `}</style>
    </main>
  );
}
