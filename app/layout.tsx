import type { Metadata, Viewport } from "next";
import "./globals.css";

const APP_NAME = "发票报销预审批系统";
const APP_DESCRIPTION = "基于 Next.js 的发票报销整理系统，支持 OCR 识别、自动分类和金额汇总";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  keywords: ["发票", "报销", "OCR", "自动分类", "金额汇总", "支付证明单", "移动端"],
  authors: [{ name: "发票报销系统" }],
  creator: APP_NAME,
  publisher: APP_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "发票报销系统",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full antialiased font-sans bg-bg-secondary text-text-primary">
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
