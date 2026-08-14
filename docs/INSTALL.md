# SERVOMAN Installation & Access Guide

This guide is the supported installation path for SERVOMAN on a fresh Ubuntu/Debian VPS.
The installer is intended to be run as root through `sudo` and configures the panel as a systemd service behind Nginx.

## 1. Requirements

Recommended:

- Ubuntu 24.04 LTS
- A fresh VPS with at least 2 GB RAM
- Root or a sudo-enabled user
- A public IPv4 address
- Ports `22/tcp`, `80/tcp`, and `443/tcp` available
- A domain name is recommended for HTTPS, but the first installation can be tested with the server IP

Do **not** expose the application port `3100` directly to the Internet. SERVOMAN listens on `127.0.0.1:3100` through the systemd service and Nginx proxies public traffic to it.

## 2. Download SERVOMAN

For the public repository, the simplest method is:

```bash
git clone https://github.com/animeshnegi/ServoMan.git
cd ServoMan
```

If you already uploaded the project to the server:

```bash
cd /path/to/ServoMan
```

Confirm that the installer and application files are present:

```bash
ls -la
ls -la docs/INSTALL.md
ls -la install.sh package.json
```

The installer intentionally checks that `package.json` exists in the current directory. Always run `install.sh` from the ServoMan project directory.

## 3. Recommended installation

Run:

```bash
sudo bash install.sh
```

Optional components:

```bash
sudo bash install.sh --with-dovecot
sudo bash install.sh --with-voip
sudo bash install.sh --with-dovecot --with-voip
```

The base installation includes the web panel stack and system services used by SERVOMAN. The optional flags add Dovecot mail access and/or Asterisk VOIP support.

The installer performs these main tasks:

1. Installs required OS packages.
2. Installs Node.js 22 when a suitable Node version is not already available.
3. Creates the `servoman` system user and `/opt/servoman` application directory.
4. Creates the PostgreSQL `servoman` role and database.
5. Copies the application into `/opt/servoman`.
6. Generates `/opt/servoman/.env` with fresh database and proxy secrets.
7. Creates the restricted sudo policy used by server operations.
8. Runs dependency installation, database push, seed, and production build.
9. Creates and enables `servoman.service`.
10. Configures Nginx as the authenticated reverse proxy.
11. Enables UFW and allows SSH, HTTP, and HTTPS.

## 4. The first and most reliable way to access the panel

At the end of a successful installation, the installer prints the panel URL and the generated HTTP Basic Authentication credentials.

You will see output similar to:

```text
[ ok ] SERVOMAN 3.0.0 installed
[ ok ] URL: http://SERVER_IP
[ ok ] Basic-auth user: servoman
[ ok ] Basic-auth password: <generated-password>
[ ok ] Database password: <generated-password>
```

Open the printed URL in your browser:

```text
http://SERVER_IP
```

Use:

```text
Username: servoman
Password: the generated Basic Auth password printed by install.sh
```

### Important

The generated password is intentionally not stored in the Git repository. Save it securely immediately after installation.

If you lose it, generate a new Nginx Basic Auth password with:

```bash
sudo htpasswd -b /etc/nginx/.servoman_admin servoman 'YOUR_NEW_PASSWORD'
sudo nginx -t
sudo systemctl reload nginx
```

Do not put the password in this documentation or commit it to GitHub.

## 5. If the browser cannot open the panel

Run these checks on the VPS in this order.

### Check the SERVOMAN service

```bash
sudo systemctl status servoman --no-pager
```

Expected:

```text
Active: active (running)
```

### Check the application logs

```bash
sudo journalctl -u servoman -n 100 --no-pager
```

Follow logs live:

```bash
sudo journalctl -u servoman -f
```

### Check that port 3100 is listening locally

```bash
sudo ss -lntp | grep ':3100'
```

It should normally be reachable only through the local proxy path.

