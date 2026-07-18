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
  UserCheck,
  UserX,
  UserPlus,
  Briefcase,
  Building,
  Mail,
  Phone,
  Globe,
  Tag,
  Share2
} from "lucide-react";

interface ClientItem {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  website?: string;
  industry?: string;
  status: "Lead" | "Qualified" | "ActiveCustomer" | "Churned";
  source: string;
  assignedAgent: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface EmployeeSummary {
  _id: string;
  firstName: string;
  lastName: string;
  user: {
    email: string;
  };
}

export default function ClientsPage() {
  const { user: currentUser } = useAuth();
  
  // Scoping & auth flag
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Data states
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // List of active employees (for Admin dropdown)
  const [agents, setAgents] = useState<EmployeeSummary[]>([]);

  // Pagination & Filter parameters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formFields, setFormFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    website: "",
    industry: "",
    status: "Lead",
    source: "Website",
    assignedAgentId: "",
  });
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const sources = ["Website", "Referral", "ColdOutreach", "LinkedIn", "Advertisement", "Other"];
  const statuses = ["Lead", "Qualified", "ActiveCustomer", "Churned"];

  // Debounce search term by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch clients
  const fetchClients = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search: debouncedSearch,
        status: selectedStatus,
        source: selectedSource,
        assignedAgent: selectedAgent,
      });

      const res = await fetch(`/api/v1/clients?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to fetch clients");
      }
      setClients(json.data);
      setTotalPages(json.pagination.pages || 1);
      setTotalRecords(json.pagination.total || 0);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch agents if SuperAdmin
  const fetchAgents = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch("/api/v1/employees?limit=100");
      const json = await res.json();
      if (res.ok) {
        setAgents(json.data);
      }
    } catch (err) {
      console.error("Error fetching agents list", err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [page, debouncedSearch, selectedStatus, selectedSource, selectedAgent]);

  useEffect(() => {
    if (isModalOpen && isSuperAdmin) {
      fetchAgents();
    }
  }, [isModalOpen]);

  // Submit client creation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    // Validation
    if (!formFields.firstName.trim() || !formFields.lastName.trim() || !formFields.email.trim()) {
      setModalError("First name, Last name, and Email are required");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formFields.email)) {
      setModalError("Please enter a valid email address");
      return;
    }

    if (isSuperAdmin && !formFields.assignedAgentId) {
      setModalError("Please select an assigned agent for this client");
      return;
    }

    setModalLoading(true);
    try {
      const res = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formFields),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create client profile");
      }
      
      // Refresh list, close modal, reset fields
      fetchClients();
      setIsModalOpen(false);
      setFormFields({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        companyName: "",
        website: "",
        industry: "",
        status: "Lead",
        source: "Website",
        assignedAgentId: "",
      });
    } catch (err: any) {
      setModalError(err.message || "Error creating client");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "var(--sp-4)",
          borderBottom: "1px solid var(--clr-border)",
        }}
      >
        <div>
          <h1 style={{ fontSize: "var(--fs-h1)", marginBottom: "var(--sp-1)" }}>Client Pipeline</h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            {isSuperAdmin 
              ? "Oversee organizational leads, acquisition states, and accounts" 
              : "Manage your assigned client accounts and communication notes"}
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="c-btn c-btn--primary"
          style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
        >
          <UserPlus size={16} />
          <span>Add Client</span>
        </button>
      </header>

      {/* Toolbar / Filters */}
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
              placeholder="Search clients by name, email, company..." 
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
        <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", alignItems: "center" }}>
          {/* Status Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "120px", background: "var(--clr-bg-primary)" }}
            >
              <option value="">All Statuses</option>
              {statuses.map(st => (
                <option key={st} value={st}>{st === "ActiveCustomer" ? "Active Customer" : st}</option>
              ))}
            </select>
          </div>

          {/* Source Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Source:</span>
            <select
              value={selectedSource}
              onChange={(e) => { setSelectedSource(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "120px", background: "var(--clr-bg-primary)" }}
            >
              <option value="">All Sources</option>
              {sources.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>

          {/* Agent Dropdown (SuperAdmin only) */}
          {isSuperAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Agent:</span>
              <select
                value={selectedAgent}
                onChange={(e) => { setSelectedAgent(e.target.value); setPage(1); }}
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

      {/* Main Grid View / List */}
      {loading ? (
        <div className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", padding: "var(--sp-8)" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="shimmer-row" style={{ height: "48px", width: "100%", background: "var(--clr-border)", opacity: 0.25, borderRadius: "var(--radius-sm)" }} />
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
          <button onClick={fetchClients} className="c-btn c-btn--secondary">Retry Loading</button>
        </div>
      ) : clients.length === 0 ? (
        <div className="c-card" style={{ textAlign: "center", padding: "var(--sp-12)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)" }}>
          <UserX size={48} style={{ color: "var(--clr-text-muted)" }} />
          <div>
            <h3 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--sp-1)" }}>No clients registered</h3>
            <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
              No clients found matching the query criteria.
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
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Client Name</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Company</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Email Address</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Source</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Assigned Agent</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((cli) => {
                  let statusBadgeClass = "c-badge--info";
                  if (cli.status === "Qualified") statusBadgeClass = "c-badge--warning";
                  if (cli.status === "ActiveCustomer") statusBadgeClass = "c-badge--success";
                  if (cli.status === "Churned") statusBadgeClass = "c-badge--error";

                  return (
                    <tr 
                      key={cli._id} 
                      style={{ 
                        borderBottom: "1px solid var(--clr-border)",
                        transition: "var(--transition-fast)" 
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: "var(--sp-4)", fontWeight: "var(--fw-medium)" }}>
                        {cli.firstName} {cli.lastName}
                      </td>
                      <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)" }}>
                        {cli.companyName || "Personal"}
                      </td>
                      <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)" }}>
                        {cli.email}
                      </td>
                      <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                        <span className={`c-badge ${statusBadgeClass}`}>
                          {cli.status === "ActiveCustomer" ? "Customer" : cli.status}
                        </span>
                      </td>
                      <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)" }}>
                        {cli.source}
                      </td>
                      <td style={{ padding: "var(--sp-4)", fontWeight: "var(--fw-medium)" }}>
                        {cli.assignedAgent 
                          ? `${cli.assignedAgent.firstName} ${cli.assignedAgent.lastName}` 
                          : "Unassigned"}
                      </td>
                      <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                        <Link 
                          href={`/dashboard/clients/${cli._id}`}
                          className="c-btn c-btn--secondary"
                          style={{ padding: "var(--sp-2) var(--sp-3)", display: "inline-flex", gap: "var(--sp-2)" }}
                        >
                          <Eye size={14} />
                          <span style={{ fontSize: "var(--fs-caption)" }}>View Profile</span>
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

          {/* Pagination */}
          <div 
            style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              padding: "var(--sp-4)",
              borderTop: "1px solid var(--clr-border)",
              backgroundColor: "rgba(4, 13, 33, 0.2)"
            }}
          >
            <span style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-caption)" }}>
              Showing {clients.length} of {totalRecords} clients
            </span>
            
            <div style={{ display: "flex", gap: "var(--sp-2)" }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="c-btn c-btn--secondary"
                style={{ padding: "var(--sp-2) var(--sp-3)" }}
              >
                <ChevronLeft size={16} />
              </button>
              <div 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  padding: "0 var(--sp-4)", 
                  fontSize: "var(--fs-body-sm)", 
                  fontWeight: "var(--fw-medium)",
                  border: "1px solid var(--clr-border)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--clr-bg-primary)"
                }}
              >
                Page {page} of {totalPages}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="c-btn c-btn--secondary"
                style={{ padding: "var(--sp-2) var(--sp-3)" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
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
              maxWidth: "560px", 
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
                <UserPlus size={20} style={{ color: "var(--clr-accent-primary)" }} />
                <span>Register New Client</span>
              </h2>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                Fill out contact, business, and source pipeline configurations
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
              {/* Contact Grid */}
              <div style={{ borderBottom: "1px solid var(--clr-border)", display: "flex", flexDirection: "column", gap: "var(--sp-4)", paddingBottom: "var(--sp-4)" }}>
                <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)" }}>Contact Details</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                  <div className="c-input">
                    <label className="c-input__label">First Name *</label>
                    <input 
                      type="text" 
                      required
                      value={formFields.firstName}
                      onChange={(e) => setFormFields(f => ({ ...f, firstName: e.target.value }))}
                      className="c-input__field" 
                    />
                  </div>
                  <div className="c-input">
                    <label className="c-input__label">Last Name *</label>
                    <input 
                      type="text" 
                      required
                      value={formFields.lastName}
                      onChange={(e) => setFormFields(f => ({ ...f, lastName: e.target.value }))}
                      className="c-input__field" 
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                  <div className="c-input">
                    <label className="c-input__label">Email Address *</label>
                    <input 
                      type="email" 
                      required
                      value={formFields.email}
                      onChange={(e) => setFormFields(f => ({ ...f, email: e.target.value }))}
                      className="c-input__field" 
                    />
                  </div>
                  <div className="c-input">
                    <label className="c-input__label">Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="+1 (555) 000-0000"
                      value={formFields.phone}
                      onChange={(e) => setFormFields(f => ({ ...f, phone: e.target.value }))}
                      className="c-input__field" 
                    />
                  </div>
                </div>
              </div>

              {/* Company Info */}
              <div style={{ borderBottom: "1px solid var(--clr-border)", display: "flex", flexDirection: "column", gap: "var(--sp-4)", paddingBottom: "var(--sp-4)" }}>
                <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)" }}>Company Info</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                  <div className="c-input">
                    <label className="c-input__label">Company Name</label>
                    <input 
                      type="text" 
                      value={formFields.companyName}
                      onChange={(e) => setFormFields(f => ({ ...f, companyName: e.target.value }))}
                      className="c-input__field" 
                    />
                  </div>
                  <div className="c-input">
                    <label className="c-input__label">Industry</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Technology, Healthcare"
                      value={formFields.industry}
                      onChange={(e) => setFormFields(f => ({ ...f, industry: e.target.value }))}
                      className="c-input__field" 
                    />
                  </div>
                </div>
                <div className="c-input">
                  <label className="c-input__label">Website URL</label>
                  <input 
                    type="text" 
                    placeholder="https://example.com"
                    value={formFields.website}
                    onChange={(e) => setFormFields(f => ({ ...f, website: e.target.value }))}
                    className="c-input__field" 
                  />
                </div>
              </div>

              {/* Meta details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)" }}>Pipeline Configuration</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                  <div className="c-input">
                    <label className="c-input__label">Lead Status *</label>
                    <select
                      value={formFields.status}
                      onChange={(e) => setFormFields(f => ({ ...f, status: e.target.value }))}
                      className="c-input__field" 
                    >
                      {statuses.map(st => (
                        <option key={st} value={st}>{st === "ActiveCustomer" ? "Active Customer" : st}</option>
                      ))}
                    </select>
                  </div>
                  <div className="c-input">
                    <label className="c-input__label">Source Channel *</label>
                    <select
                      value={formFields.source}
                      onChange={(e) => setFormFields(f => ({ ...f, source: e.target.value }))}
                      className="c-input__field" 
                    >
                      {sources.map(src => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="c-input">
                    <label className="c-input__label">Assigned Account Manager (Agent) *</label>
                    <select
                      value={formFields.assignedAgentId}
                      onChange={(e) => setFormFields(f => ({ ...f, assignedAgentId: e.target.value }))}
                      className="c-input__field" 
                    >
                      <option value="">-- Select Employee --</option>
                      {agents.map(ag => (
                        <option key={ag._id} value={ag._id}>{ag.firstName} {ag.lastName} ({ag.user?.email})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

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
                  <span>Save Client</span>
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
