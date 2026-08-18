import type { MetadataRoute } from "next";

const ROUTES = [
  "/",
  "/ai",
  "/backups",
  "/campaigns",
  "/cron",
  "/databases",
  "/deploy",
  "/dns",
  "/docker",
  "/email",
  "/files",
  "/firewall",
  "/ftp",
  "/logs",
  "/monitoring",
  "/php",
  "/processes",
  "/python",
  "/security",
  "/server",
  "/settings",
  "/ssh",
  "/ssl",
  "/terminal",
  "/voip",
  "/websites",
] as const;

function getBaseUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return value.replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const now = new Date();

  return ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.6,
  }));
}
