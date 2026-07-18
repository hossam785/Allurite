"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../layout";
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

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {/* Sub-Header Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            Monitor communication schedules, log outcomes, and view call histories
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="c-btn c-btn--primary"
          style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
        >
          <Plus size={16} />
          <span>Schedule Follow-Up</span>
        </button>
      </div>

      {/* Categories Tabs Selector */}
      <div 
        style={{ 
          display: "flex", 
          borderBottom: "1px solid var(--clr-border)", 
          gap: "var(--sp-4)",
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
              <span style={{ textTransform: "capitalize" }}>{tab}</span>
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
        <div style={{ display: "flex", flex: 1, minWidth: "260px" }}>
          {/* Search bar */}
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
              placeholder="Search schedules by title or client name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="c-input__field"
              style={{ paddingLeft: "40px", width: "100%", height: "42px" }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                style={{ 
                  position: "absolute", 
                  right: "12px", 
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
        <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
          {/* Type Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="c-input__field"
              style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "120px", background: "var(--clr-bg-primary)" }}
            >
              <option value="">All Types</option>
              <option value="Call">Call</option>
              <option value="Email">Email</option>
              <option value="Meeting">Meeting</option>
              <option value="Demo">Demo</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Agent Filter (Admin only) */}
          {isSuperAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Agent:</span>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="c-input__field"
                style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "130px", background: "var(--clr-bg-primary)" }}
              >
                <option value="">All Agents</option>
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
          <button onClick={fetchFollowUps} className="c-btn c-btn--secondary">Retry Loading</button>
        </div>
      ) : activeList.length === 0 ? (
        <div className="c-card" style={{ textAlign: "center", padding: "var(--sp-12)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)" }}>
          <Clock size={48} style={{ color: "var(--clr-text-muted)" }} />
          <div>
            <h3 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--sp-1)" }}>No follow-ups listed</h3>
            <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
              No scheduled follow-up logs match this category or search constraints.
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
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--clr-border)", backgroundColor: "rgba(4, 13, 33, 0.4)" }}>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)", width: "60px" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Topic / Title</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Client Account</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Schedule Time</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Assigned Manager</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeList.map((fup) => (
                  <tr 
                    key={fup._id} 
                    style={{ 
                      borderBottom: "1px solid var(--clr-border)",
                      transition: "var(--transition-fast)" 
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                      <div 
                        style={{ 
                          width: "32px", 
                          height: "32px", 
                          borderRadius: "var(--radius-md)", 
                          backgroundColor: "rgba(0, 210, 255, 0.08)", 
                          color: "var(--clr-accent-primary)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center" 
                        }}
                      >
                        {getTypeIcon(fup.type)}
                      </div>
                    </td>
                    <td style={{ padding: "var(--sp-4)", fontWeight: "var(--fw-medium)" }}>
                      <div style={{ fontSize: "var(--fs-body-sm)" }}>{fup.title}</div>
                      {fup.description && (
                        <div style={{ fontSize: "11px", color: "var(--clr-text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "240px" }}>
                          {fup.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)" }}>
                      {fup.client 
                        ? `${fup.client.firstName} ${fup.client.lastName}` 
                        : "No Client linked"}
                      {fup.client?.companyName && (
                        <div style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>{fup.client.companyName}</div>
                      )}
                    </td>
                    <td style={{ padding: "var(--sp-4)" }}>
                      <div style={{ fontWeight: "var(--fw-medium)" }}>
                        {new Date(fup.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                        {new Date(fup.scheduledAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                      {getStatusBadge(fup.status)}
                    </td>
                    <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)" }}>
                      {fup.assignedAgent 
                        ? `${fup.assignedAgent.firstName} ${fup.assignedAgent.lastName}` 
                        : "Unassigned"}
                    </td>
                    <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                      <Link 
                        href={`/dashboard/followups/${fup._id}`}
                        className="c-btn c-btn--secondary"
                        style={{ padding: "var(--sp-2) var(--sp-3)", display: "inline-flex", gap: "var(--sp-2)" }}
                      >
                        <Eye size={14} />
                        <span style={{ fontSize: "var(--fs-caption)" }}>Orchestrate</span>
                      </Link>
                    </td>
                  </tr>
                ))}
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
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(4, 13, 33, 0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--sp-4)"
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="c-card c-card--glow"
            style={{ 
              width: "100%", 
              maxWidth: "500px", 
              maxHeight: "90vh", 
              overflowY: "auto",
              position: "relative",
              animation: "slideIn 0.25s ease-out" 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "var(--clr-text-muted)", cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: "var(--sp-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <Clock size={20} style={{ color: "var(--clr-accent-primary)" }} />
                <span>Schedule Follow-Up Log</span>
              </h2>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                Bind a call, meeting, or email task schedule to a client record
              </p>
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
                  fontSize: "var(--fs-body-sm)"
                }}
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              
              {/* Select Client */}
              <div className="c-input">
                <label className="c-input__label">Target Client *</label>
                <select
                  value={formFields.client}
                  onChange={(e) => setFormFields(f => ({ ...f, client: e.target.value }))}
                  className="c-input__field" 
                  required
                >
                  <option value="">-- Choose Client Profile --</option>
                  {clients.map(cli => (
                    <option key={cli._id} value={cli._id}>
                      {cli.firstName} {cli.lastName} {cli.companyName ? `(${cli.companyName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic / Title */}
              <div className="c-input">
                <label className="c-input__label">Schedule Topic / Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Discuss onboarding pricing tiers"
                  value={formFields.title}
                  onChange={(e) => setFormFields(f => ({ ...f, title: e.target.value }))}
                  className="c-input__field" 
                />
              </div>

              {/* Grid: Type and DateTime */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                <div className="c-input">
                  <label className="c-input__label">Channel Type *</label>
                  <select
                    value={formFields.type}
                    onChange={(e) => setFormFields(f => ({ ...f, type: e.target.value as any }))}
                    className="c-input__field" 
                  >
                    <option value="Call">Call 📞</option>
                    <option value="Email">Email ✉️</option>
                    <option value="Meeting">Meeting 👥</option>
                    <option value="Demo">Demo 🖥️</option>
                    <option value="Other">Other 📝</option>
                  </select>
                </div>
                <div className="c-input">
                  <label className="c-input__label">Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={formFields.scheduledAt}
                    onChange={(e) => setFormFields(f => ({ ...f, scheduledAt: e.target.value }))}
                    className="c-input__field" 
                  />
                </div>
              </div>

              {/* Description */}
              <div className="c-input">
                <label className="c-input__label">Description Details</label>
                <textarea
                  placeholder="Enter context, bulleted agenda questions..."
                  value={formFields.description}
                  onChange={(e) => setFormFields(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="c-input__field" 
                  style={{ resize: "none", padding: "var(--sp-3)" }}
                />
              </div>

              {/* Assigned Agent (Admin only) */}
              {isSuperAdmin && (
                <div className="c-input">
                  <label className="c-input__label">Assigned Account Agent *</label>
                  <select
                    value={formFields.assignedAgentId}
                    onChange={(e) => setFormFields(f => ({ ...f, assignedAgentId: e.target.value }))}
                    className="c-input__field" 
                  >
                    <option value="">-- Choose Employee --</option>
                    {agents.map(ag => (
                      <option key={ag._id} value={ag._id}>{ag.firstName} {ag.lastName} ({ag.user?.email})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", marginTop: "var(--sp-4)" }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="c-btn c-btn--secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={modalLoading}
                  className="c-btn c-btn--primary"
                  style={{ minWidth: "120px", gap: "var(--sp-2)" }}
                >
                  {modalLoading ? <div className="btn-spinner" /> : null}
                  <span>Schedule Task</span>
                </button>
              </div>
            </form>

            <style jsx>{`
              @keyframes slideIn {
                from { transform: translateY(-30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
              .btn-spinner {
                width: 14px;
                height: 14px;
                border: 2px solid rgba(4,13,33,0.3);
                border-top: 2px solid var(--clr-text-primary);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
              }
            `}</style>
          </div>
        </div>
      )}
    </main>
  );
}
