# Next implementation phase

The next phase should replace any simulated server operations with tested adapters and enforce `authorizeAction()` at the beginning of the privileged action route.

Adapters should be explicit and allowlisted for:

- systemd services
- UFW/firewall
- Docker
- cron
- ACME/Let's Encrypt
- filesystem operations
- Git deployments
- mail services
- DNS
- backup/restore
- terminal

Each adapter must reject untrusted shell interpolation, record an authenticated audit event, and return sanitized errors.
