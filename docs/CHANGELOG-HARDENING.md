# Hardening changelog

- Created `agent/production-hardening` from `main`.
- Added API authentication and RBAC primitives.
- Added resource-level authorization for generic CRUD.
- Added sensitive-response redaction.
- Added rate-limit primitives and CI.
- Opened draft PR #1 against `main`.

The branch is not ready to merge until privileged action routes and deployment adapters are integrated with the new authorization boundary and CI passes.
