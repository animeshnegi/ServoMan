/** Map generic CRUD resources to least-privilege permissions. */
export const RESOURCE_PERMISSIONS: Record<string, string> = {
  sites: "sites.read",
  databases: "databases.read",
  dbUsers: "databases.read",
  dnsZones: "dns.read",
  dnsRecords: "dns.read",
  ftpAccounts: "sites.read",
  cronJobs: "services.read",
  certs: "sites.read",
  firewallRules: "services.read",
  containers: "containers.read",
  backups: "backups.read",
  backupJobs: "backups.read",
  alerts: "monitoring.read",
  panelUsers: "admin.users",
  auditLogs: "admin.audit",
  settings: "admin.settings",
  mailDomains: "sites.read",
  mailboxes: "sites.read",
  smtpSenders: "sites.read",
  sipExtensions: "services.read",
  sipTrunks: "services.read",
  callLogs: "services.read",
  campaigns: "sites.read",
  sendDomains: "sites.read",
  deployments: "deployments.read",
  sshKeys: "admin.ssh",
  pythonProjects: "deployments.read",
};

export function permissionForResource(resource: string, method: string) {
  const base = RESOURCE_PERMISSIONS[resource];
  if (!base) return null;
  if (method === "GET") return base;
  if (base.startsWith("admin.")) return base;
  return base.replace(/\.read$/, ".write");
}
