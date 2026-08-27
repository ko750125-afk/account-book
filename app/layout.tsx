import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 가계부 챗봇",
  description: "대화로 지출을 기록하는 AI 가계부",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex h-full flex-col overflow-hidden">
        {children}
      </body>
    </html>
  );
}
