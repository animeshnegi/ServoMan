// AI assistant: uses OpenAI when OPENAI_API_KEY is configured,
// otherwise falls back to a rule-based ops engine that reasons about
// live server state (real metrics + database facts).
import { db } from "@/db";
import { certs, backups, sites, containers, settings } from "@/db/schema";
import { readMeminfo, diskUsage, systemInfo, round1 } from "@/lib/metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Snapshot {
  mem: ReturnType<typeof readMeminfo>;
  disk: ReturnType<typeof diskUsage>;
  info: ReturnType<typeof systemInfo>;
  certs: any[];
  backups: any[];
  sites: any[];
  containers: any[];
  settings: Record<string, string>;
}

async function snapshot(): Promise<Snapshot> {
  const [certsRows, backupsRows, sitesRows, containerRows, settingsRows] =
    await Promise.all([
      db.select().from(certs).catch(() => []),
      db.select().from(backups).catch(() => []),
      db.select().from(sites).catch(() => []),
      db.select().from(containers).catch(() => []),
      db.select().from(settings).catch(() => []),
    ]);
  const map: Record<string, string> = {};
  for (const r of settingsRows as any[]) map[r.key] = r.value;
  return {
    mem: readMeminfo(),
    disk: diskUsage("/"),
    info: systemInfo(),
    certs: certsRows as any[],
    backups: backupsRows as any[],
    sites: sitesRows as any[],
    containers: containerRows as any[],
    settings: map,
  };
}

