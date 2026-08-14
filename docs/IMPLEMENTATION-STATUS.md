# Hardening implementation status

This branch establishes a fail-closed security boundary and replaces database-only privileged operations with real host adapters where the required system service is available.

Implemented:

- Central authentication context and admin/operator/viewer roles.
- Next.js 16 `proxy.ts` network boundary.
- Admin-only protection for terminal, filesystem, Git, settings and `/api/action`.
- Viewer mutation denial and admin-only generic resources.
- Resource-level authorization for generic CRUD collection and item endpoints.
- Server-derived audit actor for CRUD operations; omitted actors are recorded as `system`, never `admin`.
- ID and payload validation in generic CRUD.
- Sensitive-value response redaction.
- Request/action rate limiting.
- Public health endpoint and separately token-authenticated Git webhook boundary.
- Git webhook branch restriction.
- Real Nginx site lifecycle and virtual-host configuration.
- Real PostgreSQL/MySQL database and database-user lifecycle adapters.
- Real Docker container lifecycle and logs.
- Real UFW firewall operations.
- Real Certbot/Let's Encrypt issuance, renewal and dry-run.
- Real website/database backup and restore adapters with filesystem boundaries.
- Real systemd service operations.
- Real admin-only cron execution.
- Real SSH key generation.
- Real SMTP connectivity/authentication testing.
- Real Asterisk endpoint inspection and PJSIP test calls when Asterisk is installed/configured.
- Real Python application process manager: per-project virtual environments, Flask/Django/FastAPI support, Gunicorn/Uvicorn/uWSGI modes, dependency installation, systemd lifecycle and logs.
- Python deployment API with explicit path, port, framework, entrypoint, worker and environment validation.
- Git repository management API secured by RBAC.
- GitHub management API for repositories, branches, commits, releases, Actions workflow dispatch, issues and branch creation when a server-side fine-grained token is configured.
- Installer provisioning for Python tooling, the trusted proxy secret, Certbot, PHP-FPM, Docker and controlled sudo policy.
- CI for dependency installation, typecheck, lint and production build.
- Production deployment and security test checklists.

Intentionally not faked:

- Campaign delivery remains disabled because the existing schema does not contain actual recipient addresses and message content. The API returns an explicit 501 instead of pretending mail was sent.
- Any runtime that is not installed/configured returns an explicit error instead of a successful-looking status.

## Production validation gate

Install this branch on a disposable Ubuntu VPS and exercise every adapter before merging to `main`. GitHub currently reports no Actions run/status for the latest connector commits, so CI is not claimed as passed until an actual workflow run is observed.
