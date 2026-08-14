import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SERVOMAN — Lightweight Server Control Panel",
  description:
    "SERVOMAN: a lightweight self-hosted control panel for Ubuntu 24.04 cloud servers — websites, SSL v2, record-verified email & campaigns, VOIP, git push-to-deploy, DNS, backups, Docker, terminal, monitoring, AI assistant and security scoring.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0e1a] text-zinc-200 antialiased">{children}</body>
    </html>
  );
}
