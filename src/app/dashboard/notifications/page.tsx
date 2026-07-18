"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../layout";
import { 
  Search, 
  Trash2, 
  CheckCheck, 
  Bell, 
  Clock, 
  ShieldAlert, 
  FileText, 
  User, 
  AlertTriangle,
  X,
  Sliders,
  Eye,
  Settings,
  ChevronRight,
  ExternalLink,
  Save,
  CheckCircle2
} from "lucide-react";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  category: "Task" | "Follow-Up" | "Client" | "Employee" | "System" | "Security";
  priority: "Low" | "Normal" | "High" | "Critical";
  actionUrl?: string;
  readAt?: string;
  createdAt: string;
}

export default function NotificationCenterPage() {
  const router = useRouter();
  const { user: currentUser, refreshUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Data states
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeNotification, setActiveNotification] = useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter parameters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Tabs on right panel: "details" | "preferences"
  const [rightPanelTab, setRightPanelTab] = useState<"details" | "preferences">("details");

  // User preference form states
  const [prefsForm, setPrefsForm] = useState({
    taskAlerts: true,
    followUpAlerts: true,
    clientAlerts: true,
    systemAlerts: true,
  });
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState("");

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        priority: selectedPriority,
        read: selectedStatus,
        search: searchTerm,
      });

      const res = await fetch(`/api/v1/notifications?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load notifications");
      }
      setNotifications(json.data);
      
      // Keep active item reference updated if it exists in list
      if (activeNotification) {
        const found = json.data.find((n: NotificationItem) => n._id === activeNotification._id);
        if (found) setActiveNotification(found);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Sync preference state from logged-in user
  useEffect(() => {
    // If the authenticated user profile has preference records, sync them to form state
    if (currentUser) {
      const userPrefs = (currentUser as any).notificationPreferences || {
        taskAlerts: true,
        followUpAlerts: true,
        clientAlerts: true,
        systemAlerts: true,
      };
      setPrefsForm(userPrefs);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
  }, [selectedCategory, selectedPriority, selectedStatus, searchTerm]);

  // Click individual card (Select and mark read)
  const handleSelectNotification = async (notif: NotificationItem) => {
    setActiveNotification(notif);
    setRightPanelTab("details");

    if (!notif.read) {
      try {
        const res = await fetch(`/api/v1/notifications/${notif._id}`, {
          method: "PUT",
        });
        if (res.ok) {
          // Update in local state
          setNotifications(prev => 
            prev.map(n => n._id === notif._id ? { ...n, read: true, readAt: new Date().toISOString() } : n)
          );
          if (activeNotification?._id === notif._id) {
            setActiveNotification(prev => prev ? { ...prev, read: true, readAt: new Date().toISOString() } : null);
          }
        }
      } catch (err) {
        console.error("Failed to mark notification read", err);
      }
    }
  };

  // Bulk mark all read
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/v1/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Soft Delete a notification
  const handleDeleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/notifications/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActiveNotification(null);
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk delete all currently filtered notifications
  const handleClearHistory = async () => {
    try {
      // Loop and soft delete all listed items
      const deletePromises = notifications.map(n => 
        fetch(`/api/v1/notifications/${n._id}`, { method: "DELETE" })
      );
      await Promise.all(deletePromises);
      setActiveNotification(null);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Save alerts preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsLoading(true);
    setPrefsSuccess("");
    try {
      const res = await fetch("/api/v1/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefsForm }),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      
      setPrefsSuccess("Preferences saved successfully!");
      refreshUser(); // Refresh user details in Auth context
    } catch (err: any) {
      setError(err.message || "Failed saving preferences");
    } finally {
      setPrefsLoading(false);
    }
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case "Critical": return "var(--clr-error)";
      case "High": return "var(--clr-warning)";
      case "Low": return "var(--clr-text-muted)";
      default: return "var(--clr-accent-primary)";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Task": return <FileText size={18} />;
      case "Follow-Up": return <Clock size={18} />;
      case "Client": return <User size={18} />;
      case "Security": return <ShieldAlert size={18} />;
      default: return <Bell size={18} />;
    }
  };

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      
      {/* Search and Filters Toolbar */}
      <div 
        style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          gap: "var(--sp-4)", 
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--sp-4)",
          backgroundColor: "var(--clr-bg-surface)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--clr-border)",
        }}
      >
        {/* Search */}
        <div style={{ display: "flex", flex: 1, minWidth: "260px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search 
              size={18} 
              style={{ 
                position: "absolute", 
                left: "12px", 
                top: "50%", 
                transform: "translateY(-50%)", 
                color: "var(--clr-text-muted)" 
              }} 
            />
            <input 
              type="text" 
              placeholder="Search notifications title/message..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="c-input__field"
              style={{ paddingLeft: "40px", width: "100%", height: "42px" }}
            />
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="c-input__field"
            style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "120px", background: "var(--clr-bg-primary)" }}
          >
            <option value="">All Categories</option>
            <option value="Task">Tasks 📋</option>
            <option value="Follow-Up">Follow-Ups ⏰</option>
            <option value="Client">Clients 👥</option>
            <option value="Employee">Staff 💼</option>
            <option value="System">System 🖥️</option>
            <option value="Security">Security 🔒</option>
          </select>

          {/* Priority */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="c-input__field"
            style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "110px", background: "var(--clr-bg-primary)" }}
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical 🚨</option>
            <option value="High">High ⚠️</option>
            <option value="Normal">Normal ℹ️</option>
            <option value="Low">Low 💤</option>
          </select>

          {/* Read Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="c-input__field"
            style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "110px", background: "var(--clr-bg-primary)" }}
          >
            <option value="">All Status</option>
            <option value="false">Unread Only</option>
            <option value="true">Read Only</option>
          </select>
        </div>
      </div>

      {/* Grid: Left Panel (List) & Right Panel (Details/Prefs) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "var(--sp-6)", alignItems: "flex-start", flex: 1 }}>
        
        {/* Left Column: List Card */}
        <section 
          className="c-card" 
          style={{ 
            padding: 0, 
            display: "flex", 
            flexDirection: "column", 
            overflow: "hidden", 
            minHeight: "560px",
            maxHeight: "720px"
          }}
        >
          {/* List Toolbar Actions */}
          <div 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              padding: "var(--sp-4)", 
              borderBottom: "1px solid var(--clr-border)",
              backgroundColor: "rgba(4, 13, 33, 0.4)"
            }}
          >
            <span style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)" }}>
              Loaded Alerts ({notifications.length})
            </span>
            <div style={{ display: "flex", gap: "var(--sp-3)" }}>
              <button 
                onClick={handleMarkAllRead} 
                disabled={notifications.filter(n => !n.read).length === 0}
                className="c-btn c-btn--secondary" 
                style={{ padding: "var(--sp-2) var(--sp-3)", fontSize: "11px", gap: "var(--sp-1)" }}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
              <button 
                onClick={handleClearHistory} 
                disabled={notifications.length === 0}
                className="c-btn c-btn--secondary clear-history-btn" 
                style={{ padding: "var(--sp-2) var(--sp-3)", fontSize: "11px", borderColor: "rgba(229, 62, 62, 0.4)", color: "var(--clr-error)", gap: "var(--sp-1)" }}
              >
                <Trash2 size={14} />
                <span>Clear list</span>
              </button>
            </div>
          </div>

          {/* List Scroll Area */}
          <div style={{ overflowY: "auto", flex: 1, backgroundColor: "rgba(4, 13, 33, 0.15)" }}>
            {loading ? (
              <div style={{ padding: "var(--sp-12)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                Loading notification logs...
              </div>
            ) : error ? (
              <div style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-error)" }}>
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--sp-12)", gap: "var(--sp-3)", color: "var(--clr-text-muted)" }}>
                <Bell size={40} style={{ opacity: 0.2 }} />
                <span style={{ fontSize: "var(--fs-body-sm)" }}>No notifications match your filter criteria</span>
              </div>
            ) : (
              notifications.map((notif) => {
                const isActive = activeNotification?._id === notif._id;
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleSelectNotification(notif)}
                    style={{
                      padding: "var(--sp-4)",
                      borderBottom: "1px solid var(--clr-border)",
                      display: "flex",
                      gap: "var(--sp-4)",
                      cursor: "pointer",
                      backgroundColor: isActive 
                        ? "rgba(0, 210, 255, 0.05)" 
                        : !notif.read 
                        ? "rgba(0, 210, 255, 0.02)" 
                        : "transparent",
                      borderLeft: !notif.read ? `3px solid ${getPriorityColor(notif.priority)}` : "3px solid transparent",
                      transition: "var(--transition-fast)"
                    }}
                    className="notif-row-hover"
                  >
                    <div style={{ color: getPriorityColor(notif.priority), flexShrink: 0 }}>
                      {getCategoryIcon(notif.category)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                        <h4 
                          style={{ 
                            fontSize: "var(--fs-body-sm)", 
                            fontWeight: !notif.read ? "var(--fw-bold)" : "var(--fw-medium)", 
                            color: !notif.read ? "var(--clr-text-primary)" : "var(--clr-text-muted)",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            paddingRight: "8px"
                          }}
                        >
                          {notif.title}
                        </h4>
                        <span style={{ fontSize: "9px", color: "var(--clr-text-muted)", flexShrink: 0 }}>
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p 
                        style={{ 
                          fontSize: "var(--fs-caption)", 
                          color: "var(--clr-text-muted)", 
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {notif.message}
                      </p>
                    </div>
                    <ChevronRight size={16} style={{ color: "var(--clr-text-muted)", alignSelf: "center" }} />
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Details or Preferences */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          {/* Header tab buttons */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--clr-border)", gap: "var(--sp-4)" }}>
            <button
              onClick={() => setRightPanelTab("details")}
              className="tab-btn"
              style={{
                padding: "var(--sp-2) var(--sp-4)",
                background: "none",
                border: "none",
                borderBottom: rightPanelTab === "details" ? "2px solid var(--clr-accent-primary)" : "2px solid transparent",
                color: rightPanelTab === "details" ? "var(--clr-text-primary)" : "var(--clr-text-muted)",
                fontWeight: rightPanelTab === "details" ? "var(--fw-bold)" : "var(--fw-medium)",
                cursor: "pointer",
                fontSize: "var(--fs-body-sm)"
              }}
            >
              <Eye size={14} style={{ marginRight: "6px", display: "inline", verticalAlign: "middle" }} />
              <span style={{ verticalAlign: "middle" }}>Detail Inspector</span>
            </button>
            <button
              onClick={() => setRightPanelTab("preferences")}
              className="tab-btn"
              style={{
                padding: "var(--sp-2) var(--sp-4)",
                background: "none",
                border: "none",
                borderBottom: rightPanelTab === "preferences" ? "2px solid var(--clr-accent-primary)" : "2px solid transparent",
                color: rightPanelTab === "preferences" ? "var(--clr-text-primary)" : "var(--clr-text-muted)",
                fontWeight: rightPanelTab === "preferences" ? "var(--fw-bold)" : "var(--fw-medium)",
                cursor: "pointer",
                fontSize: "var(--fs-body-sm)"
              }}
            >
              <Settings size={14} style={{ marginRight: "6px", display: "inline", verticalAlign: "middle" }} />
              <span style={{ verticalAlign: "middle" }}>Alert Preferences</span>
            </button>
          </div>

          {/* Details Tab content */}
          {rightPanelTab === "details" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              {!activeNotification ? (
                <div 
                  className="c-card" 
                  style={{ 
                    textAlign: "center", 
                    padding: "var(--sp-12)", 
                    color: "var(--clr-text-muted)",
                    minHeight: "480px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "var(--sp-2)"
                  }}
                >
                  <Eye size={36} style={{ opacity: 0.2 }} />
                  <p style={{ fontSize: "var(--fs-body-sm)" }}>Select an alert from the checklist to inspect logs</p>
                </div>
              ) : (
                <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)", minHeight: "480px", position: "relative" }}>
                  {/* Category Pill and Priority Badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span 
                      className="c-badge" 
                      style={{ 
                        backgroundColor: "rgba(0, 210, 255, 0.08)", 
                        color: "var(--clr-accent-primary)",
                        padding: "4px 10px",
                        fontSize: "var(--fs-caption)"
                      }}
                    >
                      {activeNotification.category} Alert
                    </span>
                    <span 
                      className="c-badge"
                      style={{ 
                        border: `1px solid ${getPriorityColor(activeNotification.priority)}`,
                        color: getPriorityColor(activeNotification.priority),
                        backgroundColor: "transparent"
                      }}
                    >
                      {activeNotification.priority} Priority
                    </span>
                  </div>

                  {/* Title & Message */}
                  <div>
                    <h3 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)", marginBottom: "var(--sp-3)" }}>
                      {activeNotification.title}
                    </h3>
                    <p style={{ color: "var(--clr-text-primary)", fontSize: "var(--fs-body-sm)", lineHeight: "1.6", whiteSpace: "pre-line" }}>
                      {activeNotification.message}
                    </p>
                  </div>

                  {/* Audit details */}
                  <div 
                    style={{ 
                      marginTop: "auto", 
                      paddingTop: "var(--sp-4)", 
                      borderTop: "1px solid var(--clr-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--sp-2)",
                      fontSize: "var(--fs-caption)",
                      color: "var(--clr-text-muted)"
                    }}
                  >
                    <div>Generated: {new Date(activeNotification.createdAt).toLocaleString()}</div>
                    {activeNotification.readAt && (
                      <div style={{ color: "var(--clr-success)" }}>
                        Read Acknowledgement: {new Date(activeNotification.readAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div style={{ display: "flex", gap: "var(--sp-3)", marginTop: "var(--sp-2)" }}>
                    {activeNotification.actionUrl && (
                      <button
                        onClick={() => router.push(activeNotification.actionUrl!)}
                        className="c-btn c-btn--primary"
                        style={{ flex: 1, gap: "var(--sp-2)", justifyContent: "center" }}
                      >
                        <ExternalLink size={16} />
                        <span>Navigate to File</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(activeNotification._id)}
                      className="c-btn c-btn--secondary delete-alert-btn"
                      style={{ borderColor: "rgba(229,62,62,0.4)", color: "var(--clr-error)", gap: "var(--sp-2)", justifyContent: "center", flex: activeNotification.actionUrl ? "0 0 110px" : 1 }}
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Preferences Tab content */}
          {rightPanelTab === "preferences" && (
            <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", minHeight: "480px" }}>
              <div style={{ borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
                <h3 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)" }}>Channel Alert Configuration</h3>
                <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                  Toggle which categories dispatch real-time system alerts
                </p>
              </div>

              {prefsSuccess && (
                <div style={{ backgroundColor: "rgba(56, 161, 105, 0.12)", border: "1px solid var(--clr-success)", color: "var(--clr-success)", borderRadius: "var(--radius-md)", padding: "var(--sp-3)", fontSize: "var(--fs-body-sm)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                  <CheckCircle2 size={16} />
                  <span>{prefsSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSavePreferences} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)", marginTop: "var(--sp-2)" }}>
                
                {/* Tasks toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <label style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)", display: "block" }}>
                      Task Alerts & Reviews
                    </label>
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>
                      Assignments, review submissions, and approvals
                    </span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={prefsForm.taskAlerts}
                    onChange={(e) => setPrefsForm(p => ({ ...p, taskAlerts: e.target.checked }))}
                    style={{ width: "20px", height: "20px", accentColor: "var(--clr-accent-primary)", cursor: "pointer" }}
                  />
                </div>

                {/* Followups toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <label style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)", display: "block" }}>
                      Follow-Up Reminders
                    </label>
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>
                      Upcoming appointments and overdue follow-up tasks
                    </span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={prefsForm.followUpAlerts}
                    onChange={(e) => setPrefsForm(p => ({ ...p, followUpAlerts: e.target.checked }))}
                    style={{ width: "20px", height: "20px", accentColor: "var(--clr-accent-primary)", cursor: "pointer" }}
                  />
                </div>

                {/* Client toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <label style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)", display: "block" }}>
                      Client Assignments
                    </label>
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>
                      Alerts when new client profiles are bound to your account
                    </span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={prefsForm.clientAlerts}
                    onChange={(e) => setPrefsForm(p => ({ ...p, clientAlerts: e.target.checked }))}
                    style={{ width: "20px", height: "20px", accentColor: "var(--clr-accent-primary)", cursor: "pointer" }}
                  />
                </div>

                {/* System toggle */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <label style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)", display: "block" }}>
                      General System Alerts
                    </label>
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>
                      Backup statuses, employee updates, and system events
                    </span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={prefsForm.systemAlerts}
                    onChange={(e) => setPrefsForm(p => ({ ...p, systemAlerts: e.target.checked }))}
                    style={{ width: "20px", height: "20px", accentColor: "var(--clr-accent-primary)", cursor: "pointer" }}
                  />
                </div>

                {/* Security info banner */}
                <div style={{ display: "flex", gap: "var(--sp-3)", padding: "var(--sp-3) var(--sp-4)", backgroundColor: "rgba(229,178,8,0.06)", border: "1px dashed rgba(229,178,8,0.4)", borderRadius: "var(--radius-md)" }}>
                  <ShieldAlert size={18} style={{ color: "var(--clr-warning)", flexShrink: 0, marginTop: "2px" }} />
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--clr-text-muted)", lineHeight: "1.4" }}>
                    <strong>Note:</strong> Security alerts and Critical priority logs bypass these preference configurations and are always delivered.
                  </p>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={prefsLoading}
                  className="c-btn c-btn--primary"
                  style={{ gap: "var(--sp-2)", justifyContent: "center", marginTop: "var(--sp-4)", boxShadow: "var(--shadow-glow-accent)" }}
                >
                  {prefsLoading ? <div className="btn-spinner" /> : <Save size={16} />}
                  <span>Save Gated Rules</span>
                </button>
              </form>
            </section>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(4,13,33,0.3);
          border-top: 2px solid var(--clr-text-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .notif-row-hover:hover {
          background-color: rgba(0, 210, 255, 0.04) !important;
        }
        .clear-history-btn:hover {
          background-color: rgba(229, 62, 62, 0.05) !important;
          border-color: var(--clr-error) !important;
        }
        .delete-alert-btn:hover {
          background-color: rgba(229, 62, 62, 0.05) !important;
          border-color: var(--clr-error) !important;
        }
        .hover-bright:hover {
          color: var(--clr-text-primary) !important;
        }
      `}</style>
    </main>
  );
}
