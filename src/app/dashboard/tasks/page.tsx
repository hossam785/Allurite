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
  CheckSquare,
  Plus,
  Eye,
  Trash2,
  Download,
  Calendar,
  Clock,
  User,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";

interface TaskItem {
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
  createdAt: string;
}

interface ClientSummary {
  _id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}

interface EmployeeSummary {
  _id: string;
  firstName: string;
  lastName: string;
  user: {
    email: string;
  };
}

export default function TasksPage() {
  const { user: currentUser } = useAuth();
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Data states
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [agents, setAgents] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Tab State: "all" | "my-tasks" | "in-progress" | "overdue" | "completed"
  const [activeTab, setActiveTab] = useState<string>("all");

  // Search & Filter parameters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedClient, setSelectedClient] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formFields, setFormFields] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "Medium",
    assignedToId: "",
    clientId: "",
  });
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // Handle URL search parameters
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsModalOpen(true);
    }
    const qId = searchParams.get("id");
    if (qId) {
      setSearchTerm(qId);
    }
  }, [searchParams]);

  // Fetch Tasks
  const fetchTasks = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/tasks?limit=250");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to fetch tasks");
      }
      setTasks(json.data || []);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      toast.error(err.message || "فشل تحميل المهام");
    } finally {
      setLoading(false);
    }
  };

  // Fetch dependencies (clients & agents) for dropdowns
  const fetchDependencies = async () => {
    try {
      const [cRes, aRes] = await Promise.all([
        fetch("/api/v1/clients?limit=100").catch(() => null),
        fetch("/api/v1/employees?limit=100").catch(() => null),
      ]);

      if (cRes && cRes.ok) {
        const cJson = await cRes.json();
        setClients(cJson.data?.clients || cJson.data || []);
      }

      if (aRes && aRes.ok) {
        const aJson = await aRes.json();
        setAgents(aJson.data || []);
      }
    } catch (err) {
      console.error("Error fetching task dependencies", err);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchDependencies();
  }, []);

  // Filter tasks locally by tab, search, priority, client
  const filteredTasks = useMemo(() => {
    return tasks.filter((tItem) => {
      // Tab filtering
      if (activeTab === "my-tasks") {
        if (tItem.assignedTo?._id !== currentUser?.employeeId) return false;
      } else if (activeTab === "in-progress") {
        if (tItem.status !== "In Progress" && tItem.status !== "Pending") return false;
      } else if (activeTab === "overdue") {
        const isPastDue = new Date(tItem.dueDate) < new Date() && tItem.status !== "Completed";
        if (!isPastDue && tItem.status !== "Overdue") return false;
      } else if (activeTab === "completed") {
        if (tItem.status !== "Completed") return false;
      }

      // Priority filter
      if (selectedPriority && tItem.priority !== selectedPriority) return false;

      // Client filter
      if (selectedClient && tItem.client?._id !== selectedClient) return false;

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const titleMatch = tItem.title.toLowerCase().includes(q);
        const descMatch = tItem.description?.toLowerCase().includes(q);
        const agentMatch = `${tItem.assignedTo?.firstName || ""} ${tItem.assignedTo?.lastName || ""}`
          .toLowerCase()
          .includes(q);
        return titleMatch || descMatch || agentMatch;
      }

      return true;
    });
  }, [tasks, activeTab, selectedPriority, selectedClient, searchTerm, currentUser]);

  // Create Task Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!formFields.title.trim() || !formFields.dueDate) {
      setModalError("عنوان المهمة وتاريخ الاستحقاق حقول مطلوبة");
      return;
    }

    if (!formFields.assignedToId) {
      setModalError("يرجى اختيار الموظف المسند إليه المهمة");
      return;
    }

    setModalLoading(true);
    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formFields),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "فشل إنشاء المهمة");
      }

      toast.success("تم إنشاء المهمة بنجاح", "تمت العملية");
      fetchTasks();
      setIsModalOpen(false);
      setFormFields({
        title: "",
        description: "",
        dueDate: "",
        priority: "Medium",
        assignedToId: "",
        clientId: "",
      });
    } catch (err: any) {
      setModalError(err.message || "خطأ أثناء إنشاء المهمة");
    } finally {
      setModalLoading(false);
    }
  };

  // Bulk Complete Action
  const handleBulkComplete = async (idsToComplete: string[]) => {
    try {
      let count = 0;
      for (const id of idsToComplete) {
        const res = await fetch(`/api/v1/tasks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Completed" }),
        });
        if (res.ok) count++;
      }

      toast.success(`تم تحديث ${count} مهمة إلى حالة مكتملة`);
      setSelectedIds([]);
      fetchTasks();
    } catch (err) {
      toast.error("حدث خطأ أثناء التحديث الجماعي للمهام");
    }
  };

  // Bulk Delete Action
  const handleBulkDelete = async (idsToDelete: string[]) => {
    if (!confirm(`هل أنت تأكد من حذف ${idsToDelete.length} مهمة بشكل نهائي؟`)) return;

    try {
      let count = 0;
      for (const id of idsToDelete) {
        const res = await fetch(`/api/v1/tasks/${id}`, { method: "DELETE" });
        if (res.ok) count++;
      }

      toast.success(`تم حذف ${count} مهمة بنجاح`);
      setSelectedIds([]);
      fetchTasks();
    } catch (err) {
      toast.error("حدث خطأ أثناء الحذف الجماعي للمهام");
    }
  };

  // Bulk Export Action
  const handleBulkExport = (idsToExport: string[]) => {
    const selectedTasks = tasks.filter((t) => idsToExport.includes(t._id));
    if (selectedTasks.length === 0) return;

    const headers = ["ID", "Title", "Priority", "Status", "Due Date", "Assigned To"];
    const rows = selectedTasks.map((t) => [
      t._id,
      t.title,
      t.priority,
      t.status,
      new Date(t.dueDate).toLocaleDateString(),
      t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tasks_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.info(`تم تصدير ${selectedTasks.length} مهمة إلى ملف CSV`);
  };

  // Quick Filter Tabs Definition
  const quickFilters: QuickFilter[] = [
    {
      id: "all",
      label: "جميع المهام",
      count: tasks.length,
      active: activeTab === "all",
      onClick: () => setActiveTab("all"),
    },
    {
      id: "my-tasks",
      label: "مهامي المسندة",
      active: activeTab === "my-tasks",
      onClick: () => setActiveTab("my-tasks"),
    },
    {
      id: "in-progress",
      label: "قيد التنفيذ",
      active: activeTab === "in-progress",
      onClick: () => setActiveTab("in-progress"),
    },
    {
      id: "overdue",
      label: "متأخرة عن الاستحقاق",
      count: tasks.filter(
        (tItem) => new Date(tItem.dueDate) < new Date() && tItem.status !== "Completed"
      ).length,
      active: activeTab === "overdue",
      onClick: () => setActiveTab("overdue"),
    },
    {
      id: "completed",
      label: "المكتملة",
      active: activeTab === "completed",
      onClick: () => setActiveTab("completed"),
    },
  ];

  // Table Columns Definition
  const columns: ColumnDef<TaskItem>[] = [
    {
      key: "title",
      header: "عنوان المهمة والتفاصيل",
      sortable: true,
      render: (item) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--clr-text-primary)" }}>{item.title}</div>
          {item.description && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--clr-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "280px",
                marginTop: "2px",
              }}
            >
              {item.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "priority",
      header: "الأولوية",
      sortable: true,
      render: (item) => <StatusBadge status={item.priority} />,
    },
    {
      key: "status",
      header: "الحالة الحالية",
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "dueDate",
      header: "تاريخ الاستحقاق",
      sortable: true,
      render: (item) => {
        const isPast = new Date(item.dueDate) < new Date() && item.status !== "Completed";
        return (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: isPast ? 600 : 400,
              color: isPast ? "var(--clr-error)" : "var(--clr-text-secondary)",
            }}
          >
            <Clock size={13} />
            <span>{new Date(item.dueDate).toLocaleDateString("ar-EG")}</span>
          </div>
        );
      },
    },
    {
      key: "assignedTo",
      header: "المسؤول عن التنفيذ",
      render: (item) => (
        <span style={{ fontSize: "12px", color: "var(--clr-text-secondary)" }}>
          {item.assignedTo
            ? `${item.assignedTo.firstName} ${item.assignedTo.lastName}`
            : "غير مسند"}
        </span>
      ),
    },
    {
      key: "client",
      header: "العميل المرتبط",
      render: (item) => (
        <span style={{ fontSize: "12px", color: "var(--clr-text-muted)" }}>
          {item.client ? item.client.companyName || `${item.client.firstName} ${item.client.lastName}` : "—"}
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
            href={`/dashboard/tasks/${item._id}`}
            style={{
              padding: "6px",
              borderRadius: "6px",
              backgroundColor: "rgba(0, 210, 255, 0.1)",
              color: "var(--clr-accent-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="عرض تفاصيل المهمة"
          >
            <Eye size={15} />
          </Link>
        </div>
      ),
    },
  ];

  const bulkActions: BulkAction[] = [
    {
      id: "complete",
      label: "تعيين كمكتملة",
      icon: <CheckCircle2 size={14} />,
      variant: "primary",
      onClick: handleBulkComplete,
    },
    {
      id: "export",
      label: "تصدير إلى CSV",
      icon: <Download size={14} />,
      variant: "secondary",
      onClick: handleBulkExport,
    },
    {
      id: "delete",
      label: "حذف المهام",
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
            {t("tasks_view.board_title")}
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "13px" }}>
            متابعة المهام، الأولويات، والمواعيد النهائية لتنفيذ أعمال الشركة بمرونة عالية
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
          <Plus size={16} />
          <span>إضافة مهمة جديدة</span>
        </button>
      </header>

      {/* Main Interactive DataGrid Component */}
      <DataGrid
        columns={columns}
        data={filteredTasks}
        keyExtractor={(item) => item._id}
        loading={loading}
        emptyMessage={error || "لا توجد مهام مضافة تتطابق مع التصفية الحالية"}
        enableSelection={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={bulkActions}
        searchPlaceholder="البحث في عنوان المهمة، الوصف، اسم الموظف..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        quickFilters={quickFilters}
      />

      {/* Create Task Modal Overlay */}
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
              <h2 style={{ fontSize: "18px", fontWeight: "bold" }}>إنشاء مهمة عمل جديدة</h2>
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
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                  عنوان المهمة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: التواصل مع العميل لحسم عقد التوريد..."
                  value={formFields.title}
                  onChange={(e) => setFormFields({ ...formFields, title: e.target.value })}
                  className="c-input__field"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                  وصف وتفاصيل المهمة
                </label>
                <textarea
                  rows={3}
                  placeholder="اكتب التوجيهات والتفاصيل المطلوبة للمهمة..."
                  value={formFields.description}
                  onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                  className="c-input__field"
                  style={{ width: "100%", padding: "10px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    تاريخ الاستحقاق *
                  </label>
                  <input
                    type="date"
                    required
                    value={formFields.dueDate}
                    onChange={(e) => setFormFields({ ...formFields, dueDate: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    الأولوية
                  </label>
                  <select
                    value={formFields.priority}
                    onChange={(e) => setFormFields({ ...formFields, priority: e.target.value as any })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  >
                    <option value="Low">منخفضة</option>
                    <option value="Medium">عادية (Medium)</option>
                    <option value="High">عالية (High)</option>
                    <option value="Critical">حرج جداً (Critical)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    الموظف المسند إليه *
                  </label>
                  <select
                    required
                    value={formFields.assignedToId}
                    onChange={(e) => setFormFields({ ...formFields, assignedToId: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  >
                    <option value="">اختر الموظف...</option>
                    {agents.map((agent) => (
                      <option key={agent._id} value={agent._id}>
                        {agent.firstName} {agent.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    العميل المرتبط (اختياري)
                  </label>
                  <select
                    value={formFields.clientId}
                    onChange={(e) => setFormFields({ ...formFields, clientId: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  >
                    <option value="">بدون عميل مرتبط</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.companyName || `${c.firstName} ${c.lastName}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                  {modalLoading ? "جاري الحفظ..." : "إنشاء المهمة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
