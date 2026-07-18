"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../layout";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Settings, 
  Building2, 
  Users2, 
  ShieldAlert, 
  Clock, 
  Bell, 
  Lock, 
  History, 
  Plus, 
  X, 
  Save, 
  CheckCircle2, 
  Search, 
  Sliders, 
  AlertOctagon,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

interface Department {
  _id: string;
  name: string;
  code: string;
  manager?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  status: "Active" | "Inactive";
}

interface EmployeeSummary {
  _id: string;
  firstName: string;
  lastName: string;
}

interface RolePermission {
  category: string;
  actions: string[];
}

interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: RolePermission[];
  isDefault: boolean;
}

interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  details?: string;
  performedEmail: string;
  createdAt: string;
}

const CATEGORIES = [
  "Users", "Employees", "Clients", "Follow-Ups", "Tasks", "Notifications", "Files", "Reports", "Settings", "Backups"
];

const ACTIONS = ["View", "Create", "Edit", "Delete", "Approve", "Export"];

export default function SettingsDashboardPage() {
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const isSuperAdmin = currentUser?.role === "SuperAdmin";

  // Tab State
  const [activeTab, setActiveTab] = useState<"company" | "departments" | "roles" | "rules" | "security" | "logs">("company");

  // Global settings state
  const [settingsForm, setSettingsForm] = useState({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyAddress: "",
    companyWebsite: "",
    timezone: "Africa/Cairo",
    language: "ar",
    currency: "EGP",
    country: "Egypt",
    workWeekStart: 0,
    workWeekEnd: 4,
    followupIntervalDays: 3,
    reminderOffsetMinutes: 30,
    notificationRetentionDays: 90,
    emailNotificationsEnabled: true,
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    sessionTimeoutMinutes: 60,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Departments state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: "", code: "", manager: "", status: "Active" });
  const [deptError, setDeptError] = useState("");
  const [deptLoading, setDeptLoading] = useState(false);

  // Roles & Permissions state
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [savingRole, setSavingRole] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState("");

  // Audit Logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logSearch, setLogSearch] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);

  // Load Global Settings
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/v1/settings");
      const json = await res.json();
      if (res.ok && json.data) {
        setSettingsForm(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Load Departments and Staff
  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/v1/departments");
      const json = await res.json();
      if (res.ok) setDepartments(json.data);

      const resEmp = await fetch("/api/v1/employees?limit=100");
      const jsonEmp = await resEmp.json();
      if (resEmp.ok) setEmployees(jsonEmp.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Roles
  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/v1/roles");
      const json = await res.json();
      if (res.ok) setRoles(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Audit Logs
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: logPage.toString(),
        limit: "20",
        search: logSearch
      });
      const res = await fetch(`/api/v1/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setLogs(json.data);
        setLogTotalPages(json.pagination.pages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSettings();
      fetchDepartments();
      fetchRoles();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin && activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab, logPage, logSearch]);

  // Handle Save Settings Form
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError("");
    setSettingsSuccess("");
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "فشل في حفظ الإعدادات");

      setSettingsSuccess("تم حفظ إعدادات النظام بنجاح!");
      setSettingsForm(json.data);
    } catch (err: any) {
      setSettingsError(err.message || "خطأ أثناء حفظ الإعدادات");
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Create Department
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptError("");
    setDeptLoading(true);
    try {
      const res = await fetch("/api/v1/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deptForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "فشل في إنشاء القسم");

      setIsDeptModalOpen(false);
      setDeptForm({ name: "", code: "", manager: "", status: "Active" });
      fetchDepartments();
    } catch (err: any) {
      setDeptError(err.message || "خطأ أثناء إنشاء القسم");
    } finally {
      setDeptLoading(false);
    }
  };

  // Toggle Department Status (Active/Inactive)
  const handleToggleDeptStatus = async (dept: Department) => {
    const nextStatus = dept.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch(`/api/v1/departments/${dept._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) fetchDepartments();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Role Permission Checkbox
  const handlePermissionToggle = (category: string, action: string) => {
    if (roles.length === 0) return;

    setRoles(prevRoles => {
      const updated = [...prevRoles];
      const role = { ...updated[selectedRoleIndex] };
      const perms = [...role.permissions];
      
      const permIndex = perms.findIndex(p => p.category === category);
      if (permIndex > -1) {
        const item = { ...perms[permIndex] };
        const actList = [...item.actions];
        const actIndex = actList.indexOf(action);
        
        if (actIndex > -1) {
          actList.splice(actIndex, 1); // remove permission
        } else {
          actList.push(action); // add permission
        }
        item.actions = actList;
        perms[permIndex] = item;
      } else {
        perms.push({ category, actions: [action] });
      }

      role.permissions = perms;
      updated[selectedRoleIndex] = role;
      return updated;
    });
  };

  // Save Role permissions matrix
  const handleSaveRolePermissions = async () => {
    if (roles.length === 0 || savingRole) return;
    setSavingRole(true);
    setRoleSuccess("");
    const role = roles[selectedRoleIndex];
    try {
      const res = await fetch("/api/v1/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: role.name,
          permissions: role.permissions,
        }),
      });
      if (res.ok) {
        setRoleSuccess(`تم تحديث صلاحيات الدور "${role.name === "SuperAdmin" ? "مدير النظام" : "موظف"}" بنجاح!`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRole(false);
    }
  };

  // If Employee, block access
  if (!isSuperAdmin) {
    return (
      <main style={{ flex: 1, padding: "var(--sp-12)", display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center", gap: "var(--sp-4)" }}>
        <AlertOctagon size={48} style={{ color: "var(--clr-error)" }} />
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "var(--fs-h2)", color: "var(--clr-text-primary)", marginBottom: "var(--sp-1)" }}>
            {t("settings_view.access_denied")}
          </h2>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            {t("settings_view.access_denied_msg")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="responsive-main">
      
      {/* Tab grid container */}
      <div className="responsive-settings-grid">
        
        {/* Left Side Tab Navigation */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
          <button
            onClick={() => setActiveTab("company")}
            className={`tab-side-btn ${activeTab === "company" ? "active" : ""}`}
          >
            <Building2 size={16} />
            <span>{t("settings_view.profile_tab")}</span>
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`tab-side-btn ${activeTab === "departments" ? "active" : ""}`}
          >
            <Users2 size={16} />
            <span>{t("settings_view.depts_tab")}</span>
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`tab-side-btn ${activeTab === "roles" ? "active" : ""}`}
          >
            <ShieldAlert size={16} />
            <span>{t("settings_view.roles_tab")}</span>
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`tab-side-btn ${activeTab === "rules" ? "active" : ""}`}
          >
            <Clock size={16} />
            <span>{t("settings_view.rules_tab")}</span>
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`tab-side-btn ${activeTab === "security" ? "active" : ""}`}
          >
            <Lock size={16} />
            <span>{t("settings_view.security_tab")}</span>
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`tab-side-btn ${activeTab === "logs" ? "active" : ""}`}
          >
            <History size={16} />
            <span>{t("settings_view.logs_tab")}</span>
          </button>

          <style jsx>{`
            .tab-side-btn {
              display: flex;
              align-items: center;
              gap: var(--sp-3);
              padding: var(--sp-3) var(--sp-4);
              background: none;
              border: 1px solid transparent;
              border-radius: var(--radius-md);
              color: var(--clr-text-muted);
              font-size: var(--fs-body-sm);
              font-weight: var(--fw-medium);
              text-align: left;
              cursor: pointer;
              transition: var(--transition-fast);
            }
            .tab-side-btn:hover {
              color: var(--clr-text-primary);
              background-color: rgba(255, 255, 255, 0.02);
            }
            .tab-side-btn.active {
              color: var(--clr-text-primary);
              background-color: rgba(0, 210, 255, 0.08);
              border: 1px solid rgba(0, 210, 255, 0.2);
            }
          `}</style>
        </div>

        {/* Right Side Content Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          
          {/* Tab 1: Company Profile */}
          {activeTab === "company" && (
            <section className="c-card">
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
                {t("settings_view.org_profile_title")}
              </h2>
              
              {settingsSuccess && (
                <div style={{ color: "var(--clr-success)", backgroundColor: "rgba(56,161,105,0.12)", border: "1px solid var(--clr-success)", padding: "var(--sp-3)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
                  <CheckCircle2 size={16} />
                  <span>{settingsSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                <div className="responsive-grid-2">
                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.company_name")}</label>
                    <input 
                      type="text" 
                      required
                      value={settingsForm.companyName}
                      onChange={(e) => setSettingsForm(p => ({ ...p, companyName: e.target.value }))}
                      className="c-input__field"
                    />
                  </div>
                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.company_email")}</label>
                    <input 
                      type="email" 
                      value={settingsForm.companyEmail}
                      onChange={(e) => setSettingsForm(p => ({ ...p, companyEmail: e.target.value }))}
                      className="c-input__field"
                    />
                  </div>
                </div>

                <div className="responsive-grid-2">
                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.company_phone")}</label>
                    <input 
                      type="text" 
                      value={settingsForm.companyPhone}
                      onChange={(e) => setSettingsForm(p => ({ ...p, companyPhone: e.target.value }))}
                      className="c-input__field"
                    />
                  </div>
                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.company_website")}</label>
                    <input 
                      type="text" 
                      value={settingsForm.companyWebsite}
                      onChange={(e) => setSettingsForm(p => ({ ...p, companyWebsite: e.target.value }))}
                      className="c-input__field"
                    />
                  </div>
                </div>

                <div className="c-input">
                  <label className="c-input__label">{t("settings_view.company_address")}</label>
                  <input 
                    type="text" 
                    value={settingsForm.companyAddress}
                    onChange={(e) => setSettingsForm(p => ({ ...p, companyAddress: e.target.value }))}
                    className="c-input__field"
                  />
                </div>

                <div className="responsive-grid-3">
                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.timezone")}</label>
                    <select 
                      value={settingsForm.timezone}
                      onChange={(e) => setSettingsForm(p => ({ ...p, timezone: e.target.value }))}
                      className="c-input__field"
                      style={{ background: "var(--clr-bg-primary)" }}
                    >
                      <option value="Africa/Cairo">Africa/Cairo (Egypt EET/EEST)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="EST">EST (GMT-5)</option>
                      <option value="EET">EET (GMT+2)</option>
                      <option value="GST">GST (GMT+4)</option>
                    </select>
                  </div>

                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.language")}</label>
                    <select 
                      value={settingsForm.language}
                      onChange={(e) => setSettingsForm(p => ({ ...p, language: "ar" }))}
                      className="c-input__field"
                      style={{ background: "var(--clr-bg-primary)" }}
                    >
                      <option value="ar">العربية (افتراضية النظام)</option>
                    </select>
                  </div>

                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.currency")}</label>
                    <select 
                      value={settingsForm.currency}
                      onChange={(e) => setSettingsForm(p => ({ ...p, currency: e.target.value }))}
                      className="c-input__field"
                      style={{ background: "var(--clr-bg-primary)" }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EGP">EGP (EGP)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>

                <div className="responsive-grid-3" style={{ marginTop: "var(--sp-4)" }}>
                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.country")}</label>
                    <input 
                      type="text" 
                      value={(settingsForm as any).country || "Egypt"}
                      onChange={(e) => setSettingsForm(p => ({ ...p, country: e.target.value }))}
                      className="c-input__field"
                    />
                  </div>

                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.workWeekStart")}</label>
                    <select 
                      value={(settingsForm as any).workWeekStart ?? 0}
                      onChange={(e) => setSettingsForm(p => ({ ...p, workWeekStart: parseInt(e.target.value) }))}
                      className="c-input__field"
                      style={{ background: "var(--clr-bg-primary)" }}
                    >
                      <option value={0}>Sunday (الأحد)</option>
                      <option value={1}>Monday (الإثنين)</option>
                      <option value={2}>Tuesday (الثلاثاء)</option>
                      <option value={3}>Wednesday (الأربعاء)</option>
                      <option value={4}>Thursday (الخميس)</option>
                      <option value={5}>Friday (الجمعة)</option>
                      <option value={6}>Saturday (السبت)</option>
                    </select>
                  </div>

                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.workWeekEnd")}</label>
                    <select 
                      value={(settingsForm as any).workWeekEnd ?? 4}
                      onChange={(e) => setSettingsForm(p => ({ ...p, workWeekEnd: parseInt(e.target.value) }))}
                      className="c-input__field"
                      style={{ background: "var(--clr-bg-primary)" }}
                    >
                      <option value={0}>Sunday (الأحد)</option>
                      <option value={1}>Monday (الإثنين)</option>
                      <option value={2}>Tuesday (الثلاثاء)</option>
                      <option value={3}>Wednesday (الأربعاء)</option>
                      <option value={4}>Thursday (الخميس)</option>
                      <option value={5}>Friday (الجمعة)</option>
                      <option value={6}>Saturday (السبت)</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={savingSettings}
                  className="c-btn c-btn--primary"
                  style={{ gap: "var(--sp-2)", width: "200px", justifyContent: "center", alignSelf: "flex-end", marginTop: "var(--sp-2)" }}
                >
                  {savingSettings ? <div className="btn-spinner" /> : <Save size={16} />}
                  <span>{t("settings_view.save_profile")}</span>
                </button>
              </form>
            </section>
          )}

          {/* Tab 2: Departments */}
          {activeTab === "departments" && (
            <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", margin: 0 }}>
                  {t("settings_view.depts_directory")}
                </h2>
                <button 
                  onClick={() => setIsDeptModalOpen(true)}
                  className="c-btn c-btn--primary" 
                  style={{ gap: "var(--sp-1)", fontSize: "12px", padding: "8px 12px" }}
                >
                  <Plus size={14} />
                  <span>{t("settings_view.create_dept")}</span>
                </button>
              </div>

              <div style={{ border: "1px solid var(--clr-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: "var(--sp-2)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "rgba(4, 13, 33, 0.4)", borderBottom: "1px solid var(--clr-border)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                      <th style={{ textAlign: "right", padding: "var(--sp-3)" }}>{t("settings_view.dept_code")}</th>
                      <th style={{ textAlign: "right", padding: "var(--sp-3)" }}>{t("settings_view.dept_name")}</th>
                      <th style={{ textAlign: "right", padding: "var(--sp-3)" }}>{t("settings_view.dept_manager")}</th>
                      <th style={{ textAlign: "center", padding: "var(--sp-3)" }}>{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                          {t("settings_view.no_depts")}
                        </td>
                      </tr>
                    ) : (
                      departments.map(dept => (
                        <tr key={dept._id} style={{ borderBottom: "1px solid var(--clr-border)", fontSize: "12px" }}>
                          <td style={{ padding: "var(--sp-3)", fontWeight: "var(--fw-bold)", color: "var(--clr-accent-primary)" }}>{dept.code}</td>
                          <td style={{ padding: "var(--sp-3)" }}>{dept.name}</td>
                          <td style={{ padding: "var(--sp-3)", color: "var(--clr-text-muted)" }}>
                            {dept.manager ? `${dept.manager.firstName} ${dept.manager.lastName}` : "-"}
                          </td>
                          <td style={{ padding: "var(--sp-3)", textAlign: "center" }}>
                            <button
                              onClick={() => handleToggleDeptStatus(dept)}
                              className={`c-badge ${dept.status === "Active" ? "c-badge--success" : "c-badge--danger"}`}
                              style={{ cursor: "pointer", border: "none" }}
                            >
                              {dept.status}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Tab 3: Roles & Permissions */}
          {activeTab === "roles" && (
            <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", margin: 0 }}>
                  {t("settings_view.roles_config")}
                </h2>
                <button
                  onClick={handleSaveRolePermissions}
                  disabled={roles.length === 0 || savingRole}
                  className="c-btn c-btn--primary"
                  style={{ gap: "var(--sp-2)", fontSize: "12px", padding: "8px 12px" }}
                >
                  {savingRole ? <div className="btn-spinner" /> : <Save size={14} />}
                  <span>{t("settings_view.save_permissions")}</span>
                </button>
              </div>

              {roleSuccess && (
                <div style={{ color: "var(--clr-success)", backgroundColor: "rgba(56,161,105,0.12)", border: "1px solid var(--clr-success)", padding: "var(--sp-2)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                  <CheckCircle2 size={14} />
                  <span>{roleSuccess}</span>
                </div>
              )}

              {/* Roles selectors tabs */}
              <div style={{ display: "flex", gap: "var(--sp-3)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
                {roles.map((role, idx) => (
                  <button
                    key={role._id}
                    onClick={() => { setSelectedRoleIndex(idx); setRoleSuccess(""); }}
                    style={{
                      padding: "6px 12px",
                      background: selectedRoleIndex === idx ? "rgba(0, 210, 255, 0.08)" : "none",
                      border: selectedRoleIndex === idx ? "1px solid rgba(0, 210, 255, 0.2)" : "1px solid transparent",
                      borderRadius: "var(--radius-sm)",
                      color: selectedRoleIndex === idx ? "var(--clr-text-primary)" : "var(--clr-text-muted)",
                      fontWeight: selectedRoleIndex === idx ? "var(--fw-bold)" : "var(--fw-medium)",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    {role.name} {role.isDefault && "⭐️"}
                  </button>
                ))}
              </div>

              {roles.length > 0 && (
                <div style={{ border: "1px solid var(--clr-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "rgba(4, 13, 33, 0.4)", borderBottom: "1px solid var(--clr-border)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                        <th style={{ textAlign: "right", padding: "10px var(--sp-4)" }}>فئة الصلاحية</th>
                        {ACTIONS.map(action => (
                          <th key={action} style={{ textAlign: "center", padding: "10px" }}>{action}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {CATEGORIES.map(category => {
                        const role = roles[selectedRoleIndex];
                        const perm = role.permissions.find(p => p.category === category);
                        const actionsAllowed = perm ? perm.actions : [];

                        return (
                          <tr key={category} style={{ borderBottom: "1px solid var(--clr-border)", fontSize: "12px" }}>
                            <td style={{ padding: "10px var(--sp-4)", fontWeight: "var(--fw-bold)", color: "var(--clr-text-primary)" }}>{category}</td>
                            {ACTIONS.map(action => {
                              const isChecked = actionsAllowed.includes(action as any);
                              return (
                                <td key={action} style={{ textAlign: "center", padding: "10px" }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={() => handlePermissionToggle(category, action)}
                                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--clr-accent-primary)" }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Tab 4: Follow-up Rules */}
          {activeTab === "rules" && (
            <section className="c-card">
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
                {t("settings_view.rules_title")}
              </h2>

              {settingsSuccess && (
                <div style={{ color: "var(--clr-success)", backgroundColor: "rgba(56,161,105,0.12)", border: "1px solid var(--clr-success)", padding: "var(--sp-3)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
                  <CheckCircle2 size={16} />
                  <span>{settingsSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
                
                {/* Interval slider */}
                <div className="c-input">
                  <label className="c-input__label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{t("settings_view.followup_interval")}</span>
                    <span style={{ color: "var(--clr-accent-primary)" }}>{settingsForm.followupIntervalDays} {t("settings_view.days")}</span>
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="14" 
                    value={settingsForm.followupIntervalDays}
                    onChange={(e) => setSettingsForm(p => ({ ...p, followupIntervalDays: parseInt(e.target.value) }))}
                    style={{ width: "100%", accentColor: "var(--clr-accent-primary)", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "10px", color: "var(--clr-text-muted)" }}>{t("settings_view.followup_interval_desc")}</span>
                </div>

                {/* Reminder offset slider */}
                <div className="c-input">
                  <label className="c-input__label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{t("settings_view.reminder_offset")}</span>
                    <span style={{ color: "var(--clr-accent-primary)" }}>{settingsForm.reminderOffsetMinutes} {t("settings_view.mins")}</span>
                  </label>
                  <input 
                    type="range" 
                    min="5" 
                    max="120" 
                    step="5"
                    value={settingsForm.reminderOffsetMinutes}
                    onChange={(e) => setSettingsForm(p => ({ ...p, reminderOffsetMinutes: parseInt(e.target.value) }))}
                    style={{ width: "100%", accentColor: "var(--clr-accent-primary)", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "10px", color: "var(--clr-text-muted)" }}>{t("settings_view.reminder_offset_desc")}</span>
                </div>

                {/* Notification retention input */}
                <div className="c-input">
                  <label className="c-input__label">{t("settings_view.notif_retention")}</label>
                  <input 
                    type="number" 
                    value={settingsForm.notificationRetentionDays}
                    onChange={(e) => setSettingsForm(p => ({ ...p, notificationRetentionDays: parseInt(e.target.value) || 90 }))}
                    className="c-input__field"
                  />
                </div>

                {/* Enable email check */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--sp-2)" }}>
                  <div>
                    <label style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-body-sm)", display: "block" }}>
                      {t("settings_view.email_notif_label")}
                    </label>
                    <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>
                      {t("settings_view.email_notif_desc")}
                    </span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settingsForm.emailNotificationsEnabled}
                    onChange={(e) => setSettingsForm(p => ({ ...p, emailNotificationsEnabled: e.target.checked }))}
                    style={{ width: "20px", height: "20px", accentColor: "var(--clr-accent-primary)", cursor: "pointer" }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={savingSettings}
                  className="c-btn c-btn--primary"
                  style={{ gap: "var(--sp-2)", width: "160px", justifyContent: "center", alignSelf: "flex-end", marginTop: "var(--sp-4)" }}
                >
                  {savingSettings ? <div className="btn-spinner" /> : <Save size={16} />}
                  <span>{t("settings_view.save_rules")}</span>
                </button>
              </form>
            </section>
          )}

          {/* Tab 5: Security */}
          {activeTab === "security" && (
            <section className="c-card">
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
                {t("settings_view.security_title")}
              </h2>

              {settingsSuccess && (
                <div style={{ color: "var(--clr-success)", backgroundColor: "rgba(56,161,105,0.12)", border: "1px solid var(--clr-success)", padding: "var(--sp-3)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
                  <CheckCircle2 size={16} />
                  <span>{settingsSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                <div className="responsive-grid-3">
                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.password_min_length")}</label>
                    <input 
                      type="number" 
                      min="6"
                      max="32"
                      value={settingsForm.passwordMinLength}
                      onChange={(e) => setSettingsForm(p => ({ ...p, passwordMinLength: parseInt(e.target.value) || 8 }))}
                      className="c-input__field"
                    />
                  </div>

                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.max_login_lockout")}</label>
                    <input 
                      type="number" 
                      min="3"
                      max="20"
                      value={settingsForm.maxLoginAttempts}
                      onChange={(e) => setSettingsForm(p => ({ ...p, maxLoginAttempts: parseInt(e.target.value) || 5 }))}
                      className="c-input__field"
                    />
                  </div>

                  <div className="c-input">
                    <label className="c-input__label">{t("settings_view.session_timeout_mins")}</label>
                    <input 
                      type="number" 
                      min="10"
                      max="1440"
                      value={settingsForm.sessionTimeoutMinutes}
                      onChange={(e) => setSettingsForm(p => ({ ...p, sessionTimeoutMinutes: parseInt(e.target.value) || 60 }))}
                      className="c-input__field"
                    />
                  </div>
                </div>

                <div 
                  style={{ 
                    display: "flex", 
                    gap: "var(--sp-3)", 
                    padding: "var(--sp-3) var(--sp-4)", 
                    backgroundColor: "rgba(229,62,62,0.06)", 
                    border: "1px dashed rgba(229,62,62,0.4)", 
                    borderRadius: "var(--radius-md)",
                    marginTop: "var(--sp-2)"
                  }}
                >
                  <ShieldAlert size={18} style={{ color: "var(--clr-error)", flexShrink: 0, marginTop: "2px" }} />
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--clr-text-muted)", lineHeight: "1.4" }}>
                    <strong>{t("settings_view.security_advisory")}</strong> {t("settings_view.security_advisory_text")}
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={savingSettings}
                  className="c-btn c-btn--primary"
                  style={{ gap: "var(--sp-2)", width: "160px", justifyContent: "center", alignSelf: "flex-end", marginTop: "var(--sp-4)" }}
                >
                  {savingSettings ? <div className="btn-spinner" /> : <Save size={16} />}
                  <span>{t("settings_view.save_policies")}</span>
                </button>
              </form>
            </section>
          )}

          {/* Tab 6: Audit Logs */}
          {activeTab === "logs" && (
            <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", margin: 0 }}>
                  {t("settings_view.audit_trail_title")}
                </h2>

                {/* Log Search */}
                <div style={{ position: "relative", width: "240px" }}>
                  <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--clr-text-muted)" }} />
                  <input
                    type="text"
                    placeholder={t("settings_view.search_logs")}
                    value={logSearch}
                    onChange={(e) => { setLogSearch(e.target.value); setLogPage(1); }}
                    className="c-input__field"
                    style={{ paddingLeft: "32px", height: "34px", fontSize: "12px" }}
                  />
                </div>
              </div>

              <div style={{ border: "1px solid var(--clr-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: "var(--sp-1)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "rgba(4, 13, 33, 0.4)", borderBottom: "1px solid var(--clr-border)", fontSize: "11px", color: "var(--clr-text-muted)" }}>
                      <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>{t("settings_view.performed_by")}</th>
                      <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>{t("settings_view.action_code")}</th>
                      <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>{t("settings_view.entity")}</th>
                      <th style={{ textAlign: "right", padding: "10px var(--sp-3)" }}>{t("settings_view.audit_details")}</th>
                      <th style={{ textAlign: "left", padding: "10px var(--sp-3)" }}>{t("settings_view.date_time")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsLoading ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                           {t("settings_view.loading_logs")}
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--clr-text-muted)" }}>
                           {t("settings_view.no_logs")}
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log._id} style={{ borderBottom: "1px solid var(--clr-border)", fontSize: "12px" }}>
                          <td style={{ padding: "10px var(--sp-3)", fontWeight: "var(--fw-medium)" }}>{log.performedEmail}</td>
                          <td style={{ padding: "10px var(--sp-3)" }}>
                            <span 
                              className="c-badge" 
                              style={{ 
                                textTransform: "none", 
                                backgroundColor: log.action.startsWith("SETTINGS") 
                                  ? "rgba(0, 210, 255, 0.08)" 
                                  : log.action.startsWith("ROLE")
                                  ? "rgba(128, 90, 213, 0.08)"
                                  : "rgba(56, 161, 105, 0.08)" 
                              }}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)" }}>{log.entityType}</td>
                          <td style={{ padding: "10px var(--sp-3)", color: "var(--clr-text-muted)" }}>{log.details || "-"}</td>
                          <td style={{ padding: "10px var(--sp-3)", textAlign: "right" }}>{new Date(log.createdAt).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              {logTotalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)", marginTop: "var(--sp-2)" }}>
                  <button
                    disabled={logPage === 1}
                    onClick={() => setLogPage(p => Math.max(1, p - 1))}
                    className="c-btn c-btn--secondary"
                    style={{ padding: "4px 8px" }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ alignSelf: "center", fontSize: "12px", color: "var(--clr-text-muted)" }}>
                    {t("settings_view.page_of")} {logPage} {t("settings_view.of")} {logTotalPages}
                  </span>
                  <button
                    disabled={logPage === logTotalPages}
                    onClick={() => setLogPage(p => Math.min(logTotalPages, p + 1))}
                    className="c-btn c-btn--secondary"
                    style={{ padding: "4px 8px" }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </section>
          )}

        </div>
      </div>

      {/* Create Department Modal Popup */}
      {isDeptModalOpen && (
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
          onClick={() => setIsDeptModalOpen(false)}
        >
          <div 
            className="c-card c-card--glow"
            style={{ 
              width: "100%", 
              maxWidth: "460px", 
              position: "relative",
              animation: "slideIn 0.25s ease-out" 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsDeptModalOpen(false)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "var(--clr-text-muted)", cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: "var(--sp-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)" }}>
                {t("settings_view.create_dept_title")}
              </h2>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                {t("settings_view.create_dept_desc")}
              </p>
            </div>

            {deptError && (
              <div style={{ backgroundColor: "rgba(229, 62, 62, 0.12)", border: "1px solid var(--clr-error)", color: "var(--clr-error)", padding: "var(--sp-2)", borderRadius: "var(--radius-sm)", marginBottom: "var(--sp-4)", fontSize: "var(--fs-body-sm)" }}>
                {deptError}
              </div>
            )}

            <form onSubmit={handleCreateDept} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              <div className="c-input">
                <label className="c-input__label">{t("settings_view.dept_name_label")}</label>
                <input 
                  type="text" 
                  required
                  placeholder={t("settings_view.dept_name_placeholder")}
                  value={deptForm.name}
                  onChange={(e) => setDeptForm(p => ({ ...p, name: e.target.value }))}
                  className="c-input__field"
                />
              </div>

              <div className="c-input">
                <label className="c-input__label">{t("settings_view.dept_code_label")}</label>
                <input 
                  type="text" 
                  required
                  placeholder={t("settings_view.dept_code_placeholder")}
                  value={deptForm.code}
                  onChange={(e) => setDeptForm(p => ({ ...p, code: e.target.value }))}
                  className="c-input__field"
                />
              </div>

              <div className="c-input">
                <label className="c-input__label">{t("settings_view.dept_manager_label")}</label>
                <select
                  value={deptForm.manager}
                  onChange={(e) => setDeptForm(p => ({ ...p, manager: e.target.value }))}
                  className="c-input__field"
                  style={{ background: "var(--clr-bg-primary)" }}
                >
                  <option value="">{t("settings_view.unassigned")}</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", marginTop: "var(--sp-4)" }}>
                <button 
                  type="button" 
                  onClick={() => setIsDeptModalOpen(false)}
                  className="c-btn c-btn--secondary"
                >
                  {t("common.cancel")}
                </button>
                <button 
                  type="submit" 
                  disabled={deptLoading}
                  className="c-btn c-btn--primary"
                  style={{ minWidth: "110px", gap: "var(--sp-2)" }}
                >
                  {deptLoading ? <div className="btn-spinner" /> : null}
                  <span>{t("common.create")}</span>
                </button>
              </div>
            </form>
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
      `}} />
    </main>
  );
}
