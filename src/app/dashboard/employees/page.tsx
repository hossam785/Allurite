"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../layout";
import { 
  Search, 
  Filter, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X,
  UserPlus,
  Building2,
  Phone,
  Briefcase,
  Mail,
  Lock,
  UserCheck,
  UserX
} from "lucide-react";

interface EmployeeItem {
  _id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  department: string;
  position: string;
  status: "Active" | "Inactive";
  createdAt: string;
  user: {
    _id: string;
    email: string;
    role: string;
    status: string;
  };
}

export default function EmployeesPage() {
  const { user: currentUser } = useAuth();
  
  // State for data
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Pagination & Filters state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Onboarding Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formFields, setFormFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    department: "Sales",
    position: "",
  });
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // Departments List
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

  // Debounce search term by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search: debouncedSearch,
        department: selectedDept,
        status: selectedStatus,
      });

      const res = await fetch(`/api/v1/employees?${params.toString()}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to fetch employees");
      }
      
      setEmployees(json.data);
      setTotalPages(json.pagination.pages || 1);
      setTotalRecords(json.pagination.total || 0);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, debouncedSearch, selectedDept, selectedStatus]);

  // Handle Onboard submit
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    
    // Client-side validations
    if (!formFields.firstName.trim() || !formFields.lastName.trim() || !formFields.email.trim() || !formFields.password || !formFields.position.trim()) {
      setModalError("Please fill out all required fields");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(formFields.email)) {
      setModalError("Please enter a valid email address");
      return;
    }

    if (formFields.password.length < 6) {
      setModalError("Password must be at least 6 characters long");
      return;
    }

    setModalLoading(true);
    try {
      const res = await fetch("/api/v1/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formFields),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to onboard employee");
      }

      // Refresh list, close modal, reset fields
      fetchEmployees();
      setIsModalOpen(false);
      setFormFields({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        department: "Sales",
        position: "",
      });
    } catch (err: any) {
      setModalError(err.message || "Error creating account");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {/* Page Header */}
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
          <h1 style={{ fontSize: "var(--fs-h1)", marginBottom: "var(--sp-1)" }}>Employee Directory</h1>
          <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
            Manage staff credentials, department mappings, and security states
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="c-btn c-btn--primary"
          style={{ gap: "var(--sp-2)", boxShadow: "var(--shadow-glow-accent)" }}
        >
          <UserPlus size={16} />
          <span>Onboard Staff</span>
        </button>
      </header>

      {/* Toolbar / Filters */}
      <div 
        style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          gap: "var(--sp-4)", 
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--sp-4)",
          backgroundColor: "var(--clr-bg-surface)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--clr-border)",
        }}
      >
        <div style={{ display: "flex", flex: 1, minWidth: "260px", gap: "var(--sp-3)" }}>
          {/* Search Field */}
          <div style={{ position: "relative", flex: 1 }}>
            <Search 
              size={18} 
              style={{ 
                position: "absolute", 
                left: "12px", 
                top: "50%", 
                transform: "translateY(-50%)", 
                color: "var(--clr-text-muted)" 
              }} 
            />
            <input 
              type="text" 
              placeholder="Search by name, email, department..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="c-input__field"
              style={{ paddingLeft: "40px", width: "100%", height: "42px" }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                style={{ 
                  position: "absolute", 
                  right: "12px", 
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

        {/* Filter Selection Dropdowns */}
        <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
          {/* Department Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Dept:</span>
            <select
              value={selectedDept}
              onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "130px", background: "var(--clr-bg-primary)" }}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--clr-text-muted)" }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="c-input__field"
              style={{ height: "42px", padding: "0 var(--sp-3)", minWidth: "120px", background: "var(--clr-bg-primary)" }}
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Content */}
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
          <button onClick={fetchEmployees} className="c-btn c-btn--secondary">Retry Loading</button>
        </div>
      ) : employees.length === 0 ? (
        <div className="c-card" style={{ textAlign: "center", padding: "var(--sp-12)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-4)" }}>
          <UserX size={48} style={{ color: "var(--clr-text-muted)" }} />
          <div>
            <h3 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--sp-1)" }}>No staff members found</h3>
            <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
              No matches found matching "{searchTerm}" or selected filters.
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
          {/* Staff Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--clr-border)", backgroundColor: "rgba(4, 13, 33, 0.4)" }}>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Name</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Department</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Position</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Joined Date</th>
                  <th style={{ textAlign: "center", padding: "var(--sp-4)", color: "var(--clr-text-muted)", fontWeight: "var(--fw-bold)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr 
                    key={emp._id} 
                    style={{ 
                      borderBottom: "1px solid var(--clr-border)",
                      transition: "var(--transition-fast)" 
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: "var(--sp-4)", fontWeight: "var(--fw-medium)" }}>
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)" }}>
                      {emp.user?.email || "No email linked"}
                    </td>
                    <td style={{ padding: "var(--sp-4)" }}>
                      <span className="c-badge c-badge--info" style={{ textTransform: "none" }}>{emp.department}</span>
                    </td>
                    <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)" }}>
                      {emp.position}
                    </td>
                    <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                      <span className={`c-badge ${emp.status === "Active" ? "c-badge--success" : "c-badge--error"}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ padding: "var(--sp-4)", color: "var(--clr-text-muted)" }}>
                      {new Date(emp.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td style={{ padding: "var(--sp-4)", textAlign: "center" }}>
                      <Link 
                        href={`/dashboard/employees/${emp._id}`}
                        className="c-btn c-btn--secondary"
                        style={{ padding: "var(--sp-2) var(--sp-3)", display: "inline-flex", gap: "var(--sp-2)" }}
                      >
                        <Eye size={14} />
                        <span style={{ fontSize: "var(--fs-caption)" }}>Details</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table hover rules */}
          <style jsx global>{`
            .table-row-hover:hover {
              background-color: rgba(0, 210, 255, 0.04) !important;
            }
          `}</style>

          {/* Pagination Toolbar */}
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
              Showing {employees.length} of {totalRecords} employees
            </span>
            
            <div style={{ display: "flex", gap: "var(--sp-2)" }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="c-btn c-btn--secondary"
                style={{ padding: "var(--sp-2) var(--sp-3)" }}
              >
                <ChevronLeft size={16} />
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
                Page {page} of {totalPages}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="c-btn c-btn--secondary"
                style={{ padding: "var(--sp-2) var(--sp-3)" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Employee Modal */}
      {isModalOpen && (
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
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="c-card c-card--glow"
            style={{ 
              width: "100%", 
              maxWidth: "520px", 
              maxHeight: "90vh", 
              overflowY: "auto",
              position: "relative",
              animation: "slideIn 0.25s ease-out" 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                color: "var(--clr-text-muted)",
                cursor: "pointer"
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Title */}
            <div style={{ marginBottom: "var(--sp-6)" }}>
              <h2 style={{ fontSize: "var(--fs-h3)", color: "var(--clr-text-primary)", display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
                <UserPlus size={20} style={{ color: "var(--clr-accent-primary)" }} />
                <span>Onboard New Employee</span>
              </h2>
              <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)" }}>
                Create their core system profile and authorization credentials
              </p>
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
                  fontSize: "var(--fs-body-sm)"
                }}
              >
                {modalError}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleOnboardSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                <div className="c-input">
                  <label className="c-input__label">First Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formFields.firstName}
                    onChange={(e) => setFormFields(f => ({ ...f, firstName: e.target.value }))}
                    className="c-input__field" 
                  />
                </div>
                <div className="c-input">
                  <label className="c-input__label">Last Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formFields.lastName}
                    onChange={(e) => setFormFields(f => ({ ...f, lastName: e.target.value }))}
                    className="c-input__field" 
                  />
                </div>
              </div>

              <div className="c-input">
                <label className="c-input__label">Email Address *</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@allurite.com"
                  value={formFields.email}
                  onChange={(e) => setFormFields(f => ({ ...f, email: e.target.value }))}
                  className="c-input__field" 
                />
              </div>

              <div className="c-input">
                <label className="c-input__label">Temporary Password *</label>
                <input 
                  type="password" 
                  required
                  placeholder="Min 6 characters"
                  value={formFields.password}
                  onChange={(e) => setFormFields(f => ({ ...f, password: e.target.value }))}
                  className="c-input__field" 
                />
              </div>

              <div className="c-input">
                <label className="c-input__label">Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+1 (555) 000-0000"
                  value={formFields.phone}
                  onChange={(e) => setFormFields(f => ({ ...f, phone: e.target.value }))}
                  className="c-input__field" 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
                <div className="c-input">
                  <label className="c-input__label">Department *</label>
                  <select
                    value={formFields.department}
                    onChange={(e) => setFormFields(f => ({ ...f, department: e.target.value }))}
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
                    placeholder="e.g. Sales Agent"
                    value={formFields.position}
                    onChange={(e) => setFormFields(f => ({ ...f, position: e.target.value }))}
                    className="c-input__field" 
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "flex-end", marginTop: "var(--sp-4)" }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="c-btn c-btn--secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={modalLoading}
                  className="c-btn c-btn--primary"
                  style={{ minWidth: "120px", gap: "var(--sp-2)" }}
                >
                  {modalLoading ? (
                    <>
                      <div className="btn-spinner" />
                      <span>Onboarding...</span>
                    </>
                  ) : (
                    <span>Onboard Staff</span>
                  )}
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
