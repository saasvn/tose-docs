# Desktops API

::: warning Coming soon
Cloud Desktops are built, and the `tose desktop` commands ship in CLI 0.1.3, but the feature is
not switched on in production yet. Until it is, the `desktops` endpoints return 404 and the
commands fail. Everything below is reference for when it launches.
:::

REST endpoints for [Cloud Desktops](/guide/cloud-desktops). All paths are relative to the
workspace:

```
https://api-v2.tose.sh/api/workspaces/{workspace_slug}
```

Authenticate every request with your API key in the `X-API-Key` header
(see [Authentication](/api/authentication)). An API key needs the `desktops:read` scope to read and
`desktops:write` to change anything.

Cloud Desktop routes are served only when the deployment sets `DESKTOP_ENABLED=true`. Otherwise every
route on this page returns `404`.

## Endpoints

| Method | Path | Role | Response |
|--------|------|------|----------|
| `POST` | `/desktops` | admin | `202` `{desktop, operation}` |
| `GET` | `/desktops` | member | `200` `{desktops: [...]}` |
| `GET` | `/desktops/{desktop_id}` | member | `200` desktop |
| `POST` | `/desktops/{desktop_id}/wake` | member | `202` `{desktop, operation}`, or `200` if already running |
| `POST` | `/desktops/{desktop_id}/sleep` | member | `202` `{desktop, operation}`, or `200` if already sleeping |
| `DELETE` | `/desktops/{desktop_id}?confirm={name}` | admin | `202` `{desktop, operation}` |
| `GET` | `/desktops/{desktop_id}/operations/{operation_id}` | member | `200` operation |
| `GET` | `/desktops/{desktop_id}/events` | member | `200` `{events: [...]}` |
| `GET` | `/desktops/{desktop_id}/sessions` | member | `200` `{sessions: [...]}` |
| `POST` | `/desktops/{desktop_id}/sessions` | member | `201` `{session, token, websocket_path, websocket_protocols, vnc_password}` |
| `DELETE` | `/desktops/{desktop_id}/sessions/{session_id}` | member | `204` |
| `POST` | `/desktops/{desktop_id}/actions` | member | action result |

The examples below assume:

```bash
export TOSE_API=https://api-v2.tose.sh
export TOSE_API_KEY=tose_sk_your_api_key
export WS=my-workspace
export DESKTOP_ID=<desktop-id>
```

## Objects

### Desktop

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Desktop id |
| `workspace_id` | string | Owning workspace |
| `server_id` | string | Server the desktop runs on |
| `name` | string | Desktop name, unique in the workspace |
| `status` | string | `provisioning`, `starting`, `running`, `sleeping`, `sleeping_failed`, `waking`, `error`, `deleting` |
| `desired_state` | string | State the platform is driving towards |
| `cpu` | string | CPU allocation |
| `ram` | string | RAM allocation |
| `disk_size_gi` | number | Persistent disk size in GiB |
| `storage_class` | string | Storage class of the disk |
| `image` | string | Desktop image |
| `resolution` | string | Screen resolution, e.g. `1920x1080` |
| `auto_sleep_minutes` | number | Idle minutes before automatic sleep |
| `last_activity_at` | string | Last recorded activity (ISO 8601) |
| `last_error` | string | Last error message, if any |
| `current_operation_id` | string | Operation in flight, if any |
| `compute_cents_per_hour` | number | Compute price while running |
| `created_at`, `updated_at` | string | Timestamps (ISO 8601) |

### Operation

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Operation id |
| `desktop_id` | string | Desktop id |
| `action` | string | `create`, `wake`, `sleep`, `delete` |
| `status` | string | `pending`, `running`, `succeeded`, `failed` |
| `error` | string | Failure reason when `failed` |
| `actor_type` | string | Who started the operation |
| `duration_ms` | number | Duration once finished |
| `created_at`, `finished_at` | string | Timestamps (ISO 8601) |

Only one operation runs per desktop. Repeating `wake` or `sleep` while one is in flight returns
the in-flight operation.

## Create a desktop

