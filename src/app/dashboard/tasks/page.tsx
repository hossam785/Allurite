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
  Clock,
  Briefcase,
  User,
  AlertOctagon,
  AlertCircle,
  Play,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileText,
  Calendar,
  UserPlus
} from "lucide-react";

interface TaskItem {
  _id: string;
  title: string;
  description?: string;
  status: "Pending" | "In Progress" | "Under Review" | "Completed" | "Rejected" | "Cancelled" | "Overdue";
  priority: "Low" | "Medium" | "High" | "Critical";
  dueDate: string;
  assignedTo: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  client?: {
    _id: string;
    firstName: string;
    lastName: string;
    companyName?: string;
  };
  createdAt: string;
}

interface ClientSummary {
  _id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}

interface FollowUpSummary {
  _id: string;
  title: string;
  scheduledAt: string;
  status: string;
}

interface EmployeeSummary {
  _id: string;
  firstName: string;
  lastName: string;
  user: {
    email: string;
  };
}

export default function TasksPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Data states
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [followups, setFollowups] = useState<FollowUpSummary[]>([]);
  const [agents, setAgents] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab State: "my-tasks" | "team-tasks" | "overdue" | "completed"
  // If employee, "team-tasks" tab is hidden. So employee defaults to "my-tasks"
  const [activeTab, setActiveTab] = useState<"my-tasks" | "team-tasks" | "overdue" | "completed">("my-tasks");

  // Search & Filter parameters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formFields, setFormFields] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "Medium",
    assignedToId: "",
    client: "",
    followUp: "",
  });
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const priorities = ["Low", "Medium", "High", "Critical"];
  const statuses = ["Pending", "In Progress", "Under Review", "Completed", "Rejected", "Cancelled", "Overdue"];

  // Fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: "250", // Fetch a large batch to filter cleanly in-memory
        priority: selectedPriority,
        client: selectedClient,
        assignedTo: selectedAgent,
      });

      const res = await fetch(`/api/v1/tasks?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load tasks");
      }
      setTasks(json.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch helper lists for Modal
  const fetchHelperLists = async () => {
    try {
      // 1. Clients
      const resCli = await fetch("/api/v1/clients?limit=100");
      const jsonCli = await resCli.json();
      if (resCli.ok) setClients(jsonCli.data);

      // 2. Follow-Ups
      const resFup = await fetch("/api/v1/followups?limit=100");
      const jsonFup = await resFup.json();
      if (resFup.ok) setFollowups(jsonFup.data);

      // 3. Employees (if Admin)
      if (isSuperAdmin) {
        const resEmp = await fetch("/api/v1/employees?limit=100");
        const jsonEmp = await resEmp.json();
        if (resEmp.ok) setAgents(jsonEmp.data);
      }
    } catch (err) {
      console.error("Failed to load helper metadata lists", err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedPriority, selectedClient, selectedAgent]);

  useEffect(() => {
    if (isModalOpen) {
      fetchHelperLists();
    }
  }, [isModalOpen]);

  // Submit task creation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!formFields.title.trim() || !formFields.dueDate) {
      setModalError("Please enter a task title and pick a due date");
      return;
    }

    const parsedDate = new Date(formFields.dueDate);
    if (parsedDate < new Date()) {
      setModalError("A task due date cannot be set in the past");
      return;
    }

    if (isSuperAdmin && !formFields.assignedToId) {
      setModalError("Please select an assigned employee for this task");
      return;
    }

    setModalLoading(true);
    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formFields),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create task");
      }

      fetchTasks();
      setIsModalOpen(false);
      setFormFields({
        title: "",
        description: "",
        dueDate: "",
        priority: "Medium",
        assignedToId: "",
        client: "",
        followUp: "",
      });
    } catch (err: any) {
      setModalError(err.message || "Error creating task");
    } finally {
      setModalLoading(false);
    }
  };

  // Categorize tasks in-memory based on activeTab and searchTerm
  const getCategorizedTasks = () => {
    // Apply search filter first
    const filtered = tasks.filter(tsk => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const clientName = tsk.client ? `${tsk.client.firstName} ${tsk.client.lastName}`.toLowerCase() : "";
      return (
        tsk.title.toLowerCase().includes(searchLower) ||
        (tsk.description && tsk.description.toLowerCase().includes(searchLower)) ||
        clientName.includes(searchLower)
      );
    });

    switch (activeTab) {
      case "my-tasks":
        // For SuperAdmin, My Tasks resolves to all active tasks.
        // For Employees, retrieves only their active tasks (Pending, In Progress, Under Review, Rejected).
        return filtered.filter(tsk => tsk.status !== "Completed" && tsk.status !== "Cancelled" && tsk.status !== "Overdue");

      case "team-tasks":
        // View all tasks (SuperAdmin only)
        return isSuperAdmin ? filtered : [];

      case "overdue":
        return filtered.filter(tsk => tsk.status === "Overdue");

      case "completed":
        return filtered.filter(tsk => tsk.status === "Completed" || tsk.status === "Cancelled");

      default:
        return filtered;
    }
  };

  const activeList = getCategorizedTasks();

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case "Critical":
        return <span className="c-badge c-badge--error" style={{ color: "#FEB2B2", border: "1px solid #E53E3E" }}>Critical</span>;
      case "High":
        return <span className="c-badge c-badge--warning">High</span>;
      case "Medium":
        return <span className="c-badge c-badge--info">Medium</span>;
      default:
        return <span className="c-badge" style={{ backgroundColor: "rgba(160, 174, 192, 0.15)", color: "var(--clr-text-muted)" }}>Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <span className="c-badge" style={{ border: "1px solid var(--clr-border)", color: "var(--clr-text-muted)" }}>Pending</span>;
      case "In Progress":
        return <span className="c-badge c-badge--info" style={{ display: "inline-flex", gap: "4px" }}><Play size={10} /> In Progress</span>;
      case "Under Review":
        return <span className="c-badge c-badge--warning" style={{ display: "inline-flex", gap: "4px" }}><Clock size={10} /> Under Review</span>;
      case "Completed":
        return <span className="c-badge c-badge--success" style={{ display: "inline-flex", gap: "4px" }}><CheckCircle size={10} /> Completed</span>;
      case "Rejected":
        return <span className="c-badge c-badge--error" style={{ display: "inline-flex", gap: "4px" }}><XCircle size={10} /> Rejected</span>;
      case "Overdue":
        return <span className="c-badge c-badge--error" style={{ display: "inline-flex", gap: "4px" }}><AlertOctagon size={10} /> Overdue</span>;
      default:
        return <span className="c-badge">{status}</span>;
    }
  };

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      
      {/* Top action header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            Orchestrate deliverables, upload reviews, and track task productivity
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="c-btn c-btn--primary"
          style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
        >
          <Plus size={16} />
          <span>Create Task</span>
        </button>
      </div>

      {/* Tab Selectors */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--clr-border)", gap: "var(--sp-4)" }}>
        {((isSuperAdmin 
          ? ["my-tasks", "team-tasks", "overdue", "completed"] 
          : ["my-tasks", "overdue", "completed"]) as ("my-tasks" | "team-tasks" | "overdue" | "completed")[]).map(tab => {
          const isActive = activeTab === tab;
          const count = tasks.filter(tsk => {
            if (tab === "my-tasks") return tsk.status !== "Completed" && tsk.status !== "Cancelled" && tsk.status !== "Overdue";
            if (tab === "team-tasks") return true;
            if (tab === "overdue") return tsk.status === "Overdue";
            if (tab === "completed") return tsk.status === "Completed" || tsk.status === "Cancelled";
            return false;
          }).length;

          const tabName = tab === "my-tasks" 
            ? "My Tasks" 
            : tab === "team-tasks" 
            ? "Team Tasks Board" 
            : tab === "overdue" 
            ? "Overdue" 
            : "Completed & Closed";

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
              <span>{tabName}</span>
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

      {/* Toolbar filters */}
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
              placeholder="Search tasks by title or client..." 
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

        {/* Filter Selection */}
        <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
          {/* Priority dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="c-input__field"
              style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "110px", background: "var(--clr-bg-primary)" }}
            >
              <option value="">All Priorities</option>
              {priorities.map(prio => (
                <option key={prio} value={prio}>{prio}</option>
              ))}
            </select>
          </div>

          {/* Assigned Agent filter (Admin only) */}
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

      {/* Main Grid table */}
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
          <button onClick={fetchTasks} className="c-btn c-btn--secondary">Retry Loading</button>
        </div>
      ) : activeList.length === 0 ? (
        <div className="c-card" style={{ textAlign: "center", padding: "var(--sp-12)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)" }}>
          <FileText size={48} style={{ color: "var(--clr-text-muted)" }} />
          <div>
            <h3 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--sp-1)" }}>No tasks registered</h3>
            <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
              No tasks match this board category or search constraints.
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
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Task Title</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Client Link</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Priority</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Due Date</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Assigned Manager</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeList.map((tsk) => (
                  <tr 
                    key={tsk._id} 
                    style={{ 
                      borderBottom: "1px solid var(--clr-border)",
                      transition: "var(--transition-fast)" 
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: "var(--sp-4)", fontWeight: "var(--fw-medium)" }}>
                      <div style={{ fontSize: "var(--fs-body-sm)" }}>{tsk.title}</div>
                      {tsk.description && (
                        <div style={{ fontSize: "11px", color: "var(--clr-text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "260px" }}>
                          {tsk.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)" }}>
                      {tsk.client 
                        ? `${tsk.client.firstName} ${tsk.client.lastName}` 
                        : "None"}
                      {tsk.client?.companyName && (
                        <div style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>{tsk.client.companyName}</div>
                      )}
                    </td>
                    <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                      {getPriorityBadge(tsk.priority)}
                    </td>
                    <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                      {getStatusBadge(tsk.status)}
                    </td>
                    <td style={{ padding: "var(--sp-4)" }}>
                      <div style={{ fontWeight: "var(--fw-medium)" }}>
                        {new Date(tsk.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </td>
                    <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)" }}>
                      {tsk.assignedTo 
                        ? `${tsk.assignedTo.firstName} ${tsk.assignedTo.lastName}` 
                        : "Unassigned"}
                    </td>
                    <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                      <Link 
                        href={`/dashboard/tasks/${tsk._id}`}
                        className="c-btn c-btn--secondary"
                        style={{ padding: "var(--sp-2) var(--sp-3)", display: "inline-flex", gap: "var(--sp-2)" }}
                      >
                        <Eye size={14} />
                        <span style={{ fontSize: "var(--fs-caption)" }}>View Details</span>
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

      {/* Create Task Modal */}
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
              maxWidth: "520px", 
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
                <Calendar size={20} style={{ color: "var(--clr-accent-primary)" }} />
                <span>Create New Task</span>
              </h2>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                Assign task schedules, priorities, and client links
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

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              {/* Title */}
              <div className="c-input">
                <label className="c-input__label">Task Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Prepare Q3 client proposal slides"
                  value={formFields.title}
                  onChange={(e) => setFormFields(f => ({ ...f, title: e.target.value }))}
                  className="c-input__field" 
                />
              </div>

              {/* Grid: Priority & Due Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                <div className="c-input">
                  <label className="c-input__label">Priority *</label>
                  <select
                    value={formFields.priority}
                    onChange={(e) => setFormFields(f => ({ ...f, priority: e.target.value }))}
                    className="c-input__field" 
                  >
                    {priorities.map(prio => (
                      <option key={prio} value={prio}>{prio}</option>
                    ))}
                  </select>
                </div>
                <div className="c-input">
                  <label className="c-input__label">Due Date *</label>
                  <input 
                    type="date" 
                    required
                    value={formFields.dueDate}
                    onChange={(e) => setFormFields(f => ({ ...f, dueDate: e.target.value }))}
                    className="c-input__field" 
                  />
                </div>
              </div>

              {/* Optional: Linked Client */}
              <div className="c-input">
                <label className="c-input__label">Link Client Profile (Optional)</label>
                <select
                  value={formFields.client}
                  onChange={(e) => setFormFields(f => ({ ...f, client: e.target.value }))}
                  className="c-input__field" 
                >
                  <option value="">-- Choose Client (No link) --</option>
                  {clients.map(cli => (
                    <option key={cli._id} value={cli._id}>
                      {cli.firstName} {cli.lastName} {cli.companyName ? `(${cli.companyName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional: Linked Follow-Up */}
              <div className="c-input">
                <label className="c-input__label">Link Follow-Up Log (Optional)</label>
                <select
                  value={formFields.followUp}
                  onChange={(e) => setFormFields(f => ({ ...f, followUp: e.target.value }))}
                  className="c-input__field" 
                >
                  <option value="">-- Choose Followup Log --</option>
                  {followups.map(fup => (
                    <option key={fup._id} value={fup._id}>
                      {fup.title} ({new Date(fup.scheduledAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="c-input">
                <label className="c-input__label">Task Details Description</label>
                <textarea
                  placeholder="Summarize instructions, deliverables, requirements..."
                  value={formFields.description}
                  onChange={(e) => setFormFields(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="c-input__field" 
                  style={{ resize: "none", padding: "var(--sp-3)" }}
                />
              </div>

              {/* Assigned Agent (Admin dropdown selection) */}
              {isSuperAdmin && (
                <div className="c-input">
                  <label className="c-input__label">Assigned Account Manager (Agent) *</label>
                  <select
                    value={formFields.assignedToId}
                    onChange={(e) => setFormFields(f => ({ ...f, assignedToId: e.target.value }))}
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
                  <span>Save Task</span>
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
