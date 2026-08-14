#!/usr/bin/env bash
# SERVOMAN installer — Ubuntu/Debian server control panel.
set -euo pipefail
PANEL_NAME="SERVOMAN"; PANEL_VERSION="3.0.0"; PANEL_DIR="/opt/servoman"; PANEL_USER="servoman"; PANEL_PORT=3100; DB_NAME="servoman"; DB_USER="servoman"
WITH_VOIP=0; WITH_DOVECOT=0
for arg in "$@"; do case "$arg" in --with-voip) WITH_VOIP=1;; --with-dovecot) WITH_DOVECOT=1;; -h|--help) echo "sudo bash install.sh [--with-voip] [--with-dovecot]"; exit 0;; esac; done
log(){ echo "[servoman] $*"; }; ok(){ echo "[ ok ] $*"; }; warn(){ echo "[warn] $*"; }; err(){ echo "[error] $*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || err "Run as root: sudo bash install.sh"
. /etc/os-release
[[ -f package.json ]] || err "Run from the ServoMan project directory."
export DEBIAN_FRONTEND=noninteractive
DB_PASS="$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"; PANEL_PASS="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 16)"; PROXY_SECRET="$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 48)"; REPO_DIR="$(pwd)"
log "Installing OS packages"
apt-get update -yq
apt-get install -yq curl ca-certificates gnupg git unzip rsync build-essential python3 python3-venv python3-pip nginx certbot python3-certbot-nginx php-fpm php-cli php-mbstring php-xml php-curl php-zip php-gd php-bcmath php-intl postgresql postgresql-contrib redis-server postfix fail2ban ufw apache2-utils sudo
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 22 ]]; then curl -fsSL https://deb.nodesource.com/setup_22.x | bash -; apt-get install -yq nodejs; fi
id -u "$PANEL_USER" >/dev/null 2>&1 || useradd -r -m -d "$PANEL_DIR" -s /bin/bash "$PANEL_USER"; mkdir -p "$PANEL_DIR"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"; fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"; fi
log "Installing application"
rsync -a --delete --exclude node_modules --exclude .next --exclude .git "$REPO_DIR"/ "$PANEL_DIR"/
cat > "$PANEL_DIR/.env" <<EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME
NODE_ENV=production
PORT=$PANEL_PORT
SERVOMAN_TRUSTED_PROXY_SECRET=$PROXY_SECRET
SERVOMAN_ACME_EMAIL=
SERVOMAN_BACKUP_ROOT=/backups/servoman
EOF
chown -R "$PANEL_USER":"$PANEL_USER" "$PANEL_DIR"; mkdir -p /backups/servoman; chown root:root /backups/servoman; chmod 700 /backups/servoman
cat > /etc/sudoers.d/servoman <<'EOF'
Defaults:servoman !requiretty
servoman ALL=(root) NOPASSWD: /usr/bin/systemctl, /bin/systemctl, /usr/sbin/ufw, /usr/bin/ufw, /usr/bin/certbot, /snap/bin/certbot, /usr/bin/docker, /usr/bin/pg_dump, /usr/bin/pg_restore, /usr/bin/psql, /usr/bin/createdb, /usr/bin/dropdb, /usr/bin/mysqldump, /usr/bin/mysql, /usr/bin/ssh-keygen, /usr/bin/shutdown, /usr/bin/tar, /usr/bin/stat, /usr/bin/mkdir, /usr/bin/chmod, /usr/bin/cat, /usr/bin/find, /usr/bin/journalctl, /usr/bin/apt-get, /usr/sbin/runuser, /usr/bin/runuser, /usr/sbin/nginx, /usr/bin/nginx, /bin/rm, /usr/bin/rm, /bin/ln, /usr/bin/ln, /usr/bin/install, /usr/bin/chown, /usr/bin/test
EOF
chmod 440 /etc/sudoers.d/servoman; visudo -cf /etc/sudoers.d/servoman >/dev/null
log "Building application"
cd "$PANEL_DIR"; sudo -u "$PANEL_USER" npm install --no-audit --no-fund; sudo -u "$PANEL_USER" npx drizzle-kit push || warn "drizzle push reported an issue"; sudo -u "$PANEL_USER" npx tsx src/db/seed.ts || warn "seed skipped"; sudo -u "$PANEL_USER" npm run build
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
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3
MemoryMax=512M
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload; systemctl enable servoman; systemctl restart servoman
log "Configuring authenticated reverse proxy"
htpasswd -bc /etc/nginx/.servoman_admin servoman "$PANEL_PASS" >/dev/null
cat > /etc/nginx/sites-available/servoman <<'EOF'
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 64m;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    location / {
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
        proxy_set_header X-Servoman-User "servoman";
        proxy_set_header X-Servoman-Role "admin";
        proxy_set_header X-Servoman-Proxy-Secret "__SERVOMAN_PROXY_SECRET__";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF
sed -i "s/__SERVOMAN_PROXY_SECRET__/$PROXY_SECRET/" /etc/nginx/sites-available/servoman; rm -f /etc/nginx/sites-enabled/default; ln -sf /etc/nginx/sites-available/servoman /etc/nginx/sites-enabled/servoman; nginx -t; systemctl enable nginx; systemctl restart nginx
log "Configuring firewall"
ufw allow 22/tcp >/dev/null 2>&1 || true; ufw allow 80/tcp >/dev/null 2>&1 || true; ufw allow 443/tcp >/dev/null 2>&1 || true
if [[ "$WITH_DOVECOT" == "1" ]]; then apt-get install -yq dovecot-imapd dovecot-pop3d; systemctl enable --now dovecot; ufw allow 993/tcp >/dev/null 2>&1 || true; ufw allow 995/tcp >/dev/null 2>&1 || true; ufw allow 587/tcp >/dev/null 2>&1 || true; fi
if [[ "$WITH_VOIP" == "1" ]]; then apt-get install -yq asterisk; systemctl enable --now asterisk; ufw allow 5060:5061/udp >/dev/null 2>&1 || true; ufw allow 10000:20000/udp >/dev/null 2>&1 || true; fi
ufw --force enable >/dev/null 2>&1 || warn "ufw could not be enabled"
IP="$(hostname -I 2>/dev/null | awk '{print $1}')"; [[ -n "$IP" ]] || IP="<server-ip>"; ok "$PANEL_NAME $PANEL_VERSION installed"; ok "URL: http://$IP"; ok "Basic-auth user: servoman"; ok "Basic-auth password: $PANEL_PASS"; ok "Database password: $DB_PASS"; ok "Service: systemctl status servoman"; ok "Logs: journalctl -u servoman -f"; ok "The generated .env and passwords are stored on the server only."
