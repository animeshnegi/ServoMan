import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const exec = promisify(execFile);
const SAFE_NAME = /^[a-zA-Z0-9._:@/+,-]+$/;
const SAFE_SERVICE = /^(nginx|docker|postfix|dovecot|fail2ban|redis|postgresql(?:@[0-9]+)?|mysql|mariadb|php[0-9.]+-fpm)$/;
const SAFE_DOMAIN = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
const BACKUP_ROOT = process.env.SERVOMAN_BACKUP_ROOT || "/backups/servoman";

export class ServerOperationError extends Error {
  status = 500;
  constructor(message: string, status = 500) { super(message); this.status = status; }
}

function assertSafeName(value: string, label: string) {
  if (!SAFE_NAME.test(value) || value.includes("..")) throw new ServerOperationError(`Invalid ${label}`, 400);
}

function assertDomain(domain: string) {
  if (!SAFE_DOMAIN.test(domain)) throw new ServerOperationError("Invalid domain", 400);
}

async function run(command: string, args: string[], options: { timeout?: number; cwd?: string } = {}) {
  try {
    const result = await exec(command, args, { timeout: options.timeout ?? 120_000, cwd: options.cwd, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  } catch (e: any) {
    const detail = String(e?.stderr || e?.stdout || e?.message || "command failed").replace(/\s+/g, " ").slice(0, 1000);
    throw new ServerOperationError(detail, 500);
  }
}

async function privileged(command: string, args: string[], options: { timeout?: number; cwd?: string } = {}) {
  if (typeof process.getuid === "function" && process.getuid() === 0) return run(command, args, options);
  return run("sudo", ["-n", command, ...args], options);
}

async function ensureBackupRoot() {
  await privileged("mkdir", ["-p", BACKUP_ROOT]);
  await privileged("chmod", ["700", BACKUP_ROOT]);
}

function backupPath(name: string) {
  assertSafeName(name, "backup name");
  return path.join(BACKUP_ROOT, `${name}.tar.gz`);
}

function safeRestoreTarget(target: string) {
  const resolved = path.resolve(target);
  const allowed = ["/var/www", "/www", "/srv", "/home"];
  if (!allowed.some((prefix) => resolved === prefix || resolved.startsWith(prefix + path.sep))) {
    throw new ServerOperationError("Restore target is outside the allowed website roots", 400);
  }
  return resolved;
}

export async function docker(action: "start" | "stop" | "restart", name: string) {
  assertSafeName(name, "container name");
  await run("docker", ["container", action, name]);
  const state = await run("docker", ["inspect", "--format", "{{.State.Status}}", name]);
  return state.stdout;
}

export async function dockerLogs(name: string, tail = 200) {
  assertSafeName(name, "container name");
  const n = Math.max(1, Math.min(2000, Number(tail) || 200));
  const result = await run("docker", ["container", "logs", "--timestamps", "--tail", String(n), name]);
  return result.stdout || result.stderr;
}

export async function service(action: "start" | "stop" | "restart" | "reload" | "status", serviceName: string) {
  if (!SAFE_SERVICE.test(serviceName)) throw new ServerOperationError("Service is not allowed", 400);
  if (action === "status") return (await privileged("systemctl", ["is-active", serviceName])).stdout;
  await privileged("systemctl", [action, serviceName]);
  return (await privileged("systemctl", ["is-active", serviceName])).stdout;
}

export async function firewall(enabled: boolean, confirmDisable = false) {
  if (!enabled && !confirmDisable) throw new ServerOperationError("Disabling the firewall requires explicit confirmation", 400);
  if (enabled) {
    await privileged("ufw", ["--force", "enable"]);
  } else {
    await privileged("ufw", ["disable"]);
  }
  return (await privileged("ufw", ["status", "verbose"])).stdout;
}

export async function firewallRule(action: "allow" | "deny" | "delete", port: number, protocol = "tcp", source?: string) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ServerOperationError("Invalid firewall port", 400);
  const proto = protocol.toLowerCase();
  if (!/^(tcp|udp)$/.test(proto)) throw new ServerOperationError("Invalid firewall protocol", 400);
  const args = action === "delete" ? ["delete", "allow", `${port}/${proto}`] : [action, `${port}/${proto}`];
  if (source && source !== "0.0.0.0/0") {
    if (!/^[0-9a-fA-F:.\/]+$/.test(source)) throw new ServerOperationError("Invalid firewall source", 400);
    args.splice(action === "delete" ? 2 : 1, 0, "from", source);
  }
  await privileged("ufw", args);
  return (await privileged("ufw", ["status", "numbered"])).stdout;
}

export async function issueCertificate(domain: string, email: string, renew = false) {
  assertDomain(domain);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ServerOperationError("A valid ACME email is required", 400);
  if (renew) {
    await privileged("certbot", ["renew", "--cert-name", domain, "--non-interactive"]);
  } else {
    await privileged("certbot", ["certonly", "--nginx", "-d", domain, "--non-interactive", "--agree-tos", "--email", email]);
  }
  const result = await privileged("certbot", ["certificates", "--cert-name", domain]);
  return result.stdout;
}

export async function renewCertificates() {
  const result = await privileged("certbot", ["renew", "--non-interactive"]);
  return result.stdout || result.stderr;
}

export async function testCertificateRenewal() {
  const result = await privileged("certbot", ["renew", "--dry-run", "--non-interactive"], { timeout: 180_000 });
  return result.stdout || result.stderr;
}

export async function backupDirectory(source: string, name: string) {
  const resolved = path.resolve(source);
  const allowed = ["/var/www", "/www", "/srv", "/home"];
  if (!allowed.some((prefix) => resolved === prefix || resolved.startsWith(prefix + path.sep))) throw new ServerOperationError("Backup source is outside allowed roots", 400);
  await ensureBackupRoot();
  const destination = backupPath(name);
  await privileged("tar", ["-czf", destination, "--one-file-system", "-C", "/", resolved.replace(/^\//, "")], { timeout: 300_000 });
  const stat = await privileged("stat", ["-c", "%s", destination]);
  return { path: destination, sizeMb: Math.ceil(Number(stat.stdout) / 1048576) };
}

export async function restoreDirectory(archive: string, target: string) {
  const resolvedArchive = path.resolve(archive);
  if (!resolvedArchive.startsWith(path.resolve(BACKUP_ROOT) + path.sep) || !resolvedArchive.endsWith(".tar.gz")) throw new ServerOperationError("Invalid backup archive", 400);
  const resolvedTarget = safeRestoreTarget(target);
  await privileged("mkdir", ["-p", resolvedTarget]);
  await privileged("tar", ["-xzf", resolvedArchive, "-C", "/"], { timeout: 300_000 });
  return resolvedTarget;
}

export async function backupDatabase(name: string, engine: string) {
  assertSafeName(name, "database name");
  await ensureBackupRoot();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (engine.toLowerCase().includes("postgres")) {
    const file = path.join(BACKUP_ROOT, `${name}-${timestamp}.sql`);
    await privileged("pg_dump", ["--format=plain", "--no-owner", "--no-privileges", "--file", file, name], { timeout: 300_000 });
    const stat = await privileged("stat", ["-c", "%s", file]);
    return { path: file, sizeMb: Math.ceil(Number(stat.stdout) / 1048576) };
  }
  if (engine.toLowerCase().includes("mysql") || engine.toLowerCase().includes("maria")) {
    const file = path.join(BACKUP_ROOT, `${name}-${timestamp}.sql`);
    await privileged("mysqldump", ["--single-transaction", "--routines", "--events", name], { timeout: 300_000 });
    // Re-run through a shell-free pipe is not available with execFile; use mysqldump's file option.
    await privileged("mysqldump", ["--single-transaction", "--routines", "--events", "--result-file", file, name], { timeout: 300_000 });
    const stat = await privileged("stat", ["-c", "%s", file]);
    return { path: file, sizeMb: Math.ceil(Number(stat.stdout) / 1048576) };
  }
  throw new ServerOperationError(`Unsupported database engine: ${engine}`, 400);
}

export async function generateSshKey(name: string, keyType = "ed25519", comment = "ServoMan") {
  assertSafeName(name, "key name");
  if (keyType !== "ed25519" && keyType !== "rsa") throw new ServerOperationError("Unsupported SSH key type", 400);
  const dir = "/var/lib/servoman/ssh";
  await privileged("mkdir", ["-p", dir]);
  await privileged("chmod", ["700", dir]);
  const file = path.join(dir, name);
  const args = ["-t", keyType, "-f", file, "-N", "", "-C", comment.slice(0, 200)];
  if (keyType === "rsa") args.splice(2, 0, "-b", "4096");
  await privileged("ssh-keygen", args);
  const pub = (await privileged("cat", [`${file}.pub`])).stdout;
  await privileged("chmod", ["600", file]);
  await privileged("chmod", ["644", `${file}.pub"]);
  return { keyPath: file, publicKey: pub };
}

export async function systemReboot(delaySeconds = 60) {
  const delay = Math.max(30, Math.min(3600, Math.floor(delaySeconds)));
  await privileged("shutdown", ["-r", `+${Math.ceil(delay / 60)}`, "ServoMan requested reboot"]);
  return `reboot scheduled in approximately ${Math.ceil(delay / 60)} minute(s)`;
}

export async function cleanup(target: string) {
  const results: Array<{ label: string; freed: string }> = [];
  if (target === "all" || target === "apt") {
    await privileged("apt-get", ["clean"]);
    results.push({ label: "APT package cache", freed: "cleaned" });
  }
  if (target === "all" || target === "tmp") {
    await privileged("find", ["/tmp", "-xdev", "-type", "f", "-mtime", "+7", "-delete"]);
    results.push({ label: "Stale /tmp files", freed: "cleaned" });
  }
  if (target === "all" || target === "logs") {
    await privileged("journalctl", ["--vacuum-time=7d"]);
    results.push({ label: "System journal", freed: "vacuumed to 7 days" });
  }
  if (target === "all" || target === "docker") {
    await run("docker", ["image", "prune", "-f"]);
    results.push({ label: "Docker dangling images", freed: "pruned" });
  }
  return results;
}

export async function hostInfo() {
  const [uname, uptime, disk, memory] = await Promise.all([
    run("uname", ["-a"]),
    run("uptime", ["-p"]),
    run("df", ["-Pk", "/"]),
    run("free", ["-b"]),
  ]);
  return { hostname: os.hostname(), uname: uname.stdout, uptime: uptime.stdout, disk: disk.stdout, memory: memory.stdout };
}