`POST /desktops` (admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Desktop name |
| `server_id` | string | yes | Server to run on |
| `cpu` | string | yes | CPU allocation: cores (`"2"`) or millicores (`"500m"`) |
| `ram` | string | yes | RAM allocation: a bare number means GiB (`"4"`), or a quantity such as `"512Mi"` |
| `disk_size_gi` | number | yes | Disk size in GiB |
| `storage_class` | string | no | Storage class for the disk |
| `resolution` | string | no | Screen resolution, e.g. `1920x1080` |
| `auto_sleep_minutes` | number | no | Idle minutes before automatic sleep |

```bash
curl -X POST "$TOSE_API/api/workspaces/$WS/desktops" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"dev","server_id":"<server-id>","cpu":"2","ram":"4","disk_size_gi":20}'
```

```json
{
  "desktop": { "id": "<desktop-id>", "name": "dev", "status": "provisioning", "...": "..." },
  "operation": { "id": "<operation-id>", "action": "create", "status": "pending", "...": "..." }
}
```

## List and get

```bash
curl "$TOSE_API/api/workspaces/$WS/desktops" -H "X-API-Key: $TOSE_API_KEY"
curl "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID" -H "X-API-Key: $TOSE_API_KEY"
```

## Wake and sleep

```bash
curl -X POST "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/wake" -H "X-API-Key: $TOSE_API_KEY"
curl -X POST "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/sleep" -H "X-API-Key: $TOSE_API_KEY"
```

Both return `202` with `{desktop, operation}`. When the desktop is already in the requested state
(for example waking a running desktop), they return `200` with `operation: null`. Sleep releases
CPU and RAM and keeps the disk; wake boots the same disk again. Memory is not preserved.

Waking a desktop needs a positive wallet balance. With a zero or negative balance, `wake` returns `402` (even for a desktop that is already running) and the desktop stays asleep; top up the wallet and call it again. A desktop that is `running` with its workload gone or scaled to 0 is only woken back on the same disk under the same condition. Compute is billed per second; see [Pricing](/guide/pricing#cloud-desktops).

### Poll an operation

```bash
curl "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/operations/$OPERATION_ID" \
  -H "X-API-Key: $TOSE_API_KEY"
```

Poll until `status` is `succeeded` or `failed`.

## Delete

`DELETE /desktops/{desktop_id}?confirm={name}` (admin). The `confirm` parameter must equal the
desktop name; requests without it are rejected. Deleting removes the disk permanently.
A workspace that still has desktops cannot be deleted (`409`); delete its desktops first.

```bash
curl -X DELETE "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID?confirm=dev" \
  -H "X-API-Key: $TOSE_API_KEY"
```

## Events

```bash
curl "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/events" -H "X-API-Key: $TOSE_API_KEY"
```

Returns `{events: [...]}`, the audit log of the desktop.

## Sessions

A session grants access to a running desktop and carries the control lease.

### Create

`POST /desktops/{desktop_id}/sessions`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `controller` | string | yes | `human` or `agent` |
| `takeover` | boolean | no | Take the control lease from its current holder |

API keys can only open `agent` sessions; asking for `human` returns `403`. A session ends when its
holder loses access to the workspace (membership removed, API key revoked or expired) and after
12 hours at most, whatever its activity.

```bash
curl -X POST "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/sessions" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"controller":"agent"}'
```

Response `201`:

| Field | Description |
|-------|-------------|
| `session` | The session object; use `session.id` as `session_id` in actions |
| `token` | Secret gateway token for this session. Returned **once**, by this response only; the server keeps just its hash, so it cannot be fetched again. Never log it or put it in a URL |
| `websocket_path` | Gateway path for the screen stream (contains no token) |
| `websocket_protocols` | WebSocket subprotocols to send when connecting: `binary` and `tose.desktop.token.<token>` |
| `vnc_password` | The desktop's own 8-character VNC password. It is not rotated and is returned with **every** new session of this desktop (it is never part of the desktop object). Never log it |

### List and delete

```bash
curl "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/sessions" -H "X-API-Key: $TOSE_API_KEY"
curl -X DELETE "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/sessions/$SESSION_ID" \
  -H "X-API-Key: $TOSE_API_KEY"
```

Delete returns `204` and releases the lease if the session held it.

### Gateway

```
GET /api/desktop-gateway/{session_id}
Sec-WebSocket-Protocol: binary, tose.desktop.token.{token}
```

A WebSocket endpoint that carries the desktop screen (RFB). Pass `websocket_protocols` from the
session response as the subprotocols, so the token never appears in a URL or a log. The `Origin`
must be the dashboard's. It is the only way to reach a desktop's display: desktops accept no
network connections, and the platform reaches VNC inside the pod through the Kubernetes API.
The stream closes within 5 seconds of the session losing the lease. The `?token={token}` query parameter is a legacy path kept only for older clients. It puts the
token in a URL, so do not use it in new code.

## Actions

`POST /desktops/{desktop_id}/actions` with `{session_id, action, ...params}`.

| Action | Parameters | Result | Requires lease |
|--------|------------|--------|----------------|
| `screenshot` | none | `{image_base64, mime}` | yes |
| `click` | `x`, `y`, `button?` | | yes |
| `type` | `text` | | yes |
| `key` | `keys` | | yes |
| `scroll` | `x`, `y`, `direction`, `amount?` | | yes |
| `terminal.exec` | `command`, `timeout_seconds?` | `{stdout, stderr, exit_code}` | yes |
| `file.read` | `path` | `{content_base64}` | yes |
| `file.write` | `path`, `content_base64` | | yes |

Every action needs the caller's own session (same user and API key) to hold the control lease;
otherwise it returns `403`. File paths are confined to `/home/ubuntu`.

```bash
curl -X POST "$TOSE_API/api/workspaces/$WS/desktops/$DESKTOP_ID/actions" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION_ID\",\"action\":\"terminal.exec\",\"command\":\"uname -a\"}"
```

```json
{ "stdout": "Linux dev 6.8.0 ...\n", "stderr": "", "exit_code": 0 }
```

See the [Cloud Desktops guide](/guide/cloud-desktops#driving-a-desktop-from-an-agent) for a full
agent walkthrough.
