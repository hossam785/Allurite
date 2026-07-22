"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../layout";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import DataGrid, { ColumnDef, BulkAction, QuickFilter } from "@/components/ui/DataGrid";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import SplitPaneInspector from "@/components/ui/SplitPaneInspector";
import ActivityFeed, { ActivityItem } from "@/components/ui/ActivityFeed";
import {
  Calendar,
  Clock,
  Phone,
  Mail,
  Video,
  Plus,
  Eye,
  Trash2,
  Download,
  CheckCircle2,
  XCircle,
  Building,
  User,
  X,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface FollowUpItem {
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
    companyName?: string;
  };
  assignedAgent: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface ClientSummary {
  _id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
}

interface AgentSummary {
  _id: string;
  firstName: string;
  lastName: string;
  user: {
    email: string;
  };
}

export default function FollowUpsPage() {
  const { user: currentUser } = useAuth();
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Data states
  const [followups, setFollowups] = useState<FollowUpItem[]>([]);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Selected follow-up for SplitPaneInspector drawer
  const [inspectingItem, setInspectingItem] = useState<FollowUpItem | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Tab State: "today" | "upcoming" | "missed" | "completed" | "all"
  const [activeTab, setActiveTab] = useState<string>("today");

  // Search & Filter parameters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formFields, setFormFields] = useState({
    client: "",
    title: "",
    description: "",
    type: "Call",
    scheduledAt: "",
    assignedAgentId: "",
  });
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const searchParams = useSearchParams();

  // Handle URL search parameters
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsModalOpen(true);
    }
    const qId = searchParams.get("id");
    if (qId) {
      const found = followups.find((f) => f._id === qId);
      if (found) {
        handleOpenInspector(found);
      } else {
        setSearchTerm(qId);
      }
    }
  }, [searchParams, followups]);

  // Fetch follow-ups list
  const fetchFollowUps = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: "250",
        type: selectedType,
      });

      const res = await fetch(`/api/v1/followups?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to fetch follow-ups");
      }
      setFollowups(json.data || []);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      toast.error(err.message || "فشل تحميل تذكيرات المتابعة");
    } finally {
      setLoading(false);
    }
  };

  // Fetch client details
  const fetchClients = async () => {
    try {
      const res = await fetch("/api/v1/clients?limit=100");
      const json = await res.json();
      if (res.ok) {
        setClients(json.data?.clients || json.data || []);
      }
    } catch (err) {
      console.error("Failed to load clients list", err);
    }
  };

  // Fetch agents list
  const fetchAgents = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch("/api/v1/employees?limit=100");
      const json = await res.json();
      if (res.ok) {
        setAgents(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load employees list", err);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, [selectedType]);

  useEffect(() => {
    if (isModalOpen) {
      fetchClients();
      fetchAgents();
    }
  }, [isModalOpen]);

  // Open inspector drawer with populated activity history
  const handleOpenInspector = (item: FollowUpItem) => {
    setInspectingItem(item);
    setActivities([
      {
        id: "act-created",
        type: "System",
        authorName: "النظام الألي",
        content: `تم جدولة التذكير بنجاح للموعد: ${new Date(item.scheduledAt).toLocaleString("ar-EG")}`,
        timestamp: item.createdAt || new Date().toISOString(),
      },
      ...(item.notes
        ? [
            {
              id: "act-notes",
              type: "Note" as const,
              authorName: item.assignedAgent
                ? `${item.assignedAgent.firstName} ${item.assignedAgent.lastName}`
                : "المسؤول",
              content: item.notes,
              timestamp: item.createdAt || new Date().toISOString(),
            },
          ]
        : []),
    ]);
  };

  // Add new note inside inspector drawer
  const handleAddActivityNote = async (noteText: string, noteType: ActivityItem["type"]) => {
    if (!inspectingItem) return;

    const newAct: ActivityItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: noteType,
      authorName: currentUser?.name || currentUser?.email.split("@")[0] || "المستخدم الحالي",
      content: noteText,
      timestamp: new Date().toISOString(),
    };

    setActivities((prev) => [newAct, ...prev]);

    // Also update server notes if needed
    try {
      await fetch(`/api/v1/followups/${inspectingItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: `${inspectingItem.notes || ""}\n${noteText}`.trim() }),
      });
    } catch (err) {
      console.error("Failed to sync note to backend", err);
    }
  };

  // Mark Follow-Up Completed
  const handleMarkCompleted = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/followups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });
      if (res.ok) {
        toast.success("تم علم المتابعة كمكتملة بنجاح");
        fetchFollowUps();
        if (inspectingItem?._id === id) {
          setInspectingItem((prev) => (prev ? { ...prev, status: "Completed" } : null));
        }
      }
    } catch (err) {
      toast.error("فشل تحديث حالة المتابعة");
    }
  };

  // Categorize follow-ups in memory for tabs
  const filteredFollowUps = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return followups.filter((fup) => {
      const schedDate = new Date(fup.scheduledAt);

      // Tab filtering
      if (activeTab === "today") {
        if (fup.status !== "Scheduled" && fup.status !== "Pending") return false;
        if (!(schedDate >= today && schedDate < tomorrow)) return false;
      } else if (activeTab === "upcoming") {
        if (fup.status !== "Scheduled" && fup.status !== "Pending") return false;
        if (!(schedDate >= tomorrow)) return false;
      } else if (activeTab === "missed") {
        if (fup.status === "Completed" || fup.status === "Cancelled") return false;
        if (!(schedDate < today || fup.status === "Missed")) return false;
      } else if (activeTab === "completed") {
        if (fup.status !== "Completed") return false;
      }

      // Search filtering
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const titleMatch = fup.title.toLowerCase().includes(q);
        const typeMatch = fup.type.toLowerCase().includes(q);
        const clientName = `${fup.client?.firstName || ""} ${fup.client?.lastName || ""}`.toLowerCase();
        return titleMatch || typeMatch || clientName.includes(q);
      }

      return true;
    });
  }, [followups, activeTab, searchTerm]);

  // Submit Schedule form
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!formFields.client || !formFields.title.trim() || !formFields.scheduledAt) {
      setModalError("يرجى اختيار العميل وتحديد عنوان المتابعة وتاريخ الجدولة");
      return;
    }

    const parsedDate = new Date(formFields.scheduledAt);
    if (parsedDate < new Date()) {
      setModalError("لا يمكن جدولة متابعة في تاريخ سابق للوقت الحالي");
      return;
    }

    if (isSuperAdmin && !formFields.assignedAgentId) {
      setModalError("يرجى اختيار العضو المسؤول عن المتابعة");
      return;
    }

    setModalLoading(true);
    try {
      const res = await fetch("/api/v1/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formFields),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "فشل جدولة المتابعة");
      }

      toast.success("تم جدولة المتابعة بنجاح", "تم التجديل");
      fetchFollowUps();
      setIsModalOpen(false);
      setFormFields({
        client: "",
        title: "",
        description: "",
        type: "Call",
        scheduledAt: "",
        assignedAgentId: "",
      });
    } catch (err: any) {
      setModalError(err.message || "خطأ أثناء الجدولة");
    } finally {
      setModalLoading(false);
    }
  };

  // Bulk Actions
  const handleBulkComplete = async (idsToComplete: string[]) => {
    try {
      let count = 0;
      for (const id of idsToComplete) {
        const res = await fetch(`/api/v1/followups/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Completed" }),
        });
        if (res.ok) count++;
      }

      toast.success(`تم إكمال ${count} متابعة بنجاح`);
      setSelectedIds([]);
      fetchFollowUps();
    } catch (err) {
      toast.error("حدث خطأ أثناء التحديث الجماعي");
    }
  };

  const handleBulkDelete = async (idsToDelete: string[]) => {
    if (!confirm(`هل أنت تأكد من حذف ${idsToDelete.length} تذكير متابعة؟`)) return;

    try {
      let count = 0;
      for (const id of idsToDelete) {
        const res = await fetch(`/api/v1/followups/${id}`, { method: "DELETE" });
        if (res.ok) count++;
      }

      toast.success(`تم حذف ${count} متابعة بنجاح`);
      setSelectedIds([]);
      fetchFollowUps();
    } catch (err) {
      toast.error("حدث خطأ أثناء الحذف الجماعي");
    }
  };

  // Quick Filter Tabs
  const quickFilters: QuickFilter[] = [
    {
      id: "today",
      label: "متابعات اليوم",
      active: activeTab === "today",
      onClick: () => setActiveTab("today"),
    },
    {
      id: "upcoming",
      label: "القادمة",
      active: activeTab === "upcoming",
      onClick: () => setActiveTab("upcoming"),
    },
    {
      id: "missed",
      label: "فائتة / متأخرة",
      active: activeTab === "missed",
      onClick: () => setActiveTab("missed"),
    },
    {
      id: "completed",
      label: "المكتملة",
      active: activeTab === "completed",
      onClick: () => setActiveTab("completed"),
    },
    {
      id: "all",
      label: "جميع المتابعات",
      count: followups.length,
      active: activeTab === "all",
      onClick: () => setActiveTab("all"),
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Call":
        return <Phone size={14} style={{ color: "var(--clr-accent-primary)" }} />;
      case "Email":
        return <Mail size={14} style={{ color: "#A855F7" }} />;
      case "Meeting":
      case "Demo":
        return <Video size={14} style={{ color: "#F59E0B" }} />;
      default:
        return <FileText size={14} style={{ color: "#94A3B8" }} />;
    }
  };

  // Table Columns Definition
  const columns: ColumnDef<FollowUpItem>[] = [
    {
      key: "type",
      header: "نوع التواصل",
      render: (item) => (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {getTypeIcon(item.type)}
          <Badge variant="neutral" size="sm" dot={false}>
            {item.type}
          </Badge>
        </div>
      ),
    },
    {
      key: "title",
      header: "عنوان المتابعة والتفاصيل",
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
      key: "client",
      header: "العميل المرتبط",
      render: (item) => (
        <div>
          <div style={{ fontWeight: 500, color: "var(--clr-text-primary)" }}>
            {item.client ? `${item.client.firstName} ${item.client.lastName}` : "عميل ملغي"}
          </div>
          {item.client?.companyName && (
            <div style={{ fontSize: "11px", color: "var(--clr-text-muted)" }}>
              {item.client.companyName}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "scheduledAt",
      header: "موعد الاستحقاق (SLA)",
      sortable: true,
      render: (item) => {
        const isPast = new Date(item.scheduledAt) < new Date() && item.status !== "Completed";
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
            <span>
              {new Date(item.scheduledAt).toLocaleString("ar-EG", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "الحالة",
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "assignedAgent",
      header: "المسؤول",
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
      header: "معاينة سريعة",
      align: "center",
      render: (item) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <button
            onClick={() => handleOpenInspector(item)}
            style={{
              padding: "6px",
              borderRadius: "6px",
              backgroundColor: "rgba(0, 210, 255, 0.1)",
              color: "var(--clr-accent-primary)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="معاينة المتابعة وسجل التفاعل"
          >
            <Eye size={15} />
          </button>
        </div>
      ),
    },
  ];

  const bulkActions: BulkAction[] = [
    {
      id: "complete",
      label: "إكمال المحدد",
      icon: <CheckCircle2 size={14} />,
      variant: "primary",
      onClick: handleBulkComplete,
    },
    {
      id: "delete",
      label: "حذف المتابعات",
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
            {t("navigation.followups")}
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "13px" }}>
            جدولة ومتابعة اتصالات وعروض العملاء وضمان الالتزام بمواعيد الـ SLA للمبيعات
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
          <span>جدولة متابعة جديدة</span>
        </button>
      </header>

      {/* Main DataGrid Table */}
      <DataGrid
        columns={columns}
        data={filteredFollowUps}
        keyExtractor={(item) => item._id}
        loading={loading}
        emptyMessage={error || "لا توجد تذكيرات متابعة مضافة في هذه الفئة"}
        enableSelection={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={bulkActions}
        searchPlaceholder="البحث باسم المتابعة، نوع التواصل، العميل..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        quickFilters={quickFilters}
        onRowClick={handleOpenInspector}
      />

      {/* Contextual SplitPaneInspector Drawer */}
      <SplitPaneInspector
        isOpen={!!inspectingItem}
        onClose={() => setInspectingItem(null)}
        title={inspectingItem?.title || ""}
        subtitle={
          inspectingItem?.client
            ? `العميل: ${inspectingItem.client.firstName} ${inspectingItem.client.lastName} (${inspectingItem.client.companyName || inspectingItem.client.email})`
            : undefined
        }
        status={inspectingItem?.status}
        typeBadge={inspectingItem?.type}
        headerIcon={<Clock size={20} style={{ color: "var(--clr-accent-primary)" }} />}
        actions={
          inspectingItem && inspectingItem.status !== "Completed" ? (
            <button
              onClick={() => handleMarkCompleted(inspectingItem._id)}
              className="c-btn c-btn--primary"
              style={{ padding: "6px 12px", fontSize: "12px", gap: "6px" }}
            >
              <CheckCircle2 size={14} />
              <span>تعليم كمكتملة</span>
            </button>
          ) : undefined
        }
      >
        {inspectingItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Overview Card */}
            <div
              style={{
                backgroundColor: "var(--clr-bg-surface, #131A26)",
                borderRadius: "12px",
                border: "1px solid var(--clr-border, #1E293B)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--clr-text-muted)" }}>
                  موعد الاستحقاق (SLA)
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--clr-accent-primary)",
                  }}
                >
                  {new Date(inspectingItem.scheduledAt).toLocaleString("ar-EG")}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--clr-text-muted)" }}>
                  المسؤول عن التنفيذ
                </span>
                <span style={{ fontSize: "13px", color: "var(--clr-text-primary)" }}>
                  {inspectingItem.assignedAgent
                    ? `${inspectingItem.assignedAgent.firstName} ${inspectingItem.assignedAgent.lastName}`
                    : "غير مسند"}
                </span>
              </div>

              {inspectingItem.description && (
                <div style={{ borderTop: "1px solid var(--clr-border)", paddingTop: "10px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--clr-text-muted)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    وصف التذكير والتوجيهات:
                  </span>
                  <p style={{ fontSize: "13px", color: "var(--clr-text-secondary)", lineHeight: 1.5 }}>
                    {inspectingItem.description}
                  </p>
                </div>
              )}
            </div>

            {/* Visual Activity Feed */}
            <div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginBottom: "12px",
                  color: "var(--clr-text-primary)",
                }}
              >
                سجل النشاط والتواصل مع العميل
              </h3>
              <ActivityFeed activities={activities} onAddNote={handleAddActivityNote} />
            </div>
          </div>
        )}
      </SplitPaneInspector>

      {/* Schedule FollowUp Modal Overlay */}
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
              <h2 style={{ fontSize: "18px", fontWeight: "bold" }}>جدولة متابعة عميل جديدة</h2>
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

            <form onSubmit={handleScheduleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                  العميل المستهدف *
                </label>
                <select
                  required
                  value={formFields.client}
                  onChange={(e) => setFormFields({ ...formFields, client: e.target.value })}
                  className="c-input__field"
                  style={{ width: "100%" }}
                >
                  <option value="">اختر العميل...</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName ? `${c.companyName} (${c.firstName} ${c.lastName})` : `${c.firstName} ${c.lastName}`}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    عنوان المتابعة *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: المكالمة التنسيقية الثانية..."
                    value={formFields.title}
                    onChange={(e) => setFormFields({ ...formFields, title: e.target.value })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    نوع التواصل
                  </label>
                  <select
                    value={formFields.type}
                    onChange={(e) => setFormFields({ ...formFields, type: e.target.value as any })}
                    className="c-input__field"
                    style={{ width: "100%" }}
                  >
                    <option value="Call">مكالمة هاتفية (Call)</option>
                    <option value="Email">بريد إلكتروني (Email)</option>
                    <option value="Meeting">اجتماع مباشر (Meeting)</option>
                    <option value="Demo">عرض توضيحي (Demo)</option>
                    <option value="Other">أنواع أخرى</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                  موعد الاستحقاق والجدولة *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formFields.scheduledAt}
                  onChange={(e) => setFormFields({ ...formFields, scheduledAt: e.target.value })}
                  className="c-input__field"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                  ملاحظات وتوجيهات
                </label>
                <textarea
                  rows={2}
                  value={formFields.description}
                  onChange={(e) => setFormFields({ ...formFields, description: e.target.value })}
                  className="c-input__field"
                  style={{ width: "100%", padding: "10px" }}
                />
              </div>

              {isSuperAdmin && (
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, marginBottom: "4px", display: "block" }}>
                    المسؤول عن التنفيذ *
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
                        {agent.firstName} {agent.lastName}
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
                  {modalLoading ? "جاري الحفظ..." : "جدولة المتابعة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
