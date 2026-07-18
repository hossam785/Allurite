"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../layout";
import { 
  ArrowLeft, 
  Clock, 
  Calendar, 
  User, 
  Users,
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Send,
  History,
  Phone,
  Mail,
  Video,
  FileText,
  X,
  Edit2
} from "lucide-react";

interface HistoryLog {
  status: "Pending" | "Scheduled" | "Completed" | "Missed" | "Cancelled";
  scheduledAt: string;
  notes?: string;
  updatedEmail: string;
  updatedAt: string;
}

interface FollowUpDetail {
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
    phone?: string;
    companyName?: string;
  };
  assignedAgent: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  history: HistoryLog[];
  createdAt: string;
  updatedAt: string;
}

export default function FollowUpDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { user: currentUser } = useAuth();

  const [followup, setFollowup] = useState<FollowUpDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal actions states
  const [activeAction, setActiveAction] = useState<"complete" | "cancel" | "reschedule" | null>(null);
  const [notesText, setNotesText] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Fetch followup details
  const fetchDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/followups/${id}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load follow-up details");
      }
      setFollowup(json.data);
      // Pre-set reschedule date if available
      setRescheduleDate(json.data.scheduledAt.substring(0, 16));
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Submit status update / reschedule
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followup || actionLoading) return;
    setActionError("");

    const payload: any = {};

    if (activeAction === "complete") {
      if (!notesText.trim()) {
        setActionError("Please provide completion notes summarizing the call outcome");
        return;
      }
      payload.status = "Completed";
      payload.notes = notesText.trim();
    } else if (activeAction === "cancel") {
      if (!notesText.trim()) {
        setActionError("Please provide cancellation notes explaining the reason");
        return;
      }
      payload.status = "Cancelled";
      payload.notes = notesText.trim();
    } else if (activeAction === "reschedule") {
      if (!rescheduleDate) {
        setActionError("Please select a new date and time schedule");
        return;
      }
      const newDate = new Date(rescheduleDate);
      if (newDate < new Date()) {
        setActionError("Rescheduled date must be in the future");
        return;
      }
      payload.status = "Scheduled"; // Reset back to Scheduled if it was Missed
      payload.scheduledAt = newDate.toISOString();
      payload.notes = notesText.trim() || `Rescheduled followup to ${newDate.toLocaleString()}`;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/followups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update follow-up");
      }

      setFollowup(json.data);
      setActiveAction(null);
      setNotesText("");
    } catch (err: any) {
      setActionError(err.message || "Error submitting update");
    } finally {
      setActionLoading(false);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "Call": return <Phone size={18} />;
      case "Email": return <Mail size={18} />;
      case "Meeting": return <Users size={18} />;
      case "Demo": return <Video size={18} />;
      default: return <FileText size={18} />;
    }
  };

  const getStatusBanner = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center", backgroundColor: "rgba(56, 161, 105, 0.12)", border: "1px solid var(--clr-success)", color: "var(--clr-success)", borderRadius: "var(--radius-md)", padding: "var(--sp-4)" }}>
            <CheckCircle2 size={20} />
            <div>
              <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)" }}>Follow-Up Completed</div>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                This log is closed. Completed schedules cannot be reverted or rescheduled.
              </p>
            </div>
          </div>
        );
      case "Cancelled":
        return (
          <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center", backgroundColor: "rgba(160, 174, 192, 0.12)", border: "1px solid var(--clr-border)", color: "var(--clr-text-muted)", borderRadius: "var(--radius-md)", padding: "var(--sp-4)" }}>
            <XCircle size={20} />
            <div>
              <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)" }}>Follow-Up Cancelled</div>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                This schedule was cancelled and is closed for edits.
              </p>
            </div>
          </div>
        );
      case "Missed":
        return (
          <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center", backgroundColor: "rgba(229, 62, 62, 0.12)", border: "1px solid var(--clr-error)", color: "var(--clr-error)", borderRadius: "var(--radius-md)", padding: "var(--sp-4)" }}>
            <AlertCircle size={20} />
            <div>
              <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)" }}>Follow-Up Overdue (Missed)</div>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                This followup schedule was missed. Please reschedule a new date or document the outcome.
              </p>
            </div>
          </div>
        );
      default:
        return null;
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
        return <span className="c-badge c-badge--error">Missed</span>;
      case "Cancelled":
        return <span className="c-badge" style={{ backgroundColor: "rgba(160, 174, 192, 0.15)", color: "var(--clr-text-muted)" }}>Cancelled</span>;
      default:
        return <span className="c-badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", minHeight: "80vh", gap: "var(--sp-4)" }}>
        <div style={{ width: "32px", height: "32px", border: "3px solid var(--clr-border)", borderTop: "3px solid var(--clr-accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ color: "var(--clr-text-muted)" }}>Loading follow-up schedules...</span>
      </div>
    );
  }

  if (error) {
    return (
      <main style={{ flex: 1, padding: "var(--sp-8)" }}>
        <div className="c-card" style={{ borderColor: "var(--clr-error)", textAlign: "center", padding: "var(--sp-8)" }}>
          <p style={{ color: "var(--clr-error)", fontWeight: "var(--fw-medium)", marginBottom: "var(--sp-4)" }}>{error}</p>
          <Link href="/dashboard/followups" className="c-btn c-btn--secondary">Back to Directory</Link>
        </div>
      </main>
    );
  }

  if (!followup) return null;

  const isClosed = followup.status === "Completed" || followup.status === "Cancelled";

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {/* Breadcrumb */}
      <div>
        <Link 
          href="/dashboard/followups" 
          style={{ display: "inline-flex", alignItems: "center", gap: "var(--sp-2)", color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}
          className="hover-bright"
        >
          <ArrowLeft size={16} />
          <span>Back to Planner</span>
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
            {followup.title}
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            {getChannelIcon(followup.type)}
            <span>{followup.type} Follow-Up schedule</span>
          </p>
        </div>
        <div>
          {getStatusBadge(followup.status)}
        </div>
      </header>

      {/* Banner message */}
      {getStatusBanner(followup.status)}

      {/* Split grid details */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--sp-6)", alignItems: "flex-start" }}>
        
        {/* Left Column: Details and Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
          {/* Main Info */}
          <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
              Follow-Up Details
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              {/* Client Profile link */}
              <div 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "var(--sp-3) var(--sp-4)", 
                  backgroundColor: "rgba(4, 13, 33, 0.4)", 
                  border: "1px solid var(--clr-border)",
                  borderRadius: "var(--radius-md)"
                }}
              >
                <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center" }}>
                  <User size={18} style={{ color: "var(--clr-accent-primary)" }} />
                  <div>
                    <span style={{ fontSize: "10px", color: "var(--clr-text-muted)", display: "block" }}>Client</span>
                    <span style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)" }}>
                      {followup.client?.firstName} {followup.client?.lastName}
                    </span>
                  </div>
                </div>
                <Link 
                  href={`/dashboard/clients/${followup.client?._id}`}
                  className="c-btn c-btn--secondary"
                  style={{ padding: "var(--sp-1) var(--sp-3)", fontSize: "var(--fs-caption)" }}
                >
                  View Profile
                </Link>
              </div>

              {/* Schedule time */}
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <Clock size={18} style={{ color: "var(--clr-text-muted)", marginTop: "2px" }} />
                <div>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Scheduled Time</span>
                  <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-lg)", color: "var(--clr-text-primary)" }}>
                    {new Date(followup.scheduledAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <FileText size={18} style={{ color: "var(--clr-text-muted)", marginTop: "2px" }} />
                <div>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Description Agenda</span>
                  <p style={{ color: "var(--clr-text-primary)", fontSize: "var(--fs-body-sm)", marginTop: "2px", whiteSpace: "pre-line" }}>
                    {followup.description || "No agenda description logged."}
                  </p>
                </div>
              </div>

              {/* Assigned Agent */}
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <Briefcase size={18} style={{ color: "var(--clr-text-muted)", marginTop: "2px" }} />
                <div>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Account Agent Manager</span>
                  <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)", marginTop: "2px" }}>
                    {followup.assignedAgent?.firstName} {followup.assignedAgent?.lastName}
                  </div>
                </div>
              </div>

              {/* Outcome notes */}
              {followup.notes && (
                <div 
                  style={{ 
                    display: "flex", 
                    gap: "var(--sp-3)", 
                    padding: "var(--sp-4)", 
                    backgroundColor: "rgba(0, 210, 255, 0.03)", 
                    border: "1px dashed var(--clr-accent-primary)",
                    borderRadius: "var(--radius-md)",
                    marginTop: "var(--sp-2)"
                  }}
                >
                  <CheckCircle2 size={18} style={{ color: "var(--clr-accent-primary)", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Closure Notes / Log Outcome</span>
                    <p style={{ color: "var(--clr-text-primary)", fontSize: "var(--fs-body-sm)", marginTop: "2px", whiteSpace: "pre-line" }}>
                      {followup.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Action triggers (Only if scheduled/missed and not completed/cancelled) */}
          {!isClosed && (
            <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)" }}>Orchestration Actions</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                <button
                  onClick={() => { setActiveAction("complete"); setNotesText(""); setActionError(""); }}
                  className="c-btn c-btn--primary"
                  style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
                >
                  <CheckCircle2 size={16} />
                  <span>Log Outcome</span>
                </button>
                <button
                  onClick={() => { setActiveAction("reschedule"); setNotesText(""); setActionError(""); }}
                  className="c-btn c-btn--secondary"
                  style={{ gap: "var(--sp-2)" }}
                >
                  <Calendar size={16} />
                  <span>Reschedule</span>
                </button>
              </div>
              <button
                onClick={() => { setActiveAction("cancel"); setNotesText(""); setActionError(""); }}
                className="c-btn c-btn--secondary cancel-btn-hover"
                style={{ borderColor: "rgba(229, 62, 62, 0.5)", color: "var(--clr-error)", gap: "var(--sp-2)" }}
              >
                <XCircle size={16} />
                <span>Cancel Schedule</span>
              </button>
            </section>
          )}
        </div>

        {/* Right Column: Full Audit History Log Timeline */}
        <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
          <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <History size={18} />
            <span>Audit History Timeline ({followup.history.length})</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", paddingLeft: "var(--sp-2)", overflowY: "auto", maxHeight: "500px" }}>
            {[...followup.history].reverse().map((log, index) => (
              <div 
                key={index}
                style={{
                  borderLeft: "2px solid var(--clr-border)",
                  paddingLeft: "var(--sp-4)",
                  position: "relative",
                  paddingBottom: "var(--sp-2)"
                }}
              >
                {/* Timeline node circle */}
                <div
                  style={{
                    position: "absolute",
                    left: "-7px",
                    top: "4px",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: log.status === "Completed" 
                      ? "var(--clr-success)" 
                      : log.status === "Cancelled" 
                      ? "var(--clr-text-muted)" 
                      : log.status === "Missed" 
                      ? "var(--clr-error)" 
                      : "var(--clr-accent-primary)",
                    border: "2px solid var(--clr-bg-surface)"
                  }}
                />

                {/* Log Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--fs-caption)" }}>
                  <span style={{ fontWeight: "var(--fw-bold)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    Status: {getStatusBadge(log.status)}
                  </span>
                  <span style={{ color: "var(--clr-text-muted)" }}>
                    {new Date(log.updatedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>

                {/* Detail */}
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                  Scheduled Date: <span style={{ color: "var(--clr-text-primary)", fontWeight: "var(--fw-medium)" }}>{new Date(log.scheduledAt).toLocaleString()}</span>
                </div>
                {log.notes && (
                  <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)", marginTop: "4px", whiteSpace: "pre-line", backgroundColor: "rgba(4, 13, 33, 0.3)", padding: "var(--sp-2)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(30,46,93,0.5)" }}>
                    {log.notes}
                  </p>
                )}
                <div style={{ fontSize: "9px", color: "var(--clr-text-muted)", marginTop: "4px", textAlign: "right" }}>
                  By: <span style={{ color: "var(--clr-accent-primary)" }}>{log.updatedEmail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Action Modals */}
      {activeAction && (
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
          onClick={() => setActiveAction(null)}
        >
          <div 
            className="c-card c-card--glow"
            style={{ 
              width: "100%", 
              maxWidth: "460px", 
              position: "relative",
              animation: "slideIn 0.2s ease-out" 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setActiveAction(null)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "var(--clr-text-muted)", cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: "var(--sp-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                {activeAction === "complete" ? <CheckCircle2 size={20} style={{ color: "var(--clr-success)" }} /> : activeAction === "cancel" ? <XCircle size={20} style={{ color: "var(--clr-error)" }} /> : <Calendar size={20} style={{ color: "var(--clr-accent-primary)" }} />}
                <span>
                  {activeAction === "complete" ? "Complete Follow-Up" : activeAction === "cancel" ? "Cancel Follow-Up" : "Reschedule Follow-Up"}
                </span>
              </h2>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                {activeAction === "complete" 
                  ? "Log the call outcome details to complete this schedule" 
                  : activeAction === "cancel" 
                  ? "Provide the cancellation reasons to close this task" 
                  : "Pick a new date and time schedule for this follow-up"}
              </p>
            </div>

            {actionError && (
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
                {actionError}
              </div>
            )}

            <form onSubmit={handleActionSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              
              {/* Datepicker only for Reschedule */}
              {activeAction === "reschedule" && (
                <div className="c-input">
                  <label className="c-input__label">New Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="c-input__field" 
                  />
                </div>
              )}

              {/* Notes Content */}
              <div className="c-input">
                <label className="c-input__label">
                  {activeAction === "reschedule" ? "Reschedule comments (Optional)" : "Closure Summary Notes *"}
                </label>
                <textarea
                  placeholder={
                    activeAction === "complete" 
                      ? "Summarize call outcome details..." 
                      : activeAction === "cancel" 
                      ? "Provide reasons for cancellation..." 
                      : "Reason for rescheduling..."
                  }
                  required={activeAction !== "reschedule"}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={4}
                  className="c-input__field"
                  style={{ resize: "none", padding: "var(--sp-3)" }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", marginTop: "var(--sp-4)" }}>
                <button 
                  type="button" 
                  onClick={() => setActiveAction(null)}
                  className="c-btn c-btn--secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="c-btn c-btn--primary"
                  style={{ minWidth: "120px", gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
                >
                  {actionLoading ? <div className="btn-spinner" /> : null}
                  <span>
                    {activeAction === "complete" ? "Complete Log" : activeAction === "cancel" ? "Cancel Log" : "Confirm Reschedule"}
                  </span>
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
        .hover-bright:hover {
          color: var(--clr-text-primary) !important;
        }
        .cancel-btn-hover:hover {
          background-color: rgba(229, 62, 62, 0.1) !important;
          border-color: var(--clr-error) !important;
        }
      `}</style>
    </main>
  );
}
