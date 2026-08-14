#!/usr/bin/env bash
# =============================================================================
#  SERVOMAN — One-shot installer for Ubuntu 24.04 LTS
#
#  A LIGHTWEIGHT server & website control panel (cPanel/aaPanel class).
#  Installs: Node.js 22, PostgreSQL 16, Nginx, PHP-FPM 8.3, Python 3.12
#            (Flask-ready), Redis, Postfix, fail2ban, ufw and the SERVOMAN
#            panel itself (single systemd service on port 3100).
#
#  Usage:   sudo bash install.sh
#  After:   http://<your-server-ip>  → SERVOMAN panel
#
#  Options:
#    --with-voip        install Asterisk (SIP server for the VOIP manager)
#    --with-dovecot     install Dovecot (IMAP/POP3 for the mail server)
# =============================================================================
set -euo pipefail

PANEL_NAME="SERVOMAN"
PANEL_VERSION="3.0.0"
PANEL_DIR="/opt/servoman"
PANEL_USER="servoman"
PANEL_PORT=3100
DB_NAME="servoman"
DB_USER="servoman"
DB_PASS="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)"
PANEL_LOGIN="servoman"
PANEL_PASS="$(head -c 16 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 12)"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

WITH_VOIP=0
WITH_DOVECOT=0
for arg in "$@"; do
  case "$arg" in
    --with-voip) WITH_VOIP=1 ;;
    --with-dovecot) WITH_DOVECOT=1 ;;
    -h|--help)
      echo "SERVOMAN installer — usage: sudo bash install.sh [--with-voip] [--with-dovecot]"
      exit 0 ;;
  esac
done

log()  { echo -e "\033[1;36m[servoman]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[ ok ]\033[0m $*"; }
warn() { echo -e "\033[1;33m[warn]\033[0m $*"; }
err()  { echo -e "\033[1;31m[error]\033[0m $*"; exit 1; }

# ------------------------------------------------------------------ checks --
[[ $EUID -eq 0 ]] || err "Run as root: sudo bash install.sh"
. /etc/os-release || true
[[ "$ID" == "ubuntu" && "$VERSION_ID" == "24.04" ]] || warn "Expected Ubuntu 24.04 LTS, detected ${PRETTY_NAME:-unknown} — continuing anyway."
[[ -f "$REPO_DIR/package.json" ]] || err "Run this script from the SERVOMAN project folder (package.json not found)."

export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------- system packages --
log "1/9  Installing system packages…"
apt-get update -yq >/dev/null
apt-get install -yq curl gnupg ca-certificates lsb-release software-properties-common \
  build-essential git unzip rsync python3 python3-venv python3-pip python3-dev \
  nginx postgresql postgresql-contrib redis-server postfix fail2ban ufw apache2-utils \
  php-fpm php-cli php-mbstring php-xml php-curl php-zip php-gd php-bcmath php-intl >/dev/null
ok "System packages installed (Node still pending)"

# ------------------------------------------------------------------- node ----
log "2/9  Installing Node.js 22 LTS…"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1 || warn "NodeSource failed, trying fallback"
  apt-get install -yq nodejs >/dev/null
fi
ok "Node.js $(node -v) / npm $(npm -v)"

# -------------------------------------------------------------- panel user ---
log "3/9  Creating panel system user…"
id -u "$PANEL_USER" >/dev/null 2>&1 || useradd -r -m -d "$PANEL_DIR" -s /bin/bash "$PANEL_USER"
mkdir -p "$PANEL_DIR" "$PANEL_DIR/backups"

# ------------------------------------------------------------- postgres db ---
log "4/9  Creating PostgreSQL database…"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" >/dev/null
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" >/dev/null
ok "Database $DB_NAME ready (user $DB_USER)"

# ------------------------------------------------------------- copy files ----
log "5/9  Installing panel files to $PANEL_DIR…"
if [[ "$REPO_DIR" != "$PANEL_DIR" ]]; then
  rsync -a --delete --exclude node_modules --exclude .next --exclude .git "$REPO_DIR"/ "$PANEL_DIR"/ >/dev/null
fi
cat > "$PANEL_DIR/.env" <<EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME
EOF
# Optional: put an OpenAI key here for the AI assistant (server-side only)
# echo 'OPENAI_API_KEY=sk-...' >> "$PANEL_DIR/.env"
chown -R "$PANEL_USER":"$PANEL_USER" "$PANEL_DIR"
ok "Panel files installed"

# ----------------------------------------------------------- build panel ----
log "6/9  Installing dependencies and building the panel (this takes a few minutes)…"
cd "$PANEL_DIR"
sudo -u "$PANEL_USER" npm install --no-audit --no-fund >/dev/null 2>&1 || err "npm install failed"
sudo -u "$PANEL_USER" npx drizzle-kit push >/dev/null 2>&1 || warn "drizzle push reported an issue (continuing)"
sudo -u "$PANEL_USER" npx tsx src/db/seed.ts >/dev/null 2>&1 || warn "seeding skipped"
sudo -u "$PANEL_USER" npm run build >/dev/null 2>&1 || err "panel build failed"
ok "Panel built successfully (lightweight single-process app)"

