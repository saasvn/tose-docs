# Protocol, OAuth and scopes

This page covers how an MCP client connects to TOSE: which protocol revisions it can use, how it registers, which OAuth scopes it can ask for, and what happens when a read-only connection tries to write. The maintainer-level detail lives in [`MCP-CONNECTOR.md`](https://github.com/saasvn/tose-app/blob/master/MCP-CONNECTOR.md); this page does not repeat it.

## Protocol revisions

The server is stateless Streamable HTTP at `https://<your TOSE API host>/mcp`.

| Revision | How a client reaches it |
|----------|-------------------------|
| 2026-07-28 | `server/discover`, with per-request `_meta` and no session ID |
| 2025-11-25, 2025-06-18, 2025-03-26, 2024-11-05 | `initialize`, on the same endpoint |

Every revision sees the same tools. The only difference is how a refused write is reported, described under [step-up](#insufficient-scope-step-up).

## Client registration

A client can identify itself in either of two ways. TOSE accepts both:

- **Client ID Metadata Document (CIMD), preferred.** The client uses an `https` URL as its `client_id`, and TOSE fetches the JSON document at that URL. The consent page names the domain that published it.
- **Dynamic client registration.** Clients without a metadata document register with `POST /oauth/register`. The consent page shows these clients as unverified.

Both flows use the authorization code grant with PKCE (S256 only). Clients that use a metadata document authenticate with `none`. Dynamically registered clients use `none` or a client secret (`client_secret_post` or `client_secret_basic`). Key-based client authentication such as `private_key_jwt` is not supported.

## Scopes

| Scope | Grants | Changes production |
|-------|--------|--------------------|
| `deployments:read` | Workspace, projects, deployment status and logs. This is the default when a client asks for no scope. | No |
| `deployments:write` | Deploy and roll back. | Yes |
| `workspace:read` | The workspace name and your role. Added to every narrower request. | No |
| `projects:read` | `list_projects`; with autoscaling budgets on, `autoscaling_budget_get` | No |
| `projects:write` | For an owner or admin: `create_template_draft` and `publish_template`, and with `deployments:execute` also `deploy_template`. With autoscaling budgets on, `autoscaling_budget_plan`, which only stores a budget change as a plan for a person to approve in the dashboard | Only `deploy_template`, which also needs `deployments:execute` |
| `logs:read` | `read_logs` | No |
| `deployments:execute` | `deploy_project` | Yes |
| `deployments:rollback` | `rollback_deployment` | Yes |

- Any other scope, including members, billing, environment variables, databases and infrastructure, is refused with `invalid_scope`.
- A write scope is granted only when a workspace owner or admin ticks it on the consent page. It is removed on the next refresh if that person is demoted.
- A refresh can narrow the scopes but never widen them.
- `tools/list` shows only the tools your scopes allow: four read tools for a read-only connection, plus deploy and rollback with write scope.

Even with a write scope, every deploy and rollback still waits for you to approve the plan in your browser.

## `insufficient_scope` step-up

When a read-only token calls a write tool:

- On revision 2026-07-28 the server answers HTTP 403 with `WWW-Authenticate: Bearer error="insufficient_scope"` and the scopes it needs. A client that supports step-up can send you back through consent to widen the grant.
- On older revisions the client receives an `INSUFFICIENT_SCOPE` tool error instead.

Both are recorded in the audit history as `denied`.

## Browser-based clients (`MCP_ALLOWED_ORIGINS`)

Requests from a browser carry an `Origin` header, and TOSE rejects origins it does not know before authenticating. `API_BASE_URL` and `FRONTEND_URL` are always allowed. Server-side clients send no `Origin` header and are not affected.

To use a client that runs in a browser, such as a hosted MCP Inspector, the operator of the TOSE instance adds its origin to `MCP_ALLOWED_ORIGINS`, a comma-separated list. For a local Inspector, that is `http://localhost:6274`. Without it the client gets HTTP 403. 

## Client support

Which clients work, and which of them has actually been tested, is on its own page: [Client compatibility](./clients).
