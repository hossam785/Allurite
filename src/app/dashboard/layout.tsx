"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import CommandPalette from "@/components/ui/CommandPalette";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface UserInfo {
  id: string;
  email: string;
  role: string;
  status: string;
  theme?: string;
  createdAt: string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  department?: string;
  position?: string;
}

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  error: string;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ToastProvider>
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </ToastProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { setTheme } = useTheme();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasSyncedTheme, setHasSyncedTheme] = useState(false);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useKeyboardShortcuts([
    {
      key: "k",
      ctrlOrCmd: true,
      handler: () => setIsCmdPaletteOpen((prev) => !prev),
    },
  ]);

  // Listen for custom event trigger from header search button
  useEffect(() => {
    const handleOpen = () => setIsCmdPaletteOpen(true);
    window.addEventListener("open-command-palette", handleOpen);
    return () => window.removeEventListener("open-command-palette", handleOpen);
  }, []);

  // Load sidebar collapse preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar_collapsed");
      setIsSidebarCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    const nextVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextVal);
    localStorage.setItem("sidebar_collapsed", String(nextVal));
  };

  // Close sidebar on navigation change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const fetchMe = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const res = await fetch("/api/v1/auth/me", { signal: controller.signal });
      clearTimeout(timeoutId);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "فشل تحميل جلسة المستخدم");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setUser(json.data);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("fetchMe session error or timeout:", err);
      setError("خطأ في الاتصال بالسيرفر أو انتهت مهلة الجلسة");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, [router]);

  // Sync theme preference from user profile (only once on initial load)
  useEffect(() => {
    if (user?.theme && !hasSyncedTheme) {
      setTheme(user.theme as any);
      setHasSyncedTheme(true);
    }
  }, [user, setTheme, hasSyncedTheme]);

  // Resolve Header Title dynamically based on current path
  const getHeaderTitle = () => {
    if (pathname === "/dashboard") return t("navigation.dashboard");
    if (pathname === "/dashboard/employees") return t("navigation.employees");
    if (pathname.startsWith("/dashboard/employees/")) return t("employees_view.edit_modal_title");
    if (pathname === "/dashboard/clients") return t("navigation.clients");
    if (pathname.startsWith("/dashboard/clients/")) return t("clients_view.notes");
    if (pathname === "/dashboard/followups") return t("navigation.followups");
    if (pathname.startsWith("/dashboard/followups/")) return t("followups_view.planner_title");
    if (pathname === "/dashboard/tasks") return t("navigation.tasks");
    if (pathname.startsWith("/dashboard/tasks/")) return t("tasks_view.board_title");
    if (pathname === "/dashboard/notifications") return t("common.notifications");
    if (pathname === "/dashboard/files") return t("navigation.files");
    if (pathname.startsWith("/dashboard/files/")) return t("files_view.manager_title");
    if (pathname === "/dashboard/reports") return t("navigation.reports");
    if (pathname === "/dashboard/backups") return t("navigation.backups");
    if (pathname === "/dashboard/audit-logs") return t("navigation.auditLogs");
    return "Allurite CRM";
  };

  if (loading) {
    return (
      <div 
        style={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          minHeight: "100vh", 
          backgroundColor: "var(--clr-bg-primary)",
          gap: "var(--sp-4)"
        }}
      >
        <div
          className="animate-spin"
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid var(--clr-border)",
            borderTop: "3px solid var(--clr-accent-primary)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
          جاري التحقق من الجلسة الآمنة...
        </span>
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          minHeight: "100vh", 
          backgroundColor: "var(--clr-bg-primary)" 
        }}
      >
        <div className="c-card" style={{ borderColor: "var(--clr-error)", maxWidth: "500px", textAlign: "center" }}>
          <h3 style={{ color: "var(--clr-error)", marginBottom: "var(--sp-2)" }}>خطأ في الجلسة</h3>
          <p style={{ color: "var(--clr-text-muted)", marginBottom: "var(--sp-4)" }}>{error}</p>
          <p style={{ fontSize: "var(--fs-caption)" }}>جاري توجيهك لصفحة تسجيل الدخول...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, refreshUser: fetchMe }}>
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--clr-bg-primary)" }}>
        {user && (
          <>
            <Sidebar 
              user={user} 
              currentPath={pathname} 
              isMobileOpen={isMobileSidebarOpen} 
              onClose={() => setIsMobileSidebarOpen(false)} 
              isCollapsed={isSidebarCollapsed}
              onToggleCollapsed={toggleSidebar}
            />
            {isMobileSidebarOpen && (
              <div 
                className="c-sidebar-backdrop" 
                onClick={() => setIsMobileSidebarOpen(false)} 
              />
            )}
          </>
        )}
        <div 
          style={{ 
            flex: 1, 
            display: "flex", 
            flexDirection: "column", 
            overflow: "hidden",
            transition: "all 0.3s ease"
          }}
        >
          {user && (
            <Header 
              title={getHeaderTitle()} 
              toggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} 
              isSidebarCollapsed={isSidebarCollapsed}
              toggleSidebar={toggleSidebar}
            />
          )}
          {children}
        </div>
      </div>
      <CommandPalette isOpen={isCmdPaletteOpen} onClose={() => setIsCmdPaletteOpen(false)} />
    </AuthContext.Provider>
  );
}
