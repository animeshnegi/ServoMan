# ServoMan security model

## Trust boundary

ServoMan is a privileged server-control application. It must not be exposed directly to the public Internet without an authentication-aware reverse proxy.

The application expects a trusted proxy to strip client-supplied `x-servoman-user`, `x-servoman-role`, and `x-servoman-proxy-secret` headers and inject authenticated values.

Set:

```bash
SERVOMAN_TRUSTED_PROXY_SECRET=<long-random-secret>
```

Never commit this value to Git.

## Roles

- `admin`: unrestricted panel administration.
- `operator`: operational website, DNS, database, deployment, container, service and backup actions.
- `viewer`: read-only dashboard/monitoring/log access.

Generic CRUD resources are mapped to least-privilege permissions. Sensitive resources such as panel users, audit logs and SSH keys require admin permissions.

## Deployment requirements

1. Put ServoMan behind HTTPS.
2. Put an authentication proxy in front of ServoMan.
3. Strip all incoming `x-servoman-*` headers before adding trusted values.
4. Keep the application port bound to localhost/private networking where possible.
5. Store database credentials and the trusted-proxy secret outside Git.
6. Do not treat audit records, UI state, or client-provided actor fields as authentication.

This branch intentionally fails closed when the trusted authentication configuration is missing.
