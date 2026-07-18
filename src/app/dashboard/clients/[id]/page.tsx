"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../layout";
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  X,
  Mail,
  Phone,
  Building,
  Globe,
  Tag,
  Briefcase,
  Plus,
  Send,
  Calendar,
  MessageSquareCode,
  ShieldCheck,
  Building2,
  Trash,
  Share2
} from "lucide-react";

interface NoteItem {
  _id: string;
  content: string;
  creatorEmail: string;
  createdBy: string;
  createdAt: string;
}

interface ClientDetail {
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
  notes: NoteItem[];
  createdAt: string;
  updatedAt: string;
}

interface EmployeeSummary {
  _id: string;
  firstName: string;
  lastName: string;
  user: {
    email: string;
  };
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { id } = use(params);

  // Scoping flags
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Data states
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState<EmployeeSummary[]>([]);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFields, setEditFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    website: "",
    industry: "",
    status: "",
    source: "",
    assignedAgentId: "",
  });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // New Note State
  const [noteText, setNoteText] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  const sources = ["Website", "Referral", "ColdOutreach", "LinkedIn", "Advertisement", "Other"];
  const statuses = ["Lead", "Qualified", "ActiveCustomer", "Churned"];

  // Fetch client details
  const fetchClientDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/clients/${id}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load client profile");
      }
      setClient(json.data);
      // Initialize edit fields
      setEditFields({
        firstName: json.data.firstName,
        lastName: json.data.lastName,
        email: json.data.email,
        phone: json.data.phone || "",
        companyName: json.data.companyName || "",
        website: json.data.website || "",
        industry: json.data.industry || "",
        status: json.data.status,
        source: json.data.source,
        assignedAgentId: json.data.assignedAgent?._id || "",
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch agents list for SuperAdmin
  const fetchAgents = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch("/api/v1/employees?limit=100");
      const json = await res.json();
      if (res.ok) {
        setAgents(json.data);
      }
    } catch (err) {
      console.error("Error fetching agents", err);
    }
  };

  useEffect(() => {
    fetchClientDetails();
  }, [id]);

  useEffect(() => {
    if (isEditOpen && isSuperAdmin) {
      fetchAgents();
    }
  }, [isEditOpen]);

  // Client delete handler (Admin only)
  const handleDeleteClient = async () => {
    if (!client) return;
    if (!window.confirm(`Are you absolutely sure you want to permanently delete the profile of ${client.firstName} ${client.lastName}? This action is irreversible.`)) return;

    try {
      const res = await fetch(`/api/v1/clients/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to delete client");
      }
      router.push("/dashboard/clients");
    } catch (err: any) {
      alert(err.message || "Error deleting client profile");
    }
  };

  // Edit submit handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    if (!editFields.firstName.trim() || !editFields.lastName.trim() || !editFields.email.trim()) {
      setEditError("First name, Last name, and Email are required");
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`/api/v1/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFields),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update client details");
      }
      setClient(json.data);
      setIsEditOpen(false);
    } catch (err: any) {
      setEditError(err.message || "Error saving changes");
    } finally {
      setEditLoading(false);
    }
  };

  // Add Note handler
  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || noteLoading) return;

    setNoteLoading(true);
    try {
      const res = await fetch(`/api/v1/clients/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to add note");
      }
      
      // Update note list in client details
      setClient(cli => {
        if (!cli) return null;
        return {
          ...cli,
          notes: json.data,
        };
      });
      setNoteText("");
    } catch (err: any) {
      alert(err.message || "Error posting note");
    } finally {
      setNoteLoading(false);
    }
  };

  // Delete Note handler
  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this communication log note?")) return;

    try {
      const res = await fetch(`/api/v1/clients/${id}/notes/${noteId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to delete note");
      }
      // Update notes list in local state
      setClient(cli => {
        if (!cli) return null;
        return {
          ...cli,
          notes: json.data,
        };
      });
    } catch (err: any) {
      alert(err.message || "Error deleting note");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", minHeight: "80vh", gap: "var(--sp-4)" }}>
        <div style={{ width: "32px", height: "32px", border: "3px solid var(--clr-border)", borderTop: "3px solid var(--clr-accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ color: "var(--clr-text-muted)" }}>Loading client profile details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <main style={{ flex: 1, padding: "var(--sp-8)" }}>
        <div className="c-card" style={{ borderColor: "var(--clr-error)", textAlign: "center", padding: "var(--sp-8)" }}>
          <p style={{ color: "var(--clr-error)", fontWeight: "var(--fw-medium)", marginBottom: "var(--sp-4)" }}>{error}</p>
          <Link href="/dashboard/clients" className="c-btn c-btn--secondary">Back to Directory</Link>
        </div>
      </main>
    );
  }

  if (!client) return null;

  // Compute badge color
  let statusBadgeClass = "c-badge--info";
  if (client.status === "Qualified") statusBadgeClass = "c-badge--warning";
  if (client.status === "ActiveCustomer") statusBadgeClass = "c-badge--success";
  if (client.status === "Churned") statusBadgeClass = "c-badge--error";

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {/* Breadcrumbs */}
      <div>
        <Link 
          href="/dashboard/clients" 
          style={{ display: "inline-flex", alignItems: "center", gap: "var(--sp-2)", color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}
          className="hover-bright"
        >
          <ArrowLeft size={16} />
          <span>Back to Directory</span>
        </Link>
      </div>

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
          <h1 style={{ fontSize: "var(--fs-h1)", marginBottom: "var(--sp-1)" }}>
            {client.firstName} {client.lastName}
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            {client.companyName ? `${client.companyName} | ` : ""}{client.industry || "General Industry"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--sp-3)" }}>
          {isSuperAdmin && (
            <button 
              onClick={handleDeleteClient}
              className="c-btn c-btn--destructive"
              style={{ gap: "var(--sp-2)" }}
            >
              <Trash2 size={16} />
              <span>Delete Profile</span>
            </button>
          )}

          <button 
            onClick={() => setIsEditOpen(true)}
            className="c-btn c-btn--primary"
            style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
          >
            <Edit size={16} />
            <span>Edit Profile</span>
          </button>
        </div>
      </header>

      {/* Grid split */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--sp-6)", alignItems: "flex-start" }}>
        
        {/* Left Column: Profile Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
          
          {/* General details */}
          <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
            <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
              Client Overview
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              <div style={{ display: "flex", gap: "var(--sp-4)" }}>
                <div style={{ width: "32px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                  <Mail size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Email Address</div>
                  <div style={{ fontWeight: "var(--fw-bold)", marginTop: "2px" }}>{client.email}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "var(--sp-4)" }}>
                <div style={{ width: "32px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                  <Phone size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Phone Number</div>
                  <div style={{ fontWeight: "var(--fw-bold)", marginTop: "2px" }}>{client.phone || "No phone linked"}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "var(--sp-4)" }}>
                <div style={{ width: "32px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                  <Building size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Company / Business</div>
                  <div style={{ fontWeight: "var(--fw-bold)", marginTop: "2px" }}>{client.companyName || "Personal Account"}</div>
                </div>
              </div>

              {client.website && (
                <div style={{ display: "flex", gap: "var(--sp-4)" }}>
                  <div style={{ width: "32px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                    <Globe size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Website</div>
                    <div style={{ marginTop: "2px" }}>
                      <a href={client.website.startsWith("http") ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: "var(--fw-bold)" }}>
                        {client.website}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "var(--sp-4)" }}>
                <div style={{ width: "32px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                  <Tag size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Pipeline Status</div>
                  <div style={{ marginTop: "4px" }}>
                    <span className={`c-badge ${statusBadgeClass}`}>
                      {client.status === "ActiveCustomer" ? "Active Customer" : client.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "var(--sp-4)" }}>
                <div style={{ width: "32px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                  <Share2 size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Source Channel</div>
                  <div style={{ fontWeight: "var(--fw-bold)", marginTop: "2px" }}>{client.source}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "var(--sp-4)" }}>
                <div style={{ width: "32px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                  <Briefcase size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Assigned Manager</div>
                  <div style={{ fontWeight: "var(--fw-bold)", marginTop: "2px" }}>
                    {client.assignedAgent 
                      ? `${client.assignedAgent.firstName} ${client.assignedAgent.lastName}` 
                      : "Unassigned"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Audit Dates */}
          <div className="c-card" style={{ display: "flex", gap: "var(--sp-4)", justifyContent: "space-between", padding: "var(--sp-4)" }}>
            <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", color: "var(--clr-text-muted)", fontSize: "var(--fs-caption)" }}>
              <Calendar size={14} />
              <span>Created: {new Date(client.createdAt).toLocaleDateString()}</span>
            </div>
            <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center", color: "var(--clr-text-muted)", fontSize: "var(--fs-caption)" }}>
              <ShieldCheck size={14} />
              <span>Updated: {new Date(client.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Notes system */}
        <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)", minHeight: "500px" }}>
          <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
            Communication Logs & Notes ({client.notes.length})
          </h2>

          {/* New Note Form */}
          <form onSubmit={handleAddNoteSubmit} style={{ display: "flex", gap: "var(--sp-3)", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <textarea
                placeholder="Log a client callback, meeting outcome, or custom note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                maxLength={800}
                required
                rows={3}
                className="c-input__field"
                style={{ resize: "none", width: "100%", padding: "var(--sp-3)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "var(--sp-1)", fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>
                <span>{noteText.length}/800 characters</span>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={noteLoading || !noteText.trim()}
              className="c-btn c-btn--primary"
              style={{ padding: "var(--sp-3)", height: "42px", flexShrink: 0 }}
            >
              <Send size={16} />
            </button>
          </form>

          {/* Notes scrollable feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", overflowY: "auto", flex: 1, maxHeight: "400px", paddingRight: "var(--sp-2)" }}>
            {client.notes.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "var(--sp-3)", color: "var(--clr-text-muted)", paddingTop: "var(--sp-8)", paddingBottom: "var(--sp-8)" }}>
                <MessageSquareCode size={36} style={{ opacity: 0.5 }} />
                <span style={{ fontSize: "var(--fs-body-sm)" }}>No communication logs documented yet.</span>
              </div>
            ) : (
              // Sorted by newest notes first
              [...client.notes].reverse().map((note) => {
                const canDeleteNote = isSuperAdmin || (currentUser && note.creatorEmail === currentUser.email);
                
                return (
                  <div 
                    key={note._id}
                    style={{ 
                      backgroundColor: "rgba(4, 13, 33, 0.4)", 
                      border: "1px solid var(--clr-border)", 
                      borderRadius: "var(--radius-md)",
                      padding: "var(--sp-4)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--sp-2)",
                      position: "relative"
                    }}
                  >
                    {/* Header: creator & date */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>
                      <span style={{ fontWeight: "var(--fw-bold)", color: "var(--clr-accent-primary)" }}>{note.creatorEmail}</span>
                      <span>{new Date(note.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                    {/* Content */}
                    <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)", whiteSpace: "pre-line", wordBreak: "break-word" }}>
                      {note.content}
                    </p>
                    
                    {/* Delete Icon */}
                    {canDeleteNote && (
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        style={{
                          position: "absolute",
                          bottom: "12px",
                          right: "12px",
                          background: "none",
                          border: "none",
                          color: "var(--clr-text-muted)",
                          cursor: "pointer",
                          transition: "var(--transition-fast)"
                        }}
                        className="note-delete-btn"
                        title="Delete log entry"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Edit Client Modal */}
      {isEditOpen && (
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
          onClick={() => setIsEditOpen(false)}
        >
          <div 
            className="c-card c-card--glow"
            style={{ 
              width: "100%", 
              maxWidth: "560px", 
              maxHeight: "90vh", 
              overflowY: "auto",
              position: "relative",
              animation: "slideIn 0.2s ease-out" 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsEditOpen(false)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "var(--clr-text-muted)", cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: "var(--sp-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <Edit size={20} style={{ color: "var(--clr-accent-primary)" }} />
                <span>Edit Client Profile</span>
              </h2>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                Modify client details and agent assignments
              </p>
            </div>

            {editError && (
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
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              {/* Contact Grid */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)" }}>Contact Details</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                  <div className="c-input">
                    <label className="c-input__label">First Name *</label>
                    <input 
                      type="text" 
                      required
                      value={editFields.firstName}
                      onChange={(e) => setEditFields(f => ({ ...f, firstName: e.target.value }))}
                      className="c-input__field" 
                    />
                  </div>
                  <div className="c-input">
                    <label className="c-input__label">Last Name *</label>
                    <input 
                      type="text" 
                      required
                      value={editFields.lastName}
                      onChange={(e) => setEditFields(f => ({ ...f, lastName: e.target.value }))}
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
                      value={editFields.email}
                      onChange={(e) => setEditFields(f => ({ ...f, email: e.target.value }))}
                      className="c-input__field" 
                    />
                  </div>
                  <div className="c-input">
                    <label className="c-input__label">Phone Number</label>
                    <input 
                      type="tel" 
                      value={editFields.phone}
                      onChange={(e) => setEditFields(f => ({ ...f, phone: e.target.value }))}
                      className="c-input__field" 
                    />
                  </div>
                </div>
              </div>

              {/* Company Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", borderTop: "1px solid var(--clr-border)", paddingTop: "var(--sp-4)" }}>
                <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)" }}>Company Info</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                  <div className="c-input">
                    <label className="c-input__label">Company Name</label>
                    <input 
                      type="text" 
                      value={editFields.companyName}
                      onChange={(e) => setEditFields(f => ({ ...f, companyName: e.target.value }))}
                      className="c-input__field" 
                    />
                  </div>
                  <div className="c-input">
                    <label className="c-input__label">Industry</label>
                    <input 
                      type="text" 
                      value={editFields.industry}
                      onChange={(e) => setEditFields(f => ({ ...f, industry: e.target.value }))}
                      className="c-input__field" 
                    />
                  </div>
                </div>
                <div className="c-input">
                  <label className="c-input__label">Website URL</label>
                  <input 
                    type="text" 
                    value={editFields.website}
                    onChange={(e) => setEditFields(f => ({ ...f, website: e.target.value }))}
                    className="c-input__field" 
                  />
                </div>
              </div>

              {/* Meta details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", borderTop: "1px solid var(--clr-border)", paddingTop: "var(--sp-4)" }}>
                <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)" }}>Pipeline Configuration</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                  <div className="c-input">
                    <label className="c-input__label">Lead Status *</label>
                    <select
                      value={editFields.status}
                      onChange={(e) => setEditFields(f => ({ ...f, status: e.target.value }))}
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
                      value={editFields.source}
                      onChange={(e) => setEditFields(f => ({ ...f, source: e.target.value }))}
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
                      value={editFields.assignedAgentId}
                      onChange={(e) => setEditFields(f => ({ ...f, assignedAgentId: e.target.value }))}
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
                  onClick={() => setIsEditOpen(false)}
                  className="c-btn c-btn--secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={editLoading}
                  className="c-btn c-btn--primary"
                  style={{ minWidth: "120px", gap: "var(--sp-2)" }}
                >
                  {editLoading ? <div className="btn-spinner" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
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
        .note-delete-btn:hover {
          color: var(--clr-error) !important;
        }
        .hover-bright:hover {
          color: var(--clr-text-primary) !important;
        }
      `}</style>
    </main>
  );
}
