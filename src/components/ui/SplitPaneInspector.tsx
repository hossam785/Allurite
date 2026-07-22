"use client";

import React, { useEffect, useState } from "react";
import { X, ExternalLink, Clock, Calendar, User, Mail, Phone, Building, CheckCircle2, MessageSquare, Tag, Shield } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Badge, { StatusBadge } from "@/components/ui/Badge";

interface SplitPaneInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  status?: string;
  typeBadge?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  headerIcon?: React.ReactNode;
}

export default function SplitPaneInspector({
  isOpen,
  onClose,
  title,
  subtitle,
  status,
  typeBadge,
  children,
  actions,
  headerIcon,
}: SplitPaneInspectorProps) {
  const { isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");

  // Close on Escape key
  useKeyboardShortcuts([
    {
      key: "Escape",
      handler: () => {
        if (isOpen) onClose();
      },
    },
  ]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`تفاصيل المعاينة - ${title}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 9980,
        display: "flex",
        justifyContent: isRtl ? "flex-start" : "flex-end",
        animation: "drawerFadeIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          height: "100vh",
          backgroundColor: "var(--clr-bg-card, #0F172A)",
          borderInlineStart: "1px solid var(--clr-border, #1E293B)",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          animation: "drawerSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
        }}
      >
        {/* Drawer Header Bar */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--clr-border, #1E293B)",
            backgroundColor: "var(--clr-bg-surface, #131A26)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {headerIcon || <Tag size={18} style={{ color: "var(--clr-accent-primary)" }} />}
              {typeBadge && <Badge variant="purple" size="sm">{typeBadge}</Badge>}
              {status && <StatusBadge status={status} />}
            </div>

            <button
              onClick={onClose}
              aria-label="إغلاق الدرج"
              style={{
                background: "none",
                border: "none",
                color: "var(--clr-text-muted)",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              className="drawer-close-btn"
            >
              <X size={18} />
            </button>
          </div>

          <div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "var(--clr-text-primary)",
                lineHeight: 1.3,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--clr-text-muted)",
                  marginTop: "4px",
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          {/* Actions Bar */}
          {actions && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              {actions}
            </div>
          )}

          {/* Inspector Tabs Header */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--clr-border)",
              marginTop: "8px",
              gap: "16px",
            }}
          >
            <button
              onClick={() => setActiveTab("details")}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === "details" ? "2px solid var(--clr-accent-primary)" : "2px solid transparent",
                color: activeTab === "details" ? "var(--clr-accent-primary)" : "var(--clr-text-muted)",
                padding: "6px 0",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              التفاصيل والمواصفات
            </button>

            <button
              onClick={() => setActiveTab("activity")}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === "activity" ? "2px solid var(--clr-accent-primary)" : "2px solid transparent",
                color: activeTab === "activity" ? "var(--clr-accent-primary)" : "var(--clr-text-muted)",
                padding: "6px 0",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <MessageSquare size={14} />
              <span>سجل التفاعل والنشاط</span>
            </button>
          </div>
        </div>

        {/* Drawer Body Scroll Container */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes drawerFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes drawerSlideIn {
          from {
            transform: translateX(${isRtl ? "-100%" : "100%"});
          }
          to {
            transform: translateX(0);
          }
        }
        .drawer-close-btn:hover {
          color: var(--clr-text-primary) !important;
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
    </div>
  );
}
