import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "שליטה במשימות",
  description: "מערכת אישית חכמה לניהול משימות, עם סוכן AI",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="font-sans min-h-dvh">{children}</body>
    </html>
  );
}
