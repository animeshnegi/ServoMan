# Hardening branch

The `agent/production-hardening` branch is intentionally isolated from `main`.

It introduces the authentication/authorization boundary before expanding privileged functionality. Do not merge this branch into production until the deployment proxy is configured and all privileged OS adapters have been validated on a disposable server.
