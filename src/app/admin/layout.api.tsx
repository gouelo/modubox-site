import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "../globals.css";

// The admin panel's own <html>: Hebrew, right to left, never indexed.
// Server build only (*.api.tsx): the GitHub Pages export has no admin.
const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ניהול · Modubox", template: "%s · ניהול Modubox" },
  robots: { index: false, follow: false },
  icons: { icon: "/brand/favicon.svg", apple: "/brand/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0c3036", width: "device-width", initialScale: 1 };

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-dvh bg-sand font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
