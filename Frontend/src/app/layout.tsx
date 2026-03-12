import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PagePeak — Nền tảng toàn diện cho Marketing & Sales",
  description: "Landing Page, Website, Ecommerce, CRM & Automation. Thúc đẩy tăng trưởng khách hàng và doanh thu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
