# Security test checklist

Before production deployment, verify all of the following with an authenticated test environment:

- Unauthenticated API requests return 401.
- Viewer cannot mutate any resource.
- Operator cannot manage panel users, audit logs, or SSH keys.
- Client-supplied actor/user headers cannot override the trusted proxy identity.
- Sensitive credentials are never returned by generic GET endpoints.
- Invalid resource names return 404.
- Invalid IDs return 400.
- Path traversal is rejected by file APIs.
- Terminal commands cannot escape their allowed execution policy.
- Git webhook requests require the deployment token and, when configured, a valid HMAC signature.
- Invalid or mismatched webhook signatures are rejected.
- Destructive actions are audited with the authenticated identity.
- Error responses do not expose stack traces, SQL, secrets, or command output.
- Rate limits apply to authentication and privileged action endpoints.
- Privileged action routes enforce authorization at the route boundary, not only in UI code.

## Adapter validation

Run the adapter validation suite on a disposable Ubuntu VPS before enabling real mutations:

- Nginx/Apache config test and reload.
- UFW status, rule listing, and safe enable/disable procedure with SSH-preservation checks.
- systemd service status/restart for an explicit allowlist of services.
- Docker daemon availability and start/stop/restart/logs for an existing container.
- PostgreSQL/MySQL dump and restore to a disposable database.
- Let's Encrypt/ACME issuance and renewal using staging first.
- Cron installation/listing/run for a controlled test job.
- SMTP connection/authentication test without sending a real campaign.
- SIP OPTIONS test against a controlled trunk.
- Python virtualenv dependency installation and process lifecycle.
- Git clone/fetch/reset only into a validated site repository path.
- Backup creation and restore with checksum/size verification.
- Reboot/cleanup operations must remain disabled until explicitly validated on the target OS.

No adapter should report a successful mutation merely because a database row was updated; success must come from the underlying OS/provider operation.