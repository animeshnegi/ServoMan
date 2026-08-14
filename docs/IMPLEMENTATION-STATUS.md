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
- Installer provisioning for the trusted proxy secret, Certbot, PHP-FPM, Docker and controlled sudo policy.
- CI for dependency installation, typecheck, lint and production build.
- Production deployment and security test checklists.

Intentionally not faked:

- Campaign delivery remains disabled because the existing schema does not contain actual recipient addresses and message content. The API returns an explicit 501 instead of pretending mail was sent.
- Python process management and application-specific deployment commands remain explicit integration work because the existing schema does not safely define an entrypoint/process contract.
- Site operations require a real Nginx virtual-host config; no database-only status is reported.

## Production validation gate

Install this branch on a disposable Ubuntu VPS and exercise every adapter before merging to `main`. GitHub currently reports no Actions run/status for the latest connector commits, so CI is not claimed as passed until an actual workflow run is observed.
