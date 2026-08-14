// Seed realistic panel data. Run: npx tsx src/db/seed.ts
import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";
import { sql } from "drizzle-orm";
import { db } from "./index";
import {
  sites,
  databases,
  dbUsers,
  dnsZones,
  dnsRecords,
  ftpAccounts,
  cronJobs,
  certs,
  firewallRules,
  containers,
  backups,
  backupJobs,
  panelUsers,
  auditLogs,
  alerts,
  settings,
  mailDomains,
  mailboxes,
  smtpSenders,
  campaigns,
  sendDomains,
  sipExtensions,
  sipTrunks,
  callLogs,
  deployments,
  sshKeys,
  pythonProjects,
} from "./schema";

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);
const daysAhead = (d: number) => new Date(Date.now() + d * 86400000);

async function main() {
  // idempotent re-seed: wipe everything with identity reset
  await db.execute(sql`
    TRUNCATE TABLE sites, databases, db_users, dns_zones, dns_records,
      ftp_accounts, cron_jobs, certs, firewall_rules, containers, backups,
      backup_jobs, panel_users, audit_logs, alerts, settings,
      mail_domains, mailboxes, smtp_senders, campaigns, send_domains,
      sip_extensions, sip_trunks, call_logs, deployments, ssh_keys, python_projects
    RESTART IDENTITY CASCADE
  `);

  // ensure directories the panel manages exist
  for (const dir of ["/www/wwwroot", "/backups"]) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      /* read-only fs tolerated */
    }
  }

  await db.insert(sites).values([
    { domain: "example.com", rootPath: "/www/wwwroot/example.com", type: "php", phpVersion: "8.2", port: 80, status: "running", sslEnabled: true, forceHttps: true, http2: true, backupEnabled: true, diskUsedMb: 842, requestsDay: 48230, createdAt: daysAgo(240) },
    { domain: "shop.example.com", rootPath: "/www/wwwroot/shop.example.com", type: "node", phpVersion: "8.2", port: 3000, status: "running", sslEnabled: true, forceHttps: true, http2: true, backupEnabled: true, diskUsedMb: 310, requestsDay: 12874, createdAt: daysAgo(160) },
    { domain: "blog.example.com", rootPath: "/www/wwwroot/blog.example.com", type: "python", phpVersion: "8.3", port: 80, status: "running", sslEnabled: false, forceHttps: true, http2: true, backupEnabled: true, diskUsedMb: 156, requestsDay: 3105, createdAt: daysAgo(90) },
    { domain: "staging.example.com", rootPath: "/www/wwwroot/staging.example.com", type: "static", phpVersion: "8.2", port: 80, status: "stopped", sslEnabled: false, forceHttps: false, http2: false, backupEnabled: false, diskUsedMb: 42, requestsDay: 0, createdAt: daysAgo(45) },
  ]);

  await db.insert(databases).values([
    { name: "shop_db", engine: "postgresql", encoding: "UTF8", sizeMb: 412, createdAt: daysAgo(160) },
    { name: "blog_db", engine: "mysql", encoding: "utf8mb4", sizeMb: 89, createdAt: daysAgo(90) },
    { name: "analytics_db", engine: "postgresql", encoding: "UTF8", sizeMb: 1264, createdAt: daysAgo(200) },
    { name: "billing_db", engine: "mysql", encoding: "utf8mb4", sizeMb: 230, createdAt: daysAgo(130) },
  ]);

  await db.insert(dbUsers).values([
    { username: "shop_admin", password: "vH8!kP2$zQ9", host: "localhost", dbId: 1, privileges: "ALL PRIVILEGES", createdAt: daysAgo(160) },
    { username: "blog_user", password: "Lm4#xR7@wP3", host: "localhost", dbId: 2, privileges: "ALL PRIVILEGES", createdAt: daysAgo(90) },
    { username: "analytics_ro", password: "Nq2^tB5&sJ8", host: "10.0.0.5", dbId: 3, privileges: "SELECT", createdAt: daysAgo(80) },
    { username: "billing_app", password: "Zr6$uM9!hD2", host: "localhost", dbId: 4, privileges: "SELECT, INSERT, UPDATE, DELETE", createdAt: daysAgo(130) },
  ]);

  await db.insert(dnsZones).values([
    { domain: "example.com", provider: "cloud", status: "active", createdAt: daysAgo(240) },
    { domain: "app.example.net", provider: "local", status: "active", createdAt: daysAgo(60) },
  ]);

  await db.insert(dnsRecords).values([
    { zoneId: 1, type: "A", name: "@", value: "203.0.113.10", ttl: 3600, priority: 0 },
    { zoneId: 1, type: "A", name: "shop", value: "203.0.113.11", ttl: 3600, priority: 0 },
    { zoneId: 1, type: "A", name: "blog", value: "203.0.113.12", ttl: 3600, priority: 0 },
    { zoneId: 1, type: "CNAME", name: "www", value: "example.com", ttl: 3600, priority: 0 },
    { zoneId: 1, type: "MX", name: "@", value: "mail.example.com", ttl: 3600, priority: 10 },
    { zoneId: 1, type: "TXT", name: "@", value: "v=spf1 mx -all", ttl: 3600, priority: 0 },
    { zoneId: 1, type: "AAAA", name: "@", value: "2001:db8::10", ttl: 3600, priority: 0 },
    { zoneId: 2, type: "A", name: "@", value: "198.51.100.25", ttl: 600, priority: 0 },
    { zoneId: 2, type: "CNAME", name: "api", value: "app.example.net", ttl: 600, priority: 0 },
  ]);

  await db.insert(ftpAccounts).values([
    { username: "admin", password: "Pp9#kM2@vB7", path: "/www/wwwroot", status: "active", quotaMb: 10240, usedMb: 2214, createdAt: daysAgo(240) },
    { username: "uploads", password: "Wq5$xT8!nR4", path: "/www/wwwroot/example.com/uploads", status: "active", quotaMb: 2048, usedMb: 512, createdAt: daysAgo(120) },
    { username: "deploy", password: "Jf3^dZ6&qL1", path: "/www/wwwroot/shop.example.com", status: "active", quotaMb: 4096, usedMb: 310, createdAt: daysAgo(100) },
  ]);

  await db.insert(cronJobs).values([
    { name: "Laravel scheduler", schedule: "* * * * *", command: "cd /www/wwwroot/shop.example.com && php artisan schedule:run", user: "www-data", enabled: true, lastRun: new Date(Date.now() - 60000), nextRun: new Date(Date.now() + 60000), createdAt: daysAgo(100) },
    { name: "Nightly full backup", schedule: "0 3 * * *", command: "ubuntudeck backup --scope all", user: "root", enabled: true, lastRun: daysAgo(0.5), nextRun: daysAhead(0.5), createdAt: daysAgo(200) },
    { name: "SSL auto-renewal", schedule: "17 3 * * *", command: "certbot renew --quiet --deploy-hook 'nginx -s reload'", user: "root", enabled: true, lastRun: daysAgo(1), nextRun: daysAhead(0.5), createdAt: daysAgo(200) },
    { name: "Log rotation", schedule: "0 0 * * *", command: "logrotate /etc/logrotate.conf", user: "root", enabled: true, lastRun: daysAgo(0.2), nextRun: daysAhead(0.8), createdAt: daysAgo(200) },
    { name: "Analytics rollup", schedule: "*/15 * * * *", command: "/opt/analytics/rollup.sh", user: "ubuntu", enabled: false, lastRun: daysAgo(12), nextRun: null, createdAt: daysAgo(80) },
  ]);

  await db.insert(certs).values([
    { domain: "example.com", issuer: "Let's Encrypt", status: "valid", issuedAt: daysAgo(10), expiresAt: daysAhead(80), autoRenew: true, keyType: "RSA 2048", sans: "www.example.com, api.example.com", wildcard: false, hsts: true, ocsp: true, cipherProfile: "modern", createdAt: daysAgo(240) },
    { domain: "shop.example.com", issuer: "Let's Encrypt", status: "expiring", issuedAt: daysAgo(78), expiresAt: daysAhead(12), autoRenew: true, keyType: "ECDSA P-256", sans: "shop.example.com", wildcard: false, hsts: true, ocsp: true, cipherProfile: "intermediate", createdAt: daysAgo(160) },
    { domain: "staging.example.com", issuer: "ZeroSSL", status: "expired", issuedAt: daysAgo(100), expiresAt: daysAgo(10), autoRenew: false, keyType: "RSA 2048", sans: "*.staging.example.com", wildcard: true, hsts: false, ocsp: false, cipherProfile: "legacy", createdAt: daysAgo(150) },
  ]);

  await db.insert(firewallRules).values([
    { port: 22, protocol: "TCP", source: "0.0.0.0/0", action: "allow", comment: "SSH", enabled: true, createdAt: daysAgo(240) },
    { port: 80, protocol: "TCP", source: "0.0.0.0/0", action: "allow", comment: "HTTP", enabled: true, createdAt: daysAgo(240) },
    { port: 443, protocol: "TCP", source: "0.0.0.0/0", action: "allow", comment: "HTTPS", enabled: true, createdAt: daysAgo(240) },
    { port: 21, protocol: "TCP", source: "0.0.0.0/0", action: "allow", comment: "FTP", enabled: true, createdAt: daysAgo(240) },
    { port: 3306, protocol: "TCP", source: "0.0.0.0/0", action: "deny", comment: "MySQL — internal only", enabled: true, createdAt: daysAgo(240) },
    { port: 6379, protocol: "TCP", source: "0.0.0.0/0", action: "deny", comment: "Redis — internal only", enabled: true, createdAt: daysAgo(240) },
    { port: 5432, protocol: "TCP", source: "10.0.0.0/8", action: "allow", comment: "PostgreSQL — private net", enabled: true, createdAt: daysAgo(240) },
  ]);

  await db.insert(containers).values([
    { name: "redis", image: "redis:7-alpine", status: "running", ports: "127.0.0.1:6379:6379", cpuPct: 2, memMb: 84, restartPolicy: "always", createdAt: daysAgo(180) },
    { name: "nginx-proxy", image: "nginxproxy/nginx-proxy:1.6", status: "running", ports: "80:80, 443:443", cpuPct: 1, memMb: 41, restartPolicy: "unless-stopped", createdAt: daysAgo(180) },
    { name: "portainer", image: "portainer/portainer-ce:2.21", status: "stopped", ports: "9000:9000", cpuPct: 0, memMb: 0, restartPolicy: "no", createdAt: daysAgo(60) },
    { name: "nextcloud", image: "nextcloud:29-fpm", status: "error", ports: "9001:9000", cpuPct: 0, memMb: 128, restartPolicy: "on-failure", createdAt: daysAgo(30) },
  ]);

  await db.insert(backups).values([
    { name: "backup-example.com-2026-02-14", type: "website", target: "example.com", sizeMb: 842, status: "completed", location: "/backups", createdAt: daysAgo(4) },
    { name: "backup-shop_db-2026-02-15", type: "database", target: "shop_db", sizeMb: 412, status: "completed", location: "/backups", createdAt: daysAgo(3) },
    { name: "backup-blog_db-2026-02-16", type: "database", target: "blog_db", sizeMb: 89, status: "completed", location: "/backups", createdAt: daysAgo(2) },
    { name: "backup-all-2026-02-17", type: "system", target: "all", sizeMb: 2840, status: "completed", location: "/backups", createdAt: daysAgo(1) },
    { name: "backup-full-2026-02-10", type: "system", target: "all", sizeMb: 0, status: "failed", location: "/backups", createdAt: daysAgo(8) },
    { name: "backup-shop.example.com-2026-02-11", type: "website", target: "shop.example.com", sizeMb: 310, status: "completed", location: "/backups", createdAt: daysAgo(7) },
  ]);

  await db.insert(backupJobs).values([
    { name: "Daily full backup", scope: "all", schedule: "0 3 * * *", retention: 14, enabled: true, lastRun: daysAgo(1), createdAt: daysAgo(200) },
    { name: "Weekly databases dump", scope: "databases", schedule: "0 4 * * 0", retention: 30, enabled: true, lastRun: daysAgo(3), createdAt: daysAgo(150) },
    { name: "Off-site sync to S3", scope: "all", schedule: "30 4 * * *", retention: 90, enabled: false, lastRun: daysAgo(20), createdAt: daysAgo(120) },
  ]);

  await db.insert(panelUsers).values([
    { username: "admin", password: "ChangeMe!2026", role: "admin", lastLogin: new Date(Date.now() - 3600000), createdAt: daysAgo(240) },
    { username: "operator", password: "Ops#Rocket$88", role: "operator", lastLogin: daysAgo(2), createdAt: daysAgo(100) },
    { username: "viewer", password: "12345678", role: "viewer", lastLogin: daysAgo(15), createdAt: daysAgo(60) },
  ]);

  await db.insert(auditLogs).values([
    { actor: "admin", action: "Website updated", target: "blog.example.com", detail: '{"phpVersion":"8.3"}', ip: "203.0.113.20", createdAt: new Date(Date.now() - 20 * 60000) },
    { actor: "admin", action: "SSL issued", target: "shop.example.com", detail: "Let's Encrypt ACME challenge passed", ip: "203.0.113.20", createdAt: new Date(Date.now() - 55 * 60000) },
    { actor: "system", action: "backup.run", target: "Daily full backup", detail: "", ip: "127.0.0.1", createdAt: new Date(Date.now() - 3 * 3600000) },
    { actor: "admin", action: "Firewall Rule created", target: "5432 TCP", detail: '{"action":"allow"}', ip: "203.0.113.20", createdAt: new Date(Date.now() - 6 * 3600000) },
    { actor: "system", action: "cert.renew", target: "example.com", detail: "", ip: "127.0.0.1", createdAt: new Date(Date.now() - 26 * 3600000) },
    { actor: "operator", action: "Docker Container restarted", target: "redis", detail: "", ip: "10.0.0.7", createdAt: new Date(Date.now() - 30 * 3600000) },
    { actor: "admin", action: "Panel User created", target: "viewer", detail: '{"role":"viewer"}', ip: "203.0.113.20", createdAt: daysAgo(1) },
    { actor: "system", action: "security.scan", target: "score 82/B", detail: "", ip: "127.0.0.1", createdAt: daysAgo(1.2) },
    { actor: "admin", action: "DNS Record created", target: "api CNAME", detail: '{"value":"app.example.net"}', ip: "203.0.113.20", createdAt: daysAgo(2) },
    { actor: "admin", action: "cron.run", target: "Log rotation", detail: "", ip: "127.0.0.1", createdAt: daysAgo(2.4) },
  ]);

  await db.insert(alerts).values([
    { type: "ssl", severity: "warning", message: "Certificate for shop.example.com expires in 12 days", resolved: false, createdAt: daysAgo(0.4) },
    { type: "system", severity: "critical", message: "Container nextcloud entered error state (exit code 137)", resolved: false, createdAt: daysAgo(0.6) },
    { type: "backup", severity: "warning", message: "Off-site sync job has been disabled for 20 days", resolved: false, createdAt: daysAgo(1) },
    { type: "system", severity: "info", message: "Nightly full backup completed (2840 MB)", resolved: true, createdAt: daysAgo(1) },
    { type: "security", severity: "info", message: "Security scan: score 82 (grade B)", resolved: true, createdAt: daysAgo(1.2) },
  ]);

  await db.insert(mailDomains).values([
    { domain: "example.com", status: "active", dkim: true, catchAll: "admin@example.com", createdAt: daysAgo(240) },
    { domain: "app.example.net", status: "active", dkim: true, catchAll: "", createdAt: daysAgo(60) },
  ]);

  await db.insert(mailboxes).values([
    { email: "admin@example.com", domainId: 1, password: "Ma#8xK2@vP7", quotaMb: 4096, usedMb: 1214, status: "active", createdAt: daysAgo(240) },
    { email: "support@example.com", domainId: 1, password: "Tq5$bN9!wR4", quotaMb: 2048, usedMb: 512, status: "active", createdAt: daysAgo(120) },
    { email: "billing@example.com", domainId: 1, password: "Jf3^zM6&dL1", quotaMb: 2048, usedMb: 96, status: "active", createdAt: daysAgo(130) },
    { email: "info@app.example.net", domainId: 2, password: "Xk7#pQ2@hT8", quotaMb: 1024, usedMb: 210, status: "active", createdAt: daysAgo(60) },
  ]);

  await db.insert(smtpSenders).values([
    { name: "Transactional relay", email: "no-reply@example.com", host: "127.0.0.1", port: 587, protocol: "starttls", authUser: "no-reply", password: "Rm3#uX7@kP2", status: "verified", dailyLimit: 20000, sentToday: 5678, createdAt: daysAgo(200) },
    { name: "Marketing relay", email: "news@example.com", host: "smtp.eu.example.com", port: 465, protocol: "ssl", authUser: "news", password: "Vq9$zB4&wL6", status: "verified", dailyLimit: 5000, sentToday: 1234, createdAt: daysAgo(150) },
    { name: "Newsletter backup", email: "news-backup@example.com", host: "127.0.0.1", port: 25, protocol: "smtp", authUser: "", password: "", status: "unverified", dailyLimit: 5000, sentToday: 0, createdAt: daysAgo(20) },
  ]);

  await db.insert(sendDomains).values([
    { domain: "mail.example.com", status: "verified", spfRecord: "v=spf1 include:spf.servoman.io ~all", dkimSelector: "servoman", dkimRecord: '"v=DKIM1; k=rsa; p=MIIC…example"', dmarcRecord: "v=DMARC1; p=quarantine; rua=mailto:dmarc+mail-example-com@servoman.io; fo=1; adkim=r; aspf=r", dailySent: 3412, createdAt: daysAgo(180) },
    { domain: "mail.blog.example.com", status: "verified", spfRecord: "v=spf1 include:spf.servoman.io ~all", dkimSelector: "servoman", dkimRecord: '"v=DKIM1; k=rsa; p=MIIC…blog"', dmarcRecord: "v=DMARC1; p=reject; rua=mailto:dmarc+mail-blog-example-com@servoman.io", dailySent: 890, createdAt: daysAgo(60) },
    { domain: "news.example.com", status: "pending", spfRecord: "", dkimSelector: "servoman", dkimRecord: "", dmarcRecord: "", dailySent: 0, createdAt: daysAgo(2) },
  ]);

  await db.insert(campaigns).values([
    { name: "February product launch", subject: "Introducing SERVOMAN 3.0", senderId: 1, sendDomainId: 1, recipients: 4820, sent: 4820, opened: 2012, clicked: 634, bounced: 71, status: "completed", createdAt: daysAgo(6) },
    { name: "Weekly digest #8", subject: "This week on your server", senderId: 1, sendDomainId: 1, recipients: 12400, sent: 12400, opened: 5800, clicked: 1100, bounced: 210, status: "completed", createdAt: daysAgo(3) },
    { name: "Win-back re-engagement", subject: "We miss you — 20% off", senderId: 2, sendDomainId: 2, recipients: 8300, sent: 4200, opened: 640, clicked: 90, bounced: 12, status: "sending", createdAt: daysAgo(1) },
    { name: "Spring sale teaser", subject: "Something big is coming", senderId: 3, sendDomainId: 3, recipients: 15000, sent: 0, opened: 0, clicked: 0, bounced: 0, status: "draft", createdAt: daysAgo(0.5) },
  ]);

  await db.insert(sipTrunks).values([
    { name: "Primary carrier", provider: "Telnyx", host: "sip.telnyx.com", port: 5060, username: "acme_trunk01", password: "Tn#8pK2@vQ7", codecs: "ulaw,alaw,opus", channels: 16, status: "registered", createdAt: daysAgo(200) },
    { name: "Backup carrier", provider: "Flowroute", host: "sip.flowroute.com", port: 5060, username: "acme_bk01", password: "Fr$5bN9!wR4", codecs: "ulaw,alaw", channels: 8, status: "registered", createdAt: daysAgo(150) },
    { name: "Legacy TDM gateway", provider: "On-prem", host: "10.0.0.20", port: 5060, username: "tdm01", password: "Lg^3zM6&dL1", codecs: "g711", channels: 4, status: "unregistered", createdAt: daysAgo(60) },
  ]);

  await db.insert(sipExtensions).values([
    { extension: "100", name: "Reception", password: "Rec#9xK2@vP7", technology: "PJSIP", context: "from-internal", status: "online", ip: "192.168.1.21", createdAt: daysAgo(200) },
    { extension: "101", name: "Support — Alice", password: "Alc$5bN9!wR4", technology: "PJSIP", context: "from-internal", status: "online", ip: "192.168.1.22", createdAt: daysAgo(150) },
    { extension: "102", name: "Sales — Ben", password: "Ben^3zM6&dL1", technology: "SIP", context: "from-internal", status: "ringing", ip: "192.168.1.23", createdAt: daysAgo(150) },
    { extension: "103", name: "Billing — Carol", password: "Car#7pQ2@hT8", technology: "PJSIP", context: "from-internal", status: "offline", ip: "", createdAt: daysAgo(90) },
    { extension: "200", name: "Conference room", password: "Cnf!2uX7@kP2", technology: "PJSIP", context: "from-internal", status: "offline", ip: "", createdAt: daysAgo(30) },
  ]);

  await db.insert(callLogs).values([
    { src: "100", dst: "+14155550123", direction: "outbound", status: "answered", durationSec: 214, billSec: 214, cost: 642, startedAt: new Date(Date.now() - 50 * 60000) },
    { src: "102", dst: "+12025550187", direction: "outbound", status: "busy", durationSec: 6, billSec: 0, cost: 0, startedAt: new Date(Date.now() - 3 * 3600000) },
    { src: "+14155550123", dst: "101", direction: "inbound", status: "answered", durationSec: 480, billSec: 480, cost: 1440, startedAt: new Date(Date.now() - 5 * 3600000) },
    { src: "101", dst: "+447700900123", direction: "outbound", status: "no-answer", durationSec: 22, billSec: 0, cost: 0, startedAt: new Date(Date.now() - 26 * 3600000) },
    { src: "+442079460123", dst: "100", direction: "inbound", status: "answered", durationSec: 95, billSec: 95, cost: 285, startedAt: daysAgo(1.2) },
    { src: "103", dst: "+12025550199", direction: "outbound", status: "failed", durationSec: 0, billSec: 0, cost: 0, startedAt: daysAgo(2) },
  ]);

  // Build a real local git repository so clone/pull/commits work out of the box,
  // even on hosts without internet access to GitHub.
  let demoRepo = "https://github.com/acme/demo-app.git";
  try {
    execSync("rm -rf /tmp/servoman-demo /tmp/servoman-repos && mkdir -p /tmp/servoman-demo /tmp/servoman-repos", { stdio: "pipe" });
    fs.writeFileSync(
      "/tmp/servoman-demo/package.json",
      JSON.stringify({ name: "demo-app", version: "1.0.0", main: "app.js", scripts: { start: "node app.js" } }, null, 2)
    );
    fs.writeFileSync(
      "/tmp/servoman-demo/app.js",
      'const http = require("http");\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { "Content-Type": "application/json" });\n  res.end(JSON.stringify({ ok: true, app: "demo", uptime: process.uptime() }));\n});\nserver.listen(process.env.PORT || 3000, () => console.log("demo app listening"));\n'
    );
    fs.writeFileSync("/tmp/servoman-demo/README.md", "# demo-app\nA minimal Node.js app deployed by UbuntuDeck.\n");
    execSync("git init -q -b main /tmp/servoman-demo", { stdio: "pipe" });
    execSync(
      "git -C /tmp/servoman-demo add -A && git -C /tmp/servoman-demo -c user.name='Deploy Bot' -c user.email='bot@ubuntudeck.local' commit -q -m 'Initial commit: demo app scaffold'",
      { stdio: "pipe" }
    );
    fs.appendFileSync(
      "/tmp/servoman-demo/app.js",
      '\n// health endpoint added by SERVOMAN push\nserver.on("connection", () => {});\n'
    );
    execSync(
      "git -C /tmp/servoman-demo add -A && git -C /tmp/servoman-demo -c user.name='Deploy Bot' -c user.email='bot@ubuntudeck.local' commit -q -m 'Add health endpoint'",
      { stdio: "pipe" }
    );
    execSync("git clone -q --bare /tmp/servoman-demo /tmp/servoman-repos/demo-app.git", { stdio: "pipe" });
    demoRepo = "/tmp/servoman-repos/demo-app.git";
  } catch {
    /* git unavailable — deployments still work against public remotes */
  }

  await db.insert(deployments).values([
    { siteId: 2, appType: "node", gitRepo: demoRepo, branch: "main", port: 3000, buildCommand: "npm install", startCommand: "npm start", status: "running", lastDeploy: daysAgo(0.3), autoDeploy: true, webhookToken: crypto.randomBytes(12).toString("hex"), lastCommitSha: "a11c3e2", lastCommitMsg: "Add health endpoint", createdAt: daysAgo(160) },
    { siteId: 1, appType: "php", gitRepo: "https://github.com/acme/example-site.git", branch: "main", port: 9000, buildCommand: "composer install --no-dev", startCommand: "php-fpm", status: "running", lastDeploy: daysAgo(2), autoDeploy: true, webhookToken: crypto.randomBytes(12).toString("hex"), lastCommitSha: "f4b92d1", lastCommitMsg: "Update footer layout", createdAt: daysAgo(240) },
    { siteId: 3, appType: "flask", gitRepo: "https://github.com/acme/blog-flask.git", branch: "main", port: 8000, buildCommand: "python3 -m venv .venv && .venv/bin/pip install -r requirements.txt", startCommand: ".venv/bin/gunicorn -w 3 -b 127.0.0.1:8000 app:app", status: "running", lastDeploy: daysAgo(1), autoDeploy: true, webhookToken: crypto.randomBytes(12).toString("hex"), lastCommitSha: "c80de77", lastCommitMsg: "Refactor auth blueprint", createdAt: daysAgo(90) },
    { siteId: 4, appType: "static", gitRepo: "https://github.com/acme/staging-site.git", branch: "main", port: 80, buildCommand: "npm run build --prefix frontend", startCommand: "nginx", status: "stopped", lastDeploy: daysAgo(12), autoDeploy: false, webhookToken: crypto.randomBytes(12).toString("hex"), lastCommitSha: "9b1e02c", lastCommitMsg: "Stage banner A/B", createdAt: daysAgo(45) },
    { siteId: 2, appType: "node", gitRepo: "https://github.com/acme/worker-jobs.git", branch: "develop", port: 3001, buildCommand: "npm install", startCommand: "node worker.js", status: "running", lastDeploy: daysAgo(4), autoDeploy: true, webhookToken: crypto.randomBytes(12).toString("hex"), lastCommitSha: "d4a90f1", lastCommitMsg: "Retry queue with backoff", createdAt: daysAgo(60) },
  ]);

  await db.insert(sshKeys).values([
    { name: "admin-laptop", keyType: "ed25519", keyPath: "/root/.ssh/servoman_admin-laptop", publicKey: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK9xT7wM2sL5dHq4vBnE3yFg8kR1uWc6jA0mXbVzQ2x servoman-admin-laptop@panel", comment: "Work laptop", status: "active", createdAt: daysAgo(200) },
    { name: "deploy-ci", keyType: "ed25519", keyPath: "/root/.ssh/servoman_deploy-ci", publicKey: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIP8yT6vL1rK4cGp3uAmD2xFg7jR0tVb5iZ9lWcHwP4y servoman-deploy-ci@panel", comment: "CI runner — git deployments", status: "active", createdAt: daysAgo(120) },
    { name: "legacy-server", keyType: "rsa", keyPath: "/root/.ssh/servoman_legacy-server", publicKey: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQD… servoman-legacy-server@panel", comment: "Retired box", status: "revoked", createdAt: daysAgo(400) },
  ]);

  await db.insert(pythonProjects).values([
    { name: "shop-api", version: "3.12", framework: "Flask", path: "/www/wwwroot/shop.example.com", port: 8000, mode: "gunicorn", status: "running", packages: 18, createdAt: daysAgo(160) },
    { name: "analytics-worker", version: "3.11", framework: "FastAPI", path: "/www/wwwroot/analytics", port: 8001, mode: "uvicorn", status: "running", packages: 9, createdAt: daysAgo(90) },
    { name: "legacy-django", version: "3.10", framework: "Django", path: "/www/wwwroot/legacy", port: 8002, mode: "uwsgi", status: "stopped", packages: 42, createdAt: daysAgo(300) },
  ]);

  await db.insert(settings).values([
    { key: "server_label", value: "ubuntu-24-prod" },
    { key: "panel_name", value: "SERVOMAN" },
    { key: "panel_version", value: "3.0.0" },
    { key: "update_channel", value: "stable" },
    { key: "timezone", value: "UTC" },
    { key: "firewall_enabled", value: "true" },
    { key: "fail2ban_enabled", value: "true" },
    { key: "auto_backup_enabled", value: "true" },
    { key: "auto_backup_time", value: "0 3 * * *" },
    { key: "backup_retention", value: "14" },
    { key: "auto_ssl_renew", value: "true" },
    { key: "notifications_enabled", value: "true" },
    { key: "notifications_email", value: "admin@example.com" },
    { key: "alert_threshold_cpu", value: "90" },
    { key: "alert_threshold_disk", value: "85" },
    { key: "alert_threshold_mem", value: "90" },
    { key: "security_score", value: "82" },
    { key: "service_nginx", value: "true" },
    { key: "service_phpfpm", value: "true" },
    { key: "service_mysql", value: "true" },
    { key: "service_postgresql", value: "true" },
    { key: "service_redis", value: "true" },
    { key: "service_docker", value: "true" },
    ...["gd", "curl", "mbstring", "zip", "imagick", "redis", "opcache"].map((e) => ({ key: `php_ext_${e}`, value: "true" })),
    { key: "php_ext_xdebug", value: "false" },
    { key: "php_ini_memory_limit", value: "256M" },
    { key: "php_ini_upload_max_filesize", value: "64M" },
    { key: "php_ini_post_max_size", value: "80M" },
    { key: "php_ini_max_execution_time", value: "120" },
    { key: "php_ini_max_input_vars", value: "5000" },
  ]);

  console.log("✅ SERVOMAN seeded successfully.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
