import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Allurite CRM",
  description: "Enterprise CRM and Account Orchestration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <a href="#main-content" className="skip-link">
          انتقال إلى المحتوى الرئيسي
        </a>
        {children}
      </body>
    </html>
  );
}
