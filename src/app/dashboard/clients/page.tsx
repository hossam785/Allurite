"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../layout";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import DataGrid, { ColumnDef, BulkAction, QuickFilter } from "@/components/ui/DataGrid";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import {
  UserPlus,
  Eye,
  Trash2,
  Download,
  Building,
  Mail,
  Phone,
  X,
  Share2,
  CheckCircle,
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
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Data states
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [agents, setAgents] = useState<EmployeeSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  // Handle URL search parameters (e.g. ?action=new or ?id=...)
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsModalOpen(true);
    }
    const qId = searchParams.get("id");
    if (qId) {
      setSearchTerm(qId);
    }
  }, [searchParams]);

  // Debounce search term
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
      setClients(json.data || []);
      setTotalPages(json.pagination?.pages || 1);
      setTotalRecords(json.pagination?.total || 0);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      toast.error(err.message || "فشل تحميل قائمة العملاء");
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
        setAgents(json.data || []);
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

  // Handle client creation submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!formFields.firstName.trim() || !formFields.lastName.trim() || !formFields.email.trim()) {
      setModalError("الاسم الأول والاسم الأخير والبريد الإلكتروني حقول مطلوبة");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formFields.email)) {
      setModalError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    if (isSuperAdmin && !formFields.assignedAgentId) {
      setModalError("يرجى اختيار العضو المسؤول عن هذا العميل");
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
        throw new Error(json.error?.message || "فشل إضافة العميل");
      }

      toast.success("تم إضافة العميل بنجاح للمنظومة", "نجحت العملية");
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
      setModalError(err.message || "خطأ أثناء إضافة العميل");
    } finally {
      setModalLoading(false);
    }
  };

  // Bulk Delete Action
  const handleBulkDelete = async (idsToDelete: string[]) => {
    if (!confirm(`هل أنت تأكد من حذف ${idsToDelete.length} عميل بشكل نهائي؟`)) return;

    try {
      let count = 0;
      for (const id of idsToDelete) {
        const res = await fetch(`/api/v1/clients/${id}`, { method: "DELETE" });
        if (res.ok) count++;
      }

      toast.success(`تم حذف ${count} عميل بنجاح`);
      setSelectedIds([]);
      fetchClients();
    } catch (err) {
      toast.error("حدث خطأ أثناء تنفيذ الحذف الجماعي");
    }
  };

  // Bulk Export Action
  const handleBulkExport = (idsToExport: string[]) => {
    const selectedClients = clients.filter((c) => idsToExport.includes(c._id));
    if (selectedClients.length === 0) return;

    const headers = ["ID", "First Name", "Last Name", "Email", "Phone", "Company", "Status", "Source"];
    const rows = selectedClients.map((c) => [
      c._id,
      c.firstName,
      c.lastName,
      c.email,
      c.phone || "",
      c.companyName || "",
      c.status,
      c.source,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clients_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.info(`تم تصدير ${selectedClients.length} ملف عميل إلى CSV`);
  };

  // Quick filter tabs definition
  const quickFilters: QuickFilter[] = [
    {
      id: "all",
      label: "جميع العملاء",
      count: totalRecords,
      active: selectedStatus === "",
      onClick: () => {
        setSelectedStatus("");
        setPage(1);
      },
    },
    {
      id: "lead",
      label: "عملاء محتملون (Lead)",
      active: selectedStatus === "Lead",
      onClick: () => {
        setSelectedStatus("Lead");
        setPage(1);
      },
    },
    {
      id: "qualified",
      label: "مؤهلون (Qualified)",
      active: selectedStatus === "Qualified",
      onClick: () => {
        setSelectedStatus("Qualified");
        setPage(1);
      },
    },
    {
      id: "active",
      label: "عملاء نشطون (Active)",
      active: selectedStatus === "ActiveCustomer",
      onClick: () => {
        setSelectedStatus("ActiveCustomer");
        setPage(1);
      },
    },
    {
      id: "churned",
      label: "منسحبون (Churned)",
      active: selectedStatus === "Churned",
      onClick: () => {
        setSelectedStatus("Churned");
        setPage(1);
      },
    },
  ];

  // Table Columns Definition
  const columns: ColumnDef<ClientItem>[] = [
    {
      key: "name",
      header: "الاسم الكامل والشركة",
      sortable: true,
      render: (item) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--clr-text-primary)" }}>
            {item.firstName} {item.lastName}
          </div>
          {item.companyName && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--clr-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "2px",
              }}
            >
              <Building size={12} />
              <span>{item.companyName}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "contact",
      header: "بيانات التواصل",
      render: (item) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--clr-text-secondary)" }}>
            <Mail size={12} style={{ color: "var(--clr-accent-primary)" }} />
            <span>{item.email}</span>
          </div>
          {item.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--clr-text-muted)" }}>
              <Phone size={12} />
              <span>{item.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "مرحلة Pipeline",
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "source",
      header: "مصدر التواجد",
      render: (item) => (
        <Badge variant="neutral" size="sm" dot={false}>
          {item.source}
        </Badge>
      ),
    },
    {
      key: "assignedAgent",
      header: "العضو المسؤول",
      render: (item) => (
        <span style={{ fontSize: "12px", color: "var(--clr-text-secondary)" }}>
          {item.assignedAgent
            ? `${item.assignedAgent.firstName} ${item.assignedAgent.lastName}`
            : "غير مسند"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "الإجراءات",
      align: "center",
      render: (item) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <Link
            href={`/dashboard/clients/${item._id}`}
            style={{
              padding: "6px",
              borderRadius: "6px",
              backgroundColor: "rgba(0, 210, 255, 0.1)",
              color: "var(--clr-accent-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="عرض ملف العميل"
          >
            <Eye size={15} />
          </Link>
        </div>
      ),
    },
  ];

  const bulkActions: BulkAction[] = [
    {
      id: "export",
      label: "تصدير إلى CSV",
      icon: <Download size={14} />,
      variant: "primary",
      onClick: handleBulkExport,
    },
    {
      id: "delete",
      label: "حذف المحدد",
      icon: <Trash2 size={14} />,
      variant: "danger",
      onClick: handleBulkDelete,
    },
  ];

  return (
    <main className="responsive-main" style={{ padding: "24px" }}>
      {/* Header Bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "4px", fontFamily: "Outfit" }}>
            {t("clients_view.pipeline_title")}
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "13px" }}>
            {isSuperAdmin
              ? "إشراف ومتابعة فرص العمل ومراحل الاستحواذ وحسابات العملاء للشركة"
              : "إدارة حسابات عملائك المسندين إليك وملاحظات التواصل معهم"}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="c-btn c-btn--primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            boxShadow: "0 0 15px rgba(0, 210, 255, 0.25)",
          }}
        >
          <UserPlus size={16} />
          <span>{t("clients_view.create_client")}</span>
        </button>
      </header>

      {/* Main Interactive DataGrid Component */}
      <DataGrid
        columns={columns}
        data={clients}
        keyExtractor={(item) => item._id}
        loading={loading}
        emptyMessage={error || "لا توجد حسابات عملاء مضافة حالياً"}
        enableSelection={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={bulkActions}
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={setPage}
        searchPlaceholder="البحث باسم العميل، البريد الإلكتروني، الشركة..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        quickFilters={quickFilters}
      />

      {/* Create Client Modal Overlay */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="c-card"
            style={{
              width: "100%",
              maxWidth: "540px",
              backgroundColor: "var(--clr-bg-card, #0F172A)",
              border: "1px solid var(--clr-border, #1E293B)",
              borderRadius: "16px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid var(--clr-border)",
                paddingBottom: "12px",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: "bold" }}>إضافة ملف عميل جديد</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--clr-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid var(--clr-error)",
                  color: "var(--clr-error)",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    الاسم الأول *
                  </label>
                  <input
                    type="text"
                    required
                    value={formFields.firstName}
                    onChange={(e) => setFormFields({ ...formFields, firstName: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    الاسم الأخير *
                  </label>
                  <input
                    type="text"
                    required
                    value={formFields.lastName}
                    onChange={(e) => setFormFields({ ...formFields, lastName: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    البريد الإلكتروني *
                  </label>
                  <input
                    type="email"
                    required
                    value={formFields.email}
                    onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    value={formFields.phone}
                    onChange={(e) => setFormFields({ ...formFields, phone: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    اسم الشركة
                  </label>
                  <input
                    type="text"
                    value={formFields.companyName}
                    onChange={(e) => setFormFields({ ...formFields, companyName: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    المجال / الصناعة
                  </label>
                  <input
                    type="text"
                    value={formFields.industry}
                    onChange={(e) => setFormFields({ ...formFields, industry: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    حالة Pipeline
                  </label>
                  <select
                    value={formFields.status}
                    onChange={(e) => setFormFields({ ...formFields, status: e.target.value as any })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    المصدر
                  </label>
                  <select
                    value={formFields.source}
                    onChange={(e) => setFormFields({ ...formFields, source: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  >
                    {sources.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isSuperAdmin && (
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    إسناد للمسؤول *
                  </label>
                  <select
                    value={formFields.assignedAgentId}
                    onChange={(e) => setFormFields({ ...formFields, assignedAgentId: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  >
                    <option value="">اختر الموظف المسؤول...</option>
                    {agents.map((agent) => (
                      <option key={agent._id} value={agent._id}>
                        {agent.firstName} {agent.lastName} ({agent.user?.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "16px",
                  borderTop: "1px solid var(--clr-border)",
                  paddingTop: "16px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="c-btn c-btn--secondary"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="c-btn c-btn--primary"
                  style={{ minWidth: "120px" }}
                >
                  {modalLoading ? "جاري الحفظ..." : "حفظ العميل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
