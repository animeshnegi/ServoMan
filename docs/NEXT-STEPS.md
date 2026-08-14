# Next implementation phase

Static validation has been completed for the current privileged surfaces. The authentication/RBAC boundary is in place, but the domain-specific action route still contains simulated server behavior. Do not treat those operations as production-ready OS mutations.

## Required real adapters

Implement and validate explicit, allowlisted adapters for:

- systemd services
- UFW/firewall
- Docker
- cron
- ACME/Let's Encrypt
- filesystem operations
- Git deployments
- mail/SMTP
- DNS
- backup/restore
- terminal
- Python process/virtualenv management
- SIP/VoIP provider checks

## Validation rules

Each adapter must:

1. Execute a real provider/OS operation and only report success after that operation succeeds.
2. Use `execFile`/equivalent argument-based execution rather than shell interpolation.
3. Allow only known commands, service names, paths and operation parameters.
4. Enforce path boundaries for repository/filesystem operations.
5. Sanitize command/provider errors before returning them to clients.
6. Record the authenticated audit identity for every mutation.
7. Support a non-mutating `validate`/health check where practical.
8. Be tested first against a disposable Ubuntu VPS.

## Current adapter findings

- Git uses argument-based execution and disables interactive credential prompts; it still needs stricter repository-root/path validation before production use.
- Git deployment performs a real fetch/reset, but it does not build/restart the configured application after pulling.
- SSL, backups, firewall, service restart, SMTP test, campaign sending, SIP calls, SSH key generation, Python dependency installation, and several system actions are still simulated/database-backed behaviors.
- The privileged `/api/action` surface is protected by the Next.js proxy's admin-only route boundary. Keep that boundary in place even after adding adapters.
- The Git webhook uses a deployment token in the query string; add HMAC signature verification before relying on it as an Internet-facing webhook.

## Production gate

Do not expose the panel publicly or enable real OS-level mutations until the adapters above are implemented and tested on a disposable server, including an SSH-preservation test for firewall changes and a verified restore test for backups.