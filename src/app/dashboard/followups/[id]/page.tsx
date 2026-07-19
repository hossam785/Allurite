"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../layout";
import { useLanguage } from "@/context/LanguageContext";
import { 
  ArrowLeft, 
  ChevronRight,
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
  const { t, isRtl } = useLanguage();

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
          <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center", backgroundColor: "rgba(56, 161, 105, 0.12)", border: "1px solid var(--clr-success)", color: "var(--clr-success)", borderRadius: "var(--radius-md)", padding: "var(--sp-4)", textAlign: "right" }}>
            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)" }}>تم إتمام المتابعة</div>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                تم إغلاق سجل المتابعة هذا. السجلات المكتملة لا يمكن تعديلها أو إعادة جدولتها.
              </p>
            </div>
          </div>
        );
      case "Cancelled":
        return (
          <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center", backgroundColor: "rgba(160, 174, 192, 0.12)", border: "1px solid var(--clr-border)", color: "var(--clr-text-muted)", borderRadius: "var(--radius-md)", padding: "var(--sp-4)", textAlign: "right" }}>
            <XCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)" }}>تم إلغاء المتابعة</div>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                تم إلغاء موعد المتابعة هذا وهو مغلق للتعديل.
              </p>
            </div>
          </div>
        );
      case "Missed":
        return (
          <div style={{ display: "flex", gap: "var(--sp-3)", alignItems: "center", backgroundColor: "rgba(229, 62, 62, 0.12)", border: "1px solid var(--clr-error)", color: "var(--clr-error)", borderRadius: "var(--radius-md)", padding: "var(--sp-4)", textAlign: "right" }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)" }}>متابعة متأخرة (فائتة)</div>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                لقد فات الموعد المحدد لهذه المتابعة. يرجى إعادة جدولة موعد جديد أو تدوين تفاصيل النتيجة.
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
        return <span className="c-badge c-badge--info">مجدولة</span>;
      case "Completed":
        return <span className="c-badge c-badge--success">مكتملة</span>;
      case "Missed":
        return <span className="c-badge c-badge--error">فائتة</span>;
      case "Cancelled":
        return <span className="c-badge" style={{ backgroundColor: "rgba(160, 174, 192, 0.15)", color: "var(--clr-text-muted)" }}>ملغاة</span>;
      default:
        return <span className="c-badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", minHeight: "80vh", gap: "var(--sp-4)" }}>
        <div style={{ width: "32px", height: "32px", border: "3px solid var(--clr-border)", borderTop: "3px solid var(--clr-accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ color: "var(--clr-text-muted)" }}>جاري تحميل تفاصيل المتابعة...</span>
      </div>
    );
  }

  if (error) {
    return (
      <main style={{ flex: 1, padding: "var(--sp-8)" }}>
        <div className="c-card" style={{ borderColor: "var(--clr-error)", textAlign: "center", padding: "var(--sp-8)" }}>
          <p style={{ color: "var(--clr-error)", fontWeight: "var(--fw-medium)", marginBottom: "var(--sp-4)" }}>{error}</p>
          <Link href="/dashboard/followups" className="c-btn c-btn--secondary">العودة لمخطط المتابعات</Link>
        </div>
      </main>
    );
  }

  if (!followup) return null;

  const isClosed = followup.status === "Completed" || followup.status === "Cancelled";

  let followupTypeArabic: string = followup.type;
  if (followup.type === "Call") followupTypeArabic = "مكالمة هاتفية 📞";
  else if (followup.type === "Email") followupTypeArabic = "بريد إلكتروني ✉️";
  else if (followup.type === "Meeting") followupTypeArabic = "اجتماع عمل 👥";
  else if (followup.type === "Demo") followupTypeArabic = "عرض تقديمي 🖥️";
  else if (followup.type === "Other") followupTypeArabic = "متابعة أخرى 📝";

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {/* Breadcrumb */}
      <div>
        <Link 
          href="/dashboard/followups" 
          style={{ display: "inline-flex", alignItems: "center", gap: "var(--sp-2)", color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}
          className="hover-bright"
        >
          {isRtl ? <ChevronRight size={16} /> : <ArrowLeft size={16} />}
          <span>العودة لمخطط المتابعات</span>
        </Link>
      </div>

      {/* Header */}
      <header className="responsive-page-header">
        <div>
          <h1 style={{ fontSize: "var(--fs-h1)", marginBottom: "var(--sp-1)" }}>
            {followup.title}
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            {getChannelIcon(followup.type)}
            <span>متابعة مجدولة عبر {followupTypeArabic}</span>
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
          <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
            <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
              تفاصيل المتابعة
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
                    <span style={{ fontSize: "10px", color: "var(--clr-text-muted)", display: "block" }}>العميل</span>
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
                  عرض ملف العميل
                </Link>
              </div>

              {/* Schedule time */}
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <Clock size={18} style={{ color: "var(--clr-text-muted)", marginTop: "2px" }} />
                <div>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>وقت المتابعة المجدول</span>
                  <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-lg)", color: "var(--clr-text-primary)" }}>
                    {new Date(followup.scheduledAt).toLocaleString("ar-EG", { dateStyle: "long", timeStyle: "short" })}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <FileText size={18} style={{ color: "var(--clr-text-muted)", marginTop: "2px" }} />
                <div>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>أجندة / وصف المتابعة</span>
                  <p style={{ color: "var(--clr-text-primary)", fontSize: "var(--fs-body-sm)", marginTop: "2px", whiteSpace: "pre-line" }}>
                    {followup.description || "لا توجد أجندة مكتوبة لهذه المتابعة."}
                  </p>
                </div>
              </div>

              {/* Assigned Agent */}
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <Briefcase size={18} style={{ color: "var(--clr-text-muted)", marginTop: "2px" }} />
                <div>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>الموظف المسؤول والمتابع</span>
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
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>ملاحظات الإغلاق / ملخص النتيجة</span>
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
            <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
              <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>إجراءات المتابعة والتحكم</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                <button
                  onClick={() => { setActiveAction("complete"); setNotesText(""); setActionError(""); }}
                  className="c-btn c-btn--primary"
                  style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
                >
                  <CheckCircle2 size={16} />
                  <span>تدوين النتيجة</span>
                </button>
                <button
                  onClick={() => { setActiveAction("reschedule"); setNotesText(""); setActionError(""); }}
                  className="c-btn c-btn--secondary"
                  style={{ gap: "var(--sp-2)" }}
                >
                  <Calendar size={16} />
                  <span>إعادة جدولة</span>
                </button>
              </div>
              <button
                onClick={() => { setActiveAction("cancel"); setNotesText(""); setActionError(""); }}
                className="c-btn c-btn--secondary cancel-btn-hover"
                style={{ borderColor: "rgba(229, 62, 62, 0.5)", color: "var(--clr-error)", gap: "var(--sp-2)", marginTop: "var(--sp-1)" }}
              >
                <XCircle size={16} />
                <span>إلغاء المتابعة</span>
              </button>
            </section>
          )}
        </div>

        {/* Right Column: Full Audit History Log Timeline */}
        <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)", textAlign: "right" }}>
          <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <History size={18} />
            <span>سجل العمليات والتدقيق التاريخي ({followup.history.length})</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", paddingRight: "var(--sp-2)", overflowY: "auto", maxHeight: "500px" }}>
            {[...followup.history].reverse().map((log, index) => (
              <div 
                key={index}
                style={{
                  borderRight: "2px solid var(--clr-border)",
                  paddingRight: "var(--sp-4)",
                  position: "relative",
                  paddingBottom: "var(--sp-2)"
                }}
              >
                {/* Timeline node circle */}
                <div
                  style={{
                    position: "absolute",
                    right: "-7px",
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
                    الحالة: {getStatusBadge(log.status)}
                  </span>
                  <span style={{ color: "var(--clr-text-muted)" }}>
                    {new Date(log.updatedAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>

                {/* Detail */}
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px" }}>
                  الموعد المجدول: <span style={{ color: "var(--clr-text-primary)", fontWeight: "var(--fw-medium)" }}>{new Date(log.scheduledAt).toLocaleString("ar-EG")}</span>
                </div>
                {log.notes && (
                  <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)", marginTop: "4px", whiteSpace: "pre-line", backgroundColor: "rgba(4, 13, 33, 0.3)", padding: "var(--sp-2)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(30,46,93,0.5)" }}>
                    {log.notes}
                  </p>
                )}
                <div style={{ fontSize: "9px", color: "var(--clr-text-muted)", marginTop: "4px", textAlign: "left" }}>
                  بواسطة: <span style={{ color: "var(--clr-accent-primary)" }}>{log.updatedEmail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Action Modals */}
      {activeAction && (
        <div 
          className="c-modal-overlay"
          onClick={() => setActiveAction(null)}
        >
          <div 
            className="c-card c-card--glow c-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setActiveAction(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: isRtl ? "auto" : "16px",
                left: isRtl ? "16px" : "auto",
                background: "none",
                border: "none",
                color: "var(--clr-text-muted)",
                cursor: "pointer"
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: "var(--sp-6)", textAlign: "right" }}>
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                {activeAction === "complete" ? <CheckCircle2 size={20} style={{ color: "var(--clr-success)" }} /> : activeAction === "cancel" ? <XCircle size={20} style={{ color: "var(--clr-error)" }} /> : <Calendar size={20} style={{ color: "var(--clr-accent-primary)" }} />}
                <span>
                  {activeAction === "complete" ? "إتمام وتسجيل نتيجة المتابعة" : activeAction === "cancel" ? "إلغاء المتابعة المجدولة" : "إعادة جدولة المتابعة"}
                </span>
              </h2>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                {activeAction === "complete" 
                  ? "اكتب تفاصيل نتيجة المتابعة/الاتصال لإغلاق هذا الجدول كـ مكتمل" 
                  : activeAction === "cancel" 
                  ? "يرجى كتابة سبب الإلغاء لإغلاق المتابعة بنجاح" 
                  : "اختر تاريخ ووقت جديد لإعادة جدولة هذه المتابعة"}
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
                  fontSize: "var(--fs-body-sm)",
                  textAlign: "right"
                }}
              >
                {actionError}
              </div>
            )}

            <form onSubmit={handleActionSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
              
              {/* Datepicker only for Reschedule */}
              {activeAction === "reschedule" && (
                <div className="c-input">
                  <label className="c-input__label">التاريخ والوقت الجديد *</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="c-input__field" 
                    style={{ textAlign: "left", direction: "ltr" }}
                  />
                </div>
              )}

              {/* Notes Content */}
              <div className="c-input">
                <label className="c-input__label">
                  {activeAction === "reschedule" ? "ملاحظات إعادة الجدولة (اختياري)" : "ملخص النتيجة / الملاحظات *"}
                </label>
                <textarea
                  placeholder={
                    activeAction === "complete" 
                      ? "اكتب ملخصاً لما تم التوصل إليه مع العميل..." 
                      : activeAction === "cancel" 
                      ? "اكتب سبب إلغاء هذه المتابعة..." 
                      : "سبب إعادة الجدولة..."
                  }
                  required={activeAction !== "reschedule"}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  rows={4}
                  className="c-input__field"
                  style={{ resize: "none", padding: "var(--sp-3)", textAlign: "right" }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", marginTop: "var(--sp-4)" }}>
                <button 
                  type="button" 
                  onClick={() => setActiveAction(null)}
                  className="c-btn c-btn--secondary"
                >
                  {t("common.cancel")}
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="c-btn c-btn--primary"
                  style={{ minWidth: "120px", gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
                >
                  {actionLoading ? <div className="btn-spinner" /> : null}
                  <span>
                    {activeAction === "complete" ? "حفظ النتيجة وإتمام المتابعة" : activeAction === "cancel" ? "تأكيد إلغاء المتابعة" : "تأكيد إعادة الجدولة"}
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
