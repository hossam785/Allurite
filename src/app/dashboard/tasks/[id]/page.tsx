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
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Send,
  History,
  FileText,
  X,
  Paperclip,
  Download,
  MessageSquare,
  Activity,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  CheckCircle,
  Play
} from "lucide-react";

interface HistoryLog {
  action: string;
  details?: string;
  updatedEmail: string;
  updatedAt: string;
}

interface CommentItem {
  content: string;
  creatorEmail: string;
  createdAt: string;
}

interface AttachmentItem {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  uploadedEmail: string;
  uploadedAt: string;
}

interface TaskDetail {
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
  followUp?: {
    _id: string;
    title: string;
    scheduledAt: string;
    status: string;
  };
  attachments: AttachmentItem[];
  comments: CommentItem[];
  history: HistoryLog[];
  createdAt: string;
  updatedAt: string;
}

interface EmployeeListSummary {
  _id: string;
  firstName: string;
  lastName: string;
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { user: currentUser } = useAuth();
  const { t, isRtl } = useLanguage();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [employees, setEmployees] = useState<EmployeeListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab State for right panel: "comments" | "activity"
  const [rightPanelTab, setRightPanelTab] = useState<"comments" | "activity">("comments");

  // Input states
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Attachment states
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachForm, setAttachForm] = useState({ fileName: "", fileUrl: "", fileSize: "" });
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachError, setAttachError] = useState("");

  // Review states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | "reassign" | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Fetch task profile
  const fetchTaskDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/tasks/${id}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load task details");
      }
      setTask(json.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch employee list for reassign
  const fetchEmployeesList = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch("/api/v1/employees?limit=100");
      const json = await res.json();
      if (res.ok) {
        setEmployees(json.data);
      }
    } catch (err) {
      console.error("Failed to load employees list", err);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
    fetchEmployeesList();
  }, [id]);

  // Submit Comments
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || commentLoading) return;

    setCommentLoading(true);
    try {
      const res = await fetch(`/api/v1/tasks/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to post comment");
      
      setCommentText("");
      // Refresh task details to load comments & history timeline
      fetchTaskDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
    }
  };

  // Submit Attachments Deliverable
  const handleAttachmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachForm.fileName || !attachForm.fileUrl || attachLoading) return;
    setAttachError("");

    setAttachLoading(true);
    try {
      const res = await fetch(`/api/v1/tasks/${id}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attachForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to register attachment");

      setIsAttachModalOpen(false);
      setAttachForm({ fileName: "", fileUrl: "", fileSize: "" });
      fetchTaskDetails();
    } catch (err: any) {
      setAttachError(err.message || "Error adding attachment");
    } finally {
      setAttachLoading(false);
    }
  };

  // Execute State transitions (Start task, submit for review, cancel task)
  const handleSimpleStatusTransition = async (status: string) => {
    setError("");
    try {
      const res = await fetch(`/api/v1/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to transition status");
      
      setTask(json.data);
    } catch (err: any) {
      setError(err.message || "Failed status update");
    }
  };

  // Admin Review / Reassignment submission
  const handleReviewActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewLoading) return;
    setReviewError("");

    const payload: any = {};

    if (reviewAction === "approve") {
      payload.status = "Completed";
    } else if (reviewAction === "reject") {
      if (!feedbackNotes.trim()) {
        setReviewError("Please input feedback rejection comments");
        return;
      }
      payload.status = "Rejected";
      payload.description = task?.description + `\n\n[Feedback Notes]: ${feedbackNotes.trim()}`;
    } else if (reviewAction === "reassign") {
      if (!newAssigneeId) {
        setReviewError("Please select a new assigned agent employee");
        return;
      }
      payload.assignedToId = newAssigneeId;
    }

    setReviewLoading(true);
    try {
      const res = await fetch(`/api/v1/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to process review action");

      setIsReviewModalOpen(false);
      setFeedbackNotes("");
      setTask(json.data);
    } catch (err: any) {
      setReviewError(err.message || "Error processing action");
    } finally {
      setReviewLoading(false);
    }
  };

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case "Critical":
        return <span className="c-badge c-badge--error" style={{ color: "#FEB2B2", border: "1px solid #E53E3E" }}>حرجة</span>;
      case "High":
        return <span className="c-badge c-badge--warning">مرتفعة</span>;
      case "Medium":
        return <span className="c-badge c-badge--info">متوسطة</span>;
      default:
        return <span className="c-badge" style={{ backgroundColor: "rgba(160, 174, 192, 0.15)", color: "var(--clr-text-muted)" }}>منخفضة</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <span className="c-badge" style={{ border: "1px solid var(--clr-border)", color: "var(--clr-text-muted)" }}>قيد الانتظار</span>;
      case "In Progress":
        return <span className="c-badge c-badge--info" style={{ display: "inline-flex", gap: "4px" }}><Play size={10} /> قيد التنفيذ</span>;
      case "Under Review":
        return <span className="c-badge c-badge--warning" style={{ display: "inline-flex", gap: "4px" }}><Clock size={10} /> قيد المراجعة</span>;
      case "Completed":
        return <span className="c-badge c-badge--success" style={{ display: "inline-flex", gap: "4px" }}><CheckCircle size={10} /> مكتملة</span>;
      case "Rejected":
        return <span className="c-badge c-badge--error" style={{ display: "inline-flex", gap: "4px" }}><XCircle size={10} /> مرفوضة</span>;
      case "Overdue":
        return <span className="c-badge c-badge--error" style={{ display: "inline-flex", gap: "4px" }}><AlertCircle size={10} /> متأخرة</span>;
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
        <span style={{ color: "var(--clr-text-muted)" }}>جاري تحميل تفاصيل المهمة...</span>
      </div>
    );
  }

  if (error) {
    return (
      <main style={{ flex: 1, padding: "var(--sp-8)" }}>
        <div className="c-card" style={{ borderColor: "var(--clr-error)", textAlign: "center", padding: "var(--sp-8)" }}>
          <p style={{ color: "var(--clr-error)", fontWeight: "var(--fw-medium)", marginBottom: "var(--sp-4)" }}>{error}</p>
          <Link href="/dashboard/tasks" className="c-btn c-btn--secondary">العودة للوحة المهام</Link>
        </div>
      </main>
    );
  }

  if (!task) return null;

  const isClosed = task.status === "Completed" || task.status === "Cancelled";

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {/* Back link */}
      <div>
        <Link 
          href="/dashboard/tasks" 
          style={{ display: "inline-flex", alignItems: "center", gap: "var(--sp-2)", color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}
          className="hover-bright"
        >
          {isRtl ? <ChevronRight size={16} /> : <ArrowLeft size={16} />}
          <span>العودة للوحة المهام</span>
        </Link>
      </div>

      {/* Header */}
      <header className="responsive-page-header">
        <div>
          <h1 style={{ fontSize: "var(--fs-h1)", marginBottom: "var(--sp-1)" }}>
            {task.title}
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span>ملف وتفاصيل المهمة المرجعية</span>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          {getPriorityBadge(task.priority)}
          {getStatusBadge(task.status)}
        </div>
      </header>

      {/* Columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--sp-6)", alignItems: "flex-start" }}>
        
        {/* Left Column: Details, Attachments & Action controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
          {/* Main Info */}
          <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
            <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
              تفاصيل المهمة
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              {/* Client linked */}
              {task.client && (
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
                      <span style={{ fontSize: "10px", color: "var(--clr-text-muted)", display: "block" }}>العميل المرتبط</span>
                      <span style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)" }}>
                        {task.client.firstName} {task.client.lastName}
                      </span>
                    </div>
                  </div>
                  <Link 
                    href={`/dashboard/clients/${task.client._id}`}
                    className="c-btn c-btn--secondary"
                    style={{ padding: "var(--sp-1) var(--sp-3)", fontSize: "var(--fs-caption)" }}
                  >
                    عرض ملف العميل
                  </Link>
                </div>
              )}

              {/* Follow-up linked */}
              {task.followUp && (
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
                    <Calendar size={18} style={{ color: "var(--clr-accent-primary)" }} />
                    <div>
                      <span style={{ fontSize: "10px", color: "var(--clr-text-muted)", display: "block" }}>جدولة المتابعة المرتبطة</span>
                      <span style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)" }}>
                        {task.followUp.title}
                      </span>
                    </div>
                  </div>
                  <Link 
                    href={`/dashboard/followups/${task.followUp._id}`}
                    className="c-btn c-btn--secondary"
                    style={{ padding: "var(--sp-1) var(--sp-3)", fontSize: "var(--fs-caption)" }}
                  >
                    عرض جدول المتابعة
                  </Link>
                </div>
              )}

              {/* Due Date */}
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <Clock size={18} style={{ color: "var(--clr-text-muted)", marginTop: "2px" }} />
                <div>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>تاريخ الاستحقاق المحدد</span>
                  <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-lg)", color: "var(--clr-text-primary)" }}>
                    {new Date(task.dueDate).toLocaleDateString("ar-EG", { dateStyle: "long" })}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <FileText size={18} style={{ color: "var(--clr-text-muted)", marginTop: "2px" }} />
                <div>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>أجندة ومتطلبات التسليم</span>
                  <p style={{ color: "var(--clr-text-primary)", fontSize: "var(--fs-body-sm)", marginTop: "2px", whiteSpace: "pre-line" }}>
                    {task.description || "لا توجد تفاصيل متطلبات مسجلة لهذه المهمة."}
                  </p>
                </div>
              </div>

              {/* Assigned Agent */}
              <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                <Briefcase size={18} style={{ color: "var(--clr-text-muted)", marginTop: "2px" }} />
                <div>
                  <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>الموظف المسؤول والمتابع</span>
                  <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)", marginTop: "2px" }}>
                    {task.assignedTo?.firstName} {task.assignedTo?.lastName}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Actions panel */}
          {!isClosed && (
            <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
              <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>إجراءات التحكم بالمهام</h3>
 
              {/* Employee Actions: Start Task / Submit Review */}
              {!isSuperAdmin && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                  {task.status === "Pending" && (
                    <button
                      onClick={() => handleSimpleStatusTransition("In Progress")}
                      className="c-btn c-btn--primary"
                      style={{ gap: "var(--sp-2)", width: "100%", justifyContent: "center" }}
                    >
                      <Play size={16} />
                      <span>بدء العمل على المهمة</span>
                    </button>
                  )}
                  {(task.status === "In Progress" || task.status === "Rejected" || task.status === "Overdue") && (
                    <button
                      onClick={() => handleSimpleStatusTransition("Under Review")}
                      className="c-btn c-btn--primary"
                      style={{ gap: "var(--sp-2)", width: "100%", justifyContent: "center" }}
                      disabled={task.attachments.length === 0}
                      title={task.attachments.length === 0 ? "يجب رفع ملف إثبات التسليم أولاً" : ""}
                    >
                      <CheckCircle size={16} />
                      <span>تقديم تسليمات المهمة للمراجعة</span>
                    </button>
                  )}
                  {task.attachments.length === 0 && (task.status === "In Progress" || task.status === "Rejected" || task.status === "Overdue") && (
                    <span style={{ fontSize: "11px", color: "var(--clr-text-muted)", textAlign: "center", marginTop: "var(--sp-1)" }}>
                      ⚠️ يرجى رفع ملف أو رابط إثبات التسليم أدناه أولاً لتتمكن من تقديم المهمة للمراجعة.
                    </span>
                  )}
                </div>
              )}
 
              {/* SuperAdmin Actions: Approve, Reject, Reassign, Cancel */}
              {isSuperAdmin && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
                  {task.status === "Under Review" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                      <button
                        onClick={() => { setReviewAction("approve"); setIsReviewModalOpen(true); }}
                        className="c-btn c-btn--primary"
                        style={{ gap: "var(--sp-2)", justifyContent: "center" }}
                      >
                        <ThumbsUp size={16} />
                        <span>اعتماد التسليم</span>
                      </button>
                      <button
                        onClick={() => { setReviewAction("reject"); setIsReviewModalOpen(true); }}
                        className="c-btn c-btn--secondary reject-btn-hover"
                        style={{ borderColor: "rgba(229,62,62,0.5)", color: "var(--clr-error)", gap: "var(--sp-2)", justifyContent: "center" }}
                      >
                        <ThumbsDown size={16} />
                        <span>رفض وإرجاع المهمة</span>
                      </button>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                    <button
                      onClick={() => { setReviewAction("reassign"); setIsReviewModalOpen(true); }}
                      className="c-btn c-btn--secondary"
                      style={{ gap: "var(--sp-2)", justifyContent: "center" }}
                    >
                      <RotateCcw size={16} />
                      <span>إعادة إسناد المهمة</span>
                    </button>
                    <button
                      onClick={() => handleSimpleStatusTransition("Cancelled")}
                      className="c-btn c-btn--secondary"
                      style={{ borderColor: "rgba(160, 174, 192, 0.4)", color: "var(--clr-text-muted)", gap: "var(--sp-2)", justifyContent: "center" }}
                    >
                      <XCircle size={16} />
                      <span>إلغاء المهمة</span>
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Attachments Section */}
          <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <Paperclip size={18} />
                <span>الملفات والتسليمات المرفوعة ({task.attachments.length})</span>
              </h2>
              {!isClosed && (
                <button 
                  onClick={() => setIsAttachModalOpen(true)}
                  className="c-btn c-btn--secondary"
                  style={{ padding: "4px 8px", fontSize: "11px" }}
                >
                  إضافة ملف
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
              {task.attachments.length === 0 ? (
                <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", fontStyle: "italic" }}>
                  لا توجد أي تسليمات مرفوعة حتى الآن.
                </p>
              ) : (
                task.attachments.map((file, index) => (
                  <div 
                    key={index}
                    style={{ 
                      padding: "var(--sp-3) var(--sp-4)", 
                      backgroundColor: "rgba(4, 13, 33, 0.3)", 
                      border: "1px solid var(--clr-border)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "var(--sp-3)"
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {file.fileName}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--clr-text-muted)" }}>
                        تم الرفع بواسطة {file.uploadedEmail}
                      </span>
                    </div>
                    <a 
                      href={file.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="c-btn c-btn--secondary"
                      style={{ padding: "var(--sp-2)", display: "flex", alignItems: "center" }}
                      title="Download Deliverable"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Tabbed comments or activity history logs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          {/* Tab Selection */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--clr-border)", gap: "var(--sp-4)" }}>
            <button
              onClick={() => setRightPanelTab("comments")}
              style={{
                padding: "var(--sp-2) var(--sp-4)",
                background: "none",
                border: "none",
                borderBottom: rightPanelTab === "comments" ? "2px solid var(--clr-accent-primary)" : "2px solid transparent",
                color: rightPanelTab === "comments" ? "var(--clr-text-primary)" : "var(--clr-text-muted)",
                cursor: "pointer",
                fontWeight: rightPanelTab === "comments" ? "var(--fw-bold)" : "var(--fw-medium)",
                fontSize: "var(--fs-body-sm)"
              }}
            >
              المناقشات والتعليقات ({task.comments.length})
            </button>
            <button
              onClick={() => setRightPanelTab("activity")}
              style={{
                padding: "var(--sp-2) var(--sp-4)",
                background: "none",
                border: "none",
                borderBottom: rightPanelTab === "activity" ? "2px solid var(--clr-accent-primary)" : "2px solid transparent",
                color: rightPanelTab === "activity" ? "var(--clr-text-primary)" : "var(--clr-text-muted)",
                cursor: "pointer",
                fontWeight: rightPanelTab === "activity" ? "var(--fw-bold)" : "var(--fw-medium)",
                fontSize: "var(--fs-body-sm)"
              }}
            >
              سجل العمليات والتدقيق ({task.history.length})
            </button>
          </div>

          {/* Comments panel */}
          {rightPanelTab === "comments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              {/* Form to comment */}
              {!isClosed && (
                <form onSubmit={handleCommentSubmit} style={{ display: "flex", gap: "var(--sp-2)" }}>
                  <input 
                    type="text"
                    placeholder="اكتب تعليقاً أو استفساراً..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="c-input__field"
                    style={{ flex: 1, height: "42px", textAlign: "right" }}
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={commentLoading}
                    className="c-btn c-btn--primary"
                    style={{ padding: "0 var(--sp-4)", display: "flex", alignItems: "center" }}
                  >
                    <Send size={16} />
                  </button>
                </form>
              )}

              {/* Feed */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", overflowY: "auto", maxHeight: "460px" }}>
                {task.comments.length === 0 ? (
                  <p style={{ color: "var(--clr-text-muted)", fontStyle: "italic", fontSize: "var(--fs-body-sm)", textAlign: "center", padding: "var(--sp-4) 0" }}>
                    لا توجد أي تعليقات مسجلة حتى الآن.
                  </p>
                ) : (
                  [...task.comments].reverse().map((comm, index) => (
                    <div 
                      key={index}
                      style={{ 
                        padding: "var(--sp-3) var(--sp-4)", 
                        backgroundColor: "var(--clr-bg-surface)",
                        border: "1px solid var(--clr-border)",
                        borderRadius: "var(--radius-md)",
                        textAlign: "right"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--clr-text-muted)", marginBottom: "4px" }}>
                        <span style={{ fontWeight: "var(--fw-medium)", color: "var(--clr-accent-primary)" }}>{comm.creatorEmail}</span>
                        <span>{new Date(comm.createdAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</span>
                      </div>
                      <p style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-primary)", whiteSpace: "pre-line", lineHeight: "1.4" }}>
                        {comm.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Activity Logs Panel */}
          {rightPanelTab === "activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", paddingRight: "var(--sp-2)", overflowY: "auto", maxHeight: "520px" }}>
              {[...task.history].reverse().map((log, index) => (
                <div 
                  key={index}
                  style={{
                    borderRight: "2px solid var(--clr-border)",
                    paddingRight: "var(--sp-4)",
                    position: "relative",
                    paddingBottom: "var(--sp-3)",
                    textAlign: "right"
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      right: "-7px",
                      top: "4px",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: "var(--clr-accent-primary)",
                      border: "2px solid var(--clr-bg-primary)"
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px" }}>
                    <span style={{ fontWeight: "var(--fw-bold)", color: "var(--clr-text-primary)" }}>
                      {log.action}
                    </span>
                    <span style={{ color: "var(--clr-text-muted)" }}>
                      {new Date(log.updatedAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  {log.details && (
                    <p style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px", whiteSpace: "pre-line" }}>
                      {log.details}
                    </p>
                  )}
                  <div style={{ fontSize: "9px", color: "var(--clr-text-muted)", marginTop: "4px", textAlign: "left" }}>
                    المعدل: {log.updatedEmail}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Attachment Modal */}
      {isAttachModalOpen && (
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
          onClick={() => setIsAttachModalOpen(false)}
        >
          <div 
            className="c-card c-card--glow"
            style={{ width: "100%", maxWidth: "420px", position: "relative", animation: "slideIn 0.2s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsAttachModalOpen(false)} 
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
            <div style={{ marginBottom: "var(--sp-4)", textAlign: "right" }}>
              <h3 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)" }}>رفع تسليمات المهمة</h3>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>قم برفع روابط العمل أو المراجع المستندية لإثبات التسليم</p>
            </div>

            {attachError && <div style={{ color: "var(--clr-error)", fontSize: "var(--fs-body-sm)", marginBottom: "var(--sp-2)", textAlign: "right" }}>{attachError}</div>}

            <form onSubmit={handleAttachmentSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", textAlign: "right" }}>
              <div className="c-input">
                <label className="c-input__label">اسم الملف / التسليم *</label>
                <input 
                  type="text" 
                  required
                  placeholder="مثال: المسودة النهائية للاتفاقية" 
                  value={attachForm.fileName}
                  onChange={(e) => setAttachForm(a => ({ ...a, fileName: e.target.value }))}
                  className="c-input__field"
                  style={{ textAlign: "right" }}
                />
              </div>
              <div className="c-input">
                <label className="c-input__label">رابط عنوان التسليم *</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://drive.google.com/..." 
                  value={attachForm.fileUrl}
                  onChange={(e) => setAttachForm(a => ({ ...a, fileUrl: e.target.value }))}
                  className="c-input__field"
                  style={{ textAlign: "left", direction: "ltr" }}
                />
              </div>
              <div className="c-input">
                <label className="c-input__label">حجم الملف (بالبايت، اختياري)</label>
                <input 
                  type="number" 
                  placeholder="مثال: 204800" 
                  value={attachForm.fileSize}
                  onChange={(e) => setAttachForm(a => ({ ...a, fileSize: e.target.value }))}
                  className="c-input__field"
                  style={{ textAlign: "left", direction: "ltr" }}
                />
              </div>
              <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", marginTop: "var(--sp-2)" }}>
                <button type="button" onClick={() => setIsAttachModalOpen(false)} className="c-btn c-btn--secondary">{t("common.cancel")}</button>
                <button type="submit" disabled={attachLoading} className="c-btn c-btn--primary">تسجيل ورفع الملف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Action Modal (Approve, Reject, Reassign) */}
      {isReviewModalOpen && (
        <div 
          className="c-modal-overlay"
          onClick={() => setIsReviewModalOpen(false)}
        >
          <div 
            className="c-card c-card--glow c-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsReviewModalOpen(false)} 
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
            
            <div style={{ marginBottom: "var(--sp-4)", textAlign: "right" }}>
              <h3 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)" }}>
                {reviewAction === "approve" ? "اعتماد وإكمال المهمة" : reviewAction === "reject" ? "رفض التسليمات وإعادة المهمة للموظف" : "إعادة إسناد المهمة لموظف آخر"}
              </h3>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                {reviewAction === "approve" 
                  ? "اعتماد كافة التسليمات وإغلاق المهمة كـ مكتملة بنجاح." 
                  : reviewAction === "reject" 
                  ? "إرسال ملاحظات تصحيحية للموظف توضح التعديلات المطلوبة لإعادة تقديمها." 
                  : "تغيير الموظف المسؤول والمتابع الحالي لهذه المهمة."}
              </p>
            </div>

            {reviewError && <div style={{ color: "var(--clr-error)", fontSize: "var(--fs-body-sm)", marginBottom: "var(--sp-2)", textAlign: "right" }}>{reviewError}</div>}

            <form onSubmit={handleReviewActionSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", textAlign: "right" }}>
              {reviewAction === "reject" && (
                <div className="c-input">
                  <label className="c-input__label">ملاحظات وتوجيهات الرفض والتعديل *</label>
                  <textarea
                    placeholder="اكتب التعديلات والمهام التصحيحية المطلوبة من الموظف بالتفصيل..."
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    rows={4}
                    className="c-input__field"
                    style={{ resize: "none", padding: "var(--sp-3)", textAlign: "right" }}
                    required
                  />
                </div>
              )}

              {reviewAction === "reassign" && (
                <div className="c-input">
                  <label className="c-input__label">اختر الموظف الجديد لإسناد المهمة *</label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="c-input__field"
                    style={{ background: "var(--clr-bg-primary)" }}
                    required
                  >
                    <option value="">-- اختر الموظف المسؤول --</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", marginTop: "var(--sp-2)" }}>
                <button type="button" onClick={() => setIsReviewModalOpen(false)} className="c-btn c-btn--secondary">{t("common.cancel")}</button>
                <button type="submit" disabled={reviewLoading} className="c-btn c-btn--primary">
                  {reviewAction === "approve" ? "اعتماد التسليم وإتمام المهمة" : reviewAction === "reject" ? "تأكيد الرفض والإرجاع" : "تأكيد إعادة الإسناد"}
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
        .reject-btn-hover:hover {
          background-color: rgba(229,62,62,0.1) !important;
          border-color: var(--clr-error) !important;
        }
        .hover-bright:hover {
          color: var(--clr-text-primary) !important;
        }
      `}</style>
    </main>
  );
}
