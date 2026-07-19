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
  X,
  ChevronLeft,
  ChevronRight
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
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function Sidebar({ 
  user, 
  currentPath, 
  isMobileOpen, 
  onClose, 
  isCollapsed = false, 
  onToggleCollapsed 
}: SidebarProps) {
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

  // Prioritized navigation items: CRM items first, Admin/System items at the bottom
  const navItems = [
    {
      name: t("navigation.dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
      disabled: false,
    },
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
  ];

  return (
    <aside
      className={`c-sidebar-layout-aside ${isMobileOpen ? "c-sidebar-layout-aside--open" : ""} ${isCollapsed ? "c-sidebar-layout-aside--collapsed" : ""}`}
    >
      {/* Inner wrapper prevents layout items wrapping/breaking when width transitions to 0 */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", flex: 1, minWidth: "212px" }}>
        <div>
          {/* Brand Logo Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-6)" }}>
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
                  background: "rgba(0, 210, 255, 0.04)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--clr-accent-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3.5L3.5 19.5h17L12 3.5z" opacity="0.25" />
                  <path d="M12 6L18 17H6L12 6L15.5 14H9L12 9L13.5 12h-2" />
                </svg>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: "var(--fw-bold)", fontFamily: "Outfit", letterSpacing: "0.5px" }}>
                Allurite
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              {/* Desktop Collapse Trigger */}
              {onToggleCollapsed && (
                <button
                  onClick={onToggleCollapsed}
                  className="desktop-toggle-btn c-btn-touch-target"
                  aria-label={isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--clr-text-muted)",
                    cursor: "pointer",
                    padding: "4px",
                    alignItems: "center",
                    transition: "var(--transition-fast)"
                  }}
                  title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
                >
                  {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
              )}

            </div>
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
                    title="قريباً"
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
                  onClick={onClose}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--sp-3)",
                    padding: "var(--sp-3) var(--sp-4)",
                    backgroundColor: isActive ? "rgba(0, 210, 255, 0.06)" : "transparent",
                    boxShadow: isActive ? "inset 0 0 0 1px rgba(0, 210, 255, 0.15)" : "none",
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

        {/* User Session profile Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", marginTop: "var(--sp-4)" }}>
          <div 
            style={{ 
              display: "flex", 
              flexDirection: "column", 
              padding: "var(--sp-3) var(--sp-4)", 
              backgroundColor: "var(--clr-bg-card-darker)", 
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
        </div>
      </div>

      <style jsx>{`
        .c-sidebar-layout-aside {
          width: 260px;
          background-color: var(--clr-bg-surface);
          border: 1px solid var(--clr-border);
          border-radius: var(--radius-lg);
          margin: var(--sp-4);
          padding: var(--sp-6);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex-shrink: 0;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                      padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                      margin 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                      opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                      border 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                      box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-lg);
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          height: calc(100vh - 32px);
          position: sticky;
          top: 16px;
          z-index: 90;
        }

        .desktop-toggle-btn {
          display: flex;
        }

        @media (min-width: 1024px) {
          .c-sidebar-layout-aside--collapsed {
            width: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            opacity: 0 !important;
            border: none !important;
            box-shadow: none !important;
            pointer-events: none;
          }
        }

        @media (max-width: 1023px) {
          .c-sidebar-layout-aside {
            height: 100vh !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: var(--sp-4) !important;
            border-top: none !important;
            border-bottom: none !important;
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            right: auto !important;
            z-index: 999 !important;
            transform: translateX(-100%) !important;
            box-shadow: var(--shadow-lg) !important;
            width: 280px !important;
            max-width: 85vw !important;
          }
          :global([dir="rtl"]) .c-sidebar-layout-aside {
            left: auto !important;
            right: 0 !important;
            transform: translateX(100%) !important;
            border-left: 1px solid var(--clr-border) !important;
            border-right: none !important;
          }
          .c-sidebar-layout-aside--open,
          :global([dir="rtl"]) .c-sidebar-layout-aside--open {
            transform: translateX(0) !important;
          }
          .desktop-toggle-btn {
            display: none !important;
          }
        }
      `}</style>

      {/* Global hover rule styling */}
      <style jsx global>{`
        .sidebar-nav-hover:hover {
          color: var(--clr-text-primary) !important;
          background-color: var(--clr-bg-hover) !important;
          padding-left: ${isRtl ? "var(--sp-4)" : "calc(var(--sp-4) + 2px)"} !important;
          padding-right: ${isRtl ? "calc(var(--sp-4) + 2px)" : "var(--sp-4)"} !important;
        }
      `}</style>
    </aside>
  );
}

