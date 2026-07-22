"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  CheckSquare,
  Square,
  ArrowUpDown,
  Search,
  Trash2,
  Download,
  X,
  Layers,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (item: T, index: number) => React.ReactNode;
}

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "danger" | "primary" | "secondary";
  onClick: (selectedIds: string[]) => void;
}

export interface QuickFilter {
  id: string;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}

interface DataGridProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;

  // Selection & Bulk Actions
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  bulkActions?: BulkAction[];

  // Pagination
  page?: number;
  totalPages?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;

  // Search & Filters
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  quickFilters?: QuickFilter[];

  // Extras
  onRowClick?: (item: T) => void;
  headerRight?: React.ReactNode;
}

export default function DataGrid<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = "لا توجد بيانات للعرض",
  enableSelection = false,
  selectedIds = [],
  onSelectionChange,
  bulkActions = [],
  page = 1,
  totalPages = 1,
  totalRecords,
  onPageChange,
  searchPlaceholder = "البحث في الجدول...",
  searchValue,
  onSearchChange,
  quickFilters = [],
  onRowClick,
  headerRight,
}: DataGridProps<T>) {
  const { isRtl } = useLanguage();
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Selection handlers
  const allIds = useMemo(() => data.map(keyExtractor), [data, keyExtractor]);
  const isAllSelected = useMemo(
    () => allIds.length > 0 && allIds.every((id) => selectedIds.includes(id)),
    [allIds, selectedIds]
  );
  const isSomeSelected = useMemo(
    () => selectedIds.length > 0 && !isAllSelected,
    [selectedIds.length, isAllSelected]
  );

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allIds);
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((item) => item !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  // Sort handler
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // Apply local sorting if needed
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [data, sortKey, sortOrder]);

  const py = density === "compact" ? "8px" : "14px";
  const px = "16px";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
      }}
    >
      {/* Top Toolbar & Quick Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          backgroundColor: "var(--clr-bg-card, #0F172A)",
          padding: "12px 16px",
          borderRadius: "var(--radius-lg, 12px)",
          border: "1px solid var(--clr-border, #1E293B)",
        }}
      >
        {/* Left: Quick Filters Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {quickFilters.map((qf) => (
            <button
              key={qf.id}
              onClick={qf.onClick}
              style={{
                background: qf.active
                  ? "var(--clr-accent-primary, #00D2FF)"
                  : "var(--clr-bg-surface, rgba(255, 255, 255, 0.05))",
                color: qf.active ? "#090D16" : "var(--clr-text-muted, #94A3B8)",
                border: qf.active
                  ? "1px solid var(--clr-accent-primary, #00D2FF)"
                  : "1px solid var(--clr-border, #1E293B)",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <span>{qf.label}</span>
              {qf.count !== undefined && (
                <span
                  style={{
                    backgroundColor: qf.active ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.1)",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    fontSize: "10px",
                  }}
                >
                  {qf.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right: Search Input + Density Toggler + Extra Components */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", alignSelf: "auto" }}>
          {onSearchChange && (
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: isRtl ? "auto" : "10px",
                  right: isRtl ? "10px" : "auto",
                  color: "var(--clr-text-muted)",
                }}
              />
              <input
                type="text"
                value={searchValue || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  paddingLeft: isRtl ? "12px" : "32px",
                  paddingRight: isRtl ? "32px" : "12px",
                  paddingTop: "6px",
                  paddingBottom: "6px",
                  backgroundColor: "var(--clr-bg-surface, #131A26)",
                  border: "1px solid var(--clr-border, #1E293B)",
                  borderRadius: "8px",
                  color: "var(--clr-text-primary)",
                  fontSize: "13px",
                  outline: "none",
                  width: "min(240px, 60vw)",
                }}
              />
            </div>
          )}

          {/* Density Toggle Button */}
          <button
            onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
            aria-label="تغيير كثافة الأسطر"
            title={density === "compact" ? "عرض مريح" : "عرض مدمج"}
            style={{
              background: "var(--clr-bg-surface, rgba(255, 255, 255, 0.05))",
              border: "1px solid var(--clr-border)",
              color: "var(--clr-text-muted)",
              padding: "6px 10px",
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            <SlidersHorizontal size={14} />
            <span style={{ display: "none" }} className="grid-density-text">
              {density === "compact" ? "مدمج" : "مريح"}
            </span>
          </button>

          {headerRight}
        </div>
      </div>

      {/* Floating Bulk Multi-Select Action Bar */}
      {enableSelection && selectedIds.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            backgroundColor: "rgba(0, 210, 255, 0.12)",
            border: "1px solid var(--clr-accent-primary)",
            borderRadius: "var(--radius-lg, 12px)",
            color: "var(--clr-accent-primary)",
            animation: "bulkBarSlide 0.2s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: 600 }}>
            <CheckSquare size={18} />
            <span>تم تحديد {selectedIds.length} عنصر</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {bulkActions.map((action) => (
              <button
                key={action.id}
                onClick={() => action.onClick(selectedIds)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor:
                    action.variant === "danger"
                      ? "var(--clr-error, #EF4444)"
                      : action.variant === "primary"
                      ? "var(--clr-accent-primary, #00D2FF)"
                      : "var(--clr-bg-card, #0F172A)",
                  color: action.variant === "primary" ? "#090D16" : "#FFFFFF",
                  border: "none",
                  transition: "all 0.15s ease",
                }}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}

            <button
              onClick={() => onSelectionChange && onSelectionChange([])}
              style={{
                background: "none",
                border: "none",
                color: "var(--clr-text-muted)",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "12px",
              }}
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* Main Table Structure */}
      <div
        style={{
          width: "100%",
          overflowX: "auto",
          backgroundColor: "var(--clr-bg-card, #0F172A)",
          borderRadius: "var(--radius-lg, 12px)",
          border: "1px solid var(--clr-border, #1E293B)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: isRtl ? "right" : "left",
            fontSize: "13px",
          }}
        >
          {/* Sticky Table Header */}
          <thead>
            <tr
              style={{
                backgroundColor: "var(--clr-bg-surface, #131A26)",
                borderBottom: "1px solid var(--clr-border, #1E293B)",
                color: "var(--clr-text-muted, #94A3B8)",
                fontWeight: 600,
                fontSize: "12px",
                textTransform: "uppercase",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              {enableSelection && (
                <th style={{ padding: `${py} ${px}`, width: "40px", textAlign: "center" }}>
                  <button
                    onClick={toggleSelectAll}
                    style={{
                      background: "none",
                      border: "none",
                      color: isAllSelected
                        ? "var(--clr-accent-primary)"
                        : "var(--clr-text-muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isAllSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
              )}

              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  style={{
                    padding: `${py} ${px}`,
                    width: col.width || "auto",
                    textAlign: col.align || (isRtl ? "right" : "left"),
                    cursor: col.sortable ? "pointer" : "default",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      justifyContent:
                        col.align === "center"
                          ? "center"
                          : col.align === "right"
                          ? "flex-end"
                          : "flex-start",
                    }}
                  >
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ArrowUpDown
                        size={13}
                        style={{
                          opacity: sortKey === col.key ? 1 : 0.4,
                          color: sortKey === col.key ? "var(--clr-accent-primary)" : "inherit",
                        }}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={columns.length + (enableSelection ? 1 : 0)}
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    color: "var(--clr-accent-primary)",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    <Sparkles size={20} className="animate-spin" />
                    <span>جاري تحميل البيانات الحية...</span>
                  </div>
                </td>
              </tr>
            )}

            {!loading && sortedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (enableSelection ? 1 : 0)}
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    color: "var(--clr-text-muted)",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 500 }}>{emptyMessage}</div>
                </td>
              </tr>
            )}

            {!loading &&
              sortedData.map((item, idx) => {
                const rowId = keyExtractor(item);
                const isSelected = selectedIds.includes(rowId);

                return (
                  <tr
                    key={rowId}
                    onClick={() => onRowClick && onRowClick(item)}
                    style={{
                      borderBottom: "1px solid var(--clr-border, #1E293B)",
                      backgroundColor: isSelected
                        ? "rgba(0, 210, 255, 0.06)"
                        : idx % 2 === 0
                        ? "transparent"
                        : "var(--clr-bg-surface, rgba(255, 255, 255, 0.015))",
                      cursor: onRowClick ? "pointer" : "default",
                      transition: "background-color 0.15s ease",
                    }}
                    className="datagrid-row-hover"
                  >
                    {enableSelection && (
                      <td
                        onClick={(e) => toggleSelectRow(rowId, e)}
                        style={{
                          padding: `${py} ${px}`,
                          textAlign: "center",
                        }}
                      >
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: isSelected
                              ? "var(--clr-accent-primary)"
                              : "var(--clr-text-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </td>
                    )}

                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: `${py} ${px}`,
                          textAlign: col.align || (isRtl ? "right" : "left"),
                          color: "var(--clr-text-primary, #F8FAFC)",
                        }}
                      >
                        {col.render
                          ? col.render(item, idx)
                          : (item as any)[col.key] != null
                          ? String((item as any)[col.key])
                          : "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && onPageChange && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: "var(--clr-bg-card, #0F172A)",
            borderRadius: "var(--radius-lg, 12px)",
            border: "1px solid var(--clr-border, #1E293B)",
            fontSize: "13px",
            color: "var(--clr-text-muted)",
          }}
        >
          <div>
            {totalRecords !== undefined && (
              <span>
                إجمالي السجلات: <strong style={{ color: "var(--clr-text-primary)" }}>{totalRecords}</strong>
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span>
              صفحة <strong style={{ color: "var(--clr-text-primary)" }}>{page}</strong> من{" "}
              <strong style={{ color: "var(--clr-text-primary)" }}>{totalPages}</strong>
            </span>

            <div style={{ display: "flex", gap: "4px" }}>
              <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--clr-border)",
                  backgroundColor: "var(--clr-bg-surface)",
                  color: page <= 1 ? "var(--clr-text-muted)" : "var(--clr-text-primary)",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                <ChevronRight size={16} style={{ transform: isRtl ? "none" : "rotate(180deg)" }} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--clr-border)",
                  backgroundColor: "var(--clr-bg-surface)",
                  color: page >= totalPages ? "var(--clr-text-muted)" : "var(--clr-text-primary)",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={16} style={{ transform: isRtl ? "none" : "rotate(180deg)" }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .datagrid-row-hover:hover {
          background-color: var(--clr-bg-hover, rgba(0, 210, 255, 0.04)) !important;
        }
        @keyframes bulkBarSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
