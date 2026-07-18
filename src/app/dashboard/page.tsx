"use client";

import React from "react";
import { useAuth } from "./layout";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <main style={{ flex: 1, padding: "var(--sp-8)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {/* جاهز لاستقبال التصميم والبيانات الجديدة */}
    </main>
  );
}
