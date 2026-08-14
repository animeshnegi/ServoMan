// Client-safe metadata describing every panel entity.
// Drives the generic CRUD manager UI and the generic /api/data API.

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "switch"
  | "readonly";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  optionsFrom?: string; // entity key whose items populate the select
  valueField?: string;
  labelField?: string;
  col?: number; // grid span
  hint?: string;
}

export interface RowAction {
  key: string;
  label: string;
  icon: string;
}

export interface BadgeMap {
  [value: string]: { label: string; cls: string };
}

export interface EntityDef {
  key: string;
  singular: string;
  plural: string;
  icon: string;
  description: string;
  fields: FieldDef[];
  listFields: string[];
  rowActions?: RowAction[];
  badge?: { field: string; map: BadgeMap };
  defaultValues?: Record<string, unknown>;
  sort?: string;
}

const opt = (arr: string[]): FieldOption[] =>
  arr.map((v) => ({ value: v, label: v }));

const RUNNING = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
const STOPPED = "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
const ERROR = "bg-rose-500/15 text-rose-400 border-rose-500/30";
const VALID = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
const WARN = "bg-amber-500/15 text-amber-400 border-amber-500/30";

export const ENTITIES: EntityDef[] = [
  {
    key: "sites",
    singular: "Website",
    plural: "Websites",
    icon: "Globe",
    description:
      "Nginx virtual hosts. Create sites, toggle SSL (Let's Encrypt), switch PHP versions, start/stop services and run live health probes.",
    fields: [
      { key: "domain", label: "Domain", type: "text", required: true, placeholder: "example.com", col: 2 },
      { key: "rootPath", label: "Document root", type: "text", placeholder: "/www/wwwroot/example.com" },
      { key: "type", label: "App type", type: "select", options: opt(["php", "python", "static", "node", "proxy"]) },
      { key: "phpVersion", label: "PHP version", type: "select", options: opt(["7.4", "8.0", "8.1", "8.2", "8.3"]) },
      { key: "port", label: "Port", type: "number" },
      { key: "status", label: "Status", type: "select", options: opt(["running", "stopped", "error"]) },
      { key: "sslEnabled", label: "SSL (Let's Encrypt)", type: "switch" },
      { key: "forceHttps", label: "Force HTTPS", type: "switch" },
      { key: "http2", label: "HTTP/2", type: "switch" },
      { key: "backupEnabled", label: "Auto backups", type: "switch" },
      { key: "diskUsedMb", label: "Disk used (MB)", type: "number" },
      { key: "requestsDay", label: "Requests / day", type: "number" },
    ],
    listFields: ["domain", "type", "phpVersion", "sslEnabled", "diskUsedMb", "requestsDay"],
    badge: {
      field: "status",
      map: { running: { label: "Running", cls: RUNNING }, stopped: { label: "Stopped", cls: STOPPED }, error: { label: "Error", cls: ERROR } },
    },
    rowActions: [
      { key: "site.start", label: "Start", icon: "Play" },
      { key: "site.stop", label: "Stop", icon: "Square" },
      { key: "site.ssl", label: "SSL", icon: "ShieldCheck" },
      { key: "site.health", label: "Health", icon: "Activity" },
    ],
    defaultValues: { type: "php", phpVersion: "8.2", port: 80, status: "running", sslEnabled: true, forceHttps: true, http2: true, backupEnabled: true },
  },
  {
    key: "databases",
    singular: "Database",
    plural: "Databases",
    icon: "Database",
    description: "MySQL / PostgreSQL databases hosted on this server. Sizes are recalculated by the monitoring agent.",
    fields: [
      { key: "name", label: "Database name", type: "text", required: true, placeholder: "shop_db", col: 2 },
      { key: "engine", label: "Engine", type: "select", options: opt(["postgresql", "mysql"]) },
      { key: "encoding", label: "Encoding", type: "text" },
      { key: "sizeMb", label: "Size (MB)", type: "number" },
    ],
    listFields: ["name", "engine", "encoding", "sizeMb"],
    rowActions: [{ key: "db.backup", label: "Backup", icon: "DatabaseZap" }],
    defaultValues: { engine: "postgresql", encoding: "utf8mb4", sizeMb: 0 },
  },
  {
    key: "dbUsers",
    singular: "DB User",
    plural: "DB Users",
    icon: "UserCog",
    description: "Database users and their grants.",
    fields: [
      { key: "username", label: "Username", type: "text", required: true, placeholder: "shop_admin", col: 2 },
      { key: "password", label: "Password", type: "text", placeholder: "••••••••" },
      { key: "host", label: "Host", type: "text" },
      { key: "dbId", label: "Database", type: "select", required: true, optionsFrom: "databases", valueField: "id", labelField: "name" },
      { key: "privileges", label: "Privileges", type: "select", options: opt(["ALL PRIVILEGES", "SELECT", "SELECT, INSERT, UPDATE", "SELECT, INSERT, UPDATE, DELETE"]) },
    ],
    listFields: ["username", "host", "dbId", "privileges"],
    defaultValues: { host: "localhost", privileges: "ALL PRIVILEGES" },
  },
  {
    key: "dnsZones",
    singular: "DNS Zone",
    plural: "DNS Zones",
    icon: "Waypoints",
    description: "Authoritative DNS zones served by the built-in DNS server.",
    fields: [
      { key: "domain", label: "Zone domain", type: "text", required: true, placeholder: "example.com", col: 2 },
      { key: "provider", label: "Provider", type: "select", options: opt(["cloud", "local"]) },
      { key: "status", label: "Status", type: "select", options: opt(["active", "pending"]) },
    ],
    listFields: ["domain", "provider", "status"],
    badge: { field: "status", map: { active: { label: "Active", cls: VALID }, pending: { label: "Pending", cls: WARN } } },
    defaultValues: { provider: "cloud", status: "active" },
  },
  {
    key: "dnsRecords",
    singular: "DNS Record",
    plural: "DNS Records",
    icon: "ListTree",
    description: "Zone records: A, AAAA, CNAME, MX, TXT, SRV, NS.",
    fields: [
      { key: "zoneId", label: "Zone", type: "select", required: true, optionsFrom: "dnsZones", valueField: "id", labelField: "domain" },
      { key: "type", label: "Type", type: "select", options: opt(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"]) },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "value", label: "Value", type: "text", required: true, col: 2 },
      { key: "ttl", label: "TTL (s)", type: "number" },
      { key: "priority", label: "Priority", type: "number" },
    ],
    listFields: ["type", "name", "value", "ttl"],
    defaultValues: { type: "A", name: "@", ttl: 3600, priority: 0 },
  },
  {
    key: "ftpAccounts",
    singular: "FTP Account",
    plural: "FTP Accounts",
    icon: "FolderUp",
    description: "FTP accounts with path isolation and disk quotas.",
    fields: [
      { key: "username", label: "Username", type: "text", required: true, placeholder: "deploy", col: 2 },
      { key: "password", label: "Password", type: "text", placeholder: "••••••••" },
      { key: "path", label: "Home path", type: "text", required: true },
      { key: "status", label: "Status", type: "select", options: opt(["active", "disabled"]) },
      { key: "quotaMb", label: "Quota (MB)", type: "number" },
      { key: "usedMb", label: "Used (MB)", type: "number" },
    ],
    listFields: ["username", "path", "status", "usedMb", "quotaMb"],
    badge: { field: "status", map: { active: { label: "Active", cls: VALID }, disabled: { label: "Disabled", cls: STOPPED } } },
    defaultValues: { path: "/www/wwwroot", status: "active", quotaMb: 10240 },
  },
  {
    key: "cronJobs",
    singular: "Cron Job",
    plural: "Cron Jobs",
    icon: "Clock",
    description: "Scheduled tasks (standard 5-field crontab syntax).",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, placeholder: "Laravel scheduler", col: 2 },
      { key: "schedule", label: "Schedule", type: "text", required: true, placeholder: "* * * * *" },
      { key: "command", label: "Command", type: "text", required: true, placeholder: "php artisan schedule:run", col: 2 },
      { key: "user", label: "Run as", type: "select", options: opt(["root", "www-data", "ubuntu"]) },
      { key: "enabled", label: "Enabled", type: "switch" },
      { key: "lastRun", label: "Last run", type: "readonly" },
      { key: "nextRun", label: "Next run", type: "readonly" },
    ],
    listFields: ["name", "schedule", "command", "enabled", "lastRun"],
    rowActions: [{ key: "cron.run", label: "Run now", icon: "Zap" }],
    defaultValues: { user: "www-data", enabled: true },
  },
  {
    key: "certs",
    singular: "Certificate",
    plural: "SSL Certificates",
    icon: "ShieldCheck",
    description: "TLS certificates. Renewal is handled automatically by the ACME client when auto-renew is on.",
    fields: [
      { key: "domain", label: "Domain", type: "text", required: true, placeholder: "example.com", col: 2 },
      { key: "issuer", label: "Issuer", type: "select", options: opt(["Let's Encrypt", "ZeroSSL", "Self-signed"]) },
      { key: "status", label: "Status", type: "select", options: opt(["valid", "expiring", "expired", "pending"]) },
      { key: "issuedAt", label: "Issued at", type: "readonly" },
      { key: "expiresAt", label: "Expires at", type: "readonly" },
      { key: "autoRenew", label: "Auto-renew", type: "switch" },
      { key: "keyType", label: "Key type", type: "select", options: opt(["RSA 2048", "RSA 4096", "ECDSA P-256"]) },
      { key: "sans", label: "SANs (comma separated)", type: "text", placeholder: "www.example.com, api.example.com", col: 2 },
      { key: "wildcard", label: "Wildcard (*.domain)", type: "switch" },
      { key: "hsts", label: "HSTS preload", type: "switch" },
      { key: "ocsp", label: "OCSP stapling", type: "switch" },
      { key: "cipherProfile", label: "Cipher profile", type: "select", options: opt(["modern", "intermediate", "legacy"]) },
    ],
    listFields: ["domain", "issuer", "sans", "wildcard", "status", "expiresAt"],
    badge: {
      field: "status",
      map: { valid: { label: "Valid", cls: VALID }, expiring: { label: "Expiring", cls: WARN }, expired: { label: "Expired", cls: ERROR }, pending: { label: "Pending", cls: STOPPED } },
    },
    rowActions: [{ key: "cert.renew", label: "Renew", icon: "RefreshCw" }],
    defaultValues: { issuer: "Let's Encrypt", status: "valid", autoRenew: true, keyType: "RSA 2048" },
  },
  {
    key: "firewallRules",
    singular: "Firewall Rule",
    plural: "Firewall Rules",
    icon: "Flame",
    description: "Inbound firewall rules. Reload the firewall after changes.",
    fields: [
      { key: "port", label: "Port", type: "number", required: true, placeholder: "443" },
      { key: "protocol", label: "Protocol", type: "select", options: opt(["TCP", "UDP", "TCP/UDP"]) },
      { key: "source", label: "Source", type: "text" },
      { key: "action", label: "Action", type: "select", options: opt(["allow", "deny"]) },
      { key: "comment", label: "Comment", type: "text", col: 2 },
      { key: "enabled", label: "Enabled", type: "switch" },
    ],
    listFields: ["port", "protocol", "source", "action", "enabled", "comment"],
    badge: { field: "action", map: { allow: { label: "Allow", cls: VALID }, deny: { label: "Deny", cls: ERROR } } },
    defaultValues: { protocol: "TCP", source: "0.0.0.0/0", action: "allow", enabled: true },
  },
  {
    key: "containers",
    singular: "Container",
    plural: "Docker Containers",
    icon: "Boxes",
    description: "Docker containers running on this node.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, placeholder: "redis", col: 2 },
      { key: "image", label: "Image", type: "text", placeholder: "redis:7-alpine" },
      { key: "status", label: "Status", type: "select", options: opt(["running", "stopped", "error"]) },
      { key: "ports", label: "Ports", type: "text", placeholder: "6379:6379" },
      { key: "cpuPct", label: "CPU %", type: "number" },
      { key: "memMb", label: "Memory (MB)", type: "number" },
      { key: "restartPolicy", label: "Restart policy", type: "select", options: opt(["always", "unless-stopped", "on-failure", "no"]) },
    ],
    listFields: ["name", "image", "status", "ports", "cpuPct", "memMb"],
    badge: { field: "status", map: { running: { label: "Running", cls: RUNNING }, stopped: { label: "Stopped", cls: STOPPED }, error: { label: "Error", cls: ERROR } } },
    rowActions: [
      { key: "docker.start", label: "Start", icon: "Play" },
      { key: "docker.stop", label: "Stop", icon: "Square" },
      { key: "docker.restart", label: "Restart", icon: "RotateCcw" },
      { key: "docker.logs", label: "Logs", icon: "ScrollText" },
    ],
    defaultValues: { restartPolicy: "always", status: "running" },
  },
  {
    key: "backups",
    singular: "Backup",
    plural: "Backups",
    icon: "ArchiveRestore",
    description: "Backup archive history. Stored in /backups with integrity checksums.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, placeholder: "backup-example.com-2026-02-18", col: 2 },
      { key: "type", label: "Type", type: "select", options: opt(["website", "database", "system"]) },
      { key: "target", label: "Target", type: "text", placeholder: "example.com" },
      { key: "sizeMb", label: "Size (MB)", type: "number" },
      { key: "status", label: "Status", type: "select", options: opt(["completed", "running", "failed"]) },
      { key: "location", label: "Location", type: "text" },
      { key: "createdAt", label: "Created at", type: "readonly" },
    ],
    listFields: ["name", "type", "target", "sizeMb", "status", "createdAt"],
    badge: { field: "status", map: { completed: { label: "Completed", cls: VALID }, running: { label: "Running", cls: WARN }, failed: { label: "Failed", cls: ERROR } } },
    rowActions: [{ key: "backup.restore", label: "Restore", icon: "RotateCcw" }],
    defaultValues: { type: "website", location: "/backups", status: "completed" },
  },
  {
    key: "backupJobs",
    singular: "Backup Job",
    plural: "Backup Jobs",
    icon: "CalendarClock",
    description: "Scheduled backup jobs with retention policy.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, placeholder: "Daily full backup", col: 2 },
      { key: "scope", label: "Scope", type: "select", options: opt(["all", "websites", "databases", "system"]) },
      { key: "schedule", label: "Schedule (cron)", type: "text", required: true },
      { key: "retention", label: "Retention (days)", type: "number" },
      { key: "enabled", label: "Enabled", type: "switch" },
      { key: "lastRun", label: "Last run", type: "readonly" },
    ],
    listFields: ["name", "scope", "schedule", "retention", "enabled", "lastRun"],
    rowActions: [{ key: "backup.run", label: "Run now", icon: "Zap" }],
    defaultValues: { scope: "all", retention: 14, enabled: true },
  },
  {
    key: "panelUsers",
    singular: "Panel User",
    plural: "Panel Users",
    icon: "Users",
    description: "Accounts that can sign in to this panel. Use strong passwords.",
    fields: [
      { key: "username", label: "Username", type: "text", required: true, placeholder: "admin", col: 2 },
      { key: "password", label: "Password", type: "text", placeholder: "••••••••" },
      { key: "role", label: "Role", type: "select", options: opt(["admin", "operator", "viewer"]) },
      { key: "lastLogin", label: "Last login", type: "readonly" },
      { key: "createdAt", label: "Created", type: "readonly" },
    ],
    listFields: ["username", "role", "lastLogin"],
    defaultValues: { role: "operator" },
  },
  {
    key: "mailDomains",
    singular: "Mail Domain",
    plural: "Mail Domains",
    icon: "Mail",
    description: "Virtual mail domains hosted by the built-in Postfix + Dovecot stack. DKIM is signed per domain and catch-all delivery can be configured.",
    fields: [
      { key: "domain", label: "Mail domain", type: "text", required: true, placeholder: "example.com", col: 2 },
      { key: "status", label: "Status", type: "select", options: opt(["active", "pending"]) },
      { key: "dkim", label: "DKIM signing", type: "switch" },
      { key: "catchAll", label: "Catch-all mailbox", type: "text", placeholder: "admin@example.com" },
    ],
    listFields: ["domain", "status", "dkim", "catchAll"],
    badge: { field: "status", map: { active: { label: "Active", cls: VALID }, pending: { label: "Pending", cls: WARN } } },
    defaultValues: { status: "active", dkim: true },
  },
  {
    key: "mailboxes",
    singular: "Mailbox",
    plural: "Mailboxes",
    icon: "Inbox",
    description: "POP3/IMAP mailboxes with per-account disk quotas. Passwords are encrypted at rest.",
    fields: [
      { key: "email", label: "Email address", type: "text", required: true, placeholder: "user@example.com", col: 2 },
      { key: "domainId", label: "Mail domain", type: "select", required: true, optionsFrom: "mailDomains", valueField: "id", labelField: "domain" },
      { key: "password", label: "Password", type: "text", placeholder: "••••••••" },
      { key: "quotaMb", label: "Quota (MB)", type: "number" },
      { key: "usedMb", label: "Used (MB)", type: "number" },
      { key: "status", label: "Status", type: "select", options: opt(["active", "disabled"]) },
    ],
    listFields: ["email", "domainId", "usedMb", "quotaMb", "status"],
    badge: { field: "status", map: { active: { label: "Active", cls: VALID }, disabled: { label: "Disabled", cls: STOPPED } } },
    defaultValues: { quotaMb: 2048, usedMb: 0, status: "active" },
  },
  {
    key: "smtpSenders",
    singular: "SMTP Sender",
    plural: "SMTP Senders",
    icon: "Send",
    description: "Outbound relays used to send mail. Supports plain SMTP, STARTTLS and implicit SSL with daily rate limits.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, placeholder: "Transactional relay", col: 2 },
      { key: "email", label: "From address", type: "text", required: true, placeholder: "no-reply@example.com", col: 2 },
      { key: "host", label: "SMTP host", type: "text" },
      { key: "port", label: "Port", type: "number" },
      { key: "protocol", label: "Security", type: "select", options: opt(["starttls", "ssl", "smtp"]) },
      { key: "authUser", label: "Auth user", type: "text" },
      { key: "password", label: "Auth password", type: "text", placeholder: "••••••••" },
      { key: "status", label: "Status", type: "select", options: opt(["verified", "unverified", "rate-limited"]) },
      { key: "dailyLimit", label: "Daily limit", type: "number" },
      { key: "sentToday", label: "Sent today", type: "number" },
    ],
    listFields: ["name", "email", "protocol", "sentToday", "dailyLimit", "status"],
    badge: { field: "status", map: { verified: { label: "Verified", cls: VALID }, unverified: { label: "Unverified", cls: WARN }, "rate-limited": { label: "Rate limited", cls: ERROR } } },
    rowActions: [{ key: "smtp.test", label: "Send test", icon: "Send" }],
    defaultValues: { host: "127.0.0.1", port: 587, protocol: "starttls", status: "verified", dailyLimit: 5000, sentToday: 0 },
  },
  {
    key: "campaigns",
    singular: "Campaign",
    plural: "Campaigns",
    icon: "Megaphone",
    description: "Bulk email campaigns with live open/click/bounce tracking. Use ⚡ Send to push a campaign through the queue.",
    fields: [
      { key: "name", label: "Campaign name", type: "text", required: true, placeholder: "Spring sale", col: 2 },
      { key: "subject", label: "Subject", type: "text", required: true, placeholder: "20% off everything", col: 2 },
      { key: "senderId", label: "From (SMTP sender)", type: "select", required: true, optionsFrom: "smtpSenders", valueField: "id", labelField: "email" },
      { key: "sendDomainId", label: "Sending domain (record-verified)", type: "select", required: true, optionsFrom: "sendDomains", valueField: "id", labelField: "domain" },
      { key: "recipients", label: "Recipients", type: "number" },
      { key: "sent", label: "Delivered", type: "number" },
      { key: "opened", label: "Opened", type: "number" },
      { key: "clicked", label: "Clicked", type: "number" },
      { key: "bounced", label: "Bounced", type: "number" },
      { key: "status", label: "Status", type: "select", options: opt(["draft", "sending", "paused", "completed"]) },
    ],
    listFields: ["name", "subject", "sendDomainId", "recipients", "sent", "opened", "status"],
    badge: {
      field: "status",
      map: {
        draft: { label: "Draft", cls: STOPPED },
        sending: { label: "Sending", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
        paused: { label: "Paused", cls: WARN },
        completed: { label: "Completed", cls: VALID },
      },
    },
    rowActions: [
      { key: "campaign.send", label: "Send", icon: "Send" },
      { key: "campaign.pause", label: "Pause", icon: "Pause" },
    ],
    defaultValues: { recipients: 0, sent: 0, opened: 0, clicked: 0, bounced: 0, status: "draft" },
  },
  {
    key: "sendDomains",
    singular: "Sending Domain",
    plural: "Sending Domains",
    icon: "BadgeCheck",
    description:
      "Record-verified domain identities for transactional & campaign email — SPF, DKIM and DMARC published in your DNS. No SMTP credentials needed: verification happens through the DNS records themselves. Different records are generated per domain.",
    fields: [
      { key: "domain", label: "Domain", type: "text", required: true, placeholder: "mail.example.com", col: 2 },
      { key: "status", label: "Verification", type: "select", options: opt(["pending", "verified", "failed"]) },
      { key: "spfRecord", label: "SPF record (TXT @)", type: "readonly" },
      { key: "dkimSelector", label: "DKIM selector", type: "text" },
      { key: "dkimRecord", label: "DKIM record (TXT selector._domainkey)", type: "readonly" },
      { key: "dmarcRecord", label: "DMARC record (TXT _dmarc)", type: "readonly" },
      { key: "dailySent", label: "Sent today", type: "number" },
    ],
    listFields: ["domain", "status", "dkimSelector", "dailySent"],
    badge: {
      field: "status",
      map: { verified: { label: "Verified", cls: VALID }, pending: { label: "Pending", cls: WARN }, failed: { label: "Failed", cls: ERROR } },
    },
    rowActions: [
      { key: "send.records", label: "DNS records", icon: "ScrollText" },
      { key: "send.verify", label: "Verify domain", icon: "BadgeCheck" },
    ],
    defaultValues: { status: "pending", dkimSelector: "servoman", dailySent: 0 },
  },
  {
    key: "sipTrunks",
    singular: "SIP Trunk",
    plural: "SIP Trunks",
    icon: "Cable",
    description: "Carrier trunks connecting the PBX to the PSTN — credentials, codecs and concurrent channel limits per trunk.",
    fields: [
      { key: "name", label: "Trunk name", type: "text", required: true, placeholder: "Primary SIP provider", col: 2 },
      { key: "provider", label: "Provider", type: "text", placeholder: "Telnyx / Twilio / Flowroute" },
      { key: "host", label: "SIP host", type: "text" },
      { key: "port", label: "Port", type: "number" },
      { key: "username", label: "Username", type: "text" },
      { key: "password", label: "Password", type: "text", placeholder: "••••••••" },
      { key: "codecs", label: "Codecs", type: "text" },
      { key: "channels", label: "Max channels", type: "number" },
      { key: "status", label: "Status", type: "select", options: opt(["registered", "unregistered", "failed"]) },
    ],
    listFields: ["name", "provider", "host", "channels", "status"],
    badge: {
      field: "status",
      map: { registered: { label: "Registered", cls: VALID }, unregistered: { label: "Unregistered", cls: WARN }, failed: { label: "Failed", cls: ERROR } },
    },
    rowActions: [{ key: "voip.trunk.test", label: "Test trunk", icon: "PhoneCall" }],
    defaultValues: { port: 5060, codecs: "ulaw,alaw,opus", channels: 4, status: "registered" },
  },
  {
    key: "sipExtensions",
    singular: "SIP Extension",
    plural: "SIP Extensions",
    icon: "Phone",
    description: "VOIP extensions registered on the Asterisk / FreeSWITCH cluster (PJSIP or legacy SIP). Use ⚡ Call to place a test call.",
    fields: [
      { key: "extension", label: "Extension", type: "text", required: true, placeholder: "101" },
      { key: "name", label: "Display name", type: "text", required: true, placeholder: "Support — Alice" },
      { key: "password", label: "SIP password", type: "text", placeholder: "••••••••" },
      { key: "technology", label: "Technology", type: "select", options: opt(["PJSIP", "SIP", "IAX2"]) },
      { key: "context", label: "Dialplan context", type: "text" },
      { key: "status", label: "Registration", type: "select", options: opt(["online", "ringing", "offline"]) },
      { key: "ip", label: "Endpoint IP", type: "text" },
    ],
    listFields: ["extension", "name", "technology", "status", "ip"],
    badge: {
      field: "status",
      map: { online: { label: "Online", cls: VALID }, ringing: { label: "Ringing", cls: WARN }, offline: { label: "Offline", cls: STOPPED } },
    },
    rowActions: [{ key: "voip.call", label: "Place test call", icon: "PhoneCall" }],
    defaultValues: { technology: "PJSIP", context: "from-internal", status: "offline" },
  },
  {
    key: "callLogs",
    singular: "Call Record",
    plural: "Call Records (CDR)",
    icon: "PhoneCall",
    description: "Call detail records — answered, busy, failed and no-answer calls with billing seconds and cost.",
    fields: [
      { key: "src", label: "From", type: "text", required: true, placeholder: "101" },
      { key: "dst", label: "To", type: "text", required: true, placeholder: "+14155550123" },
      { key: "direction", label: "Direction", type: "select", options: opt(["outbound", "inbound"]) },
      { key: "status", label: "Result", type: "select", options: opt(["answered", "busy", "failed", "no-answer"]) },
      { key: "durationSec", label: "Duration (s)", type: "number" },
      { key: "billSec", label: "Billable (s)", type: "number" },
      { key: "cost", label: "Cost (cents)", type: "number" },
      { key: "startedAt", label: "Started at", type: "readonly" },
    ],
    listFields: ["src", "dst", "direction", "status", "durationSec", "cost", "startedAt"],
    badge: {
      field: "status",
      map: { answered: { label: "Answered", cls: VALID }, busy: { label: "Busy", cls: WARN }, failed: { label: "Failed", cls: ERROR }, "no-answer": { label: "No answer", cls: STOPPED } },
    },
    defaultValues: { direction: "outbound", status: "answered", durationSec: 0, billSec: 0, cost: 0 },
  },
  {
    key: "sshKeys",
    singular: "SSH Key",
    plural: "SSH Keys",
    icon: "KeyRound",
    description: "Key pairs for shell access — generated on the server, with the public key ready to paste into GitHub / authorized_keys. Use ⚡ Generate to mint a new pair.",
    fields: [
      { key: "name", label: "Key name", type: "text", required: true, placeholder: "admin-laptop", col: 2 },
      { key: "keyType", label: "Type", type: "select", options: opt(["ed25519", "rsa"]) },
      { key: "keyPath", label: "Private key path", type: "readonly" },
      { key: "publicKey", label: "Public key", type: "readonly" },
      { key: "comment", label: "Comment", type: "text" },
      { key: "status", label: "Status", type: "select", options: opt(["active", "revoked"]) },
    ],
    listFields: ["name", "keyType", "status", "comment"],
    badge: { field: "status", map: { active: { label: "Active", cls: VALID }, revoked: { label: "Revoked", cls: ERROR } } },
    rowActions: [{ key: "ssh.generate", label: "Generate key pair", icon: "KeyRound" }],
    defaultValues: { keyType: "ed25519", status: "active" },
  },
  {
    key: "pythonProjects",
    singular: "Python Project",
    plural: "Python Projects",
    icon: "Code2",
    description:
      "aaPanel-style Python Project Manager: Flask, Django & FastAPI apps on Python 3.10–3.12, each with its own venv, gunicorn/uvicorn/uwsgi mode and port. Use ⚡ to install dependencies or start/stop.",
    fields: [
      { key: "name", label: "Project name", type: "text", required: true, placeholder: "shop-api", col: 2 },
      { key: "version", label: "Python version", type: "select", options: opt(["3.10", "3.11", "3.12"]) },
      { key: "framework", label: "Framework", type: "select", options: opt(["Flask", "Django", "FastAPI", "Other"]) },
      { key: "path", label: "Project path", type: "text" },
      { key: "port", label: "Port", type: "number" },
      { key: "mode", label: "Process mode", type: "select", options: opt(["gunicorn", "uvicorn", "uwsgi"]) },
      { key: "status", label: "Status", type: "select", options: opt(["running", "stopped", "failed"]) },
      { key: "packages", label: "Installed packages", type: "number" },
    ],
    listFields: ["name", "version", "framework", "port", "mode", "packages", "status"],
    badge: { field: "status", map: { running: { label: "Running", cls: RUNNING }, stopped: { label: "Stopped", cls: STOPPED }, failed: { label: "Failed", cls: ERROR } } },
    rowActions: [
      { key: "python.deps", label: "Install dependencies", icon: "Package" },
      { key: "python.start", label: "Start", icon: "Play" },
      { key: "python.stop", label: "Stop", icon: "Square" },
    ],
    defaultValues: { version: "3.12", framework: "Flask", path: "/www/wwwroot", port: 8000, mode: "gunicorn", status: "running", packages: 0 },
  },
  {
    key: "deployments",
    singular: "Deployment",
    plural: "Deployments",
    icon: "Rocket",
    description: "Push-to-deploy applications: Node.js, Python/Flask, PHP and static sites — wired to Nginx with per-app ports and process supervision. Use ⚡ Deploy to trigger a build.",
    fields: [
      { key: "siteId", label: "Website (virtual host)", type: "select", required: true, optionsFrom: "sites", valueField: "id", labelField: "domain" },
      { key: "appType", label: "Runtime", type: "select", required: true, options: opt(["node", "php", "flask", "static"]) },
      { key: "gitRepo", label: "Git repository", type: "text", required: true, placeholder: "https://github.com/acme/app.git", col: 2 },
      { key: "branch", label: "Branch", type: "text" },
      { key: "port", label: "Port", type: "number" },
      { key: "buildCommand", label: "Build command", type: "text", col: 2 },
      { key: "startCommand", label: "Start command", type: "text", col: 2 },
      { key: "status", label: "Status", type: "select", options: opt(["running", "stopped", "failed"]) },
      { key: "autoDeploy", label: "Auto-deploy on push", type: "switch" },
      { key: "lastDeploy", label: "Last deploy", type: "readonly" },
      { key: "lastCommitSha", label: "Last commit", type: "readonly" },
    ],
    listFields: ["siteId", "appType", "branch", "port", "autoDeploy", "status"],
    badge: { field: "status", map: { running: { label: "Running", cls: RUNNING }, stopped: { label: "Stopped", cls: STOPPED }, failed: { label: "Failed", cls: ERROR } } },
    rowActions: [
      { key: "deploy.trigger", label: "Deploy", icon: "Rocket" },
      { key: "deploy.start", label: "Start", icon: "Play" },
      { key: "deploy.stop", label: "Stop", icon: "Square" },
    ],
    defaultValues: { appType: "node", branch: "main", port: 3000, status: "running", buildCommand: "npm install && npm run build", startCommand: "npm start" },
  },
  {
    key: "alerts",
    singular: "Alert",
    plural: "Alerts",
    icon: "BellRing",
    description: "Threshold alerts raised by the monitoring agent.",
    fields: [
      { key: "type", label: "Type", type: "select", options: opt(["system", "security", "backup", "ssl"]) },
      { key: "severity", label: "Severity", type: "select", options: opt(["info", "warning", "critical"]) },
      { key: "message", label: "Message", type: "textarea", required: true, col: 2 },
      { key: "resolved", label: "Resolved", type: "switch" },
      { key: "createdAt", label: "Created", type: "readonly" },
    ],
    listFields: ["severity", "type", "message", "resolved"],
    badge: {
      field: "severity",
      map: { info: { label: "Info", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" }, warning: { label: "Warning", cls: WARN }, critical: { label: "Critical", cls: ERROR } },
    },
    defaultValues: { type: "system", severity: "info" },
  },
];

export const ENTITY_MAP: Record<string, EntityDef> = Object.fromEntries(
  ENTITIES.map((e) => [e.key, e])
);

export const MENU: { section: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    section: "System",
    items: [
      { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/server", label: "Server & Cleanup", icon: "Server" },
      { href: "/monitoring", label: "Monitoring", icon: "ChartSpline" },
      { href: "/processes", label: "Processes", icon: "Cpu" },
      { href: "/logs", label: "Logs", icon: "FileText" },
      { href: "/terminal", label: "Terminal", icon: "TerminalSquare" },
      { href: "/ssh", label: "SSH Keys", icon: "KeyRound" },
    ],
  },
  {
    section: "Web",
    items: [
      { href: "/websites", label: "Websites", icon: "Globe" },
      { href: "/deploy", label: "Deployments", icon: "Rocket" },
      { href: "/php", label: "PHP & Extensions", icon: "Braces" },
      { href: "/python", label: "Python Projects", icon: "Code2" },
      { href: "/dns", label: "DNS", icon: "Waypoints" },
      { href: "/ssl", label: "SSL v2", icon: "ShieldCheck" },
      { href: "/firewall", label: "Firewall", icon: "Flame" },
    ],
  },
  {
    section: "Email & Calls",
    items: [
      { href: "/email", label: "Email Server", icon: "Mail" },
      { href: "/campaigns", label: "Campaigns", icon: "Megaphone" },
      { href: "/voip", label: "VOIP", icon: "Phone" },
    ],
  },
  {
    section: "Data",
    items: [
      { href: "/databases", label: "Databases", icon: "Database" },
      { href: "/ftp", label: "FTP", icon: "FolderUp" },
      { href: "/cron", label: "Cron Jobs", icon: "Clock" },
      { href: "/backups", label: "Backups", icon: "ArchiveRestore" },
    ],
  },
  {
    section: "Compute & Files",
    items: [
      { href: "/docker", label: "Docker", icon: "Boxes" },
      { href: "/files", label: "File Manager", icon: "FolderOpen" },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { href: "/ai", label: "AI Assistant", icon: "Sparkles" },
      { href: "/security", label: "Security", icon: "Fingerprint" },
    ],
  },
  {
    section: "Panel",
    items: [{ href: "/settings", label: "Settings", icon: "Settings" }],
  },
];

export const STATUS_BADGE: BadgeMap = {
  running: { label: "Running", cls: RUNNING },
  stopped: { label: "Stopped", cls: STOPPED },
  active: { label: "Active", cls: VALID },
  valid: { label: "Valid", cls: VALID },
  completed: { label: "Completed", cls: VALID },
  error: { label: "Error", cls: ERROR },
  expired: { label: "Expired", cls: ERROR },
};
