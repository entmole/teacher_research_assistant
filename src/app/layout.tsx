import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "교사 업무수첩", template: "%s | 교사 업무수첩" },
  description: "초등 교사를 위한 시간표·학사일정 관리 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-stone-100 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
