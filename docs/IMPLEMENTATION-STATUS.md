# Hardening implementation status

This branch establishes a fail-closed security boundary for the panel and generic CRUD API.

Implemented:

- Central authentication context and roles.
- Resource-level permissions for generic CRUD.
- Fail-closed middleware for panel/API paths.
- Server-derived audit actor instead of client-supplied actor.
- ID and payload validation in generic CRUD.
- Cache prevention for sensitive API responses.
- Sensitive-value redaction helpers.
- Basic request rate limiting.
- CI for dependency installation, typecheck, lint and build.
- Production deployment and security checklists.

Remaining integration work must be completed against the actual deployment environment before enabling OS-level actions: terminal, filesystem, Git, firewall, service management, Docker, mail, DNS, ACME and backup providers must each enforce the same authenticated permission boundary and use narrowly scoped command adapters rather than arbitrary shell execution.
