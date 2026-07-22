"use client";

import React, { useState } from "react";
import { MessageSquare, Phone, Mail, Calendar, CheckCircle2, User, Send, Clock, Sparkles } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/context/ToastContext";

export interface ActivityItem {
  id: string;
  type: "Note" | "Call" | "Email" | "Meeting" | "StatusChange" | "System";
  authorName: string;
  content: string;
  timestamp: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  onAddNote?: (noteText: string, type: ActivityItem["type"]) => void;
}

export default function ActivityFeed({ activities, onAddNote }: ActivityFeedProps) {
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<ActivityItem["type"]>("Note");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmitting(true);
    try {
      if (onAddNote) {
        await onAddNote(newNote, noteType);
      }
      setNewNote("");
      toast.success("تم تسجيل الملاحظة في سجل النشاطات");
    } catch (err) {
      toast.error("فشل تسجيل الملاحظة");
    } finally {
      setSubmitting(false);
    }
  };

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "Call":
        return <Phone size={14} style={{ color: "var(--clr-accent-primary)" }} />;
      case "Email":
        return <Mail size={14} style={{ color: "#A855F7" }} />;
      case "Meeting":
        return <Calendar size={14} style={{ color: "#F59E0B" }} />;
      case "StatusChange":
        return <CheckCircle2 size={14} style={{ color: "#10B981" }} />;
      default:
        return <MessageSquare size={14} style={{ color: "#00D2FF" }} />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* Note Composer Form */}
      {onAddNote && (
        <form
          onSubmit={handleNoteSubmit}
          style={{
            backgroundColor: "var(--clr-bg-surface, #131A26)",
            borderRadius: "12px",
            border: "1px solid var(--clr-border, #1E293B)",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--clr-text-muted)" }}>
              إضافة نشاط / ملاحظة تواصل
            </span>

            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as any)}
              style={{
                backgroundColor: "var(--clr-bg-card, #0F172A)",
                border: "1px solid var(--clr-border)",
                color: "var(--clr-text-primary)",
                borderRadius: "6px",
                padding: "2px 8px",
                fontSize: "11px",
              }}
            >
              <option value="Note">ملاحظة عامة</option>
              <option value="Call">مكالمة هاتفية</option>
              <option value="Email">بريد إلكتروني</option>
              <option value="Meeting">اجتماع / معاينة</option>
            </select>
          </div>

          <textarea
            rows={2}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="اكتب الملاحظة أو تفاصيل التواصل السريع مع العميل..."
            style={{
              width: "100%",
              backgroundColor: "var(--clr-bg-card, #0F172A)",
              border: "1px solid var(--clr-border, #1E293B)",
              borderRadius: "8px",
              padding: "10px",
              color: "var(--clr-text-primary)",
              fontSize: "13px",
              outline: "none",
              resize: "none",
              fontFamily: "inherit",
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={submitting || !newNote.trim()}
              className="c-btn c-btn--primary"
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: !newNote.trim() ? 0.5 : 1,
              }}
            >
              <Send size={13} />
              <span>{submitting ? "جاري الحفظ..." : "تسجيل النشاط"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Timeline List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative" }}>
        {activities.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 16px",
              color: "var(--clr-text-muted)",
              fontSize: "13px",
            }}
          >
            <Clock size={24} style={{ opacity: 0.3, marginBottom: "8px" }} />
            <div>لا يوجد سجل نشاطات مسجل حالياً</div>
          </div>
        ) : (
          activities.map((item, idx) => (
            <div
              key={item.id || idx}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                position: "relative",
              }}
            >
              {/* Icon Bubble */}
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: "var(--clr-bg-surface, #131A26)",
                  border: "1px solid var(--clr-border, #1E293B)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                {getActivityIcon(item.type)}
              </div>

              {/* Card Content */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: "var(--clr-bg-surface, #131A26)",
                  borderRadius: "10px",
                  border: "1px solid var(--clr-border, #1E293B)",
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--clr-text-primary)" }}>
                      {item.authorName}
                    </span>
                    <Badge variant="neutral" size="sm" dot={false}>
                      {item.type}
                    </Badge>
                  </div>

                  <span style={{ fontSize: "10px", color: "var(--clr-text-muted)" }}>
                    {new Date(item.timestamp).toLocaleString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--clr-text-secondary, #CBD5E1)",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {item.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
