"use client";

import React from "react";
import { useAuth } from "./layout";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto" }}>


      {user && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
          <section className="c-card c-card--glow" style={{ maxWidth: "600px" }}>
            <h2 style={{ fontSize: "var(--fs-h3)", marginBottom: "var(--sp-4)", color: "var(--clr-accent-primary)" }}>
              تم تفويض الجلسة النشطة بنجاح
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "var(--sp-3)" }}>
              <span style={{ color: "var(--clr-text-muted)" }}>حساب البريد الإلكتروني:</span>
              <span>{user.email}</span>

              <span style={{ color: "var(--clr-text-muted)" }}>صلاحية الحساب:</span>
              <span>{user.role === "SuperAdmin" ? "سوبر أدمن (SuperAdmin)" : user.role}</span>

              <span style={{ color: "var(--clr-text-muted)" }}>حالة الحساب في النظام:</span>
              <span>
                <span className="c-badge c-badge--success">
                  {user.status === "Active" ? "نشط" : user.status}
                </span>
              </span>

              <span style={{ color: "var(--clr-text-muted)" }}>تاريخ ووقت تسجيل الحساب:</span>
              <span>{new Date(user.createdAt).toLocaleString("ar-EG")}</span>
            </div>
          </section>

          <section className="c-card" style={{ maxWidth: "600px" }}>
            <h3 style={{ marginBottom: "var(--sp-2)" }}>نظام Allurite CRM نشط وبحالة ممتازة</h3>
            <p style={{ color: "var(--clr-text-muted)" }}>
              تعمل جميع حمايات النظام وقواعد الجلسات ومسارات التحقق التلقائي والاتصال المباشر بقاعدة البيانات بكفاءة تامة. استخدم زر الخروج في القائمة الجانبية لإنهاء هذه الجلسة الآمنة.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
