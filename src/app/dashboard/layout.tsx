"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

interface UserInfo {
  id: string;
  email: string;
  role: string;
  status: string;
  theme?: string;
  createdAt: string;
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
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
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

  // Close sidebar on navigation change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Failed to load user session");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setUser(json.data);
      }
    } catch (err) {
      setError("Network connection error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, [router]);

  // Sync theme preference from user profile
  useEffect(() => {
    if (user?.theme) {
      setTheme(user.theme as any);
    }
  }, [user, setTheme]);

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
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid var(--clr-border)",
            borderTop: "3px solid var(--clr-accent-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <span style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
          Authenticating session...
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
          <h3 style={{ color: "var(--clr-error)", marginBottom: "var(--sp-2)" }}>Session Error</h3>
          <p style={{ color: "var(--clr-text-muted)", marginBottom: "var(--sp-4)" }}>{error}</p>
          <p style={{ fontSize: "var(--fs-caption)" }}>Redirecting to Login screen...</p>
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
            />
            {isMobileSidebarOpen && (
              <div 
                className="c-sidebar-backdrop" 
                onClick={() => setIsMobileSidebarOpen(false)} 
              />
            )}
          </>
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {user && (
            <Header 
              title={getHeaderTitle()} 
              toggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} 
            />
          )}
          {children}
        </div>
      </div>
    </AuthContext.Provider>
  );
}
