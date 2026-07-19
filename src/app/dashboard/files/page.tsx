"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../layout";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Search, 
  Plus, 
  X,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
  Trash2,
  Archive,
  RotateCcw,
  Eye,
  Download,
  FolderOpen,
  Calendar,
  ExternalLink,
  Tag
} from "lucide-react";

interface FileItem {
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
  createdAt: string;
}

interface ClientSummary {
  _id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}

interface TaskSummary {
  _id: string;
  title: string;
}

interface EmployeeSummary {
  _id: string;
  firstName: string;
  lastName: string;
}

export default function FilesManagerPage() {
  const { user: currentUser } = useAuth();
  const { t, isRtl } = useLanguage();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Data lists
  const [files, setFiles] = useState<FileItem[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tab State: "active" | "archived"
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");

  // Upload Modal Form
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [relatedModule, setRelatedModule] = useState("");
  const [relatedId, setRelatedId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Preview Modal
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // Fetch files
  const fetchFiles = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        archived: activeTab === "archived" ? "true" : "false",
        category: selectedCategory,
        owner: selectedOwner,
        search: searchTerm,
        limit: "100"
      });

      const res = await fetch(`/api/v1/files?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to load files");
      
      setFiles(json.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Fetch helper lists for uploads (Client, Task, Employee dropdowns)
  const fetchUploadHelpers = async () => {
    try {
      // 1. Clients
      const resCli = await fetch("/api/v1/clients?limit=100");
      const jsonCli = await resCli.json();
      if (resCli.ok) setClients(jsonCli.data);

      // 2. Tasks
      const resTsk = await fetch("/api/v1/tasks?limit=100");
      const jsonTsk = await resTsk.json();
      if (resTsk.ok) setTasks(jsonTsk.data);

      // 3. Employees
      const resEmp = await fetch("/api/v1/employees?limit=100");
      const jsonEmp = await resEmp.json();
      if (resEmp.ok) setEmployees(jsonEmp.data);
    } catch (err) {
      console.error("Failed to load upload dropdown helpers", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [activeTab, selectedCategory, selectedOwner, searchTerm]);

  useEffect(() => {
    if (isUploadOpen) {
      fetchUploadHelpers();
    }
  }, [isUploadOpen]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle upload submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || uploadLoading) return;
    setUploadError("");

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (relatedModule) formData.append("relatedModule", relatedModule);
      if (relatedId) formData.append("relatedId", relatedId);
      if (tagsInput) formData.append("tags", tagsInput);

      const res = await fetch("/api/v1/files", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to upload file");

      setIsUploadOpen(false);
      setSelectedFile(null);
      setRelatedModule("");
      setRelatedId("");
      setTagsInput("");
      fetchFiles();
    } catch (err: any) {
      setUploadError(err.message || "Error uploading file");
    } finally {
      setUploadLoading(false);
    }
  };

  // Archive / Restore
  const handleToggleArchive = async (file: FileItem) => {
    try {
      const res = await fetch(`/api/v1/files/${file._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !file.archived }),
      });
      if (!res.ok) throw new Error("Failed to archive/restore file");
      
      fetchFiles();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete File
  const handleDeleteFile = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this file? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/v1/files/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete file");
      
      fetchFiles();
    } catch (err) {
      console.error(err);
    }
  };

  // Helpers for category visual rendering
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "PDF": return <FileText size={20} style={{ color: "#E53E3E" }} />;
      case "Image": return <ImageIcon size={20} style={{ color: "#38A169" }} />;
      case "Document": return <FileText size={20} style={{ color: "#3182CE" }} />;
      case "Spreadsheet": return <FileSpreadsheet size={20} style={{ color: "#DD6B20" }} />;
      case "Archive": return <Archive size={20} style={{ color: "#805AD5" }} />;
      default: return <FileIcon size={20} style={{ color: "var(--clr-text-muted)" }} />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <main className="responsive-main">
      
      {/* Header action bar */}
      <div className="responsive-page-header">
        <div>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            رفع الوثائق والمستندات، إدارة العقود والملفات، وربطها بملفات العملاء المتابعين
          </p>
        </div>
        <button 
          onClick={() => setIsUploadOpen(true)}
          className="c-btn c-btn--primary"
          style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
        >
          <Plus size={16} />
          <span>رفع ملف جديد</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="responsive-tab-list" style={{ borderBottom: "1px solid var(--clr-border)" }}>
        <button
          onClick={() => setActiveTab("active")}
          style={{
            padding: "var(--sp-2) var(--sp-4)",
            background: "none",
            border: "none",
            borderBottom: activeTab === "active" ? "3px solid var(--clr-accent-primary)" : "3px solid transparent",
            color: activeTab === "active" ? "var(--clr-text-primary)" : "var(--clr-text-muted)",
            fontWeight: activeTab === "active" ? "var(--fw-bold)" : "var(--fw-medium)",
            cursor: "pointer",
            fontSize: "var(--fs-body-sm)"
          }}
          className="tab-btn"
        >
          الملفات النشطة
        </button>
        <button
          onClick={() => setActiveTab("archived")}
          style={{
            padding: "var(--sp-2) var(--sp-4)",
            background: "none",
            border: "none",
            borderBottom: activeTab === "archived" ? "3px solid var(--clr-accent-primary)" : "3px solid transparent",
            color: activeTab === "archived" ? "var(--clr-text-primary)" : "var(--clr-text-muted)",
            fontWeight: activeTab === "archived" ? "var(--fw-bold)" : "var(--fw-medium)",
            cursor: "pointer",
            fontSize: "var(--fs-body-sm)"
          }}
          className="tab-btn"
        >
          الملفات المؤرشفة
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="responsive-toolbar">
        {/* Search */}
        <div style={{ display: "flex", flex: 1, minWidth: "260px" }}>
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
              placeholder="ابحث عن الملفات بالاسم أو الوسوم..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="c-input__field"
              style={{ paddingLeft: isRtl ? "12px" : "40px", paddingRight: isRtl ? "40px" : "12px", width: "100%", height: "42px", textAlign: "right" }}
            />
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "var(--sp-3)" }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="c-input__field"
            style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "135px", background: "var(--clr-bg-primary)" }}
          >
            <option value="">كل الصيغ والأنواع</option>
            <option value="PDF">ملف PDF 📄</option>
            <option value="Image">صور وثائقية 🖼️</option>
            <option value="Document">مستند Word 📝</option>
            <option value="Spreadsheet">جدول بيانات Excel 📊</option>
            <option value="Archive">أرشيف مضغوط ZIP 📦</option>
            <option value="Other">مرفقات أخرى 📁</option>
          </select>
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
          <button onClick={fetchFiles} className="c-btn c-btn--secondary">إعادة المحاولة</button>
        </div>
      ) : files.length === 0 ? (
        <div className="c-card" style={{ textAlign: "center", padding: "var(--sp-12)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)" }}>
          <FolderOpen size={48} style={{ color: "var(--clr-text-muted)" }} />
          <div>
            <h3 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--sp-1)" }}>لا توجد ملفات مسجلة</h3>
            <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
              لا توجد أي مرفقات نشطة أو مؤرشفة تطابق خيارات التصفية الحالية.
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
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)", width: "100px" }}>نوع الملف</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>اسم الملف</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)", width: "120px" }}>الحجم</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>الارتباط بالنظام</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>تاريخ الرفع</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>مالك الملف</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr 
                    key={file._id} 
                    style={{ 
                      borderBottom: "1px solid var(--clr-border)",
                      transition: "var(--transition-fast)" 
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                      <div 
                        style={{ 
                          width: "36px", 
                          height: "36px", 
                          borderRadius: "var(--radius-md)", 
                          backgroundColor: "rgba(255, 255, 255, 0.03)", 
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center" 
                        }}
                      >
                        {getCategoryIcon(file.category)}
                      </div>
                    </td>
                    <td style={{ padding: "var(--sp-4)", fontWeight: "var(--fw-medium)", textAlign: "right" }}>
                      <div style={{ fontSize: "var(--fs-body-sm)" }}>{file.fileName}</div>
                      {file.tags.length > 0 && (
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px", justifyContent: "flex-start" }}>
                          {file.tags.map(t => (
                            <span 
                              key={t} 
                              style={{ 
                                fontSize: "9px", 
                                color: "var(--clr-accent-primary)", 
                                border: "1px solid rgba(0, 210, 255, 0.2)",
                                padding: "0 6px",
                                borderRadius: "2px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px"
                              }}
                            >
                              <Tag size={8} />
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)", textAlign: "right" }}>
                      {formatBytes(file.fileSize)}
                    </td>
                    <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)", textAlign: "right" }}>
                      {file.relatedModule ? (
                        <span className="c-badge" style={{ backgroundColor: "rgba(4, 13, 33, 0.5)", textTransform: "none" }}>
                          {file.relatedModule === "Clients" ? "العملاء" : file.relatedModule === "Tasks" ? "المهام" : "الموظفين"}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ padding: "var(--sp-4)", textAlign: "right" }}>
                      <div style={{ fontWeight: "var(--fw-medium)" }}>
                        {new Date(file.createdAt).toLocaleDateString("ar-EG")}
                      </div>
                    </td>
                    <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)", textAlign: "right" }}>
                      {file.owner 
                        ? `${file.owner.firstName} ${file.owner.lastName}` 
                        : "غير مسند"}
                    </td>
                    <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "var(--sp-2)", justifyContent: "center" }}>
                        <button 
                          onClick={() => setPreviewFile(file)}
                          className="c-btn c-btn--secondary"
                          style={{ padding: "var(--sp-2)" }}
                          title="معاينة الملف"
                        >
                          <Eye size={14} />
                        </button>
                        <a 
                          href={file.blobUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="c-btn c-btn--secondary"
                          style={{ padding: "var(--sp-2)", display: "inline-flex", alignItems: "center" }}
                          title="تحميل الملف"
                        >
                          <Download size={14} />
                        </a>
                        <button 
                          onClick={() => handleToggleArchive(file)}
                          className="c-btn c-btn--secondary"
                          style={{ padding: "var(--sp-2)" }}
                          title={file.archived ? "استعادة الملف" : "أرشفة الملف"}
                        >
                          {file.archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                        </button>
                        <Link 
                          href={`/dashboard/files/${file._id}`}
                          className="c-btn c-btn--secondary"
                          style={{ padding: "var(--sp-2)", display: "inline-flex", alignItems: "center" }}
                          title="سجل التدقيق والتغييرات"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        <button 
                          onClick={() => handleDeleteFile(file._id)}
                          className="c-btn c-btn--secondary delete-btn-hover"
                          style={{ padding: "var(--sp-2)", borderColor: "rgba(229, 62, 62, 0.3)", color: "var(--clr-error)" }}
                          title="حذف الملف نهائياً"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div 
          className="c-modal-overlay"
          onClick={() => setIsUploadOpen(false)}
        >
          <div 
            className="c-card c-card--glow c-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsUploadOpen(false)}
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
                <FolderOpen size={20} style={{ color: "var(--clr-accent-primary)" }} />
                <span>رفع ملف سحابي جديد</span>
              </h2>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                تسجيل ورفع المستندات والملفات على مساحة التخزين السحابية الآمنة
              </p>
            </div>

            {uploadError && (
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
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", textAlign: "right" }}>
              
              {/* File Input */}
              <div className="c-input">
                <label className="c-input__label">اختر الملف *</label>
                <input 
                  type="file" 
                  required
                  onChange={handleFileChange}
                  className="c-input__field"
                  style={{ padding: "8px 12px", direction: "rtl", textAlign: "right" }}
                />
              </div>

              {/* Tags */}
              <div className="c-input">
                <label className="c-input__label">الوسوم (مفصولة بفاصلة)</label>
                <input 
                  type="text" 
                  placeholder="مثال: فاتورة، عقد، عرض_سعر"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="c-input__field" 
                  style={{ textAlign: "right" }}
                />
              </div>

              {/* Related Module */}
              <div className="responsive-grid-2">
                <div className="c-input">
                  <label className="c-input__label">ربط بالقسم / الكيان</label>
                  <select
                    value={relatedModule}
                    onChange={(e) => { setRelatedModule(e.target.value); setRelatedId(""); }}
                    className="c-input__field" 
                    style={{ background: "var(--clr-bg-primary)" }}
                  >
                    <option value="">-- اختر القسم (لا يوجد ارتباط) --</option>
                    <option value="Clients">العملاء 👥</option>
                    <option value="Tasks">المهام 📋</option>
                    <option value="Employees">الموظفين 💼</option>
                  </select>
                </div>

                {/* Related ID selection dynamic */}
                {relatedModule && (
                  <div className="c-input">
                    <label className="c-input__label">اختر الكيان المرتبط بالتحديد *</label>
                    <select
                      value={relatedId}
                      onChange={(e) => setRelatedId(e.target.value)}
                      className="c-input__field"
                      style={{ background: "var(--clr-bg-primary)" }}
                      required
                    >
                      <option value="">-- اختر الارتباط --</option>
                      {relatedModule === "Clients" && clients.map(c => (
                        <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
                      ))}
                      {relatedModule === "Tasks" && tasks.map(t => (
                        <option key={t._id} value={t._id}>{t.title}</option>
                      ))}
                      {relatedModule === "Employees" && employees.map(e => (
                        <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", marginTop: "var(--sp-4)" }}>
                <button 
                  type="button" 
                  onClick={() => setIsUploadOpen(false)}
                  className="c-btn c-btn--secondary"
                >
                  {t("common.cancel")}
                </button>
                <button 
                  type="submit" 
                  disabled={uploadLoading}
                  className="c-btn c-btn--primary"
                  style={{ minWidth: "120px", gap: "var(--sp-2)" }}
                >
                  {uploadLoading ? <div className="btn-spinner" /> : null}
                  <span>رفع وحفظ الملف</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(4, 13, 33, 0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--sp-4)"
          }}
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="c-card c-card--glow"
            style={{ 
              width: "100%", 
              maxWidth: "800px", 
              maxHeight: "90vh",
              overflow: "hidden",
              position: "relative",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              animation: "slideIn 0.25s ease-out" 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--sp-4)", borderBottom: "1px solid var(--clr-border)", backgroundColor: "rgba(4, 13, 33, 0.4)" }}>
              <div style={{ textAlign: "right" }}>
                <h3 style={{ fontSize: "var(--fs-body-lg)", fontWeight: "var(--fw-bold)", margin: 0 }}>
                  معاينة: {previewFile.fileName}
                </h3>
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>
                  صيغة الملف: {previewFile.mimeType} | الحجم: {formatBytes(previewFile.fileSize)}
                </span>
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                style={{ background: "none", border: "none", color: "var(--clr-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview Frame */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--sp-6)", backgroundColor: "#020917", minHeight: "350px" }}>
              {previewFile.category === "Image" ? (
                <img 
                  src={previewFile.blobUrl} 
                  alt={previewFile.fileName}
                  style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "var(--radius-md)", border: "1px solid var(--clr-border)" }} 
                />
              ) : previewFile.category === "PDF" ? (
                <iframe 
                  src={previewFile.blobUrl} 
                  style={{ width: "100%", height: "60vh", border: "none", borderRadius: "var(--radius-md)" }}
                  title={previewFile.fileName}
                />
              ) : (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)", maxWidth: "400px" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", border: "1px solid var(--clr-border)" }}>
                    {getCategoryIcon(previewFile.category)}
                  </div>
                  <div>
                    <h4 style={{ marginBottom: "2px" }}>لا تتوفر معاينة مرئية لهذا الملف في المتصفح</h4>
                    <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", lineHeight: "1.4" }}>
                      لا يمكن عرض صيغة هذا الملف مباشرة داخل نافذة المتصفح. يرجى تحميل ملف المستند محلياً لمعاينة محتوياته.
                    </p>
                  </div>
                  <a 
                    href={previewFile.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="c-btn c-btn--primary"
                    style={{ gap: "var(--sp-2)" }}
                  >
                    <Download size={16} />
                    <span>تحميل حزمة الملف</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
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
