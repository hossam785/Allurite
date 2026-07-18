"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  CheckSquare, 
  LogOut,
  Clock,
  FolderOpen,
  BarChart2,
  Database,
  Settings,
  X
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface SidebarProps {
  user: {
    email: string;
    role: string;
    status: string;
  };
  currentPath: string;
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, currentPath, isMobileOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const { t, isRtl } = useLanguage();

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/v1/auth/logout", {
        method: "POST",
      });
      if (res.ok) {
        router.push("/login");
      }
    } catch (err) {
      console.error("Logout request failed", err);
    }
  };

  const isSuperAdmin = user.role === "SuperAdmin";

  const navItems = [
    {
      name: t("navigation.dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
      disabled: false,
    },
    ...(isSuperAdmin ? [
      {
        name: t("navigation.employees"),
        href: "/dashboard/employees",
        icon: Users,
        disabled: false,
      },
      {
        name: t("navigation.auditLogs"),
        href: "/dashboard/audit-logs",
        icon: Clock,
        disabled: false,
      },
      {
        name: t("navigation.backups"),
        href: "/dashboard/backups",
        icon: Database,
        disabled: false,
      },
      {
        name: t("navigation.settings"),
        href: "/dashboard/settings",
        icon: Settings,
        disabled: false,
      }
    ] : []),
    {
      name: t("navigation.clients"),
      href: "/dashboard/clients",
      icon: UserCheck,
      disabled: false,
    },
    {
      name: t("navigation.followups"),
      href: "/dashboard/followups",
      icon: Clock,
      disabled: false,
    },
    {
      name: t("navigation.tasks"),
      href: "/dashboard/tasks",
      icon: CheckSquare,
      disabled: false,
    },
    {
      name: t("navigation.files"),
      href: "/dashboard/files",
      icon: FolderOpen,
      disabled: false,
    },
    {
      name: t("navigation.reports"),
      href: "/dashboard/reports",
      icon: BarChart2,
      disabled: false,
    },
  ];

  return (
    <aside
      className={`c-sidebar-layout-aside ${isMobileOpen ? "c-sidebar-layout-aside--open" : ""}`}
      style={{
        width: "260px",
        backgroundColor: "var(--clr-bg-surface)",
        borderRight: isRtl ? "none" : "1px solid var(--clr-border)",
        borderLeft: isRtl ? "1px solid var(--clr-border)" : "none",
        padding: "var(--sp-6)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flexShrink: 0,
      }}
    >
      <div>
        {/* Brand Logo Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--clr-accent-primary)",
                boxShadow: "var(--shadow-glow-accent)",
                background: "rgba(0, 210, 255, 0.05)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--clr-accent-primary)" strokeWidth="2.5">
                <path d="M3 20h18L12 4z" />
              </svg>
            </div>
            <span style={{ fontSize: "1.25rem", fontWeight: "var(--fw-bold)", fontFamily: "Outfit", letterSpacing: "0.5px" }}>
              Allurite
            </span>
          </div>

          {/* Close Menu Trigger (Mobile only) */}
          {onClose && (
            <button
              onClick={onClose}
              className="hamburger-btn"
              style={{
                background: "none",
                border: "none",
                color: "var(--clr-text-muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center"
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/dashboard" 
              ? currentPath === "/dashboard" 
              : currentPath.startsWith(item.href);

            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--sp-3)",
                    padding: "var(--sp-3) var(--sp-4)",
                    color: "var(--clr-text-muted)",
                    cursor: "not-allowed",
                    opacity: 0.5,
                  }}
                  title="Coming Soon"
                >
                  <Icon size={18} />
                  <span style={{ fontWeight: "var(--fw-medium)" }}>{item.name}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--sp-3)",
                  padding: "var(--sp-3) var(--sp-4)",
                  backgroundColor: isActive ? "var(--clr-border)" : "transparent",
                  borderRadius: "var(--radius-md)",
                  borderLeft: isRtl ? "4px solid transparent" : (isActive ? "4px solid var(--clr-accent-primary)" : "4px solid transparent"),
                  borderRight: isRtl ? (isActive ? "4px solid var(--clr-accent-primary)" : "4px solid transparent") : "4px solid transparent",
                  color: isActive ? "var(--clr-text-primary)" : "var(--clr-text-muted)",
                  fontWeight: isActive ? "var(--fw-bold)" : "var(--fw-medium)",
                  transition: "var(--transition-fast)",
                }}
                className={!isActive ? "sidebar-nav-hover" : ""}
              >
                <Icon size={18} style={{ color: isActive ? "var(--clr-accent-primary)" : "inherit" }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Session profile Info & Logout */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div 
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            padding: "var(--sp-3) var(--sp-4)", 
            backgroundColor: "rgba(4, 13, 33, 0.4)", 
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--clr-border)",
            fontSize: "var(--fs-caption)"
          }}
        >
          <span style={{ color: "var(--clr-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={user.email}>
            {user.email}
          </span>
          <span style={{ color: "var(--clr-accent-primary)", fontWeight: "var(--fw-bold)", marginTop: "var(--sp-1)" }}>
            {user.role === "SuperAdmin" ? t("employees_view.superadmin") : t("employees_view.employee_role")}
          </span>
        </div>
        <button onClick={handleLogout} className="c-btn c-btn--destructive" style={{ width: "100%", gap: "var(--sp-2)", justifyContent: "center" }}>
          <LogOut size={16} />
          <span>{t("common.logout")}</span>
        </button>

        {/* Global hover rule styling */}
        <style jsx global>{`
          .sidebar-nav-hover:hover {
            color: var(--clr-text-primary) !important;
            background-color: rgba(30, 46, 93, 0.3);
            padding-left: ${isRtl ? "var(--sp-4)" : "calc(var(--sp-4) + 2px)"} !important;
            padding-right: ${isRtl ? "calc(var(--sp-4) + 2px)" : "var(--sp-4)"} !important;
          }
        `}</style>
      </div>
    </aside>
  );
}
