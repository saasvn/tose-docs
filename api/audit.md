# Audit Log

TOSE records every change made through the REST API, so you can answer who did what, with which credential, and whether it worked.

## What is recorded

Every request to `/api` that changes something (`POST`, `PUT`, `PATCH` and `DELETE`) is written to the audit log after it finishes. Requests that the authorization policy **denied** are recorded too, so a key trying something its scopes or role do not allow leaves a trace. Requests rejected earlier, such as an invalid, expired or revoked key, or a key used against another workspace, are not recorded.

Each entry holds:

| Field | Meaning |
|-------|---------|
| `user_id` | The person the request acted for. |
| `auth_type` | How the request authenticated: `session` (signed in) or `api_key`. |
| `credential_id` | The API key that made the request, when it was not a session. |
| `workspace_id` | The workspace the request touched. |
| `action`, `risk` | The operation (for example `env.write`) and its risk level: `low`, `medium`, `high` or `critical`. |
| `method`, `route`, `params` | The HTTP method, the route template (for example `/api/workspaces/:slug/api-keys`) and the path parameters. |
| `status`, `outcome`, `deny_code` | The HTTP status, the result (`ok`, `denied` or `error`) and, for a denial, the reason. |
| `request_id` | The request ID, to match an entry with a support request. |
| `created_at` | When it happened. |

## What is never recorded

- Request bodies. A secret you send, such as an environment variable value, is not stored.
- Query strings.
- Invitation tokens. They are dropped from the path parameters.

Reads (`GET`) are not part of this log.

## MCP connector calls

Calls made through the [MCP connector](/mcp) are also recorded in a separate MCP audit log: client, workspace, project, deployment, tool, outcome and error code. Deploys and rollbacks are recorded before they run.

## Who can see it

- **Platform operators** can read the audit log. It is stored in the TOSE database.
- **You** can see your own MCP activity for a workspace in the dashboard, under workspace **Settings**, then **Agent access**. The same data is available at `GET /api/mcp/audit?workspace_id=...` for a signed-in session.
- The REST API audit log has no dashboard page or public API yet. If you need an export for your workspace, contact the operator of your TOSE instance and include the time range and the workspace.
