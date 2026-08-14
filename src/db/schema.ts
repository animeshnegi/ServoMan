import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at").defaultNow().notNull();

// ---------- Websites (Nginx / Apache virtual hosts) ----------
export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  rootPath: text("root_path").notNull().default("/www/wwwroot"),
  type: text("type").notNull().default("php"),
  phpVersion: text("php_version").notNull().default("8.2"),
  port: integer("port").notNull().default(80),
  status: text("status").notNull().default("running"),
  sslEnabled: boolean("ssl_enabled").notNull().default(true),
  forceHttps: boolean("force_https").notNull().default(true),
  http2: boolean("http2").notNull().default(true),
  backupEnabled: boolean("backup_enabled").notNull().default(true),
  diskUsedMb: integer("disk_used_mb").notNull().default(0),
  requestsDay: integer("requests_day").notNull().default(0),
  createdAt,
});

// ---------- Databases ----------
export const databases = pgTable("databases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  engine: text("engine").notNull().default("postgresql"),
  encoding: text("encoding").notNull().default("utf8mb4"),
  sizeMb: integer("size_mb").notNull().default(0),
  createdAt,
});

export const dbUsers = pgTable("db_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull().default(""),
  host: text("host").notNull().default("localhost"),
  dbId: integer("db_id").notNull(),
  privileges: text("privileges").notNull().default("ALL PRIVILEGES"),
  createdAt,
});

// ---------- DNS ----------
export const dnsZones = pgTable("dns_zones", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  provider: text("provider").notNull().default("cloud"),
  status: text("status").notNull().default("active"),
  createdAt,
});

export const dnsRecords = pgTable("dns_records", {
  id: serial("id").primaryKey(),
  zoneId: integer("zone_id").notNull(),
  type: text("type").notNull().default("A"),
  name: text("name").notNull().default("@"),
  value: text("value").notNull().default(""),
  ttl: integer("ttl").notNull().default(3600),
  priority: integer("priority").notNull().default(0),
  createdAt,
});

// ---------- FTP ----------
export const ftpAccounts = pgTable("ftp_accounts", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull().default(""),
  path: text("path").notNull().default("/www/wwwroot"),
  status: text("status").notNull().default("active"),
  quotaMb: integer("quota_mb").notNull().default(10240),
  usedMb: integer("used_mb").notNull().default(0),
  createdAt,
});

// ---------- Cron jobs ----------
export const cronJobs = pgTable("cron_jobs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  schedule: text("schedule").notNull().default("* * * * *"),
  command: text("command").notNull(),
  user: text("user").notNull().default("www-data"),
  enabled: boolean("enabled").notNull().default(true),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
  createdAt,
});

// ---------- SSL certificates ----------
export const certs = pgTable("certs", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  issuer: text("issuer").notNull().default("Let's Encrypt"),
  status: text("status").notNull().default("valid"),
  issuedAt: timestamp("issued_at"),
  expiresAt: timestamp("expires_at"),
  autoRenew: boolean("auto_renew").notNull().default(true),
  keyType: text("key_type").notNull().default("RSA 2048"),
  // SSL v2
  sans: text("sans").notNull().default(""),
  wildcard: boolean("wildcard").notNull().default(false),
  hsts: boolean("hsts").notNull().default(true),
  ocsp: boolean("ocsp").notNull().default(true),
  cipherProfile: text("cipher_profile").notNull().default("modern"),
  createdAt,
});

// ---------- Firewall ----------
export const firewallRules = pgTable("firewall_rules", {
  id: serial("id").primaryKey(),
  port: integer("port").notNull(),
  protocol: text("protocol").notNull().default("TCP"),
  source: text("source").notNull().default("0.0.0.0/0"),
  action: text("action").notNull().default("allow"),
  comment: text("comment").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  createdAt,
});

// ---------- Docker ----------
export const containers = pgTable("containers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  image: text("image").notNull().default(""),
  status: text("status").notNull().default("running"),
  ports: text("ports").notNull().default(""),
  cpuPct: integer("cpu_pct").notNull().default(0),
  memMb: integer("mem_mb").notNull().default(0),
  restartPolicy: text("restart_policy").notNull().default("always"),
  createdAt,
});

// ---------- Backups ----------
export const backups = pgTable("backups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("website"),
  target: text("target").notNull().default(""),
  sizeMb: integer("size_mb").notNull().default(0),
  status: text("status").notNull().default("completed"),
  location: text("location").notNull().default("/backups"),
  createdAt,
});

export const backupJobs = pgTable("backup_jobs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  scope: text("scope").notNull().default("all"),
  schedule: text("schedule").notNull().default("0 3 * * *"),
  retention: integer("retention").notNull().default(14),
  enabled: boolean("enabled").notNull().default(true),
  lastRun: timestamp("last_run"),
  createdAt,
});

// ---------- Panel ----------
export const panelUsers = pgTable("panel_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull().default(""),
  role: text("role").notNull().default("admin"),
  lastLogin: timestamp("last_login"),
  createdAt,
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull().default("admin"),
  action: text("action").notNull(),
  target: text("target").notNull().default(""),
  detail: text("detail").notNull().default(""),
  ip: text("ip").notNull().default("127.0.0.1"),
  createdAt,
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("system"),
  severity: text("severity").notNull().default("info"),
  message: text("message").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  createdAt,
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
});

