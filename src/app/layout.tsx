import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helpdesk & Shape Up",
  description: "Hệ thống Quản lý Ticket & Thư viện tri thức Shape Up",
};

import ThemeProvider from "@/components/providers/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
