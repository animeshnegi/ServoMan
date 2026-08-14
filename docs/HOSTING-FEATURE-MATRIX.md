# ServoMan hosting feature target

ServoMan is being built as a real self-hosted hosting/server control panel, not a dashboard that merely records simulated state.

## Website and application hosting

- Nginx virtual hosts with real enable/disable/reload lifecycle
- PHP-FPM sites
- Static sites
- Node.js applications with per-app ports and process supervision
- Python applications: Flask, Django, FastAPI and generic WSGI/ASGI applications
- Per-Python-project virtual environments
- Python dependency installation from `requirements.txt`
- Gunicorn, Uvicorn and uWSGI process modes
- Per-app workers, environment variables, entrypoints and systemd services
- Reverse proxy integration from domain → application port
- Git clone/pull, branch selection and push-to-deploy
- Deployment webhooks restricted to the configured branch

## GitHub / Git management

When `SERVOMAN_GITHUB_TOKEN` is configured, the panel API supports:

- Repository listing
- Branch listing
- Commit history
- Releases
- GitHub Actions workflow listing and dispatch
- Open issue listing and issue creation
- Creating branches from a known commit
- Deployment/repository audit events

Tokens stay server-side and are never returned by the API.

## Hosting-panel capabilities

The target feature set includes the functionality normally spread across paid hosting panels and their add-ons:

- Domains and virtual hosts
- SSL / Let's Encrypt and renewal testing
- DNS records and zone management
- File management
- FTP accounts
- Databases and database users
- Cron jobs
- Backups and scheduled backup jobs
- Docker/container management
- Firewall and security checks
- Service management
- Server metrics and process inspection
- SSH key generation
- Email domains/mailboxes and SMTP testing
- Email sending-domain verification
- VoIP/Asterisk management when installed
- Role-based access control and audit logs
- AI operations assistant

## Production rule

Every privileged feature must execute against the host and report the actual result. If the required service or configuration is unavailable, ServoMan must return an explicit error instead of showing a fake success state.

Before merging to `main`, the full feature set must be exercised on a disposable Ubuntu VPS, including Python app deployment, Nginx proxying, Git/GitHub operations, SSL, database lifecycle, backups, Docker, firewall and service controls.
