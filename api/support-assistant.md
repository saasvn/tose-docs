# Support Assistant Token

The in-dashboard support assistant (Dewee) can diagnose your workspace and propose changes. It never holds your session token or an API key. Instead, the dashboard mints a **support token**: a short-lived credential that only works on the two routes the assistant needs.

The support broker is off by default. A TOSE instance enables it with `SUPPORT_BROKER_ENABLED=true`, which mounts `/api/support`.

## Mint a token

`POST /api/support/token` returns a token for the signed-in user.

```bash
curl -X POST https://app.tose.sh/api/support/token \
  -H "Cookie: <session cookie>"
```

```json
{ "token": "<support token>", "expires_at": "2026-11-04T15:52:00Z" }
```

| Property | Behavior |
|----------|----------|
| Who can mint | A signed-in user with a **session login**. API keys and OAuth grants are refused with `403`; a signed-out request gets `401`. |
| Lifetime | 5 minutes. Mint a new token when it expires instead of keeping the session token around. |
| Binding | The token is bound to the user and to the session that minted it. |
| Revocation | Signing out, or revoking the session, makes the token fail immediately. |

## Where the token works

Send the token as `Authorization: Bearer <token>`. It is accepted on exactly two routes:

| Route | Purpose |
|-------|---------|
| `GET /api/support/tools` | Lists the assistant's operations with their JSON Schemas. |
| `POST /api/support/call` | Runs one operation with `{operation, workspace, args}`. |

Every other route returns `401`, including `POST /api/support/token` (a support token cannot mint another one) and `/api/support/approvals/*`.

## What the assistant can do

Each call goes through the same authorization as the dashboard and checks your live workspace membership, so the assistant can never reach more than you can.

| Operation | Risk | Returns |
|-----------|------|---------|
| `list_projects` | low | Project names, slugs and latest deployment status. |
| `get_project_status` | low | Live, latest and recent deployments, with redacted errors. |
| `read_logs` | low | The newest build or runtime lines (at most 500 lines, 64 KiB), redacted. |
| `get_wallet` | low | Balance, low-balance alert setting and 30-day spend. No payment details. |
| `get_action_status` | low | The state of a change the assistant proposed. |
| `redeploy_project` | high | A plan and an `approval_id`. It never deploys by itself. |

`redeploy_project` needs an **owner or admin** role, both when proposed and when confirmed. You confirm a change with a button in the dashboard; the assistant has no operation that approves. A confirmation expires after ten minutes, and a push that moved the branch since the plan was shown returns `409 approval_stale`.

Logs and statuses are redacted before the assistant sees them: environment variable values and common credential shapes are removed. If redaction cannot load, the call fails with `503` instead of returning raw text.

## Audit

Every call is recorded in the [audit log](/api/audit) with `auth_type` `session`, including denied and unknown operations. Arguments and output are never stored.

## Not available to the assistant

Shell or file access, environment variable reads, database access, billing changes, member or API key management, deletes, rollbacks, restarts and arbitrary API calls.
