# ServoMan security model

## Trust boundary

ServoMan is a privileged server-control application. It must not be exposed directly to the public Internet without an authentication-aware reverse proxy.

Next.js 16 uses the `proxy.ts` convention for the request boundary. ServoMan's `src/proxy.ts` fails closed unless the trusted proxy supplies `x-servoman-user`, `x-servoman-role`, and `x-servoman-proxy-secret` after stripping any client-supplied copies.

Set:

```bash
SERVOMAN_TRUSTED_PROXY_SECRET=<long-random-secret>
```

Never commit this value to Git.

## Roles

- `admin`: unrestricted panel administration and privileged OS actions.
- `operator`: operational website, DNS, database, deployment, container, service and backup actions.
- `viewer`: read-only dashboard/monitoring/log access.

Sensitive resources such as panel users, audit logs, settings and SSH keys are admin-only.

## Privileged routes

Terminal, filesystem, Git, settings and the domain-specific `/api/action` endpoint are admin-only. Generic CRUD mutation is denied to viewers, and admin-only resources cannot be mutated by operators.

Git webhooks are intentionally excluded from the panel authentication boundary because Git providers cannot supply the panel session headers. They authenticate using a high-entropy per-deployment webhook token and only auto-deploy the deployment's configured branch.

## Deployment requirements

1. Put ServoMan behind HTTPS.
2. Put an authentication proxy in front of ServoMan.
3. Strip all incoming `x-servoman-*` headers before adding trusted values.
4. Keep the application port bound to localhost/private networking where possible.
5. Store database credentials and the trusted-proxy secret outside Git.
6. Do not treat audit records, UI state, or client-provided actor fields as authentication.
7. Test the panel against a disposable server before granting it OS-level privileges.

The application intentionally fails closed when the trusted authentication configuration is missing.
