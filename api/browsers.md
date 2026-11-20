# Browsers API

::: info On TOSE cloud
Browser routes are live on TOSE cloud. A self-hosted deployment serves them only with
`BROWSER_ENABLED=true`. The Site API map routes below are enabled on TOSE cloud and need per-workspace admin setup; see
[what is available](/guide/agent-browser#status).
:::

REST endpoints for [agent browser](/guide/agent-browser) sessions. All paths are relative to the
workspace:

```
https://api-v2.tose.sh/api/workspaces/{workspace_slug}
```

Authenticate with your API key in the `X-API-Key` header (see
[Authentication](/api/authentication)). Workspace credentials need explicit `browser:read` consent
to read and `browser:control` to drive sessions; `browsers:read` and `browsers:write` remain
accepted aliases. A session outside the caller's workspace answers `404`.

## Sessions

| Method | Path | Response |
|--------|------|----------|
| `POST` | `/browsers` | `202` session, or `200` the existing session for a repeated `Idempotency-Key` |
| `GET` | `/browsers` | `200` sessions |
| `GET` | `/browsers/{browser_id}` | `200` session |
| `DELETE` | `/browsers/{browser_id}` | `202` termination accepted |
| `POST` | `/browsers/{browser_id}/suspend` | `202` (removes the pod) |
| `POST` | `/browsers/{browser_id}/resume` | `202` (starts a new pod) |
| `GET` | `/browsers/{browser_id}/events?limit=` | `200` lifecycle, lease and action audit events |

Create body:

```json
{"name": "web", "server_id": "<server-id>", "cpu": "1", "ram": "2Gi"}
```

`name` (required) is 1 to 40 lowercase letters, digits or dashes; `cpu` and `ram` are Kubernetes
quantities. Create and resume answer `402` when the wallet is empty and `429` when the workspace is
at its concurrent-session cap.

## Leases

| Method | Path | Response |
|--------|------|----------|
| `POST` | `/browsers/{browser_id}/leases` | `201` lease, one-time token and observation stream details |
| `GET` | `/browsers/{browser_id}/leases` | `200` leases, without tokens |
| `DELETE` | `/browsers/{browser_id}/leases/{lease_id}` | `204` revoked; older leases are fenced |
| `POST` | `/browsers/{browser_id}/heartbeat` | `200` lease extended within its age cap (`X-Browser-Lease` header) |

Lease body: `controller` (`human` or `agent`; defaults to `human` for a signed-in person and `agent`
for API keys), `scopes` (`observe`, `act`) and `takeover`. Credentials can hold only agent leases.
See [Leases](/guide/agent-browser#leases).

## Actions

`POST /browsers/{browser_id}/actions` with the lease token in `X-Browser-Lease`.

| Field | Used by |
|---|---|
| `type` | `navigate`, `snapshot`, `click`, `fill`, `press`, `screenshot`, `extract`, `wait`, `tab`, `fetch` |
| `url` | `navigate`; for `fetch` the canonical URL of an enabled endpoint |
| `locator` | exactly one of `css`, `role`, `text`, `label`; optional `name`, `exact`, `nth` |
| `value` | `fill` |
| `key` | `press` |
| `kind`, `attr`, `all` | `extract` (`text`, `attr`, `value`) |
| `until`, `text` | `wait` (`load`, `visible`, `hidden`, `url_contains`, `text`, `delay`) |
| `full_page` | `screenshot` |
| `tab`, `tab_id` | `tab` (`list`, `new`, `close`, `switch`) |
| `timeout_ms` | any, 0 to 30000 |
| `interactive_only`, `format`, `return_snapshot` | shape the snapshot; not part of an approval |
| `approval` | the token for `click`, `fill` or `press` run by an API key or connected app |

```bash
curl -X POST "$TOSE_API/api/workspaces/acme/browsers/$BROWSER_ID/actions" \
  -H "X-API-Key: $TOSE_API_KEY" -H "X-Browser-Lease: $LEASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "snapshot", "format": "compact"}'
```

Errors use the shared envelope `error`, `code`, `next_step`, `details`; see
[Errors](/guide/agent-browser#errors).

## Approvals

`POST /browsers/{browser_id}/approvals`, by a signed-in workspace owner or admin only:

```json
{"lease_id": "<agent lease>", "action": {"type": "click", "locator": {"role": "button", "name": "Buy", "exact": true}},
 "origin": "https://shop.example.com", "ttl_seconds": 600}
```

`action` is the exact body the agent will send, without `approval`. `ttl_seconds` defaults to 600,
at most 900. The response `{"approval": {id, token, executor, session_id, action, origin,
expires_at}}` shows the token once. API keys and connected apps get `403 HUMAN_APPROVAL_REQUIRED`; a
person's own lease needs no approval (`400`).

## Allowed sites

| Method | Path | Who |
|--------|------|-----|
| `GET` | `/browser-origins` | `browser:read`: the switch and every origin |
| `POST` | `/browser-origins` `{origin}` | anyone who may drive a browser; stays `pending` |
| `POST` | `/browser-origins/{origin_id}/confirm` | signed-in owner or admin |
| `DELETE` | `/browser-origins/{origin_id}` | signed-in owner or admin |
| `PUT` | `/browser-egress` `{allowlist_enabled}` | signed-in owner or admin |

## Site API map

Served only with `BROWSER_API_MAP_ENABLED`, which is enabled on TOSE cloud; each workspace needs admin setup. See [Site API map](/guide/agent-browser#site-api-map).

| Method | Path | Who |
|--------|------|-----|
| `GET` | `/browser-api-endpoints?origin=` | `browser:read`: unexpired endpoints |
| `GET` | `/browser-api-endpoints?url=<url>` | `browser:read`: known `GET` endpoints of that origin, the match first |
| `POST` | `/browser-api-endpoints/{endpoint_id}/enable` | signed-in owner or admin |
| `POST` | `/browser-api-endpoints/{endpoint_id}/disable` | signed-in owner or admin |

`fetch` errors: `FETCH_METHOD_NOT_ALLOWED` (400), `API_ENDPOINT_NOT_ENABLED` (403),
`FETCH_URL_NOT_CANONICAL` (400 or 403), `FETCH_CROSS_ORIGIN` (403), `fetch_failed` (422).
