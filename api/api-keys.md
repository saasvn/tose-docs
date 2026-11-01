# API Keys and Scopes

A workspace API key lets a script, a CI job or an AI agent call the TOSE REST API without a person signing in. This page explains what a key can do, how to limit it with scopes, and which routes never accept a key.

For how to send a key with a request, see [Authentication](/api/authentication).

## One key, one workspace

- A key belongs to **one workspace**, the one it was created in. It can read and change that workspace and nothing else.
- A key never gains account-level or platform-level power, even when the person who created it is a platform admin. See [Routes that reject API keys](#routes-that-reject-api-keys).
- TOSE checks the creator's workspace membership on every request. If the person is removed from the workspace, or demoted, their keys lose that access at once.
- A request for any other workspace is refused with `403`.

## Create a key

Only workspace owners and admins can create keys. Send the key in the `X-API-Key` header on every request. It is shown **once**, when you create it. TOSE stores only a hash, so a lost key cannot be recovered and has to be replaced.

```http
POST /api/workspaces/{slug}/api-keys
Content-Type: application/json

{
  "name": "ci-deploy",
  "expires_in_days": 90,
  "scopes": ["deployments:read", "deployments:execute", "logs:read"]
}
```

| Field | Required | Meaning |
|-------|----------|---------|
| `name` | Yes | A label to recognise the key later. |
| `expires_in_days` | No | The key stops working after this many days. Omit it for a key that does not expire. |
| `scopes` | No | The scopes to grant. Omit it for full access to the workspace (see below). An empty list is rejected. |

An unknown scope is rejected with `400`, and the response lists `allowed_scopes`.

## Scopes

A scope names a kind of operation. A key can only do what its scopes allow. A request that needs a scope the key does not have fails with `403` and `code: "insufficient_scope"`, and the response names the missing scope in `required_scope`.

The table below is generated from the authorization catalog in tose-app (`internal/policy`). The "Also grants" column lists narrower scopes that a scope includes.

| Scope | Also grants | Actions it allows |
|-------|-------------|-------------------|
| `workspace:read` | - | `workspace.read`, `member.read`, `invitation.read`, `api_key.read` |
| `workspace:write` | `workspace:read` | `workspace.update`, `workspace.delete`, `api_key.create`, `api_key.revoke` |
| `members:manage` | - | `member.manage`, `member.remove`, `invitation.manage` |
| `projects:read` | - | `project.read` |
| `projects:write` | `projects:read` | `project.write`, `project.delete` |
| `deployments:read` | `workspace:read`, `projects:read`, `logs:read` | `deployment.read` |
| `deployments:execute` | - | `deployment.execute` |
| `deployments:rollback` | - | `deployment.rollback` |
| `logs:read` | - | `logs.read` |
| `env:read` | - | `env.read`, `env.reveal` |
| `env:write` | `env:read` | `env.write` |
| `domains:write` | - | `domain.write` |
| `databases:read` | - | `database.read`, `database.data_read` |
| `databases:write` | `databases:read` | `database.write`, `database.delete` |
| `desktops:read` | - | `desktop.read` |
| `desktops:write` | `desktops:read` | `desktop.write` |
| `billing:read` | - | `billing.read` |
| `billing:write` | `billing:read` | `billing.write` |

Notes:

- `deployments:read` also covers reading projects, logs and the workspace, so a read-only key for a status dashboard needs only that one scope.
- Reading an environment variable value (`env.reveal`) needs `env:read`. Treat `env:read` like a secret.
- `deployments:write` exists only for the [MCP connector](/mcp) and cannot be granted to an API key.
- Scopes limit the key, never the person. Even with a scope, a request can still be refused when the workspace role of the key's creator is too low for the action.

## Full-access keys

A key created **without** `scopes` has full access to its workspace: every action its creator's role allows. Keys created before scopes existed behave this way. They keep working unchanged, and they still cannot leave their workspace.

Prefer scoped keys. When you can, replace a full-access key with a scoped one and revoke the old key.

## Recommended practice

- **Use the smallest set of scopes** that does the job. A CI job that deploys needs `deployments:execute`, `deployments:read` and `logs:read`. It does not need `env:write` or `billing:write`.
- **Use a separate key for each CI pipeline and each agent**, named after what uses it, so you can revoke one without breaking the others.
- **Set `expires_in_days`** for keys that are not long-lived infrastructure, and rotate them.
- **Keep keys out of source control and URLs.** Store them in your CI secret store. A request that carries a key in its query string is rejected with `400 credentials_in_url`.
- **A scoped key cannot create a broader key.** A key can only create keys whose scopes it already has, and a scoped key must list the scopes of the key it creates.
- **Review your keys.** `GET /api/workspaces/{slug}/api-keys` lists them, and `DELETE /api/workspaces/{slug}/api-keys/{key_id}` revokes one. Creating and revoking keys is recorded in the [audit log](/api/audit).

## Routes that reject API keys

Some routes act on a person's account or on shared infrastructure, not on one workspace. A key is bound to one workspace, so these routes refuse it with `403 forbidden`. Use a signed-in session instead.

| Route | Why |
|-------|-----|
| `POST /api/workspaces` | Creating a workspace is an account action. |
| `POST /api/invitations/{token}/accept` | Accepting an invitation is an account action. |
| `POST /api/upload` | See below. |
| `POST /api/github/check-install`, `POST` and `DELETE /api/github/workspace-installations` | Managing GitHub installations is an account action. |
| `GET /api/mcp/connections`, `DELETE /api/mcp/connections/{family_id}`, `GET /api/mcp/tasks`, `GET /api/mcp/audit` | Connections belong to the person who made them, so only that person can see or revoke them. |
| `POST` and `DELETE /api/servers`, `PUT /api/servers/{id}/development`, `POST` and `DELETE /api/registries`, `GET /api/registries` | Servers and registries are shared platform infrastructure. |

A few account-level reads do accept a key, limited to its own workspace: `GET /api/workspaces` lists only the key's workspace, `GET /api/workspaces/available-templates` returns the template catalog, and `GET /api/servers` and the `GET /api/github/...` reads check the workspace the key is bound to. The GitHub reads also need the `projects:read` scope.

### Behavior change: `POST /api/upload` no longer accepts API keys

`POST /api/upload` used to accept an API key. It now refuses one with `403 forbidden` and accepts only a signed-in user session.

The reason: an upload is stored under the **user's** account, not under a workspace, and in TOSE's authorization policy it is an account-level action. An API key is bound to one workspace and does not carry account-level power. TOSE's rule is that anything a person can do in the dashboard can also be done with an API key, unless the reason for an exception is written down. This is that exception.

If a script used `POST /api/upload` with a key, upload the file from a signed-in session instead, or host the file elsewhere and pass its URL.
