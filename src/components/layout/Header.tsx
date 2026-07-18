"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Shield, User, Check, Trash2, Calendar, AlertCircle, Clock, ShieldAlert, FileText, CheckCircle, Sun, Moon, Menu } from "lucide-react";
import { useAuth } from "@/app/dashboard/layout";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: "Reminder" | "Overdue" | "System";
  category?: "Task" | "Follow-Up" | "Client" | "Employee" | "System" | "Security";
  priority?: "Low" | "Normal" | "High" | "Critical";
  actionUrl?: string;
  createdAt: string;
}

interface HeaderProps {
  title: string;
  toggleMobileSidebar?: () => void;
}

export default function Header({ title, toggleMobileSidebar }: HeaderProps) {
  const { user } = useAuth();
  const { language, setLanguage, isRtl } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/v1/notifications");
      const json = await res.json();
      if (res.ok) {
        setNotifications(json.data);
      }
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds for real-time reminders
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/v1/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  };

  const markSingleRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch("/api/v1/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
    } catch (err) {
      console.error("Failed to mark single notification read", err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    // 1. Mark as read
    await markSingleRead(notif._id);
    setIsOpen(false);
    // 2. Redirect if actionUrl is defined
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    }
  };

  const getPriorityColor = (prio?: string) => {
    switch (prio) {
      case "Critical": return "var(--clr-error)";
      case "High": return "var(--clr-warning)";
      case "Low": return "var(--clr-text-muted)";
      default: return "var(--clr-accent-primary)";
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "Task": return <FileText size={16} />;
      case "Follow-Up": return <Clock size={16} />;
      case "Client": return <User size={16} />;
      case "Security": return <ShieldAlert size={16} />;
      default: return <Bell size={16} />;
    }
  };

  return (
    <header
      style={{
        height: "70px",
        padding: "0 var(--sp-8)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--clr-border)",
        background: "rgba(3, 7, 18, 0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Page Title */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {toggleMobileSidebar && (
          <button
            onClick={toggleMobileSidebar}
            className="hamburger-btn"
            style={{
              background: "none",
              border: "none",
              color: "var(--clr-text-primary)",
              cursor: "pointer",
              marginRight: isRtl ? "none" : "var(--sp-3)",
              marginLeft: isRtl ? "var(--sp-3)" : "none",
              padding: "4px",
              display: "flex",
              alignItems: "center"
            }}
          >
            <Menu size={22} />
          </button>
        )}
        <h1 style={{ fontSize: "var(--fs-h3)", fontWeight: "var(--fw-bold)", fontFamily: "Outfit" }}>
          {title}
        </h1>
      </div>

      {/* Right Controls: Bell and User */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-6)" }}>
        

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: "none",
            border: "none",
            color: "var(--clr-accent-primary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--sp-2)",
            borderRadius: "50%",
            transition: "var(--transition-fast)"
          }}
          className="bell-btn-hover"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notification Bell */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button
            onClick={() => { setIsOpen(!isOpen); fetchNotifications(); }}
            style={{
              background: "none",
              border: "none",
              color: isOpen ? "var(--clr-accent-primary)" : "var(--clr-text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "var(--sp-2)",
              borderRadius: "50%",
              transition: "var(--transition-fast)",
              position: "relative"
            }}
            className="bell-btn-hover"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  right: "2px",
                  backgroundColor: "var(--clr-error)",
                  color: "#FFFFFF",
                  fontSize: "9px",
                  fontWeight: "bold",
                  minWidth: "16px",
                  height: "16px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  border: "2px solid var(--clr-bg-primary)"
                }}
              >
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isOpen && (
            <div
              className="c-card c-card--glow"
              style={{
                position: "absolute",
                right: 0,
                top: "45px",
                width: "360px",
                maxHeight: "440px",
                display: "flex",
                flexDirection: "column",
                padding: 0,
                zIndex: 200,
                overflow: "hidden",
                boxShadow: "var(--shadow-lg)",
                animation: "fadeSlide 0.2s ease-out"
              }}
            >
              {/* Dropdown Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-3) var(--sp-4)",
                  borderBottom: "1px solid var(--clr-border)",
                  backgroundColor: "rgba(4, 13, 33, 0.6)"
                }}
              >
                <span style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)" }}>Reminders Center</span>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--clr-accent-primary)",
                      cursor: "pointer",
                      fontSize: "var(--fs-caption)",
                      fontWeight: "var(--fw-medium)"
                    }}
                    className="hover-bright"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div style={{ overflowY: "auto", flex: 1, backgroundColor: "var(--clr-bg-surface)" }}>
                {notifications.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--sp-8)", gap: "var(--sp-2)", color: "var(--clr-text-muted)" }}>
                    <Bell size={24} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: "var(--fs-caption)" }}>You have no unread notifications</span>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isHighOrCritical = notif.priority === "High" || notif.priority === "Critical" || notif.type === "Overdue";
                    return (
                      <div
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: "var(--sp-3) var(--sp-4)",
                          borderBottom: "1px solid var(--clr-border)",
                          display: "flex",
                          gap: "var(--sp-3)",
                          position: "relative",
                          cursor: "pointer",
                          transition: "var(--transition-fast)"
                        }}
                        className="notif-item-hover"
                      >
                        <div style={{ color: getPriorityColor(notif.priority), marginTop: "2px", flexShrink: 0 }}>
                          {getCategoryIcon(notif.category)}
                        </div>
                        <div style={{ flex: 1, paddingRight: "20px" }}>
                          <div style={{ fontWeight: "var(--fw-medium)", fontSize: "var(--fs-body-sm)", color: isHighOrCritical ? "var(--clr-error)" : "var(--clr-text-primary)" }}>
                            {notif.title}
                          </div>
                          <p style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px", lineHeight: "1.4" }}>
                            {notif.message}
                          </p>
                          <span style={{ fontSize: "9px", color: "var(--clr-text-muted)", display: "block", marginTop: "4px" }}>
                            {new Date(notif.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        
                        {/* Checkmark read button */}
                        <button
                          onClick={(e) => markSingleRead(notif._id, e)}
                          style={{
                            position: "absolute",
                            top: "12px",
                            right: "12px",
                            background: "none",
                            border: "none",
                            color: "var(--clr-text-muted)",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center"
                          }}
                          className="check-btn-hover"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer */}
              <div
                style={{
                  borderTop: "1px solid var(--clr-border)",
                  backgroundColor: "rgba(4, 13, 33, 0.6)",
                  textAlign: "center"
                }}
              >
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setIsOpen(false)}
                  style={{
                    display: "block",
                    padding: "var(--sp-2) var(--sp-4)",
                    color: "var(--clr-accent-primary)",
                    fontSize: "var(--fs-caption)",
                    fontWeight: "var(--fw-bold)",
                    textDecoration: "none",
                    transition: "var(--transition-fast)"
                  }}
                  className="hover-bright"
                >
                  View All Notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", borderLeft: "1px solid var(--clr-border)", paddingLeft: "var(--sp-6)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-bold)", color: "var(--clr-text-primary)" }}>
                {user.email.split("@")[0]}
              </span>
              <span className="c-badge c-badge--info" style={{ padding: "0 var(--sp-2)", fontSize: "9px", textTransform: "none", marginTop: "2px" }}>
                {user.role}
              </span>
            </div>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "var(--clr-border)",
                border: "1px solid var(--clr-accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--clr-accent-primary)"
              }}
            >
              <User size={18} />
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bell-btn-hover:hover {
          color: var(--clr-text-primary) !important;
          background-color: rgba(255,255,255,0.05) !important;
        }
        .notif-item-hover:hover {
          background-color: rgba(0, 210, 255, 0.02) !important;
        }
        .check-btn-hover:hover {
          color: var(--clr-success) !important;
        }
        .hover-bright:hover {
          color: var(--clr-text-primary) !important;
        }
      `}</style>
    </header>
  );
}
