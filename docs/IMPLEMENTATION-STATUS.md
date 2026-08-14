# Hardening implementation status

ServoMan is being hardened as a real self-hosted hosting/server control panel. Privileged actions must execute against the host and must never report simulated success.

Implemented real adapters include Nginx virtual hosts, PHP-FPM/static site hosting, PostgreSQL/MySQL databases and users, Docker, UFW, Certbot/Let's Encrypt, website/database backup and restore, systemd services, cron execution, SSH keys, SMTP tests, Asterisk inspection/test calls, Git clone/pull/branch/webhook management, and RBAC/audit/rate limiting.

Python application management is now implemented with per-project virtual environments, Flask/Django/FastAPI support, Gunicorn/Uvicorn/uWSGI process modes, dependency installation, systemd lifecycle, logs, configurable entrypoints/workers/environment variables, and an authenticated Python deployment API.

GitHub management is now implemented behind `SERVOMAN_GITHUB_TOKEN` with repository listing, branches, commits, releases, GitHub Actions workflow listing/dispatch, issue listing/creation and branch creation. The token remains server-side.

The installer provisions Python tooling, the trusted proxy boundary, Certbot, PHP-FPM, Docker and controlled sudo permissions.

Intentionally not faked: campaign delivery remains disabled because the existing schema does not contain actual recipient addresses and message content; unsupported runtimes/configurations return explicit errors.

## Production validation gate

Install this branch on a disposable Ubuntu VPS and exercise every adapter before merging to `main`. GitHub currently reports no Actions run/status for the latest connector commits, so CI is not claimed as passed until an actual workflow run is observed.
