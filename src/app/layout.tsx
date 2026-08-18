import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SERVOMAN — Server Control Panel",
    template: "%s | SERVOMAN",
  },
  description:
    "SERVOMAN is a practical self-hosted control panel for managing websites, domains, SSL, DNS, databases, backups, deployments, containers, server tasks and security from one place.",
  applicationName: "SERVOMAN",
  keywords: [
    "server control panel",
    "self-hosted server management",
    "website management",
    "SSL management",
    "DNS management",
    "server monitoring",
    "Docker management",
    "Git deployment",
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0e1a] text-zinc-200 antialiased">{children}</body>
    </html>
  );
}
