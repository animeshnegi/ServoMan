# Production checklist

## Before first deployment

- [ ] Configure `DATABASE_URL` outside Git.
- [ ] Configure a long random `SERVOMAN_TRUSTED_PROXY_SECRET` outside Git.
- [ ] Put ServoMan behind an HTTPS authentication proxy.
- [ ] Bind the application to a private interface or localhost.
- [ ] Ensure the proxy strips all incoming `x-servoman-*` headers before setting trusted values.
- [ ] Run database migrations.
- [ ] Review firewall policy and preserve SSH access before enabling restrictive rules.
- [ ] Verify backups are real files with tested restores.
- [ ] Verify ACME certificates are actually issued and renewed.
- [ ] Verify Docker/service/cron actions against a disposable test service first.
- [ ] Verify terminal and file APIs enforce an allowlist and path boundaries.
- [ ] Review audit logs after every privileged action.
- [ ] Run `npm ci`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

## Security rule

Never deploy the control panel directly to the public Internet. A control panel with OS-level privileges should have a separate authentication boundary and should be reachable only over HTTPS/private networking.
