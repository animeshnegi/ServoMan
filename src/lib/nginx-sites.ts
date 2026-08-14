import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const DOMAIN = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
const ROOTS = ["/var/www", "/www", "/srv", "/home"];
const SERVICE_NAME = /^[a-zA-Z0-9._-]+$/;

function safeDomain(domain: string) { if (!DOMAIN.test(domain)) throw new Error("Invalid domain"); }
function safeRoot(root: string) { const resolved = path.resolve(root); if (!ROOTS.some((r) => resolved === r || resolved.startsWith(r + path.sep))) throw new Error("Website root is outside allowed roots"); return resolved; }
async function privileged(command: string, args: string[]) { if (typeof process.getuid === "function" && process.getuid() === 0) return exec(command, args, { maxBuffer: 1024 * 1024 }); return exec("sudo", ["-n", command, ...args], { maxBuffer: 1024 * 1024 }); }
function configFor(site: { domain: string; rootPath: string; type: string; port: number; phpVersion?: string }) {
  const domain = site.domain; const root = safeRoot(site.rootPath); const type = site.type.toLowerCase();
  if (!SERVICE_NAME.test(domain)) throw new Error("Invalid domain for nginx site name");
  const common = `server {\n    listen 80;\n    server_name ${domain};\n    root ${root};\n    index index.html index.htm index.php;\n    client_max_body_size 64m;\n`;
  if (type === "php") {
    const version = (site.phpVersion || "8.3").replace(/[^0-9.]/g, "");
    return `${common}    location / { try_files $uri $uri/ =404; }\n    location ~ \\.php$ { try_files $uri =404; include fastcgi_params; fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; fastcgi_pass unix:/run/php/php${version}-fpm.sock; }\n    location ~ /\\. { deny all; }\n}\n`;
  }
  if (type === "node" || type === "flask" || type === "python") return `${common}    location / { proxy_pass http://127.0.0.1:${Number(site.port) || 3000}; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }\n}\n`;
  return `${common}    location / { try_files $uri $uri/ =404; }\n    location ~ /\\. { deny all; }\n}\n`;
}

async function reloadNginx() { await privileged("nginx", ["-t"]); await privileged("systemctl", ["reload", "nginx"]); }

export async function createOrUpdateNginxSite(site: { domain: string; rootPath: string; type: string; port: number; phpVersion?: string }) {
  safeDomain(site.domain); const root = safeRoot(site.rootPath); await privileged("mkdir", ["-p", root]); await privileged("chown", ["www-data:www-data", root]);
  const tmp = path.join("/tmp", `servoman-${site.domain}-${process.pid}.conf`); await fs.writeFile(tmp, configFor(site), { mode: 0o600 });
  const available = `/etc/nginx/sites-available/${site.domain}`; const enabled = `/etc/nginx/sites-enabled/${site.domain}`;
  try { await privileged("install", ["-m", "0644", tmp, available]); await privileged("ln", ["-sfn", available, enabled]); await reloadNginx(); } finally { await fs.rm(tmp, { force: true }); }
}
export async function disableNginxSite(domain: string) { safeDomain(domain); const enabled = `/etc/nginx/sites-enabled/${domain}`; await privileged("rm", ["-f", enabled]); await reloadNginx(); }
export async function enableNginxSite(domain: string) { safeDomain(domain); const available = `/etc/nginx/sites-available/${domain}`; const enabled = `/etc/nginx/sites-enabled/${domain}`; await privileged("test", ["-f", available]); await privileged("ln", ["-sfn", available, enabled]); await reloadNginx(); }
export async function deleteNginxSite(domain: string) { safeDomain(domain); await privileged("rm", ["-f", `/etc/nginx/sites-enabled/${domain}`, `/etc/nginx/sites-available/${domain}`]); await reloadNginx(); }