function ctxString(s: Snapshot): string {
  const memPct = round1((s.mem.used / Math.max(s.mem.total, 1)) * 100);
  const expSoon = s.certs.filter(
    (c) => c.expiresAt && new Date(c.expiresAt).getTime() - Date.now() < 21 * 86400000
  ).map((c) => c.domain);
  const lastBackup = s.backups
    .filter((b) => b.status === "completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return `Server: ${s.info.hostname}, ${s.info.distro}, ${s.info.kernel}. CPU: ${s.info.cores} cores.
Memory used: ${memPct}% (${(s.mem.used / 1073741824).toFixed(1)} GB of ${(s.mem.total / 1073741824).toFixed(1)} GB).
Disk used: ${s.disk.pct}%.
Websites: ${s.sites.length} (${s.sites.filter((x) => x.status === "running").length} running).
Containers: ${s.containers.length}.
Certificates expiring soon: ${expSoon.length ? expSoon.join(", ") : "none"}.
Last backup: ${lastBackup ? `${lastBackup.name} at ${new Date(lastBackup.createdAt).toISOString()}` : "none"}.`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const messages: { role: string; content: string }[] = body.messages || [];
  const last = [...messages].reverse().find((m) => m.role === "user");
  const question = (last?.content || "").trim();
  if (!question) return Response.json({ error: "Empty prompt" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const s = await snapshot();
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are SERVOMAN AI, the operations assistant of a lightweight web hosting control panel (cPanel/aaPanel class) managing an Ubuntu 24.04 cloud server. Answer concisely and technically, with actionable commands. Current live server state:\n" +
                ctxString(s),
            },
            ...messages.slice(-8),
          ],
          max_tokens: 700,
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return Response.json({ reply: text, engine: "openai" });
    } catch {
      /* fall back to local engine */
    }
  }

  // ---- Local rule-based ops engine ----
  const s = await snapshot();
  const reply = localEngine(question, s);
  return Response.json({ reply, engine: "local" });
}

function localEngine(q: string, s: Snapshot): string {
  const t = q.toLowerCase();
  const memPct = round1((s.mem.used / Math.max(s.mem.total, 1)) * 100);
  const memGb = (s.mem.used / 1073741824).toFixed(1);
  const memTotalGb = (s.mem.total / 1073741824).toFixed(1);
  const expSoon = s.certs.filter(
    (c) => c.expiresAt && new Date(c.expiresAt).getTime() - Date.now() < 21 * 86400000
  );
  const expired = expSoon.filter((c) => new Date(c.expiresAt).getTime() < Date.now());
  const lastBackup = s.backups
    .filter((b) => b.status === "completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const badContainers = s.containers.filter((c) => c.status !== "running");
  const stoppedSites = s.sites.filter((x) => x.status !== "running");
  const fw = s.settings.firewall_enabled !== "false";

  const has = (...keys: string[]) => keys.some((k) => t.includes(k));

  if (has("help", "what can you do", "features", "capabil")) {
    return `I'm SERVOMAN AI — I can help you operate this server. Try asking me:

• **Diagnostics** — "is anything wrong?", "why is the server slow?", "check SSL"
• **Email** — "how do I verify a sending domain?", "SPF and DKIM setup"
• **Resources** — "how much RAM is left?", "disk usage", "clean the server"
• **Security** — "run a security review", "is the firewall on?"
• **Backups** — "when was the last backup?"
• **Commands** — "nginx reload command", "show mysql slow queries"
• **Sites** — "which websites are down?", "how do I deploy a Flask app?"

I read live metrics and panel data in real time, so my answers reflect the actual server state.`;
  }

  if (has("ssl", "cert", "https", "tls")) {
    const parts: string[] = [];
    parts.push(`TLS status for ${s.certs.length} certificate(s):`);
    for (const c of s.certs) {
      const d = c.expiresAt ? new Date(c.expiresAt) : null;
      const days = d ? Math.round((d.getTime() - Date.now()) / 86400000) : null;
      parts.push(`- **${c.domain}** — ${c.status}${days !== null ? ` (${days > 0 ? `${days} days left` : "EXPIRED"})` : ""}${c.autoRenew ? ", auto-renew on" : ", auto-renew OFF"}`);
    }
    if (expired.length) parts.push(`\n⚠️ ${expired.map((c) => c.domain).join(", ")} has expired — run \`certbot renew --force-renewal\` or use the SSL page's Renew button.`);
    else if (expSoon.length) parts.push(`\nRenewal is due soon for ${expSoon.map((c) => c.domain).join(", ")}. I'd renew those within a week.`);
    else parts.push(`\nAll certificates are healthy. Auto-renew handles them before expiry.`);
    return parts.join("\n");
  }

  if (has("ram", "memory", "mem", "oom", "swap")) {
    if (memPct > 85)
      return `Memory is **under pressure**: ${memGb} GB of ${memTotalGb} GB used (${memPct}%).\n\nAction plan:\n1. \`ps aux --sort=-%mem | head\` to find the top consumers\n2. Check swap: \`free -h\` — if swap is fully used, the kernel is thrashing\n3. Consider raising your PHP-FPM/MySQL limits or adding swap. I can monitor this for you on the Monitoring page.`;
    return `Memory looks healthy: ${memGb} GB used of ${memTotalGb} GB (${memPct}%).\n\nTop-level check: \`free -h\` or the Processes page for per-process RSS. No action needed.`;
  }

  if (has("disk", "storage", "space", "inode")) {
    if (s.disk.pct > 85)
      return `Disk is **${s.disk.pct}% full** — this is critical.\n\nRecommended:\n1. \`du -sh /var/log /backups /www/wwwroot/*\` to find large directories\n2. \`journalctl --vacuum-size=200M\` to shrink system logs\n3. \`find /tmp -mtime +7 -delete\` for stale temp files\n4. Run a cleanup from the panel.`;
    return `Disk usage is fine at ${s.disk.pct}% (${(s.disk.used / 1073741824).toFixed(1)} GB used). No action required.`;
  }

  if (has("slow", "performance", "optimiz", "speed up", "fast")) {
    return `Performance checklist for this server:

1. **PHP** — enable OPcache and set \`pm = dynamic\` in PHP-FPM pools
2. **Nginx** — enable gzip/brotli, HTTP/2 (already toggled per site in Websites), and add caching headers
3. **MySQL/PostgreSQL** — \`mysqltuner\` audit or check \`pg_stat_statements\` for slow queries
4. **Redis** — cache sessions and frequent queries; your Docker container list shows ${s.containers.length} container(s)
5. **Assets** — serve /static with long \`Cache-Control\`, use a CDN for media

Run the Security scan for a systematic review, and watch the Monitoring charts after each change.`;
  }

  if (has("security", "hack", "attack", "brute", "hardening", "vulnerab")) {
    const lines: string[] = [];
    lines.push(fw ? "✅ Firewall (ufw) is active." : "❌ **Firewall is disabled** — enable it in the Firewall page immediately.");
    lines.push(s.settings.fail2ban_enabled !== "false" ? "✅ Fail2ban is running." : "❌ Fail2ban is off — enable intrusion prevention in Settings.");
    if (expired.length) lines.push(`❌ Expired certificates: ${expired.map((c) => c.domain).join(", ")}.`);
    if (!lastBackup || Date.now() - new Date(lastBackup.createdAt).getTime() > 3 * 86400000)
      lines.push("⚠️ No recent backup — schedule one in Backups.");
    else lines.push("✅ Recent backup exists.");
    if (badContainers.length) lines.push(`⚠️ Containers not running: ${badContainers.map((c) => c.name).join(", ")}.`);
    lines.push("\nExtra hardening: enable unattended-upgrades (`dpkg-reconfigure unattended-upgrades`), restrict SSH to key auth, and keep panel users' passwords strong.");
    return lines.join("\n");
  }

  if (has("backup", "restore")) {
    const last = lastBackup;
    return last
      ? `Last completed backup: **${last.name}** (${last.type} / ${last.target}) on ${new Date(last.createdAt).toISOString().slice(0, 16)}Z.\n\nTotal archives: ${s.backups.length}. Restore any of them from the Backups page — restores are verified against checksums.`
      : `No backups yet. Create one from the Backups page — I recommend a full (websites + databases) snapshot daily at 03:00 with 14-day retention.`;
  }

  if (has("down", "offline", "error", "not working", "failed", "status", "anything wrong", "issue", "problem")) {
    const problems: string[] = [];
    if (stoppedSites.length) problems.push(`websites not running: ${stoppedSites.map((x) => x.domain).join(", ")}`);
    if (badContainers.length) problems.push(`containers not running: ${badContainers.map((c) => c.name).join(", ")}`);
    if (expired.length) problems.push(`expired certificates: ${expired.map((c) => c.domain).join(", ")}`);
    if (memPct > 85) problems.push(`memory pressure at ${memPct}%`);
    if (s.disk.pct > 85) problems.push(`disk at ${s.disk.pct}%`);
    if (!fw) problems.push("firewall disabled");
    if (!problems.length)
      return `Everything looks healthy right now: all ${s.sites.length} site(s) running, ${s.containers.length} container(s) up, memory at ${memPct}%, disk at ${s.disk.pct}%. ✅`;
    return `I found the following issues:\n\n- ${problems.join("\n- ")}\n\nTell me which one to dive into, or head to the relevant page — I've linked everything in the sidebar.`;
  }

  if (has("command", "nginx reload", "restart nginx", "reload", "mysql", "postgres", "dump")) {
    if (has("nginx"))
      return "```bash\nnginx -t              # test configuration\nsystemctl reload nginx\n# or from the panel: Websites → Start/Stop\n```";
    if (has("mysql"))
      return "```bash\nsystemctl restart mysql\nmysqladmin -u root status\n# slow query log:\nmysqldumpslow -s t /var/log/mysql/mysql-slow.log\n```";
    if (has("postgres"))
      return "```bash\nsystemctl restart postgresql\npg_stat_activity  # via psql:\nSELECT pid, state, query FROM pg_stat_activity WHERE state='active';\n```";
    if (has("dump"))
      return "```bash\n# MySQL\nmysqldump -u root mydb > /backups/mydb.sql\n# PostgreSQL\npg_dump -U postgres mydb > /backups/mydb.dump\n# or use Databases → Backup in this panel\n```";
  }

  if (has("send domain", "sending domain", "dkim", "spf", "dmarc", "verify domain", "record-verified", "transactional")) {
    return `**Record-verified email sending** (no SMTP credentials):

1. Go to **Email Server → Record-verified sending domains** and add your domain
2. Click ⚡ **DNS records** — SERVOMAN generates unique SPF, DKIM and DMARC records for that domain
3. Publish the three TXT records at your DNS provider:
   • SPF at the root: the TXT value shown
   • DKIM at \`<selector>._domainkey.<domain>\`
   • DMARC at \`_dmarc.<domain>\`
4. Click ⚡ **Verify domain** — SERVOMAN checks the DKIM record in public DNS
5. Pick that domain on any campaign — delivery then goes out authenticated by your DNS records, with a separate daily counter per domain

Each domain gets different records and its own identity — use a separate sending domain per product, e.g. \`mail.acme.com\`, \`mail.blog.example.com\`.`;
  }

  if (has("flask", "python", "django", "fastapi", "gunicorn")) {
    return `**Python on SERVOMAN** — two ways:

1. **Python Projects** page (aaPanel-style manager): Flask / Django / FastAPI on Python 3.10–3.12, each with its own venv, gunicorn/uvicorn/uwsgi mode and port. Use ⚡ to install dependencies or start/stop.
2. **Git Deployments**: add an app with runtime **Flask** for push-to-deploy:
   • Build: \`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt\`
   • Start: \`.venv/bin/gunicorn -w 3 -b 127.0.0.1:8000 app:app\`

Then Nginx reverse-proxies the domain to the app port. Gunicorn worker count ≈ 2 × CPU cores + 1. Add SSL from the SSL v2 page when ready.`;
  }

  if (has("clean", "cleanup", "purge", "free space")) {
    return `**Cleaning options** are on the **Server & Cleanup** page — one click each:

• Page cache & buffers (real memory cache drop)
• Stale /tmp files older than 7 days
• APT package cache
• Rotated logs (journalctl vacuum)
• Docker dangling images
• Backups past retention

Every run is written to the audit trail. For manual cleanup:
\`\`\`bash
sync && echo 3 > /proc/sys/vm/drop_caches   # page cache
apt clean                                   # apt cache
journalctl --vacuum-size=200M               # logs
docker image prune -f                       # docker
\`\`\``;
  }

  if (has("git", "deploy", "webhook", "push", "repository", "clone")) {
    return `**Git deployments** in this panel:

• **Deployments page** — connect any GitHub / GitLab repository (HTTPS or SSH URL) for Node.js, Flask, PHP or static apps
• **Clone / Pull** — real git runs on the server; the panel clones into the site's document root and keeps a clean working tree
• **Push-to-deploy** — each deployment has a secret webhook URL. Add it to GitHub → Settings → Webhooks → *Just the push event* and every \`git push\` triggers pull + rebuild
• **Auto-deploy toggle** — ON = rebuild on every push, OFF = only record the commit
• **Branch switching** — pick any remote branch from the dropdown; deploy from \`develop\`, \`staging\`, etc.

From the terminal, a manual equivalent:
\`\`\`bash
git clone -b main --depth 1 <repo> /www/wwwroot/<domain>
cd /www/wwwroot/<domain> && git pull origin main
\`\`\``;
  }

  if (has("upgrade", "update", "apt")) {
    return `To update this Ubuntu server:

\`\`\`bash
sudo apt update
sudo apt upgrade -y
sudo apt autoremove
# kernel updates need a reboot — schedule one from Settings
\`\`\`

Enable \`unattended-upgrades\` if you want security patches applied automatically.`;
  }

  // Default overview
  return `Here's the current state of **${s.info.hostname}** (${s.info.distro}):

- 💾 Memory: ${memPct}% (${memGb} GB / ${memTotalGb} GB)
- 💽 Disk: ${s.disk.pct}%
- 🌐 Websites: ${s.sites.length} (${s.sites.filter((x) => x.status === "running").length} running)
- 📦 Containers: ${s.containers.length} (${badContainers.length} stopped/error)
- 🔒 SSL: ${expired.length} expired, ${expSoon.length - expired.length} expiring soon
- 💼 Last backup: ${lastBackup ? lastBackup.name : "none"}

Ask me about **SSL, backups, security, performance, memory, disk** or type **help** to see what I can do.`;
}
