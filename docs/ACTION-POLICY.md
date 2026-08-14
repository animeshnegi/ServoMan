# Privileged action policy

All `/api/action` operations must call `authorizeAction()` before dispatch. The client is never trusted to select its own role or actor.

OS-level actions are deliberately assigned to admin-only `admin.shell` unless a narrower resource permission exists. This prevents an operator permission from becoming arbitrary server command execution.

When adding a new action:

1. Add it to the narrowest permission group.
2. Validate all arguments with an allowlist/schema.
3. Prefer a dedicated OS API over shell interpolation.
4. Never concatenate untrusted input into a shell command.
5. Audit the authenticated actor and outcome.
6. Return sanitized errors.
