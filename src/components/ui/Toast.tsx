"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const { isRtl } = useLanguage();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        bottom: "24px",
        left: isRtl ? "24px" : "auto",
        right: isRtl ? "auto" : "24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "400px",
        width: "calc(100vw - 48px)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onDismiss]);

  const getStyle = () => {
    switch (toast.type) {
      case "success":
        return {
          bg: "rgba(16, 185, 129, 0.12)",
          border: "var(--clr-success)",
          color: "var(--clr-success)",
          icon: <CheckCircle2 size={18} />,
        };
      case "error":
        return {
          bg: "rgba(239, 68, 68, 0.12)",
          border: "var(--clr-error)",
          color: "var(--clr-error)",
          icon: <AlertCircle size={18} />,
        };
      case "warning":
        return {
          bg: "rgba(245, 158, 11, 0.12)",
          border: "var(--clr-warning)",
          color: "var(--clr-warning)",
          icon: <AlertTriangle size={18} />,
        };
      default:
        return {
          bg: "rgba(0, 210, 255, 0.12)",
          border: "var(--clr-accent-primary)",
          color: "var(--clr-accent-primary)",
          icon: <Info size={18} />,
        };
    }
  };

  const styleConfig = getStyle();

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      style={{
        pointerEvents: "auto",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 16px",
        borderRadius: "var(--radius-lg, 12px)",
        backgroundColor: "var(--clr-bg-card, #131A26)",
        borderInlineStart: `4px solid ${styleConfig.border}`,
        borderTop: "1px solid var(--clr-border, #1E293B)",
        borderRight: "1px solid var(--clr-border, #1E293B)",
        borderBottom: "1px solid var(--clr-border, #1E293B)",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
        animation: "toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ color: styleConfig.color, marginTop: "2px", flexShrink: 0 }}>
        {styleConfig.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div
            style={{
              fontWeight: 600,
              fontSize: "14px",
              color: "var(--clr-text-primary, #F8FAFC)",
              marginBottom: "2px",
            }}
          >
            {toast.title}
          </div>
        )}
        <div
          style={{
            fontSize: "13px",
            color: "var(--clr-text-muted, #94A3B8)",
            lineHeight: 1.4,
          }}
        >
          {toast.message}
        </div>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="إغلاق التنبيه"
        style={{
          background: "none",
          border: "none",
          color: "var(--clr-text-muted, #94A3B8)",
          cursor: "pointer",
          padding: "4px",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
          marginTop: "-2px",
          marginInlineEnd: "-4px",
        }}
        className="toast-close-btn"
      >
        <X size={15} />
      </button>

      <style jsx global>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .toast-close-btn:hover {
          color: var(--clr-text-primary, #F8FAFC) !important;
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
    </div>
  );
}