// ---------- Email server (Postfix + Dovecot managed stack) ----------
export const mailDomains = pgTable("mail_domains", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  status: text("status").notNull().default("active"),
  dkim: boolean("dkim").notNull().default(true),
  catchAll: text("catch_all").notNull().default(""),
  createdAt,
});

export const mailboxes = pgTable("mailboxes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  domainId: integer("domain_id").notNull(),
  password: text("password").notNull().default(""),
  quotaMb: integer("quota_mb").notNull().default(2048),
  usedMb: integer("used_mb").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt,
});

// ---------- Email sending (SMTP relays) ----------
export const smtpSenders = pgTable("smtp_senders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  host: text("host").notNull().default("127.0.0.1"),
  port: integer("port").notNull().default(587),
  protocol: text("protocol").notNull().default("starttls"),
  authUser: text("auth_user").notNull().default(""),
  password: text("password").notNull().default(""),
  status: text("status").notNull().default("verified"),
  dailyLimit: integer("daily_limit").notNull().default(5000),
  sentToday: integer("sent_today").notNull().default(0),
  createdAt,
});

// ---------- Email campaigns ----------
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  senderId: integer("sender_id").notNull(),
  sendDomainId: integer("send_domain_id").notNull().default(0),
  recipients: integer("recipients").notNull().default(0),
  sent: integer("sent").notNull().default(0),
  opened: integer("opened").notNull().default(0),
  clicked: integer("clicked").notNull().default(0),
  bounced: integer("bounced").notNull().default(0),
  status: text("status").notNull().default("draft"),
  createdAt,
});

// ---------- Record-verified sending domains (no SMTP credentials) ----------
export const sendDomains = pgTable("send_domains", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  status: text("status").notNull().default("pending"),
  spfRecord: text("spf_record").notNull().default(""),
  dkimSelector: text("dkim_selector").notNull().default("servoman"),
  dkimRecord: text("dkim_record").notNull().default(""),
  dmarcRecord: text("dmarc_record").notNull().default(""),
  dailySent: integer("daily_sent").notNull().default(0),
  createdAt,
});

// ---------- VOIP (Asterisk / FreeSWITCH extensions + CDRs) ----------
export const sipExtensions = pgTable("sip_extensions", {
  id: serial("id").primaryKey(),
  extension: text("extension").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull().default(""),
  technology: text("technology").notNull().default("PJSIP"),
  context: text("context").notNull().default("from-internal"),
  status: text("status").notNull().default("offline"),
  ip: text("ip").notNull().default(""),
  createdAt,
});

export const sipTrunks = pgTable("sip_trunks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull().default(""),
  host: text("host").notNull().default(""),
  port: integer("port").notNull().default(5060),
  username: text("username").notNull().default(""),
  password: text("password").notNull().default(""),
  codecs: text("codecs").notNull().default("ulaw,alaw,opus"),
  channels: integer("channels").notNull().default(4),
  status: text("status").notNull().default("registered"),
  createdAt,
});

export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  src: text("src").notNull(),
  dst: text("dst").notNull(),
  direction: text("direction").notNull().default("outbound"),
  status: text("status").notNull().default("answered"),
  durationSec: integer("duration_sec").notNull().default(0),
  billSec: integer("bill_sec").notNull().default(0),
  cost: integer("cost").notNull().default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
});

// ---------- SSH keys ----------
export const sshKeys = pgTable("ssh_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  keyType: text("key_type").notNull().default("ed25519"),
  keyPath: text("key_path").notNull().default(""),
  publicKey: text("public_key").notNull().default(""),
  comment: text("comment").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt,
});

// ---------- Python projects (aaPanel-style Python Project Manager) ----------
export const pythonProjects = pgTable("python_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  version: text("version").notNull().default("3.12"),
  framework: text("framework").notNull().default("Flask"),
  path: text("path").notNull().default("/www/wwwroot"),
  port: integer("port").notNull().default(8000),
  mode: text("mode").notNull().default("gunicorn"),
  status: text("status").notNull().default("running"),
  packages: integer("packages").notNull().default(0),
  createdAt,
});

// ---------- Multi-app deployments (Node.js / Flask / PHP / static) ----------
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").notNull(),
  appType: text("app_type").notNull().default("node"),
  gitRepo: text("git_repo").notNull().default(""),
  branch: text("branch").notNull().default("main"),
  port: integer("port").notNull().default(3000),
  buildCommand: text("build_command").notNull().default(""),
  startCommand: text("start_command").notNull().default(""),
  status: text("status").notNull().default("running"),
  lastDeploy: timestamp("last_deploy"),
  autoDeploy: boolean("auto_deploy").notNull().default(true),
  webhookToken: text("webhook_token").notNull().default(""),
  lastCommitSha: text("last_commit_sha").notNull().default(""),
  lastCommitMsg: text("last_commit_msg").notNull().default(""),
  createdAt,
});
