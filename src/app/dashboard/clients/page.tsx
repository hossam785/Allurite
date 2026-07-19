"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../layout";
import { useLanguage } from "@/context/LanguageContext";
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
  const { t, isRtl } = useLanguage();
  
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
    <main className="responsive-main">
      {/* Header */}
      <header className="responsive-page-header">
        <div>
          <h1 style={{ fontSize: "var(--fs-h1)", marginBottom: "var(--sp-1)" }}>{t("clients_view.pipeline_title")}</h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            {isSuperAdmin 
              ? "إشراف ومتابعة فرص العمل، مراحل الاستحواذ، وحسابات العملاء للشركة" 
              : "إدارة حسابات عملائك المسندين إليك وملاحظات التواصل معهم"}
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="c-btn c-btn--primary"
          style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
        >
          <UserPlus size={16} />
          <span>{t("clients_view.create_client")}</span>
        </button>
      </header>

      {/* Toolbar / Filters */}
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
              placeholder="ابحث عن عميل بالاسم، البريد الإلكتروني، الشركة..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="c-input__field"
              style={{ paddingLeft: isRtl ? "12px" : "40px", paddingRight: isRtl ? "40px" : "12px", width: "100%", height: "42px", textAlign: "right" }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                style={{ 
                  position: "absolute", 
                  left: isRtl ? "12px" : "auto",
                  right: isRtl ? "auto" : "12px",
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
        <div style={{ display: "flex", gap: "var(--sp-4)", flexWrap: "wrap", alignItems: "center" }}>
          {/* Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>{t("common.status")}:</span>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "135px", background: "var(--clr-bg-primary)" }}
            >
              <option value="">{t("common.all")}</option>
              <option value="Lead">عميل محتمل (Lead)</option>
              <option value="Qualified">عميل مؤهل (Qualified)</option>
              <option value="ActiveCustomer">عميل نشط (Active)</option>
              <option value="Churned">منسحب (Churned)</option>
            </select>
          </div>

          {/* Source Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>المصدر:</span>
            <select
              value={selectedSource}
              onChange={(e) => { setSelectedSource(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "125px", background: "var(--clr-bg-primary)" }}
            >
              <option value="">كل المصادر</option>
              <option value="Website">الموقع الإلكتروني</option>
              <option value="Referral">توصية / ترشيح</option>
              <option value="ColdOutreach">تواصل بارد</option>
              <option value="LinkedIn">لينكد إن</option>
              <option value="Advertisement">إعلان ممول</option>
              <option value="Other">مصادر أخرى</option>
            </select>
          </div>

          {/* Agent Filter (Admin scoping only) */}
          {isSuperAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
              <span style={{ fontSize: "var(--fs-body-sm)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>المسؤول:</span>
              <select
                value={selectedAgent}
                onChange={(e) => { setSelectedAgent(e.target.value); setPage(1); }}
                className="c-input__field"
                style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "150px", background: "var(--clr-bg-primary)" }}
              >
                <option value="">كل المسؤولين</option>
                {agents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.firstName} {agent.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Grid table */}
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
          <button onClick={fetchClients} className="c-btn c-btn--secondary">إعادة المحاولة</button>
        </div>
      ) : clients.length === 0 ? (
        <div className="c-card" style={{ textAlign: "center", padding: "var(--sp-12)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)" }}>
          <UserX size={48} style={{ color: "var(--clr-text-muted)" }} />
          <div>
            <h3 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--sp-1)" }}>لم يتم العثور على عملاء</h3>
            <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
              لا توجد أي نتائج مطابقة لكلمة البحث "{searchTerm}" أو الفلاتر المحددة.
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
          {/* Scrollable table container */}
          <div className="c-table-container">
            <table className="c-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--clr-border)", backgroundColor: "rgba(4, 13, 33, 0.4)" }}>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>الاسم</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>الشركة / القطاع</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>البريد الإلكتروني</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>رقم الهاتف</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>المصدر</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>الحالة</th>
                  <th style={{ textAlign: "right", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>الموظف المتابع</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  let statusBadgeClass = "c-badge--info";
                  let statusText: string = client.status;
                  if (client.status === "Lead") {
                    statusBadgeClass = "c-badge--info";
                    statusText = "عميل محتمل (Lead)";
                  } else if (client.status === "Qualified") {
                    statusBadgeClass = "c-badge--warning";
                    statusText = "مؤهل (Qualified)";
                  } else if (client.status === "ActiveCustomer") {
                    statusBadgeClass = "c-badge--success";
                    statusText = "نشط (Active)";
                  } else if (client.status === "Churned") {
                    statusBadgeClass = "c-badge--error";
                    statusText = "منسحب (Churned)";
                  }

                  let sourceText = client.source;
                  if (client.source === "Website") sourceText = "الموقع الإلكتروني";
                  else if (client.source === "Referral") sourceText = "توصية / ترشيح";
                  else if (client.source === "ColdOutreach") sourceText = "تواصل بارد";
                  else if (client.source === "LinkedIn") sourceText = "لينكد إن";
                  else if (client.source === "Advertisement") sourceText = "إعلان ممول";
                  else if (client.source === "Other") sourceText = "مصادر أخرى";

                  return (
                    <tr 
                      key={client._id} 
                      style={{ 
                        borderBottom: "1px solid var(--clr-border)",
                        transition: "var(--transition-fast)" 
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: "var(--sp-4)", fontWeight: "var(--fw-medium)", textAlign: "right" }} title={`${client.firstName} ${client.lastName}`}>
                        {client.firstName} {client.lastName}
                      </td>
                      <td style={{ padding: "var(--sp-4)", textAlign: "right" }} title={client.companyName || "لا توجد شركة"}>
                        {client.companyName ? (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: "var(--fw-medium)" }}>{client.companyName}</span>
                            <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>{client.industry || "لم يحدد"}</span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--clr-text-muted)" }}>لا توجد شركة</span>
                        )}
                      </td>
                      <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)", textAlign: "right" }} title={client.email}>
                        {client.email}
                      </td>
                      <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)", textAlign: "right", direction: "ltr" }} title={client.phone || "—"}>
                        {client.phone || "—"}
                      </td>
                      <td style={{ padding: "var(--sp-4)", textAlign: "right" }}>
                        <span className="c-badge c-badge--info" style={{ textTransform: "none" }}>{sourceText}</span>
                      </td>
                      <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                        <span className={`c-badge ${statusBadgeClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td style={{ padding: "var(--sp-4)", textAlign: "right" }}>
                        {client.assignedAgent ? (
                          <span>{client.assignedAgent.firstName} {client.assignedAgent.lastName}</span>
                        ) : (
                          <span style={{ color: "var(--clr-text-muted)" }}>غير مسند</span>
                        )}
                      </td>
                      <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                        <Link 
                          href={`/dashboard/clients/${client._id}`}
                          className="c-btn c-btn--secondary c-btn-touch-target"
                          style={{ padding: "var(--sp-2) var(--sp-3)", display: "inline-flex", gap: "var(--sp-2)" }}
                        >
                          <Eye size={14} />
                          <span style={{ fontSize: "var(--fs-caption)" }}>التفاصيل</span>
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
              عرض {clients.length} من أصل {totalRecords} عميل
            </span>
            
            <div style={{ display: "flex", gap: "var(--sp-2)" }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="الصفحة السابقة"
                className="c-btn c-btn--secondary c-btn-touch-target"
                style={{ padding: "var(--sp-2) var(--sp-3)" }}
              >
                {isRtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
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
                الصفحة {page} من {totalPages}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="الصفحة التالية"
                className="c-btn c-btn--secondary c-btn-touch-target"
                style={{ padding: "var(--sp-2) var(--sp-3)" }}
              >
                {isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Client Modal */}
      {isModalOpen && (
        <div 
          className="c-modal-overlay"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="c-card c-card--glow c-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="c-modal-header">
              <div style={{ textAlign: "right" }}>
                <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                  <UserPlus size={20} style={{ color: "var(--clr-accent-primary)" }} />
                  <span>{t("clients_view.create_client")}</span>
                </h2>
                <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                  إنشاء ملف العميل الشخصي وتعيين المسؤولية الإدارية له
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                aria-label="إغلاق النافذة"
                className="c-btn-touch-target"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--clr-text-muted)",
                  cursor: "pointer"
                }}
              >
                <X size={20} />
              </button>
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
                  fontSize: "var(--fs-body-sm)",
                  textAlign: "right"
                }}
              >
                {modalError}
              </div>
            )}

            {/* Modal Body Form */}
            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", textAlign: "right" }}>
              <div className="c-modal-body" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                <div className="responsive-grid-2">
                  <div className="c-input">
                    <label htmlFor="client-first-name" className="c-input__label">الاسم الأول *</label>
                    <input 
                      id="client-first-name"
                      type="text" 
                      required
                      value={formFields.firstName}
                      onChange={(e) => setFormFields(f => ({ ...f, firstName: e.target.value }))}
                      className="c-input__field" 
                      style={{ textAlign: "right" }}
                    />
                  </div>
                  <div className="c-input">
                    <label htmlFor="client-last-name" className="c-input__label">الاسم الأخير *</label>
                    <input 
                      id="client-last-name"
                      type="text" 
                      required
                      value={formFields.lastName}
                      onChange={(e) => setFormFields(f => ({ ...f, lastName: e.target.value }))}
                      className="c-input__field" 
                      style={{ textAlign: "right" }}
                    />
                  </div>
                </div>

                <div className="responsive-grid-2">
                  <div className="c-input">
                    <label htmlFor="client-email" className="c-input__label">البريد الإلكتروني *</label>
                    <input 
                      id="client-email"
                      type="email" 
                      required
                      placeholder="example@mail.com"
                      value={formFields.email}
                      onChange={(e) => setFormFields(f => ({ ...f, email: e.target.value }))}
                      className="c-input__field" 
                      style={{ textAlign: "left", direction: "ltr" }}
                    />
                  </div>
                  <div className="c-input">
                    <label htmlFor="client-phone" className="c-input__label">رقم الهاتف</label>
                    <input 
                      id="client-phone"
                      type="tel" 
                      placeholder="010XXXXXXXX"
                      value={formFields.phone}
                      onChange={(e) => setFormFields(f => ({ ...f, phone: e.target.value }))}
                      className="c-input__field" 
                      style={{ textAlign: "left", direction: "ltr" }}
                    />
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="c-input">
                    <label htmlFor="client-agent" className="c-input__label">{t("clients_view.assigned_agent")} *</label>
                    <select
                      id="client-agent"
                      value={formFields.assignedAgentId}
                      onChange={(e) => setFormFields(f => ({ ...f, assignedAgentId: e.target.value }))}
                      className="c-input__field" 
                      style={{ background: "var(--clr-bg-primary)" }}
                    >
                      <option value="">-- اختر الموظف المسؤول --</option>
                      {agents.map((agent) => (
                        <option key={agent._id} value={agent._id}>
                          {agent.firstName} {agent.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="responsive-grid-2">
                  <div className="c-input">
                    <label htmlFor="client-company" className="c-input__label">{t("clients_view.company_name")}</label>
                    <input 
                      id="client-company"
                      type="text" 
                      value={formFields.companyName}
                      onChange={(e) => setFormFields(f => ({ ...f, companyName: e.target.value }))}
                      className="c-input__field" 
                      style={{ textAlign: "right" }}
                    />
                  </div>
                  <div className="c-input">
                    <label htmlFor="client-industry" className="c-input__label">{t("clients_view.industry")}</label>
                    <input 
                      id="client-industry"
                      type="text" 
                      placeholder="مثال: عقارات / تقنية"
                      value={formFields.industry}
                      onChange={(e) => setFormFields(f => ({ ...f, industry: e.target.value }))}
                      className="c-input__field" 
                      style={{ textAlign: "right" }}
                    />
                  </div>
                </div>

                <div className="c-input">
                  <label htmlFor="client-website" className="c-input__label">{t("clients_view.website")}</label>
                  <input 
                    id="client-website"
                    type="url" 
                    placeholder="https://example.com"
                    value={formFields.website}
                    onChange={(e) => setFormFields(f => ({ ...f, website: e.target.value }))}
                    className="c-input__field" 
                    style={{ textAlign: "left", direction: "ltr" }}
                  />
                </div>

                <div className="responsive-grid-2">
                  <div className="c-input">
                    <label htmlFor="client-source" className="c-input__label">{t("clients_view.source")}</label>
                    <select
                      id="client-source"
                      value={formFields.source}
                      onChange={(e) => setFormFields(f => ({ ...f, source: e.target.value }))}
                      className="c-input__field" 
                      style={{ background: "var(--clr-bg-primary)" }}
                    >
                      <option value="Website">الموقع الإلكتروني</option>
                      <option value="Referral">توصية / ترشيح</option>
                      <option value="ColdOutreach">تواصل بارد</option>
                      <option value="LinkedIn">لينكد إن</option>
                      <option value="Advertisement">إعلان ممول</option>
                      <option value="Other">مصادر أخرى</option>
                    </select>
                  </div>
                  <div className="c-input">
                    <label htmlFor="client-status" className="c-input__label">حالة العميل الحالي</label>
                    <select
                      id="client-status"
                      value={formFields.status}
                      onChange={(e) => setFormFields(f => ({ ...f, status: e.target.value as any }))}
                      className="c-input__field" 
                      style={{ background: "var(--clr-bg-primary)" }}
                    >
                      <option value="Lead">عميل محتمل (Lead)</option>
                      <option value="Qualified">عميل مؤهل (Qualified)</option>
                      <option value="ActiveCustomer">عميل نشط (Active)</option>
                      <option value="Churned">منسحب (Churned)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Sticky Footer Buttons */}
              <div className="c-modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="c-btn c-btn--secondary c-btn-touch-target"
                >
                  {t("common.cancel")}
                </button>
                <button 
                  type="submit" 
                  disabled={modalLoading}
                  className="c-btn c-btn--primary c-btn-touch-target"
                  style={{ minWidth: "120px", gap: "var(--sp-2)" }}
                >
                  {modalLoading ? <div className="btn-spinner" /> : null}
                  <span>حفظ بيانات العميل</span>
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
