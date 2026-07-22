"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  CheckSquare,
  Clock,
  UserCheck,
  FileText,
  BarChart3,
  Bell,
  Shield,
  Database,
  Settings,
  PlusCircle,
  Sun,
  Moon,
  Globe,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  category: "Navigation" | "Quick Actions" | "Live Search";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { language, setLanguage, isRtl } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liveResults, setLiveResults] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Static items: Navigation & Actions
  const staticItems: CommandItem[] = [
    // Navigation
    {
      id: "nav-dashboard",
      category: "Navigation",
      title: isRtl ? "لوحة التحكم" : "Dashboard Overview",
      subtitle: "/dashboard",
      icon: <BarChart3 size={18} />,
      action: () => {
        router.push("/dashboard");
        onClose();
      },
      keywords: ["home", "main", "overview", "رئيسية", "لوحة"],
    },
    {
      id: "nav-clients",
      category: "Navigation",
      title: isRtl ? "إدارة العملاء والشركات" : "Clients & Accounts",
      subtitle: "/dashboard/clients",
      icon: <Users size={18} />,
      action: () => {
        router.push("/dashboard/clients");
        onClose();
      },
      keywords: ["customers", "accounts", "leads", "عملاء", "شركات"],
    },
    {
      id: "nav-tasks",
      category: "Navigation",
      title: isRtl ? "إدارة المهام والمشاريع" : "Task Board",
      subtitle: "/dashboard/tasks",
      icon: <CheckSquare size={18} />,
      action: () => {
        router.push("/dashboard/tasks");
        onClose();
      },
      keywords: ["todo", "projects", "مهام", "مشاريع"],
    },
    {
      id: "nav-followups",
      category: "Navigation",
      title: isRtl ? "متابعات المبيعات" : "Follow-ups Planner",
      subtitle: "/dashboard/followups",
      icon: <Clock size={18} />,
      action: () => {
        router.push("/dashboard/followups");
        onClose();
      },
      keywords: ["calls", "reminders", "متابعة", "تذكير"],
    },
    {
      id: "nav-employees",
      category: "Navigation",
      title: isRtl ? "فريق العمل والموظفين" : "Employee Directory",
      subtitle: "/dashboard/employees",
      icon: <UserCheck size={18} />,
      action: () => {
        router.push("/dashboard/employees");
        onClose();
      },
      keywords: ["team", "staff", "موظفين", "فريق"],
    },
    {
      id: "nav-files",
      category: "Navigation",
      title: isRtl ? "مكتبة الملفات والمستندات" : "File Manager",
      subtitle: "/dashboard/files",
      icon: <FileText size={18} />,
      action: () => {
        router.push("/dashboard/files");
        onClose();
      },
      keywords: ["documents", "invoices", "ملفات", "مستندات"],
    },
    {
      id: "nav-reports",
      category: "Navigation",
      title: isRtl ? "التقارير والإحصائيات" : "Analytics & Reports",
      subtitle: "/dashboard/reports",
      icon: <BarChart3 size={18} />,
      action: () => {
        router.push("/dashboard/reports");
        onClose();
      },
      keywords: ["analytics", "charts", "تقارير", "إحصائيات"],
    },
    {
      id: "nav-notifications",
      category: "Navigation",
      title: isRtl ? "مركز التنبيهات" : "Notifications Center",
      subtitle: "/dashboard/notifications",
      icon: <Bell size={18} />,
      action: () => {
        router.push("/dashboard/notifications");
        onClose();
      },
      keywords: ["alerts", "تنبيهات", "إشعارات"],
    },
    {
      id: "nav-audit-logs",
      category: "Navigation",
      title: isRtl ? "سجلات الأمان والأحداث" : "Audit Security Logs",
      subtitle: "/dashboard/audit-logs",
      icon: <Shield size={18} />,
      action: () => {
        router.push("/dashboard/audit-logs");
        onClose();
      },
      keywords: ["security", "history", "سجلات", "أمان"],
    },
    {
      id: "nav-backups",
      category: "Navigation",
      title: isRtl ? "النسخ الاحتياطي للنظام" : "System Backups",
      subtitle: "/dashboard/backups",
      icon: <Database size={18} />,
      action: () => {
        router.push("/dashboard/backups");
        onClose();
      },
      keywords: ["backup", "export", "نسخ", "استرجاع"],
    },
    {
      id: "nav-settings",
      category: "Navigation",
      title: isRtl ? "إعدادات النظام" : "System Settings",
      subtitle: "/dashboard/settings",
      icon: <Settings size={18} />,
      action: () => {
        router.push("/dashboard/settings");
        onClose();
      },
      keywords: ["config", "preferences", "إعدادات"],
    },

    // Quick Actions
    {
      id: "act-create-client",
      category: "Quick Actions",
      title: isRtl ? "إضافة عميل جديد" : "Create New Client Profile",
      subtitle: "إضافة عميل مباشر للمنظومة",
      icon: <PlusCircle size={18} />,
      action: () => {
        router.push("/dashboard/clients?action=new");
        onClose();
        toast.info(isRtl ? "جاري فتح نموذج إضافة عميل جديد" : "Opening new client modal");
      },
      keywords: ["add", "new", "create", "جديد", "إضافة"],
    },
    {
      id: "act-create-task",
      category: "Quick Actions",
      title: isRtl ? "إنشاء مهمة عمل جديدة" : "Create New Task",
      subtitle: "إسناد مهمة جديدة للموظفين",
      icon: <PlusCircle size={18} />,
      action: () => {
        router.push("/dashboard/tasks?action=new");
        onClose();
        toast.info(isRtl ? "جاري فتح نموذج إنشاء مهمة" : "Opening new task modal");
      },
      keywords: ["add", "new", "task", "مهمة"],
    },
    {
      id: "act-toggle-theme",
      category: "Quick Actions",
      title: isRtl
        ? `التبديل إلى الوضع ${theme === "dark" ? "الفاتح" : "الداكن"}`
        : `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
      subtitle: isRtl ? "تغيير المظهر العام للنظام" : "Toggle visual theme",
      icon: theme === "dark" ? <Sun size={18} /> : <Moon size={18} />,
      action: () => {
        toggleTheme();
        onClose();
        toast.success(
          isRtl
            ? `تم التبديل إلى الوضع ${theme === "dark" ? "الفاتح" : "الداكن"}`
            : `Switched theme`
        );
      },
      keywords: ["theme", "dark", "light", "مظهر", "وضع"],
    },
    {
      id: "act-toggle-language",
      category: "Quick Actions",
      title: isRtl ? "التبديل إلى اللغة الإنجليزية (English)" : "Switch Language to Arabic (العربية)",
      subtitle: isRtl ? "Change locale" : "تغيير لغة الواجهة",
      icon: <Globe size={18} />,
      action: () => {
        const nextLang = language === "ar" ? "en" : "ar";
        setLanguage(nextLang);
        onClose();
        toast.success(nextLang === "ar" ? "تم التغيير إلى اللغة العربية" : "Switched to English");
      },
      keywords: ["lang", "language", "arabic", "english", "لغة"],
    },
  ];

  // Fetch live search results when query is >= 2 chars
  const fetchLiveSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      setLiveResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [clientsRes, tasksRes] = await Promise.all([
        fetch(`/api/v1/clients?search=${encodeURIComponent(searchTerm)}&limit=4`).catch(() => null),
        fetch(`/api/v1/tasks?search=${encodeURIComponent(searchTerm)}&limit=4`).catch(() => null),
      ]);

      const results: CommandItem[] = [];

      if (clientsRes && clientsRes.ok) {
        const cJson = await clientsRes.json();
        const clientsList = cJson.data?.clients || cJson.data || [];
        if (Array.isArray(clientsList)) {
          clientsList.slice(0, 4).forEach((client: any) => {
            results.push({
              id: `live-client-${client._id}`,
              category: "Live Search",
              title: client.name || client.companyName || "عميل بدون اسم",
              subtitle: `عميل • ${client.phone || client.email || client.status || ""}`,
              icon: <Users size={18} />,
              action: () => {
                router.push(`/dashboard/clients?id=${client._id}`);
                onClose();
              },
            });
          });
        }
      }

      if (tasksRes && tasksRes.ok) {
        const tJson = await tasksRes.json();
        const tasksList = tJson.data?.tasks || tJson.data || [];
        if (Array.isArray(tasksList)) {
          tasksList.slice(0, 4).forEach((task: any) => {
            results.push({
              id: `live-task-${task._id}`,
              category: "Live Search",
              title: task.title || "مهمة بدون عنوان",
              subtitle: `مهمة • الحالة: ${task.status || "قيد الانتظار"}`,
              icon: <CheckSquare size={18} />,
              action: () => {
                router.push(`/dashboard/tasks?id=${task._id}`);
                onClose();
              },
            });
          });
        }
      }

      setLiveResults(results);
    } catch (err) {
      console.error("Live search command palette error", err);
    } finally {
      setLoading(false);
    }
  }, [router, onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        fetchLiveSearch(query);
      } else {
        setLiveResults([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, fetchLiveSearch]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter static items by query
  const filteredStaticItems = staticItems.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const matchTitle = item.title.toLowerCase().includes(q);
    const matchSub = item.subtitle?.toLowerCase().includes(q);
    const matchKW = item.keywords?.some((k) => k.toLowerCase().includes(q));
    return matchTitle || matchSub || matchKW;
  });

  const allItems = [...liveResults, ...filteredStaticItems];

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Keep selected index in scroll view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="قائمة الأوامر والبحث السريع"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(8px)",
        zIndex: 9990,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "min(12vh, 120px)",
        paddingLeft: "16px",
        paddingRight: "16px",
        animation: "paletteFade 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          maxWidth: "640px",
          backgroundColor: "var(--clr-bg-card, #0F172A)",
          borderRadius: "var(--radius-xl, 16px)",
          border: "1px solid var(--clr-border, #1E293B)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 210, 255, 0.15)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "palettePop 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Search Header Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--clr-border, #1E293B)",
            gap: "12px",
            backgroundColor: "var(--clr-bg-surface, #131A26)",
          }}
        >
          <Search size={22} style={{ color: "var(--clr-accent-primary, #00D2FF)", flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={
              isRtl
                ? "ابحث عن أي شيء، صفحة، عميل، أو اكتب أمر مباشر... (Cmd+K)"
                : "Type a command or search anything... (Cmd+K)"
            }
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--clr-text-primary, #F8FAFC)",
              fontSize: "16px",
              fontFamily: "inherit",
            }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--clr-text-muted)",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <X size={18} />
            </button>
          )}
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--clr-text-muted)",
              backgroundColor: "var(--clr-bg-primary, #090D16)",
              padding: "3px 8px",
              borderRadius: "6px",
              border: "1px solid var(--clr-border)",
            }}
          >
            ESC
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            maxHeight: "380px",
            overflowY: "auto",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                gap: "10px",
                color: "var(--clr-accent-primary)",
                fontSize: "14px",
              }}
            >
              <Sparkles size={18} className="animate-spin" />
              <span>جاري البحث الذكي...</span>
            </div>
          )}

          {!loading && allItems.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--clr-text-muted)",
              }}
            >
              <Search size={32} style={{ opacity: 0.3, marginBottom: "10px" }} />
              <div style={{ fontSize: "14px", fontWeight: 500 }}>
                لم يتم العثور على نتائج لـ &quot;{query}&quot;
              </div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                جرّب البحث باسم عميل، مهمة، أو تنقل للصفحات
              </div>
            </div>
          )}

          {!loading &&
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    backgroundColor: isSelected
                      ? "rgba(0, 210, 255, 0.12)"
                      : "transparent",
                    border: isSelected
                      ? "1px solid rgba(0, 210, 255, 0.3)"
                      : "1px solid transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      color: isSelected
                        ? "var(--clr-accent-primary, #00D2FF)"
                        : "var(--clr-text-muted, #94A3B8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected
                          ? "var(--clr-text-primary, #F8FAFC)"
                          : "var(--clr-text-secondary, #CBD5E1)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--clr-text-muted, #94A3B8)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: "2px",
                        }}
                      >
                        {item.subtitle}
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: isSelected ? "var(--clr-accent-primary)" : "var(--clr-text-muted)",
                      backgroundColor: isSelected
                        ? "rgba(0, 210, 255, 0.15)"
                        : "rgba(255, 255, 255, 0.05)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.category}
                  </span>

                  {isSelected && (
                    <ArrowRight
                      size={14}
                      style={{
                        color: "var(--clr-accent-primary)",
                        transform: isRtl ? "rotate(180deg)" : "none",
                      }}
                    />
                  )}
                </div>
              );
            })}
        </div>

        {/* Command Palette Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderTop: "1px solid var(--clr-border, #1E293B)",
            backgroundColor: "var(--clr-bg-surface, #131A26)",
            fontSize: "11px",
            color: "var(--clr-text-muted)",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span>
              <strong style={{ color: "var(--clr-text-primary)" }}>↑↓</strong> للتنقل
            </span>
            <span>
              <strong style={{ color: "var(--clr-text-primary)" }}>↵</strong> للاختيار
            </span>
            <span>
              <strong style={{ color: "var(--clr-text-primary)" }}>ESC</strong> للإغلاق
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--clr-accent-primary)" }}>
            <Sparkles size={12} />
            <span>Allurite Cmd Launcher</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes paletteFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes palettePop {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
