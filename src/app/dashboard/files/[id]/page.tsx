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
  History,
  FileText,
  X,
  Paperclip,
  Download,
  Trash2,
  Archive,
  RotateCcw,
  Edit2,
  Tag,
  Save
} from "lucide-react";

interface ActivityLog {
  action: "Upload" | "Rename" | "Archive" | "Restore" | "Delete";
  details?: string;
  performedEmail: string;
  performedAt: string;
}

interface FileDetail {
  _id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  blobUrl: string;
  category: "PDF" | "Image" | "Document" | "Spreadsheet" | "Archive" | "Other";
  tags: string[];
  archived: boolean;
  owner: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  relatedModule?: string;
  relatedId?: string;
  uploadedEmail: string;
  activityLogs: ActivityLog[];
  createdAt: string;
  updatedAt: string;
}

export default function FileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { user: currentUser } = useAuth();
  const { t, isRtl } = useLanguage();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  const [file, setFile] = useState<FileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit fields
  const [newName, setNewName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");

  // Fetch details
  const fetchFileDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/files/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load file details");
      
      setFile(json.data);
      setNewName(json.data.fileName);
      setTagsInput(json.data.tags.join(", "));
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFileDetails();
  }, [id]);

  // Submit update (rename / tags update)
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || updateLoading) return;
    setUpdateError("");
    setUpdateSuccess("");

    if (!newName.trim()) {
      setUpdateError("File name cannot be empty");
      return;
    }

    setUpdateLoading(true);
    try {
      // Parse tags
      const tags = tagsInput
        ? tagsInput
            .split(",")
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0)
        : [];

      const res = await fetch(`/api/v1/files/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: newName.trim(), tags }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update file properties");

      setUpdateSuccess("File details updated successfully!");
      setFile(json.data);
    } catch (err: any) {
      setUpdateError(err.message || "Error updating file properties");
    } finally {
      setUpdateLoading(false);
    }
  };

  // Archive / Restore
  const handleToggleArchive = async () => {
    if (!file) return;
    try {
      const res = await fetch(`/api/v1/files/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !file.archived }),
      });
      const json = await res.json();
      if (res.ok) {
        setFile(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Permanent Delete
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this file? This action is irreversible.")) return;
    try {
      const res = await fetch(`/api/v1/files/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/dashboard/files");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", minHeight: "80vh", gap: "var(--sp-4)" }}>
        <div style={{ width: "32px", height: "32px", border: "3px solid var(--clr-border)", borderTop: "3px solid var(--clr-accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ color: "var(--clr-text-muted)" }}>جاري تحميل تفاصيل وخصائص الملف...</span>
      </div>
    );
  }

  if (error) {
    return (
      <main style={{ flex: 1, padding: "var(--sp-8)" }}>
        <div className="c-card" style={{ borderColor: "var(--clr-error)", textAlign: "center", padding: "var(--sp-8)" }}>
          <p style={{ color: "var(--clr-error)", fontWeight: "var(--fw-medium)", marginBottom: "var(--sp-4)" }}>{error}</p>
          <Link href="/dashboard/files" className="c-btn c-btn--secondary">العودة لمدير الملفات</Link>
        </div>
      </main>
    );
  }

  if (!file) return null;

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {/* Back button */}
      <div>
        <Link 
          href="/dashboard/files" 
          style={{ display: "inline-flex", alignItems: "center", gap: "var(--sp-2)", color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}
          className="hover-bright"
        >
          {isRtl ? <ChevronRight size={16} /> : <ArrowLeft size={16} />}
          <span>العودة لمدير الملفات</span>
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
            {file.fileName}
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span>اسم الملف الأصلي عند الرفع: {file.originalName}</span>
          </p>
        </div>
        <div>
          {file.archived ? (
            <span className="c-badge c-badge--warning">مؤرشف</span>
          ) : (
            <span className="c-badge c-badge--success">نشط</span>
          )}
        </div>
      </header>

      {/* Grid columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "var(--sp-6)", alignItems: "flex-start" }}>
        
        {/* Left Column: Edit Form & Metadata Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
          {/* Metadata Card */}
          <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
            <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
              خصائص الملف
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "var(--sp-3)", fontSize: "var(--fs-body-sm)" }}>
              <span style={{ color: "var(--clr-text-muted)" }}>نوع وصيغة الملف:</span>
              <span style={{ fontWeight: "var(--fw-bold)" }}>{file.category}</span>

              <span style={{ color: "var(--clr-text-muted)" }}>حجم الملف:</span>
              <span>{formatBytes(file.fileSize)}</span>

              <span style={{ color: "var(--clr-text-muted)" }}>ترويسة MIME:</span>
              <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{file.mimeType}</span>

              <span style={{ color: "var(--clr-text-muted)" }}>تاريخ الرفع:</span>
              <span>{new Date(file.createdAt).toLocaleString("ar-EG")}</span>

              <span style={{ color: "var(--clr-text-muted)" }}>قام بالرفع:</span>
              <span>{file.uploadedEmail}</span>

              <span style={{ color: "var(--clr-text-muted)" }}>مالك الملف:</span>
              <span>{file.owner?.firstName} {file.owner?.lastName}</span>

              {file.relatedModule && (
                <>
                  <span style={{ color: "var(--clr-text-muted)" }}>الارتباط بالنظام:</span>
                  <span>
                    {file.relatedModule === "Clients" ? "العملاء" : file.relatedModule === "Tasks" ? "المهام" : "الموظفين"} (رقم الكيان: {file.relatedId?.toString()})
                  </span>
                </>
              )}
            </div>
          </section>

          {/* Edit Form */}
          <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
            <h3 style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>تحديث إعدادات الملف</h3>

            {updateError && (
              <div style={{ color: "var(--clr-error)", fontSize: "var(--fs-body-sm)", backgroundColor: "rgba(229,62,62,0.12)", border: "1px solid var(--clr-error)", padding: "var(--sp-2)", borderRadius: "var(--radius-sm)" }}>
                {updateError}
              </div>
            )}

            {updateSuccess && (
              <div style={{ color: "var(--clr-success)", fontSize: "var(--fs-body-sm)", backgroundColor: "rgba(56,161,105,0.12)", border: "1px solid var(--clr-success)", padding: "var(--sp-2)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <CheckCircle2 size={14} />
                <span>تم تحديث تفاصيل الملف بنجاح!</span>
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              <div className="c-input">
                <label className="c-input__label">اسم عرض الملف *</label>
                <input 
                  type="text" 
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="c-input__field"
                  style={{ textAlign: "right" }}
                />
              </div>

              <div className="c-input">
                <label className="c-input__label">الوسوم (مفصولة بفاصلة)</label>
                <input 
                  type="text" 
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="c-input__field"
                  placeholder="مثال: فاتورة، عقد، وثيقة"
                  style={{ textAlign: "right" }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", borderTop: "1px solid var(--clr-border)", paddingTop: "var(--sp-4)", marginTop: "var(--sp-2)" }}>
                <a 
                  href={file.blobUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="c-btn c-btn--secondary"
                  style={{ gap: "var(--sp-2)", display: "inline-flex", alignItems: "center" }}
                >
                  <Download size={16} />
                  <span>تحميل الملف</span>
                </a>

                <button 
                  type="button"
                  onClick={handleToggleArchive}
                  className="c-btn c-btn--secondary"
                  style={{ gap: "var(--sp-2)" }}
                >
                  {file.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                  <span>{file.archived ? "استعادة الملف" : "أرشفة الملف"}</span>
                </button>

                <button 
                  type="button"
                  onClick={handleDelete}
                  className="c-btn c-btn--secondary delete-btn-hover"
                  style={{ borderColor: "rgba(229, 62, 62, 0.4)", color: "var(--clr-error)", gap: "var(--sp-2)" }}
                >
                  <Trash2 size={16} />
                  <span>حذف الملف</span>
                </button>

                <button
                  type="submit"
                  disabled={updateLoading}
                  className="c-btn c-btn--primary"
                  style={{ gap: "var(--sp-2)", marginRight: "auto", marginLeft: "0", minWidth: "110px" }}
                >
                  {updateLoading ? <div className="btn-spinner" /> : <Save size={16} />}
                  <span>حفظ</span>
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Column: Activity log timeline */}
        <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)", textAlign: "right" }}>
          <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <History size={18} />
            <span>سجل العمليات التاريخي للملف ({file.activityLogs.length})</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", paddingRight: "var(--sp-2)", overflowY: "auto", maxHeight: "600px" }}>
            {[...file.activityLogs].reverse().map((log, index) => (
              <div 
                key={index}
                style={{
                  borderRight: "2px solid var(--clr-border)",
                  paddingRight: "var(--sp-4)",
                  position: "relative",
                  paddingBottom: "var(--sp-3)"
                }}
              >
                {/* Timeline node */}
                <div
                  style={{
                    position: "absolute",
                    right: "-7px",
                    top: "4px",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: log.action === "Upload" 
                      ? "var(--clr-success)" 
                      : log.action === "Archive"
                      ? "var(--clr-warning)"
                      : log.action === "Restore"
                      ? "var(--clr-accent-primary)"
                      : "var(--clr-accent-primary)",
                    border: "2px solid var(--clr-bg-surface)"
                  }}
                />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px" }}>
                  <span style={{ fontWeight: "var(--fw-bold)", color: "var(--clr-text-primary)" }}>
                    العملية: {log.action === "Upload" ? "رفع الملف" : log.action === "Rename" ? "إعادة تسمية" : log.action === "Archive" ? "أرشفة" : log.action === "Restore" ? "استعادة" : "حذف"}
                  </span>
                  <span style={{ color: "var(--clr-text-muted)" }}>
                    {new Date(log.performedAt).toLocaleString("ar-EG")}
                  </span>
                </div>
                {log.details && (
                  <p style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", marginTop: "2px", whiteSpace: "pre-line" }}>
                    {log.details}
                  </p>
                )}
                <div style={{ fontSize: "9px", color: "var(--clr-text-muted)", marginTop: "4px", textAlign: "left" }}>
                  بواسطة: {log.performedEmail}
                </div>
              </div>
            ))}
          </div>
        </section>
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
        .delete-btn-hover:hover {
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
