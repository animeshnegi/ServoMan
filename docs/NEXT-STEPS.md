# Next implementation phase

Static validation has been completed for the current privileged surfaces. The authentication/RBAC boundary is in place, but the domain-specific action route still contains simulated server behavior. Do not treat those operations as production-ready OS mutations.

Required real adapters: systemd services, UFW/firewall, Docker, cron, ACME/Let's Encrypt, filesystem, Git deployments, mail/SMTP, DNS, backup/restore, terminal, Python process/virtualenv management, and SIP/VoIP provider checks.

Every adapter must execute the real provider/OS operation before reporting success, use argument-based execution rather than shell interpolation, enforce allowlists and path boundaries, sanitize errors, and audit the authenticated identity. Test on a disposable Ubuntu VPS first.

Current findings:
- Git uses argument-based execution and disables interactive credential prompts, but repository-root/path validation should be stricter before production use.
- Git deployment performs a real fetch/reset, but does not yet build/restart the configured application after pulling.
- SSL, backups, firewall, service restart, SMTP test, campaign sending, SIP calls, SSH key generation, Python dependency installation, and several system actions are still simulated/database-backed behaviors.
- The privileged `/api/action` surface is protected by the Next.js proxy's admin-only route boundary.
- The Git webhook uses a deployment token in the query string; add HMAC signature verification before relying on it as an Internet-facing webhook.

Production gate: do not expose the panel publicly or enable real OS-level mutations until these adapters are implemented and tested on a disposable server, including an SSH-preservation test for firewall changes and a verified restore test for backups.