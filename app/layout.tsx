import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { publicOrigin } from "./lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// What this build actually is: a private space where one person talks with
// themselves. The old local-first seven-module surface is not what a newcomer
// lands on, so it is not what the document claims to be either.
export const metadata: Metadata = {
  ...(publicOrigin() ? { metadataBase: new URL(publicOrigin()) } : {}),
  title: "我和自己",
  description: "一个只属于你的对话空间。说的话留在这里，不评分、不排名、不推送。",
  // Behind an account there is nothing for a crawler to read. The declaration is
  // dropped only when this deployment really has a public origin.
  robots: publicOrigin() ? undefined : { index: false, follow: false },
};

// No maximumScale: zooming the text with two fingers is not a design flaw to
// suppress, it is how some people read.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0e12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
