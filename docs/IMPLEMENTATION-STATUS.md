# Hardening implementation status

This branch establishes a fail-closed security boundary for the panel and API surface.

Implemented:

- Central authentication context and admin/operator/viewer roles.
- Next.js 16 `proxy.ts` network boundary.
- Admin-only protection for terminal, filesystem, Git, settings and `/api/action`.
- Viewer mutation denial and admin-only generic resources.
- Resource-level authorization for generic CRUD collection and item endpoints.
- Server-derived audit actor for CRUD operations; omitted actors are recorded as `system`, never `admin`.
- ID and payload validation in generic CRUD.
- Sensitive-value response redaction.
- Request rate limiting for panel/API traffic.
- Public health endpoint and separately token-authenticated Git webhook boundary.
- Git webhook branch restriction so a push cannot select an arbitrary deployment branch.
- CI for dependency installation, typecheck, lint and production build.
- Next.js upgraded to 16.2.11, including the current 16.x security patch available when this branch was hardened.
- Production deployment and security test checklists.

The privileged action implementation in `/api/action` is intentionally kept behind the admin-only boundary. Its current product behavior still contains simulated operations in several areas (for example some backup, service, SSL and system actions). Before production use, those operations should be replaced or verified against real server adapters and tested on a disposable host. The security boundary must remain in place while doing that integration.
