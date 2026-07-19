"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../layout";
import { useLanguage } from "@/context/LanguageContext";
import { 
  ChevronRight,
  Database, 
  DownloadCloud, 
  RotateCcw, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  HardDrive, 
  FileJson,
  X,
  ShieldAlert,
  ServerCrash
} from "lucide-react";

interface BackupItem {
  _id: string;
  name: string;
  size: number;
  status: "Pending" | "Completed" | "Failed" | "Restored";
  blobUrl: string;
  createdEmail: string;
  restoredEmail?: string;
  restoredAt?: string;
  createdAt: string;
}

export default function BackupsPage() {
  const { user: currentUser } = useAuth();
  const { t, isRtl } = useLanguage();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Data state
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Action states
  const [creating, setCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupItem | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Load backups list
  const fetchBackups = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/backups");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load backups");
      setBackups(json.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchBackups();
    }
  }, [isSuperAdmin]);

  // Create backup trigger
  const handleCreateBackup = async () => {
    if (creating) return;
    setCreating(true);
    setActionError("");
    setRestoreSuccess("");
    try {
      const res = await fetch("/api/v1/backups", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to generate backup");

      fetchBackups();
    } catch (err: any) {
      setActionError(err.message || "Failed to create backup snapshot");
    } finally {
      setCreating(false);
    }
  };

  // Restore backup execution
  const handleExecuteRestore = async () => {
    if (!restoreTarget || restoring) return;
    setRestoring(true);
    setActionError("");
    setRestoreSuccess("");
    try {
      const res = await fetch(`/api/v1/backups/${restoreTarget._id}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Restore failed");

      setRestoreSuccess(`Database successfully recovered and rolled back to snapshot: ${restoreTarget.name}`);
      setRestoreTarget(null);
      fetchBackups();
    } catch (err: any) {
      setActionError(err.message || "Failed to execute database recovery");
    } finally {
      setRestoring(false);
    }
  };

  // Delete backup record
  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this backup snapshot? This deletes the file from storage and database logs.")) return;
    setActionError("");
    setRestoreSuccess("");
    try {
      const res = await fetch(`/api/v1/backups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete backup");

      fetchBackups();
    } catch (err: any) {
      setActionError(err.message || "Failed to delete backup snapshot");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // If Employee, block access
  if (!isSuperAdmin) {
    return (
      <main style={{ flex: 1, padding: "var(--sp-12)", display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: "var(--sp-4)" }}>
        <ServerCrash size={48} style={{ color: "var(--clr-error)" }} />
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "var(--fs-h2)", color: "var(--clr-text-primary)", marginBottom: "var(--sp-1)" }}>
            تم رفض الوصول (403 غير مسموح)
          </h2>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            المشرفين العامين على النظام فقط مخول لهم بالوصول لإدارة النسخ الاحتياطي واستعادة البيانات.
          </p>
        </div>
      </main>
    );
  }

  // Calculate statistics
  const totalSize = backups.reduce((acc, curr) => acc + curr.size, 0);
  const lastBackup = backups.length > 0 ? backups[0].createdAt : null;

  return (
    <main className="responsive-main">
      
      {/* Header toolbar */}
      <div className="responsive-page-header">
        <div>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            إنشاء نسخ سحابية احتياطية لقواعد بيانات نظام الـ CRM على مساحات Vercel Blob
          </p>
        </div>
        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="c-btn c-btn--primary"
          style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
        >
          {creating ? <div className="btn-spinner" /> : <Database size={16} />}
          <span>إنشاء نسخة احتياطية جديدة</span>
        </button>
      </div>

      {/* Alert logs */}
      {actionError && (
        <div style={{ backgroundColor: "rgba(229, 62, 62, 0.12)", border: "1px solid var(--clr-error)", color: "var(--clr-error)", padding: "var(--sp-3) var(--sp-4)", borderRadius: "var(--radius-md)", fontSize: "var(--fs-body-sm)", textAlign: "right" }}>
          {actionError}
        </div>
      )}

      {restoreSuccess && (
        <div style={{ backgroundColor: "rgba(56, 161, 105, 0.12)", border: "1px solid var(--clr-success)", color: "var(--clr-success)", padding: "var(--sp-3) var(--sp-4)", borderRadius: "var(--radius-md)", fontSize: "var(--fs-body-sm)", display: "flex", alignItems: "center", gap: "var(--sp-2)", textAlign: "right" }}>
          <CheckCircle2 size={16} />
          <span>{restoreSuccess}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="responsive-grid-3" style={{ textAlign: "right" }}>
        <div className="c-card c-card--glow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>إجمالي النسخ الاحتياطية</span>
          <span style={{ fontSize: "32px", fontWeight: "var(--fw-bold)", fontFamily: "Outfit" }}>{backups.length} نسخة</span>
        </div>

        <div className="c-card c-card--glow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>تاريخ آخر نسخة ناجحة</span>
          <span style={{ fontSize: "16px", fontWeight: "var(--fw-bold)", color: lastBackup ? "var(--clr-text-primary)" : "var(--clr-text-muted)", margin: "auto 0" }}>
            {lastBackup ? new Date(lastBackup).toLocaleString("ar-EG") : "لم يتم مطلقاً"}
          </span>
        </div>

        <div className="c-card c-card--glow" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>إجمالي استهلاك المساحة</span>
          <span style={{ fontSize: "32px", fontWeight: "var(--fw-bold)", fontFamily: "Outfit" }}>{formatBytes(totalSize)}</span>
        </div>
      </div>

      {/* History table */}
      <section className="c-card" style={{ padding: 0, display: "flex", flexDirection: "column", minHeight: "440px" }}>
        <div style={{ padding: "var(--sp-4)", borderBottom: "1px solid var(--clr-border)", backgroundColor: "rgba(4, 13, 33, 0.4)", textAlign: "right" }}>
          <h2 style={{ fontSize: "var(--fs-body-sm)", fontWeight: "var(--fw-bold)", margin: 0 }}>سجلات النسخ الاحتياطي التاريخية</h2>
        </div>

        <div style={{ overflowX: "auto", flex: 1 }}>
          <div className="c-table-container">
            <table className="c-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--clr-border)", fontSize: "11px", color: "var(--clr-text-muted)", backgroundColor: "rgba(4, 13, 33, 0.1)" }}>
                  <th style={{ textAlign: "right", padding: "12px var(--sp-4)" }}>اسم ملف النسخة الاحتياطية</th>
                  <th style={{ textAlign: "right", padding: "12px" }}>حجم الملف</th>
                  <th style={{ textAlign: "right", padding: "12px" }}>تم الإنشاء بواسطة</th>
                  <th style={{ textAlign: "right", padding: "12px" }}>الحالة</th>
                  <th style={{ textAlign: "right", padding: "12px" }}>تاريخ الإنشاء</th>
                  <th style={{ textAlign: "center", padding: "12px var(--sp-4)" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--sp-12)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                      جاري تحميل سجلات النسخ الاحتياطي...
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--sp-12)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                      لا توجد أي نسخ احتياطية مسجلة. انقر على 'إنشاء نسخة احتياطية جديدة' لبدء النسخ لقواعد البيانات.
                    </td>
                  </tr>
                ) : (
                  backups.map(backup => (
                    <tr key={backup._id} style={{ borderBottom: "1px solid var(--clr-border)", fontSize: "12px" }} className="table-row-hover">
                      <td style={{ padding: "12px var(--sp-4)", fontWeight: "var(--fw-medium)", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <FileJson size={16} style={{ color: "var(--clr-accent-primary)" }} />
                          <span>{backup.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px", color: "var(--clr-text-muted)", textAlign: "right" }}>{formatBytes(backup.size)}</td>
                      <td style={{ padding: "12px", textAlign: "right" }}>{backup.createdEmail}</td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <span className={`c-badge ${backup.status === "Restored" ? "c-badge--info" : "c-badge--success"}`} style={{ textTransform: "none" }}>
                          {backup.status === "Completed" ? "مكتملة" : backup.status === "Restored" ? "مستعادة" : backup.status === "Failed" ? "فاشلة" : backup.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px", color: "var(--clr-text-muted)", textAlign: "right" }}>{new Date(backup.createdAt).toLocaleString("ar-EG")}</td>
                      <td style={{ padding: "12px var(--sp-4)", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "var(--sp-2)", justifyContent: "center" }}>
                          <a
                            href={backup.blobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="c-btn c-btn--secondary"
                            style={{ padding: "6px var(--sp-2)", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <DownloadCloud size={13} />
                            <span>تحميل</span>
                          </a>
                          <button
                            onClick={() => setRestoreTarget(backup)}
                            className="c-btn c-btn--secondary"
                            style={{ padding: "6px var(--sp-2)", gap: "4px" }}
                          >
                            <RotateCcw size={13} />
                            <span>استعادة</span>
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(backup._id)}
                            className="c-btn c-btn--secondary delete-btn-hover"
                            style={{ padding: "6px", borderColor: "rgba(229, 62, 62, 0.3)", color: "var(--clr-error)" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Restore Warning Modal */}
      {restoreTarget && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(4, 13, 33, 0.85)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--sp-4)"
          }}
        >
          <div 
            className="c-card c-card--glow"
            style={{ 
              width: "100%", 
              maxWidth: "500px", 
              position: "relative",
              borderColor: "var(--clr-error)",
              animation: "slideIn 0.25s ease-out" 
            }}
          >
            <div style={{ display: "flex", gap: "var(--sp-3)", marginBottom: "var(--sp-4)", textAlign: "right" }}>
              <AlertTriangle size={36} style={{ color: "var(--clr-error)", flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)", margin: 0 }}>
                  تنبيه حرج للغاية: تأكيد استعادة قاعدة البيانات
                </h3>
                <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", marginTop: "4px" }}>
                  استعادة النسخة الاحتياطية ستقوم بحذف كافة البيانات الحالية وتجاوزها بالكامل.
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: "rgba(229, 62, 62, 0.05)", border: "1px dashed var(--clr-error)", borderRadius: "var(--radius-md)", padding: "var(--sp-4)", fontSize: "var(--fs-body-sm)", color: "var(--clr-text-muted)", lineHeight: "1.6", marginBottom: "var(--sp-5)", textAlign: "right" }}>
              <p style={{ margin: 0 }}>
                <strong>تحذير:</strong> ستقوم هذه العملية بالكتابة فوق قاعدة البيانات الحالية، بما في ذلك:
                <br />• كافة حسابات وسجلات العملاء
                <br />• قائمة حسابات الموظفين والمسؤولين
                <br />• لوحات المهام والمناقشات والتعليقات
                <br />• مواعيد وجدول المتابعة بالكامل
                <br />
                هذا الإجراء نهائي ولا يمكن التراجع عنه بعد البدء!
              </p>
            </div>

            <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end" }}>
              <button
                disabled={restoring}
                onClick={() => setRestoreTarget(null)}
                className="c-btn c-btn--secondary"
              >
                {t("common.cancel")}
              </button>
              <button
                disabled={restoring}
                onClick={handleExecuteRestore}
                className="c-btn c-btn--primary"
                style={{ backgroundColor: "var(--clr-error)", borderColor: "var(--clr-error)", minWidth: "120px", gap: "var(--sp-2)" }}
              >
                {restoring ? <div className="btn-spinner" /> : <RotateCcw size={14} />}
                <span>استعادة البيانات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
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
        .table-row-hover:hover {
          background-color: rgba(0, 210, 255, 0.04) !important;
        }
        .delete-btn-hover:hover {
          background-color: rgba(229, 62, 62, 0.05) !important;
          border-color: var(--clr-error) !important;
        }
      `}} />
    </main>
  );
}
