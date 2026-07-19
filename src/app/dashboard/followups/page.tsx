"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../layout";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X,
  Phone,
  Mail,
  Users,
  Video,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  Briefcase,
  UserPlus
} from "lucide-react";

interface FollowUpItem {
  _id: string;
  title: string;
  description?: string;
  type: "Call" | "Email" | "Meeting" | "Demo" | "Other";
  scheduledAt: string;
  status: "Pending" | "Scheduled" | "Completed" | "Missed" | "Cancelled";
  notes?: string;
  client: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    companyName?: string;
  };
  assignedAgent: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface ClientSummary {
  _id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}

interface AgentSummary {
  _id: string;
  firstName: string;
  lastName: string;
  user: {
    email: string;
  };
}

export default function FollowUpsPage() {
  const { user: currentUser } = useAuth();
  const { t, isRtl } = useLanguage();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Data states
  const [followups, setFollowups] = useState<FollowUpItem[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab State: "today" | "upcoming" | "missed" | "completed"
  const [activeTab, setActiveTab] = useState<"today" | "upcoming" | "missed" | "completed">("today");

  // Search & Filter parameters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formFields, setFormFields] = useState({
    client: "",
    title: "",
    description: "",
    type: "Call",
    scheduledAt: "",
    assignedAgentId: "",
  });
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch follow-ups list
  const fetchFollowUps = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch a larger limit to partition client-side or we can fetch per category,
      // but fetching the full set allows smooth tab switching. We filter by status
      // or fetch all active. Let's fetch all and filter in memory for best responsiveness.
      const params = new URLSearchParams({
        limit: "250",
        type: selectedType,
        assignedAgent: selectedAgent,
      });

      const res = await fetch(`/api/v1/followups?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to fetch follow-ups");
      }
      setFollowups(json.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch client details (for dropdown selection)
  const fetchClients = async () => {
    try {
      const res = await fetch("/api/v1/clients?limit=100");
      const json = await res.json();
      if (res.ok) {
        setClients(json.data);
      }
    } catch (err) {
      console.error("Failed to load clients list", err);
    }
  };

  // Fetch agents list if SuperAdmin
  const fetchAgents = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch("/api/v1/employees?limit=100");
      const json = await res.json();
      if (res.ok) {
        setAgents(json.data);
      }
    } catch (err) {
      console.error("Failed to load employees list", err);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [selectedType, selectedAgent]);

  useEffect(() => {
    if (isModalOpen) {
      fetchClients();
      fetchAgents();
    }
  }, [isModalOpen]);

  // Submit Schedule form
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!formFields.client || !formFields.title.trim() || !formFields.scheduledAt) {
      setModalError("Please select a client, enter a title, and pick a schedule date");
      return;
    }

    const parsedDate = new Date(formFields.scheduledAt);
    if (parsedDate < new Date()) {
      setModalError("A follow-up cannot be scheduled in the past");
      return;
    }

    if (isSuperAdmin && !formFields.assignedAgentId) {
      setModalError("Please select an assigned agent employee");
      return;
    }

    setModalLoading(true);
    try {
      const res = await fetch("/api/v1/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formFields),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to schedule follow-up");
      }

      fetchFollowUps();
      setIsModalOpen(false);
      setFormFields({
        client: "",
        title: "",
        description: "",
        type: "Call",
        scheduledAt: "",
        assignedAgentId: "",
      });
    } catch (err: any) {
      setModalError(err.message || "Error scheduling follow-up");
    } finally {
      setModalLoading(false);
    }
  };

  // Categorize follow-ups in memory
  const getCategorizedFollowUps = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Apply text search first
    const filtered = followups.filter(fup => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const clientName = `${fup.client?.firstName || ""} ${fup.client?.lastName || ""}`.toLowerCase();
      return (
        fup.title.toLowerCase().includes(searchLower) ||
        fup.type.toLowerCase().includes(searchLower) ||
        clientName.includes(searchLower)
      );
    });

    switch (activeTab) {
      case "today":
        return filtered.filter(fup => {
          if (fup.status !== "Scheduled" && fup.status !== "Pending") return false;
          const schedDate = new Date(fup.scheduledAt);
          return schedDate >= today && schedDate < tomorrow;
        });

      case "upcoming":
        return filtered.filter(fup => {
          if (fup.status !== "Scheduled" && fup.status !== "Pending") return false;
          const schedDate = new Date(fup.scheduledAt);
          return schedDate >= tomorrow;
        });

      case "missed":
        return filtered.filter(fup => fup.status === "Missed");

      case "completed":
        return filtered.filter(fup => fup.status === "Completed" || fup.status === "Cancelled");

      default:
        return filtered;
    }
  };

  const activeList = getCategorizedFollowUps();

  // Helper to resolve Icons
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Call": return <Phone size={16} />;
      case "Email": return <Mail size={16} />;
      case "Meeting": return <Users size={16} />;
      case "Demo": return <Video size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Scheduled":
      case "Pending":
        return <span className="c-badge c-badge--info">Scheduled</span>;
      case "Completed":
        return <span className="c-badge c-badge--success">Completed</span>;
      case "Missed":
        return <span className="c-badge c-badge--error" style={{ display: "inline-flex", gap: "4px" }}><AlertTriangle size={12} /> Missed</span>;
      case "Cancelled":
        return <span className="c-badge" style={{ backgroundColor: "rgba(160, 174, 192, 0.15)", color: "var(--clr-text-muted)" }}>Cancelled</span>;
      default:
        return <span className="c-badge">{status}</span>;
    }
  };

  const tabTitles = {
    today: "اليوم",
    upcoming: "المقبلة",
    missed: "الفائتة",
    completed: "المكتملة"
  };

  return (
    <main className="responsive-main">
      {/* Sub-Header Toolbar */}
      <div className="responsive-page-header">
        <div>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            مراقبة جداول المتابعة والاتصالات، تدوين نتائج المبيعات، ومراجعة سجل المكالمات والاجتماعات
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="c-btn c-btn--primary"
          style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
        >
          <Plus size={16} />
          <span>جدولة متابعة جديدة</span>
        </button>
      </div>

      {/* Categories Tabs Selector */}
      <div 
        className="responsive-tab-list"
        style={{ 
          borderBottom: "1px solid var(--clr-border)", 
          position: "relative"
        }}
      >
        {(["today", "upcoming", "missed", "completed"] as const).map(tab => {
          const isActive = activeTab === tab;
          const count = followups.filter(fup => {
            const today = new Date(); today.setHours(0,0,0,0);
            const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
            const schedDate = new Date(fup.scheduledAt);

            if (tab === "today") return (fup.status === "Scheduled" || fup.status === "Pending") && schedDate >= today && schedDate < tomorrow;
            if (tab === "upcoming") return (fup.status === "Scheduled" || fup.status === "Pending") && schedDate >= tomorrow;
            if (tab === "missed") return fup.status === "Missed";
            if (tab === "completed") return fup.status === "Completed" || fup.status === "Cancelled";
            return false;
          }).length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "var(--sp-3) var(--sp-4)",
                background: "none",
                border: "none",
                borderBottom: isActive ? "3px solid var(--clr-accent-primary)" : "3px solid transparent",
                color: isActive ? "var(--clr-text-primary)" : "var(--clr-text-muted)",
                fontWeight: isActive ? "var(--fw-bold)" : "var(--fw-medium)",
                cursor: "pointer",
                fontSize: "var(--fs-body-sm)",
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-2)",
                transition: "var(--transition-fast)"
              }}
              className="tab-btn"
            >
              <span>{tabTitles[tab]}</span>
              <span 
                style={{ 
                  fontSize: "10px", 
                  backgroundColor: isActive ? "var(--clr-accent-primary)" : "var(--clr-border)",
                  color: isActive ? "var(--clr-bg-primary)" : "var(--clr-text-muted)",
                  padding: "1px 6px",
                  borderRadius: "var(--radius-full)",
                  fontWeight: "bold"
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="responsive-toolbar">
        <div style={{ display: "flex", flex: 1, minWidth: "260px" }}>
          {/* Search bar */}
          <div style={{ position: "relative", flex: 1 }}>
            <Search 
              size={18} 
              style={{ 
                position: "absolute", 
                right: isRtl ? "12px" : "auto",
                left: isRtl ? "auto" : "12px", 
                top: "50%", 
                transform: "translateY(-50%)", 
                color: "var(--clr-text-muted)" 
              }} 
            />
            <input 
              type="text" 
              placeholder="ابحث عن المتابعات بالعنوان أو اسم العميل..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="c-input__field"
              style={{ paddingLeft: isRtl ? "12px" : "40px", paddingRight: isRtl ? "40px" : "12px", width: "100%", height: "42px", textAlign: "right" }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                style={{ 
                  position: "absolute", 
                  left: isRtl ? "12px" : "auto",
                  right: isRtl ? "auto" : "12px",
                  top: "50%", 
                  transform: "translateY(-50%)", 
                  background: "none", 
                  border: "none", 
                  color: "var(--clr-text-muted)",
                  cursor: "pointer" 
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Filter dropdowns */}
        <div style={{ display: "flex", gap: "var(--sp-4)", flexWrap: "wrap", alignItems: "center" }}>
          {/* Type Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>النوع:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="c-input__field"
              style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "140px", background: "var(--clr-bg-primary)" }}
            >
              <option value="">كل الأنواع</option>
              <option value="Call">مكالمة هاتفية (Call)</option>
              <option value="Email">بريد إلكتروني (Email)</option>
              <option value="Meeting">اجتماع (Meeting)</option>
              <option value="Demo">عرض تقديمي (Demo)</option>
              <option value="Other">أخرى (Other)</option>
            </select>
          </div>

          {/* Agent Filter (Admin only) */}
          {isSuperAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>المسؤول:</span>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="c-input__field"
                style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "150px", background: "var(--clr-bg-primary)" }}
              >
                <option value="">كل المسؤولين</option>
                {agents.map(ag => (
                  <option key={ag._id} value={ag._id}>{ag.firstName} {ag.lastName}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", padding: "var(--sp-8)" }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="shimmer-row" style={{ height: "60px", width: "100%", background: "var(--clr-border)", opacity: 0.25, borderRadius: "var(--radius-sm)" }} />
          ))}
          <style jsx>{`
            .shimmer-row {
              animation: shimmer 1.5s infinite linear;
              background: linear-gradient(90deg, var(--clr-border) 25%, rgba(30,46,93,0.6) 50%, var(--clr-border) 75%) !important;
              background-size: 200% 100% !important;
            }
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      ) : error ? (
        <div className="c-card" style={{ borderColor: "var(--clr-error)", textAlign: "center", padding: "var(--sp-8)" }}>
          <p style={{ color: "var(--clr-error)", fontWeight: "var(--fw-medium)", marginBottom: "var(--sp-4)" }}>{error}</p>
          <button onClick={fetchFollowUps} className="c-btn c-btn--secondary">إعادة المحاولة</button>
        </div>
      ) : activeList.length === 0 ? (
        <div className="c-card" style={{ textAlign: "center", padding: "var(--sp-12)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)" }}>
          <Clock size={48} style={{ color: "var(--clr-text-muted)" }} />
          <div>
            <h3 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--sp-1)" }}>لا توجد أي متابعات مسجلة</h3>
            <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
              لا توجد أي متابعات مجدولة تطابق هذا القسم أو كلمة البحث.
            </p>
          </div>
        </div>
      ) : (
        <div 
          style={{ 
            backgroundColor: "var(--clr-bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--clr-border)",
            overflow: "hidden",
            boxShadow: "var(--shadow-md)"
          }}
        >
          <div className="c-table-container">
            <table className="c-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--clr-border)", backgroundColor: "rgba(4, 13, 33, 0.4)" }}>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)", width: "80px" }}>النوع</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>الموضوع / العنوان</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>حساب العميل</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>وقت المتابعة المجدول</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>الحالة</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>المسؤول المتابع</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {activeList.map((fup) => {
                  let fupTypeArabic: string = fup.type;
                  if (fup.type === "Call") fupTypeArabic = "مكالمة 📞";
                  else if (fup.type === "Email") fupTypeArabic = "بريد ✉️";
                  else if (fup.type === "Meeting") fupTypeArabic = "اجتماع 👥";
                  else if (fup.type === "Demo") fupTypeArabic = "عرض 🖥️";
                  else if (fup.type === "Other") fupTypeArabic = "أخرى 📝";

                  let fupStatusArabic: string = fup.status;
                  let fupStatusBadge = "c-badge--info";
                  if (fup.status === "Scheduled" || fup.status === "Pending") {
                    fupStatusArabic = "مجدولة";
                    fupStatusBadge = "c-badge--info";
                  } else if (fup.status === "Completed") {
                    fupStatusArabic = "مكتملة";
                    fupStatusBadge = "c-badge--success";
                  } else if (fup.status === "Missed") {
                    fupStatusArabic = "فات موعدها";
                    fupStatusBadge = "c-badge--error";
                  } else if (fup.status === "Cancelled") {
                    fupStatusArabic = "ملغاة";
                    fupStatusBadge = "c-badge";
                  }

                  return (
                    <tr 
                      key={fup._id} 
                      style={{ 
                        borderBottom: "1px solid var(--clr-border)",
                        transition: "var(--transition-fast)" 
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                        <span className="c-badge c-badge--info" style={{ textTransform: "none" }}>
                          {fupTypeArabic}
                        </span>
                      </td>
                      <td style={{ padding: "var(--sp-4)", fontWeight: "var(--fw-medium)", textAlign: "right" }} title={fup.title}>
                        <div style={{ fontSize: "var(--fs-body-sm)" }}>{fup.title}</div>
                        {fup.description && (
                          <div style={{ fontSize: "11px", color: "var(--clr-text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "240px" }} title={fup.description}>
                            {fup.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)", textAlign: "right" }}>
                        {fup.client 
                          ? `${fup.client.firstName} ${fup.client.lastName}` 
                          : "لا يوجد عميل مرتبط"}
                        {fup.client?.companyName && (
                          <div style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>{fup.client.companyName}</div>
                        )}
                      </td>
                      <td style={{ padding: "var(--sp-4)", textAlign: "right" }}>
                        <div style={{ fontWeight: "var(--fw-medium)" }}>
                          {new Date(fup.scheduledAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--clr-text-muted)", marginTop: "2px", direction: "ltr", textAlign: "right" }}>
                          {new Date(fup.scheduledAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                        <span className={`c-badge ${fupStatusBadge}`}>{fupStatusArabic}</span>
                      </td>
                      <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)", textAlign: "right" }}>
                        {fup.assignedAgent 
                          ? `${fup.assignedAgent.firstName} ${fup.assignedAgent.lastName}` 
                          : "غير مسند"}
                      </td>
                      <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                        <Link 
                          href={`/dashboard/followups/${fup._id}`}
                          className="c-btn c-btn--secondary c-btn-touch-target"
                          style={{ padding: "var(--sp-2) var(--sp-3)", display: "inline-flex", gap: "var(--sp-2)" }}
                        >
                          <Eye size={14} />
                          <span style={{ fontSize: "var(--fs-caption)" }}>التفاصيل</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <style jsx global>{`
            .table-row-hover:hover {
              background-color: rgba(0, 210, 255, 0.04) !important;
            }
          `}</style>
        </div>
      )}

      {/* Schedule Follow-Up Modal */}
      {isModalOpen && (
        <div 
          className="c-modal-overlay"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="c-card c-card--glow c-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="c-modal-header">
              <div style={{ textAlign: "right" }}>
                <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                  <Clock size={20} style={{ color: "var(--clr-accent-primary)" }} />
                  <span>جدولة متابعة جديدة</span>
                </h2>
                <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                  تسجيل مكالمة، اجتماع، أو بريد إلكتروني مجدول وتعيينه لملف العميل للمتابعة
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                aria-label="إغلاق النافذة"
                className="c-btn-touch-target"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--clr-text-muted)",
                  cursor: "pointer"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div 
                style={{ 
                  backgroundColor: "rgba(229, 62, 62, 0.12)", 
                  border: "1px solid var(--clr-error)", 
                  color: "var(--clr-error)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--sp-3) var(--sp-4)",
                  marginBottom: "var(--sp-4)",
                  fontSize: "var(--fs-body-sm)",
                  textAlign: "right"
                }}
              >
                {modalError}
              </div>
            )}

            {/* Modal Body Form */}
            <form onSubmit={handleScheduleSubmit} style={{ display: "flex", flexDirection: "column", height: "100%", textAlign: "right" }}>
              <div className="c-modal-body" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                {/* Select Client */}
                <div className="c-input">
                  <label htmlFor="fup-client-select" className="c-input__label">العميل المستهدف *</label>
                  <select
                    id="fup-client-select"
                    value={formFields.client}
                    onChange={(e) => setFormFields(f => ({ ...f, client: e.target.value }))}
                    className="c-input__field" 
                    style={{ background: "var(--clr-bg-primary)" }}
                    required
                  >
                    <option value="">-- اختر العميل من القائمة --</option>
                    {clients.map(cli => (
                      <option key={cli._id} value={cli._id}>
                        {cli.firstName} {cli.lastName} {cli.companyName ? `(${cli.companyName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic / Title */}
                <div className="c-input">
                  <label htmlFor="fup-title-input" className="c-input__label">عنوان / موضوع المتابعة *</label>
                  <input 
                    id="fup-title-input"
                    type="text" 
                    required
                    placeholder="مثال: مناقشة أسعار وتفاصيل الاشتراك"
                    value={formFields.title}
                    onChange={(e) => setFormFields(f => ({ ...f, title: e.target.value }))}
                    className="c-input__field" 
                    style={{ textAlign: "right" }}
                  />
                </div>

                {/* Grid: Type and DateTime */}
                <div className="responsive-grid-2">
                  <div className="c-input">
                    <label htmlFor="fup-type-select" className="c-input__label">قناة الاتصال *</label>
                    <select
                      id="fup-type-select"
                      value={formFields.type}
                      onChange={(e) => setFormFields(f => ({ ...f, type: e.target.value as any }))}
                      className="c-input__field" 
                      style={{ background: "var(--clr-bg-primary)" }}
                    >
                      <option value="Call">مكالمة هاتفية 📞</option>
                      <option value="Email">بريد إلكتروني ✉️</option>
                      <option value="Meeting">اجتماع 👥</option>
                      <option value="Demo">عرض تقديمي 🖥️</option>
                      <option value="Other">أخرى 📝</option>
                    </select>
                  </div>
                  <div className="c-input">
                    <label htmlFor="fup-date-input" className="c-input__label">التاريخ والوقت *</label>
                    <input 
                      id="fup-date-input"
                      type="datetime-local" 
                      required
                      value={formFields.scheduledAt}
                      onChange={(e) => setFormFields(f => ({ ...f, scheduledAt: e.target.value }))}
                      className="c-input__field" 
                      style={{ textAlign: "left", direction: "ltr" }}
                    />
                  </div>
                </div>

                {/* Assigned Agent (Admin only) */}
                {isSuperAdmin && (
                  <div className="c-input">
                    <label htmlFor="fup-agent-select" className="c-input__label">الموظف المسؤول والمتابع *</label>
                    <select
                      id="fup-agent-select"
                      value={formFields.assignedAgentId}
                      onChange={(e) => setFormFields(f => ({ ...f, assignedAgentId: e.target.value }))}
                      className="c-input__field" 
                      style={{ background: "var(--clr-bg-primary)" }}
                    >
                      <option value="">-- اختر الموظف المسؤول --</option>
                      {agents.map(ag => (
                        <option key={ag._id} value={ag._id}>{ag.firstName} {ag.lastName}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Description */}
                <div className="c-input">
                  <label htmlFor="fup-desc-input" className="c-input__label">تفاصيل الوصف والأجندة</label>
                  <textarea
                    id="fup-desc-input"
                    placeholder="اكتب سياق المتابعة، الأسئلة المطروحة، أو أهداف الاجتماع..."
                    value={formFields.description}
                    onChange={(e) => setFormFields(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="c-input__field" 
                    style={{ resize: "none", padding: "var(--sp-3)", textAlign: "right" }}
                  />
                </div>
              </div>

              {/* Sticky Footer Buttons */}
              <div className="c-modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="c-btn c-btn--secondary c-btn-touch-target"
                >
                  {t("common.cancel")}
                </button>
                <button 
                  type="submit" 
                  disabled={modalLoading}
                  className="c-btn c-btn--primary c-btn-touch-target"
                  style={{ minWidth: "120px", gap: "var(--sp-2)" }}
                >
                  {modalLoading ? <div className="btn-spinner" /> : null}
                  <span>جدولة المتابعة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
