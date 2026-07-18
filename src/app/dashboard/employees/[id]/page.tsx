"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Edit, 
  Key, 
  Calendar, 
  Smartphone, 
  Mail, 
  Building2, 
  Briefcase,
  Tag, 
  X,
  UserCheck,
  UserX,
  Lock,
  User,
  Shield,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface EmployeeDetail {
  _id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  department: string;
  position: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
  user: {
    _id: string;
    email: string;
    role: string;
    status: string;
  };
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Status toggle loading
  const [statusLoading, setStatusLoading] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFields, setEditFields] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    department: "",
    position: "",
    status: "Active" as "Active" | "Inactive",
  });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Reset Password State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const departments = [
    "Sales",
    "Marketing",
    "Engineering",
    "HR",
    "Support",
    "Finance",
    "Operations",
    "Executive"
  ];

  // Fetch employee details
  const fetchDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/employees/${id}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load employee details");
      }
      setEmployee(json.data);
      // Initialize edit fields
      setEditFields({
        firstName: json.data.firstName,
        lastName: json.data.lastName,
        phone: json.data.phone || "",
        department: json.data.department,
        position: json.data.position,
        status: json.data.status,
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Toggle status directly
  const handleToggleStatus = async () => {
    if (!employee || statusLoading) return;
    
    const confirmMsg = employee.status === "Active" 
      ? "Disabling this employee will suspend their active user account, revoking system login immediately. Proceed?"
      : "Enabling this employee will reactivate their system login account. Proceed?";
      
    if (!window.confirm(confirmMsg)) return;

    setStatusLoading(true);
    try {
      const newStatus = employee.status === "Active" ? "Inactive" : "Active";
      const res = await fetch(`/api/v1/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to toggle employee status");
      }
      setEmployee(json.data);
    } catch (err: any) {
      alert(err.message || "Error updating account status");
    } finally {
      setStatusLoading(false);
    }
  };

  // Submit Edit form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    
    if (!editFields.firstName.trim() || !editFields.lastName.trim() || !editFields.position.trim()) {
      setEditError("Please fill out all required fields");
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`/api/v1/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFields),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to update employee details");
      }
      setEmployee(json.data);
      setIsEditOpen(false);
    } catch (err: any) {
      setEditError(err.message || "Error updating profile");
    } finally {
      setEditLoading(false);
    }
  };

  // Submit Reset Password form
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");
    
    if (!newPassword || newPassword.length < 6) {
      setResetError("Password must be at least 6 characters long");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(`/api/v1/employees/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to reset password");
      }
      setResetSuccess("Temporary password updated successfully!");
      setNewPassword("");
    } catch (err: any) {
      setResetError(err.message || "Error resetting password");
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", gap: "var(--sp-4)" }}>
        <div style={{ width: "32px", height: "32px", border: "3px solid var(--clr-border)", borderTop: "3px solid var(--clr-accent-primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ color: "var(--clr-text-muted)" }}>Loading profile details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <main style={{ flex: 1, padding: "var(--sp-8)" }}>
        <div className="c-card" style={{ borderColor: "var(--clr-error)", textAlign: "center", padding: "var(--sp-8)" }}>
          <p style={{ color: "var(--clr-error)", fontWeight: "var(--fw-medium)", marginBottom: "var(--sp-4)" }}>{error}</p>
          <Link href="/dashboard/employees" className="c-btn c-btn--secondary">Back to Directory</Link>
        </div>
      </main>
    );
  }

  if (!employee) return null;

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {/* Back breadcrumb navigation */}
      <div>
        <Link 
          href="/dashboard/employees" 
          style={{ display: "inline-flex", alignItems: "center", gap: "var(--sp-2)", color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}
          className="hover-bright"
        >
          <ArrowLeft size={16} />
          <span>Back to Directory</span>
        </Link>
      </div>

      {/* Screen Header */}
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
            {employee.firstName} {employee.lastName}
          </h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            {employee.position} &bull; {employee.department}
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--sp-3)" }}>
          <button 
            onClick={handleToggleStatus}
            disabled={statusLoading}
            className={`c-btn ${employee.status === "Active" ? "c-btn--destructive" : "c-btn--secondary"}`}
            style={{ gap: "var(--sp-2)" }}
          >
            {employee.status === "Active" ? <UserX size={16} /> : <UserCheck size={16} />}
            <span>{employee.status === "Active" ? "Disable Employee" : "Enable Employee"}</span>
          </button>

          <button 
            onClick={() => setIsEditOpen(true)}
            className="c-btn c-btn--primary"
            style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
          >
            <Edit size={16} />
            <span>Edit Profile</span>
          </button>
        </div>
      </header>

      {/* Grid split */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--sp-6)" }}>
        {/* Left Column: General profile details */}
        <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
          <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
            Employee Profile
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            <div style={{ display: "flex", gap: "var(--sp-4)" }}>
              <div style={{ width: "40px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                <User size={20} />
              </div>
              <div>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>Full Name</div>
                <div style={{ fontSize: "var(--fs-body-lg)", fontWeight: "var(--fw-bold)", marginTop: "2px" }}>
                  {employee.firstName} {employee.lastName}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--sp-4)" }}>
              <div style={{ width: "40px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                <Building2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>Department</div>
                <div style={{ fontSize: "var(--fs-body-lg)", fontWeight: "var(--fw-bold)", marginTop: "2px" }}>
                  {employee.department}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--sp-4)" }}>
              <div style={{ width: "40px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                <Briefcase size={20} />
              </div>
              <div>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>Position Title</div>
                <div style={{ fontSize: "var(--fs-body-lg)", fontWeight: "var(--fw-bold)", marginTop: "2px" }}>
                  {employee.position}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--sp-4)" }}>
              <div style={{ width: "40px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                <Smartphone size={20} />
              </div>
              <div>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>Phone Number</div>
                <div style={{ fontSize: "var(--fs-body-lg)", fontWeight: "var(--fw-bold)", marginTop: "2px" }}>
                  {employee.phone || "No phone provided"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--sp-4)" }}>
              <div style={{ width: "40px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>Date Registered</div>
                <div style={{ fontSize: "var(--fs-body-lg)", fontWeight: "var(--fw-bold)", marginTop: "2px" }}>
                  {new Date(employee.createdAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: User Account & Security */}
        <section className="c-card" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
          <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-accent-primary)", borderBottom: "1px solid var(--clr-border)", paddingBottom: "var(--sp-2)" }}>
            Credentials & Authorization
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", flex: 1 }}>
            <div style={{ display: "flex", gap: "var(--sp-4)" }}>
              <div style={{ width: "40px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                <Mail size={20} />
              </div>
              <div>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>Email Address</div>
                <div style={{ fontSize: "var(--fs-body-lg)", fontWeight: "var(--fw-bold)", marginTop: "2px" }}>
                  {employee.user?.email || "No user linked"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--sp-4)" }}>
              <div style={{ width: "40px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                <Shield size={20} />
              </div>
              <div>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>CRM Access Role</div>
                <div style={{ fontSize: "var(--fs-body-lg)", fontWeight: "var(--fw-bold)", marginTop: "2px" }}>
                  {employee.user?.role || "N/A"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--sp-4)" }}>
              <div style={{ width: "40px", display: "flex", justifyContent: "center", color: "var(--clr-text-muted)" }}>
                <Tag size={20} />
              </div>
              <div>
                <div style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-medium)" }}>Employment Status</div>
                <div style={{ marginTop: "4px" }}>
                  <span className={`c-badge ${employee.status === "Active" ? "c-badge--success" : "c-badge--error"}`}>
                    {employee.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Security Reset Action */}
            <div 
              style={{ 
                marginTop: "auto", 
                padding: "var(--sp-4)", 
                backgroundColor: "rgba(4, 13, 33, 0.4)", 
                border: "1px solid var(--clr-border)", 
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--sp-3)" 
              }}
            >
              <div style={{ display: "flex", gap: "var(--sp-2)", color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                <Lock size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>Need to reset temporary or forgotten passwords for this user?</span>
              </div>
              <button 
                onClick={() => { setIsResetOpen(true); setResetSuccess(""); setResetError(""); }}
                className="c-btn c-btn--secondary"
                style={{ alignSelf: "flex-start", gap: "var(--sp-2)" }}
              >
                <Key size={14} />
                <span>Reset User Password</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
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
          onClick={() => setIsEditOpen(false)}
        >
          <div 
            className="c-card c-card--glow"
            style={{ 
              width: "100%", 
              maxWidth: "500px", 
              position: "relative",
              animation: "slideIn 0.2s ease-out" 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsEditOpen(false)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "var(--clr-text-muted)", cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: "var(--sp-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <Edit size={20} style={{ color: "var(--clr-accent-primary)" }} />
                <span>Edit Employee Profile</span>
              </h2>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                Modify database fields and roles for this account
              </p>
            </div>

            {editError && (
              <div 
                style={{ 
                  backgroundColor: "rgba(229, 62, 62, 0.12)", 
                  border: "1px solid var(--clr-error)", 
                  color: "var(--clr-error)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--sp-3) var(--sp-4)",
                  marginBottom: "var(--sp-4)",
                  fontSize: "var(--fs-body-sm)"
                }}
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                <div className="c-input">
                  <label className="c-input__label">First Name *</label>
                  <input 
                    type="text" 
                    required
                    value={editFields.firstName}
                    onChange={(e) => setEditFields(f => ({ ...f, firstName: e.target.value }))}
                    className="c-input__field" 
                  />
                </div>
                <div className="c-input">
                  <label className="c-input__label">Last Name *</label>
                  <input 
                    type="text" 
                    required
                    value={editFields.lastName}
                    onChange={(e) => setEditFields(f => ({ ...f, lastName: e.target.value }))}
                    className="c-input__field" 
                  />
                </div>
              </div>

              <div className="c-input">
                <label className="c-input__label">Phone Number</label>
                <input 
                  type="tel" 
                  value={editFields.phone}
                  onChange={(e) => setEditFields(f => ({ ...f, phone: e.target.value }))}
                  className="c-input__field" 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                <div className="c-input">
                  <label className="c-input__label">Department *</label>
                  <select
                    value={editFields.department}
                    onChange={(e) => setEditFields(f => ({ ...f, department: e.target.value }))}
                    className="c-input__field" 
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="c-input">
                  <label className="c-input__label">Position Title *</label>
                  <input 
                    type="text" 
                    required
                    value={editFields.position}
                    onChange={(e) => setEditFields(f => ({ ...f, position: e.target.value }))}
                    className="c-input__field" 
                  />
                </div>
              </div>

              <div className="c-input">
                <label className="c-input__label">Employment Status *</label>
                <select
                  value={editFields.status}
                  onChange={(e) => setEditFields(f => ({ ...f, status: e.target.value as "Active" | "Inactive" }))}
                  className="c-input__field" 
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", marginTop: "var(--sp-4)" }}>
                <button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)}
                  className="c-btn c-btn--secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={editLoading}
                  className="c-btn c-btn--primary"
                  style={{ minWidth: "100px", gap: "var(--sp-2)" }}
                >
                  {editLoading ? <div className="btn-spinner" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetOpen && (
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
          onClick={() => setIsResetOpen(false)}
        >
          <div 
            className="c-card c-card--glow"
            style={{ 
              width: "100%", 
              maxWidth: "440px", 
              position: "relative",
              animation: "slideIn 0.2s ease-out" 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsResetOpen(false)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "var(--clr-text-muted)", cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: "var(--sp-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <Key size={20} style={{ color: "var(--clr-accent-primary)" }} />
                <span>Reset User Password</span>
              </h2>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                Assign a new authentication credential for this employee account
              </p>
            </div>

            {resetSuccess ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", alignItems: "center", textAlign: "center", padding: "var(--sp-4) 0" }}>
                <CheckCircle2 size={48} style={{ color: "var(--clr-success)" }} />
                <div>
                  <h3 style={{ color: "var(--clr-success)", marginBottom: "var(--sp-1)" }}>Success</h3>
                  <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>{resetSuccess}</p>
                </div>
                <button onClick={() => setIsResetOpen(false)} className="c-btn c-btn--primary" style={{ width: "100%" }}>
                  Close Modal
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
                {resetError && (
                  <div 
                    style={{ 
                      backgroundColor: "rgba(229, 62, 62, 0.12)", 
                      border: "1px solid var(--clr-error)", 
                      color: "var(--clr-error)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--sp-3) var(--sp-4)",
                      fontSize: "var(--fs-body-sm)"
                    }}
                  >
                    {resetError}
                  </div>
                )}

                <div className="c-input">
                  <label className="c-input__label">New Password *</label>
                  <input 
                    type="password" 
                    required
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="c-input__field" 
                  />
                </div>

                <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", marginTop: "var(--sp-4)" }}>
                  <button 
                    type="button" 
                    onClick={() => setIsResetOpen(false)}
                    className="c-btn c-btn--secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={resetLoading}
                    className="c-btn c-btn--primary"
                    style={{ minWidth: "120px", gap: "var(--sp-2)" }}
                  >
                    {resetLoading ? <div className="btn-spinner" /> : null}
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Global CSS for spinner and transitions */}
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
      `}</style>
    </main>
  );
}
