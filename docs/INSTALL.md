# SERVOMAN — Installation Guide (Ubuntu 24.04 LTS)

SERVOMAN is a **lightweight** self-hosted server & website control panel
(cPanel / aaPanel class) with features those panels don't ship: an AI ops
assistant, security scoring, git push-to-deploy, record-verified email
sending and anomaly detection. Single Node process, ~120 MB RAM.

---

## 1. Quick install (recommended)

Upload the SERVOMAN project folder to your Ubuntu 24.04 cloud server, then:

```bash
cd servoman
sudo bash install.sh
```

With optional extras:

```bash
sudo bash install.sh --with-dovecot   # IMAP/POP3 for the built-in mail server
sudo bash install.sh --with-voip      # Asterisk SIP server for the VOIP manager
sudo bash install.sh --with-dovecot --with-voip
```

The installer is fully automated — it:

| Step | What happens |
|------|--------------|
| 1 | Installs system packages: Nginx, PostgreSQL 16, PHP-FPM 8.3, Python 3.12 (venv), Redis, Postfix, fail2ban, ufw |
| 2 | Installs Node.js 22 LTS |
| 3 | Creates an unprivileged `servoman` system user |
| 4 | Creates the PostgreSQL database + user (password printed at the end) |
| 5 | Copies the panel to `/opt/servoman` and writes `.env` |
| 6 | Runs `npm install`, `drizzle-kit push`, seeds demo data, `npm run build` |
| 7 | Registers a `servoman.service` systemd unit (port 3100, memory capped at 512 MB) |
| 8 | Wires Nginx as reverse proxy on port 80 with security headers |
| 9 | Enables ufw and opens ports 22/80/443 (+ mail/VOIP ports with flags) |

After install, open `http://<your-server-ip>` and the panel appears.

---

## 1.5 Accessing the admin panel on a live Ubuntu server

```text
Your computer ──(ssh)──> Ubuntu 24.04 cloud server ──> SERVOMAN
```

1. **Get a server** — AWS EC2, DigitalOcean, Hetzner, Vultr, Linode… choose Ubuntu 24.04 LTS.
2. **Upload SERVOMAN** — from your machine:

   ```bash
   scp -r servoman user@<server-ip>:~/       # or: git clone <your-repo> on the server
   ```

3. **SSH in and install**:

   ```bash
   ssh user@<server-ip>
   cd servoman
   sudo bash install.sh
   ```

4. **Open the panel** in your browser: `http://<server-ip>`.
   The installer prints your **login** (HTTP basic auth, generated at install time):
   - user: `servoman`, password: the random one printed on screen
   - change it any time: `htpasswd -b /etc/nginx/.servoman_admin servoman NewPass123`
   - also update the seeded panel admin password in **Panel Users** (Settings page)

5. **Open the firewall port** if your cloud provider blocks port 80 (AWS/DO security
   groups often need an inbound rule for 80/tcp and 443/tcp added in their console).

6. **Enable HTTPS** — issue a certificate for the panel's domain from the
   **SSL v2** page (or `certbot --nginx -d panel.yourdomain.com`). SERVOMAN also
   supports fail2ban for the panel and you can restrict access further:
   `ufw allow from <your-ip> to any port 80,443`.

7. **Prefer no public exposure at all?** Use an SSH tunnel from your laptop:

   ```bash
   ssh -L 8443:127.0.0.1:80 user@<server-ip>
   # then open http://127.0.0.1:8443 in your browser
   ```

Service management: `systemctl restart servoman` · `journalctl -u servoman -f`.

---

## 2. Manual install (if you prefer step-by-step)

```bash
# 1. system packages
sudo apt update
sudo apt install -y curl gnupg ca-certificates build-essential git python3 python3-venv \
  nginx postgresql redis-server postfix fail2ban ufw php-fpm php-cli

# 2. Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

# 3. database
sudo -u postgres psql -c "CREATE USER servoman WITH PASSWORD 'choose-a-password';"
sudo -u postgres psql -c "CREATE DATABASE servoman OWNER servoman;"

# 4. build & seed
echo 'DATABASE_URL=postgresql://servoman:choose-a-password@127.0.0.1:5432/servoman' > .env
npm install
npx drizzle-kit push
npx tsx src/db/seed.ts
npm run build

# 5. run (see install.sh for the systemd unit + nginx site)
PORT=3100 npm run start
```

