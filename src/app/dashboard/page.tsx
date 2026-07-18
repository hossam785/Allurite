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
              Active Session Authorized
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "var(--sp-3)" }}>
              <span style={{ color: "var(--clr-text-muted)" }}>Email Account:</span>
              <span>{user.email}</span>

              <span style={{ color: "var(--clr-text-muted)" }}>System Role:</span>
              <span>{user.role}</span>

              <span style={{ color: "var(--clr-text-muted)" }}>Session Status:</span>
              <span>
                <span className="c-badge c-badge--success">{user.status}</span>
              </span>

              <span style={{ color: "var(--clr-text-muted)" }}>Account Created:</span>
              <span>{new Date(user.createdAt).toLocaleString()}</span>
            </div>
          </section>

          <section className="c-card" style={{ maxWidth: "600px" }}>
            <h3 style={{ marginBottom: "var(--sp-2)" }}>Allurite CRM System Active</h3>
            <p style={{ color: "var(--clr-text-muted)" }}>
              All authorization boundaries, middleware route protection, and database connection systems are operating correctly. Use the logout button in the sidebar to terminate this session.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