### Check Nginx

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
```

### Check HTTP locally from the VPS

```bash
curl -I http://127.0.0.1
```

If Basic Auth is enabled, a `401 Unauthorized` response is expected without credentials. That means Nginx is reachable and protecting the panel.

### Check the firewall

```bash
sudo ufw status verbose
```

At minimum, SSH and HTTP should be allowed during the initial setup.

## 6. Cloud-provider firewall / security group

UFW is only one firewall layer. Your VPS provider may also have an external firewall/security group.

Make sure the provider allows:

```text
22/tcp   SSH
80/tcp   HTTP
443/tcp  HTTPS
```

Do not open port `3100` publicly unless you have a specific reason and understand the security implications.

## 7. HTTPS with a domain

For production use, put SERVOMAN behind HTTPS.

Point your domain's A record to the VPS public IP, for example:

```text
panel.example.com  ->  SERVER_IP
```

Then obtain a certificate with Certbot:

```bash
sudo certbot --nginx -d panel.example.com
```

After Certbot finishes, test:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Then use:

```text
https://panel.example.com
```

Do not send passwords or API keys over plain HTTP on an Internet-facing production server.

## 8. SSH tunnel option for private administration

If the panel should not be publicly accessible, an SSH tunnel is a safer option.

Keep SERVOMAN behind the local Nginx listener and from your own computer run:

```bash
ssh -L 8443:127.0.0.1:80 user@SERVER_IP
```

Then open:

```text
http://127.0.0.1:8443
```

This is useful for initial administration before a domain/HTTPS setup is complete.

## 9. Service management

Start:

```bash
sudo systemctl start servoman
```

Stop:

```bash
sudo systemctl stop servoman
```

Restart:

```bash
sudo systemctl restart servoman
```

Enable at boot:

```bash
sudo systemctl enable servoman
```

Check status:

```bash
sudo systemctl status servoman --no-pager
```

View recent logs:

```bash
sudo journalctl -u servoman -n 100 --no-pager
```

Follow logs:

```bash
sudo journalctl -u servoman -f
```

## 10. Application files and secrets

The installed application is located at:

```text
/opt/servoman
```

Important files:

```text
/opt/servoman/.env
/etc/systemd/system/servoman.service
/etc/nginx/sites-available/servoman
/etc/nginx/.servoman_admin
/etc/sudoers.d/servoman
/backups/servoman
```

The `.env` file contains generated secrets and database credentials. Never commit it to GitHub.

Check permissions if needed:

```bash
sudo ls -la /opt/servoman/.env
sudo ls -la /etc/nginx/.servoman_admin
sudo ls -la /etc/sudoers.d/servoman
```

## 11. Updating SERVOMAN

Back up the current installation before upgrading.

Then update the source:

```bash
cd /path/to/ServoMan
git pull
```

Run the installer again:

```bash
sudo bash install.sh
```

The installer recreates the application deployment and restarts the systemd service.

After an update, always verify:

```bash
sudo systemctl status servoman --no-pager
sudo nginx -t
sudo journalctl -u servoman -n 100 --no-pager
```

## 12. Development validation before installing on a VPS

From the repository directory:

```bash
npm install --no-audit --no-fund
npm run typecheck
npm run lint
npm run build
```

All three checks must pass before treating a commit as installation-ready.

The GitHub Actions CI performs the same validation sequence on pushes and pull requests:

```text
npm install
npm run typecheck
npm run lint
npm run build
```

If TypeScript fails, do not install that commit on a production VPS.

## 13. Python projects managed by SERVOMAN

SERVOMAN can manage Python applications such as Flask, Django, and FastAPI using per-project virtual environments and service processes.

A typical application should have its own directory, for example:

```text
/var/www/example-app
```

The Python environment should remain isolated from the system Python installation.

For a Flask application, the normal deployment model is:

```text
Flask application
       ↓
Python virtual environment
       ↓
Gunicorn
       ↓
Nginx
       ↓
Internet
```

Do not expose the Gunicorn application port directly when Nginx can proxy it.

## 14. Backups

SERVOMAN uses:

```text
/backups/servoman
```

The installer creates this directory with restricted permissions.

For important production systems, also maintain an off-server backup. A backup stored on the same VPS is not sufficient protection against disk failure, accidental deletion, or server compromise.

## 15. Uninstall

Before uninstalling, export any databases and backups you need.

Stop and disable the service:

```bash
sudo systemctl disable --now servoman
```

Then remove the application and related configuration only after confirming that you no longer need them.

```bash
sudo rm -rf /opt/servoman
sudo rm -f /etc/systemd/system/servoman.service
sudo rm -f /etc/nginx/sites-enabled/servoman
sudo rm -f /etc/nginx/sites-available/servoman
sudo rm -f /etc/nginx/.servoman_admin
sudo rm -f /etc/sudoers.d/servoman
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl reload nginx
```

Do not delete PostgreSQL data or `/backups/servoman` until you have verified that no data is required.

## 16. Security checklist before production

- Use HTTPS for Internet-facing administration.
- Keep port `3100` private.
- Keep SSH protected with keys and disable password authentication when appropriate.
- Restrict cloud-provider firewall rules to the ports you actually use.
- Keep UFW enabled.
- Store `/opt/servoman/.env` securely.
- Never commit database passwords, proxy secrets, API keys, or generated Basic Auth credentials.
- Keep regular off-server backups.
- Review `journalctl -u servoman` after upgrades.
- Run `npm run typecheck`, `npm run lint`, and `npm run build` before production deployment.

## 17. Quick troubleshooting commands

```bash
# Service
sudo systemctl status servoman --no-pager

# Logs
sudo journalctl -u servoman -n 200 --no-pager

# Nginx
sudo nginx -t
sudo systemctl status nginx --no-pager

# Listening ports
sudo ss -lntup

# Firewall
sudo ufw status numbered

# Local HTTP test
curl -I http://127.0.0.1

# Node version
node --version
npm --version

# Installed application
sudo ls -la /opt/servoman
```

If `servoman.service` is active but the browser returns `502 Bad Gateway`, inspect the SERVOMAN journal first. A 502 normally means Nginx cannot reach the application on the expected local port.

If the browser returns `401 Unauthorized`, that is normally the Nginx Basic Auth layer working; enter the generated `servoman` credentials printed by the installer.

If the browser times out, check both UFW and the VPS provider's external firewall/security group.