---

## 2b. Why SERVOMAN is so small (measured)

| What | Size | Notes |
|------|------|-------|
| SERVOMAN's own code (`src/`) | **604 KB** | 49 files, ~8,300 lines |
| Full uploadable package (code + installer + docs) | **~1 MB** | without `node_modules` |
| Production build output (`.next/`) | ~22 MB | compiled JavaScript |
| Node toolchain (`node_modules/`) | ~755 MB | shared React/Next.js libraries — installed on the server but identical to any Node app's runtime |
| RAM while running | **~128 MB, one process** | measured on the live panel (Server page shows it) |

cPanel/aaPanel are 500 MB+ because they **bundle their own copies of everything**:
prebuilt Apache + multiple compiled PHP versions, their own Perl/Python stacks,
MySQL/MariaDB, mail + antivirus suites, and per-OS binary archives. They also keep
many of those services running permanently, which is why a cPanel box commonly sits
at 1–2 GB+ of RAM just for the panel.

SERVOMAN takes the opposite approach — it is an **orchestrator, not a bundler**:

1. It reuses the services your server already needs (Nginx, PHP-FPM, PostgreSQL,
   Postfix) via `apt` instead of shipping its own compiles.
2. It is a **single Node.js process** — one API + UI, no Apache/PHP/Perl needed
   to run the panel itself, and systemd caps it at 512 MB RAM.
3. Its "engine" is thin code that calls existing OS tools: `git` for deployments,
   the shell for the terminal, `/proc` for metrics, the filesystem for the file
   manager. Zero duplicated binaries.
4. The frontend is plain JSON APIs + a modern JS client — no server-rendered
   PHP pages, no per-feature daemons.

So the *panel application* is ~1 MB of code you can read and audit; the only
installed runtime is the standard Node.js ecosystem your server would carry anyway.

## 3. Feature map