# -------------------------------------------------------- systemd service ---
log "7/9  Registering systemd service…"
cat > /etc/systemd/system/servoman.service <<EOF
[Unit]
Description=SERVOMAN Control Panel
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=$PANEL_USER
Group=$PANEL_USER
WorkingDirectory=$PANEL_DIR
Environment=NODE_ENV=production
Environment=PORT=$PANEL_PORT
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3
TimeoutStopSec=10
MemoryMax=512M

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable servoman >/dev/null 2>&1 || true
systemctl restart servoman
ok "systemd service servoman (port $PANEL_PORT, capped at 512 MB RAM)"

# -------------------------------------------------------------- nginx site --
log "8/9  Configuring Nginx reverse proxy…"
cat > /etc/nginx/sites-available/servoman <<'EOF'
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 64m;

    # security headers
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        # panel login — credentials are printed at the end of this installer
        auth_basic "SERVOMAN Panel";
        auth_basic_user_file /etc/nginx/.servoman_admin;

        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
EOF
htpasswd -bc /etc/nginx/.servoman_admin "$PANEL_LOGIN" "$PANEL_PASS" >/dev/null
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/servoman /etc/nginx/sites-enabled/servoman
nginx -t >/dev/null 2>&1 || warn "nginx config test failed — check /etc/nginx/sites-available/servoman"
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx
ok "Nginx configured (port 80 → panel)"

# --------------------------------------------------------------- firewall ---
log "9/9  Hardening firewall…"
ufw allow 22/tcp  >/dev/null 2>&1 || true
ufw allow 80/tcp  >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
if [[ "$WITH_DOVECOT" == "1" ]]; then
  ufw allow 993/tcp >/dev/null 2>&1 || true
  ufw allow 995/tcp >/dev/null 2>&1 || true
  ufw allow 587/tcp >/dev/null 2>&1 || true
  ufw allow 465/tcp >/dev/null 2>&1 || true
fi
if [[ "$WITH_VOIP" == "1" ]]; then
  ufw allow 5060:5061/udp >/dev/null 2>&1 || true
  ufw allow 10000:20000/udp >/dev/null 2>&1 || true
fi
ufw --force enable >/dev/null 2>&1 || warn "ufw could not be enabled"

# ------------------------------------------------------- optional services --
if [[ "$WITH_DOVECOT" == "1" ]]; then
  log "Installing Dovecot (IMAP/POP3)…"
  apt-get install -yq dovecot-imapd dovecot-pop3d >/dev/null || warn "dovecot install failed"
  systemctl enable dovecot >/dev/null 2>&1 || true
  systemctl restart dovecot >/dev/null 2>&1 || true
  ok "Dovecot running — mailboxes from the Email Server page are served via IMAP/POP3"
fi

if [[ "$WITH_VOIP" == "1" ]]; then
  log "Installing Asterisk (SIP server)…"
  apt-get install -yq asterisk >/dev/null || warn "asterisk install failed"
  systemctl enable asterisk >/dev/null 2>&1 || true
  systemctl restart asterisk >/dev/null 2>&1 || true
  ok "Asterisk running — extensions & trunks from the VOIP page register via PJSIP"
fi

# ----------------------------------------------------------------- summary ---
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[[ -z "$IP" ]] && IP="<your-server-ip>"
ok ""
ok "══════════════════════════════════════════════════════════════════════════"
ok "  $PANEL_NAME v$PANEL_VERSION installed!"
ok "  Panel URL:    http://$IP"
ok "  Panel login:  user: $PANEL_LOGIN   password: $PANEL_PASS"
ok "                (HTTP basic auth — change with:"
ok "                htpasswd -b /etc/nginx/.servoman_admin $PANEL_LOGIN newpass)"
ok "  Data:         PostgreSQL (db: $DB_NAME, user: $DB_USER)"
ok "  Password:     $DB_PASS   ← store this safely"
ok ""
ok "  Next steps:"
ok "  1. Open http://$IP in your browser"
ok "  2. Websites → create virtual hosts (PHP, Node, Flask, static)"
ok "  3. Deployments → connect Git repos (clone/pull + push-to-deploy webhooks)"
ok "  4. SSL v2 → wildcard/SAN certificates with HSTS + OCSP"
ok "  5. Email Server → mail domains & mailboxes (Dovecot with --with-dovecot)"
ok "  6. Sending domains → record-verified SPF/DKIM/DMARC email (no SMTP creds)"
ok "  7. VOIP → SIP extensions + trunks + CDRs (Asterisk with --with-voip)"
ok "  8. Server & Cleanup → details, request-health probe, one-click cleaning"
ok "  9. AI Assistant → set OPENAI_API_KEY in $PANEL_DIR/.env (optional)"
ok ""
ok "  Service:     systemctl restart servoman"
ok "  Logs:        journalctl -u servoman -f"
ok "  Uninstall:   systemctl disable --now servoman && rm -rf $PANEL_DIR"
ok "══════════════════════════════════════════════════════════════════════════"
