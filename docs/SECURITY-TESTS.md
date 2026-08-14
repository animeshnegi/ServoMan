# Security test checklist

Before production deployment, verify all of the following with an authenticated test environment:

- Unauthenticated API requests return 401.
- Viewer cannot mutate any resource.
- Operator cannot manage panel users, audit logs, or SSH keys.
- Client-supplied actor/user headers cannot override the trusted proxy identity.
- Sensitive credentials are never returned by generic GET endpoints.
- Invalid resource names return 404.
- Invalid IDs return 400.
- Path traversal is rejected by file APIs.
- Terminal commands cannot escape their allowed execution policy.
- Webhook endpoints require signature verification.
- Destructive actions are audited with the authenticated identity.
- Error responses do not expose stack traces, SQL, secrets, or command output.
- Rate limits apply to authentication and privileged action endpoints.
