"use client";

import React from "react";

export type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = true,
  className = "",
  style = {},
}: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.3)",
          color: "#10B981",
          dotBg: "#10B981",
        };
      case "warning":
        return {
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.3)",
          color: "#F59E0B",
          dotBg: "#F59E0B",
        };
      case "error":
        return {
          bg: "rgba(239, 68, 68, 0.12)",
          border: "rgba(239, 68, 68, 0.3)",
          color: "#EF4444",
          dotBg: "#EF4444",
        };
      case "info":
        return {
          bg: "rgba(0, 210, 255, 0.12)",
          border: "rgba(0, 210, 255, 0.3)",
          color: "#00D2FF",
          dotBg: "#00D2FF",
        };
      case "purple":
        return {
          bg: "rgba(168, 85, 247, 0.12)",
          border: "rgba(168, 85, 247, 0.3)",
          color: "#A855F7",
          dotBg: "#A855F7",
        };
      default:
        return {
          bg: "rgba(148, 163, 184, 0.12)",
          border: "rgba(148, 163, 184, 0.3)",
          color: "#94A3B8",
          dotBg: "#94A3B8",
        };
    }
  };

  const v = getVariantStyles();
  const isSm = size === "sm";

  return (
    <span
      className={`c-badge-unified ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSm ? "4px" : "6px",
        padding: isSm ? "2px 8px" : "4px 10px",
        borderRadius: "9999px",
        fontSize: isSm ? "11px" : "12px",
        fontWeight: 600,
        backgroundColor: v.bg,
        border: `1px solid ${v.border}`,
        color: v.color,
        whiteSpace: "nowrap",
        lineHeight: 1.2,
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: isSm ? "5px" : "6px",
            height: isSm ? "5px" : "6px",
            borderRadius: "50%",
            backgroundColor: v.dotBg,
            boxShadow: `0 0 6px ${v.dotBg}`,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}

// Preset Helper for Status mapping
export function StatusBadge({ status }: { status: string }) {
  const mapStatus = (s: string): { label: string; variant: BadgeVariant } => {
    switch (s) {
      case "Lead":
        return { label: "عميل محتمل (Lead)", variant: "info" };
      case "Qualified":
        return { label: "مؤهل (Qualified)", variant: "purple" };
      case "ActiveCustomer":
        return { label: "عميل نشط (Active)", variant: "success" };
      case "Churned":
        return { label: "منسحب (Churned)", variant: "error" };
      case "Pending":
      case "قيد الانتظار":
        return { label: "قيد الانتظار", variant: "warning" };
      case "In Progress":
      case "قيد التنفيذ":
        return { label: "قيد التنفيذ", variant: "info" };
      case "Completed":
      case "مكتملة":
        return { label: "مكتملة", variant: "success" };
      case "Cancelled":
      case "ملغاة":
        return { label: "ملغاة", variant: "error" };
      case "Critical":
      case "حرج":
        return { label: "حرج جداً", variant: "error" };
      case "High":
      case "عالية":
        return { label: "عالية", variant: "warning" };
      case "Normal":
      case "عادية":
        return { label: "عادية", variant: "info" };
      case "Low":
      case "منخفضة":
        return { label: "منخفضة", variant: "neutral" };
      default:
        return { label: s, variant: "neutral" };
    }
  };

  const config = mapStatus(status);
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
