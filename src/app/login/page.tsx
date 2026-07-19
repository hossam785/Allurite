"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email) {
      newErrors.email = t("auth.email_label");
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = t("auth.invalid_credentials");
    }
    if (!password) {
      newErrors.password = t("auth.password_label");
    } else if (password.length < 6) {
      newErrors.password = t("auth.invalid_credentials");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrors({
          form: json.error?.message || t("auth.invalid_credentials"),
        });
      } else {
        router.push(redirect);
        router.refresh();
      }
    } catch (err) {
      setErrors({ form: t("auth.invalid_credentials") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="c-card c-card--glow" style={{ width: "100%", maxWidth: "420px", boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4), var(--shadow-glow-accent)" }}>
      <div style={{ textAlign: "center", marginBottom: "var(--sp-6)" }}>
        {/* Brand Logo Symbol */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "64px",
            height: "64px",
            borderRadius: "var(--radius-lg)",
            border: "2px solid var(--clr-accent-primary)",
            boxShadow: "var(--shadow-glow-accent)",
            marginBottom: "var(--sp-4)",
            background: "rgba(0, 210, 255, 0.04)",
          }}
        >
          {/* Cyan Triangle Maze logo mark */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--clr-accent-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3.5L3.5 19.5h17L12 3.5z" opacity="0.25" />
            <path d="M12 6L18 17H6L12 6L15.5 14H9L12 9L13.5 12h-2" />
          </svg>
        </div>
        <h1 style={{ fontSize: "var(--fs-h2)", color: "var(--clr-text-primary)", marginBottom: "var(--sp-1)", fontWeight: "var(--fw-bold)", fontFamily: "Outfit", letterSpacing: "0.5px" }}>
          Allurite
        </h1>
        <p style={{ color: "var(--clr-text-muted)", fontSize: "var(--fs-body-sm)", fontFamily: "Outfit" }}>
          {t("auth.title")}
        </p>
      </div>

      {errors.form && (
        <div
          style={{
            backgroundColor: "rgba(229, 62, 62, 0.15)",
            border: "1px solid var(--clr-error)",
            borderRadius: "var(--radius-md)",
            color: "var(--clr-error)",
            padding: "var(--sp-3) var(--sp-4)",
            fontSize: "var(--fs-body-sm)",
            marginBottom: "var(--sp-4)",
            fontWeight: "var(--fw-medium)",
          }}
        >
          {errors.form}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", marginBottom: "var(--sp-6)" }}>
        <div className="c-input">
          <label htmlFor="login-email-input" className="c-input__label">{t("auth.email_label")}</label>
          <input
            id="login-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={`c-input__field ${errors.email ? "c-input__field--error" : ""}`}
            placeholder="name@allurite.com"
          />
          {errors.email && <span className="c-input__error-msg">{errors.email}</span>}
        </div>

        <div className="c-input">
          <label htmlFor="login-password-input" className="c-input__label">{t("auth.password_label")}</label>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              id="login-password-input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className={`c-input__field ${errors.password ? "c-input__field--error" : ""}`}
              style={{ width: "100%", paddingInlineEnd: "40px" }}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              className="c-btn-touch-target"
              style={{
                position: "absolute",
                insetInlineEnd: "4px",
                background: "none",
                border: "none",
                color: "var(--clr-text-muted)",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center"
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <span className="c-input__error-msg">{errors.password}</span>}
        </div>
      </div>

      <button type="submit" disabled={loading} className="c-btn c-btn--primary c-btn-touch-target" style={{ width: "100%", minHeight: "44px" }}>
        {loading ? t("auth.loading_session") : t("auth.login_btn")}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <main
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "var(--sp-4)",
            background: "radial-gradient(circle at center, rgba(0, 210, 255, 0.08) 0%, var(--clr-bg-primary) 80%)",
          }}
        >
          <Suspense fallback={<div style={{ color: "var(--clr-text-muted)" }}>Loading components...</div>}>
            <LoginFormContent />
          </Suspense>
        </main>
      </ThemeProvider>
    </LanguageProvider>
  );
}