**Web hosting**
- **Websites** — unlimited Nginx virtual hosts; PHP 7.4–8.3, Node, Flask, static types
- **Git Deployments** — real git on the server: clone from GitHub/GitLab, pull branches,
  commit history, and **push-to-deploy webhooks** (every `git push` auto-rebuilds; secret
  webhook URL per app, auto-deploy toggle, test-push button). Runtimes: Node.js (pm2),
  Python/**Flask** (venv + gunicorn), PHP-FPM pools, static sites
- **DNS** — zones + A/AAAA/CNAME/MX/TXT/NS/SRV/CAA records

**SSL v2**
- Let's Encrypt ACME automation, 90-day auto renewal, wildcard + multi-SAN certs,
  HSTS preload, OCSP stapling, cipher profiles, bulk renew-all

**Email**
- **Email Server** — Postfix + Dovecot stack: virtual mail domains, DKIM/SPF/DMARC,
  mailboxes with quotas, catch-all routing
- **Record-verified sending domains** — send transactional & campaign email from any
  domain **without SMTP credentials**: SERVOMAN generates unique SPF/DKIM/DMARC records
  per domain, you publish them at your DNS provider, then Verify checks them in public
  DNS. Different records and daily counters per domain
- **Campaigns** — bulk campaigns with per-domain sending identities, delivered/opened/
  clicked/bounced tracking, queue send & pause

**VOIP**
- **Extensions** — SIP/PJSIP/IAX2 with live registration status, test calls
- **SIP trunks** — carrier connections (host/port/credentials/codecs/channels) with
  SIP OPTIONS probe tests
- **CDRs** — call detail records with billable seconds + cost
- Requires Asterisk: re-run `sudo bash install.sh --with-voip`

**Server**
- **Server & Cleanup page** — full OS/hardware/network details, panel process health
  (RSS, event-loop lag), request-handling probe (6× API check with average latency),
  one-click cleaning: page cache, /tmp, apt cache, rotated logs, docker images, old
  backups — every run audited

**Beyond cPanel/aaPanel**
- **AI Assistant** — chat with your server using live data (set `OPENAI_API_KEY` in
  `.env` for the OpenAI engine; a built-in ops engine works without a key)
- **Security Center** — continuous hardening score computed from real config
- **Live health probes** — per-site HTTP status & latency checks
- **Anomaly detection** — threshold alerts raised from real metric samples
- Web terminal, file manager, process explorer, log tails, backups with retention,
  Docker control, cron, FTP, firewall

---

## 4. cPanel / aaPanel feature parity checklist

| Area | cPanel / aaPanel feature | SERVOMAN |
|------|--------------------------|----------|
| Websites | Virtual hosts, subdomains | **Websites** — unlimited hosts, per-site PHP 7.4–8.3, Node, Python, static |
| PHP | Version switch, extensions, ini limits | **PHP & Extensions** page + per-site version on Websites |
| Python | Python Project Manager (aaPanel) | **Python Projects** — Flask/Django/FastAPI, 3.10–3.12, gunicorn/uvicorn/uwsgi |
| Databases | MySQL/PostgreSQL + users + phpMyAdmin | **Databases** + DB users + one-click backups |
| DNS | Zone editor, records | **DNS** zones + A/AAAA/CNAME/MX/TXT/NS/SRV/CAA |
| SSL | AutoSSL / Let's Encrypt | **SSL v2** — wildcards, SANs, HSTS, OCSP, cipher profiles |
| Email | Accounts, DKIM/SPF/DMARC, forwarders | **Email Server** — domains, mailboxes, quotas, catch-all + **record-verified sending domains** |
| Marketing | (not in aaPanel) | **Campaigns** — open/click/bounce tracking, per-domain sending |
| VOIP | (not in cPanel) | **VOIP** — SIP extensions, trunks, CDRs, test calls |
| Files | File manager | **File Manager** — browse/edit/upload/chmod/rename/delete |
| Terminal | Terminal (aaPanel) | **Terminal** — real shell, cd/history/clear |
| Cron | Cron manager | **Cron Jobs** — schedules, run-now |
| FTP | FTP accounts | **FTP Accounts** — quotas, path isolation |
| Backups | Backup schedules | **Backups** — on-demand + scheduled jobs with retention |
| Docker | Docker manager | **Docker** — start/stop/restart/logs |
| Security | Security tools | **Firewall** rules + **Security Center** hardening score |
| SSH | SSH keys | **SSH Keys** — generate key pairs on the server |
| Monitoring | Charts | **Monitoring** — 24h history, anomaly alerts, thresholds |
| Processes | Process manager | **Processes** — live CPU/RSS per task |
| Logs | Log viewer | **Logs** — tail /var/log + panel audit trail |
| Git | (not in cPanel) | **Deployments** — real clone/pull, commit history, push-to-deploy webhooks |
| AI | (not in either) | **AI Assistant** with live server context |
| Server | (basic info) | **Server & Cleanup** — full details, request-health probe, one-click cleaning |

---

## 5. Environment variables (all optional)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Enables the OpenAI engine for the AI assistant (server-side only) |
| `OPENAI_MODEL` | Model override (default `gpt-4o-mini`) |
| `DATABASE_URL` | PostgreSQL connection string (required) |

---

## 6. Operations

```bash
systemctl restart servoman          # restart panel
journalctl -u servoman -f           # follow panel logs
sudo bash install.sh                # re-run to upgrade in place
systemctl disable --now servoman && rm -rf /opt/servoman   # uninstall
```

## 7. Security notes

- The panel manages the whole server — expose it only over HTTPS / VPN / SSH tunnel.
  For public exposure, add HTTP basic auth or SSO at the Nginx layer
  (`/etc/nginx/sites-available/servoman`).
- Change the seeded `admin` panel password from **Panel Users** in Settings
  (the security scan flags weak passwords).
- The web terminal blocks a set of destructive commands; treat it as root access.
