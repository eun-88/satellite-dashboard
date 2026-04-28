import type { Metadata } from "next";
import { Space_Mono, DM_Sans, Syne, Barlow, Martian_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SATSCHEDULE · INTEL OPS",
  description: "위성 촬영 스케줄링 자동화 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${spaceMono.variable} ${dmSans.variable} ${syne.variable} ${barlow.variable} ${martianMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
