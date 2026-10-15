import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const nunito = localFont({
  src: [
    { path: "./fonts/Nunito-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Nunito-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-nunito",
  display: "swap",
});

const title = "TVSI Helpdesk | Hỗ trợ & Tri thức";
const description = "TVSI Helpdesk — Nền tảng tiếp nhận ý kiến, quản lý yêu cầu hỗ trợ và thư viện tri thức của Chứng khoán Tân Việt.";
// Set the public origin before building for a custom deployment domain.
const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (deploymentHost ? `https://${deploymentHost}` : "http://localhost:3000");
const socialImage = {
  url: "/brand/tvsi-helpdesk-og-v2.png",
  width: 1200,
  height: 630,
  alt: "Logo TVSI đỏ–đen và tên Helpdesk trên nền trắng.",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "TVSI Helpdesk",
  title,
  description,
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "TVSI Helpdesk",
    url: "/",
    title,
    description,
    images: [{ ...socialImage, type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
};

import ThemeProvider from "@/components/providers/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={nunito.variable}>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
