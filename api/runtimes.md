# Runtimes API

REST endpoints for runtimes: the docker hosts that [Cloud Harness](/guide/cloud-harness)
instances run their Docker jobs on. Each instance has exactly one runtime, created with the
instance. All paths are relative to the workspace:

```
https://api-v2.tose.sh/api/workspaces/{workspace_slug}
```

Authenticate every request with your API key in the `X-API-Key` header
(see [Authentication](/api/authentication)).

## Endpoints

| Method | Path | Role | API key scope | Response |
|--------|------|------|---------------|----------|
| `GET` | `/runtimes` | member | `runtimes:read` | `200` `{runtimes: [...]}` |
| `POST` | `/runtimes` | admin | `runtimes:write` | `202` `{runtime, operation}` |
| `GET` | `/runtimes/{runtime_id}` | member | `runtimes:read` | `200` runtime |
| `DELETE` | `/runtimes/{runtime_id}?confirm={name}` | admin | `runtimes:write` | `202` `{runtime, operation}` |
| `POST` | `/runtimes/{runtime_id}/wake` | member | `runtimes:write` | `202` `{runtime, operation}`, or `200` if already ready |
| `POST` | `/runtimes/{runtime_id}/suspend` | member | `runtimes:write` | `202` `{runtime, operation}`, or `200` if already cold |
| `POST` | `/runtimes/{runtime_id}/activity` | member | `runtimes:write` | `204` |
| `GET` | `/runtimes/{runtime_id}/operations` | member | `runtimes:read` | `200` `{operations: [...]}` |
| `GET` | `/runtimes/{runtime_id}/operations/{operation_id}` | member | `runtimes:read` | `200` operation |

**Role** is the lowest workspace role that may call the endpoint; owners can call everything. An API
key acts with its owner's role and also needs the listed scope. `runtimes:write` includes
`runtimes:read`.

### Runtime-bound keys

Each Cloud Harness instance has its own API key, issued and managed by TOSE, which the instance uses
to wake its docker host and report activity. It appears in the workspace's API keys with
`runtime_id` set, and you cannot create one yourself. It can only read and operate its own runtime:
get it, wake, suspend, report activity and read its operations. Every other call, including the
runtime list, create and delete, returns `403`.

The examples below assume:

```bash
export TOSE_API=https://api-v2.tose.sh
export TOSE_API_KEY=ws_your_api_key
export WS=my-workspace
export RUNTIME_ID=<runtime-id>
```

## Objects

### Runtime

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Runtime id |
| `workspace_id` | string | Owning workspace |
| `server_id` | string | Server the runtime runs on |
| `template_id` | string | The Cloud Harness instance (template) it belongs to |
| `kind` | string | Always `docker-host` |
| `name` | string | Runtime name; deleting needs it as confirmation |
| `status` | string | `cold`, `waking`, `ready`, `suspending`, `suspend_failed`, `error`, `deleting` |
| `desired_state` | string | State the platform is driving towards: `cold`, `ready` or `deleted` |
| `cpu` | string | CPU allocation, in millicores (`"2000m"`) |
| `ram` | string | RAM allocation, in MiB (`"4096Mi"`) |
| `disk_size_gi` | number | Disk size in GiB |
| `storage_class` | string | Storage class of the disk |
| `image` | string | Docker host image |
| `runtime_class` | string | Sandbox runtime class of the pod |
| `idle_suspend_minutes` | number | Idle minutes before automatic suspend |
| `last_activity_at` | string | Last recorded activity (ISO 8601), or `null` |
| `last_error` | string | Last error message, if any |
| `current_operation_id` | string | Operation in flight, or `null` |
| `created_by` | string | User who created the runtime |
| `compute_cents_per_hour` | number | Compute price in cents per hour while `ready`, at the workspace's current wallet balance tier |
| `created_at`, `updated_at` | string | Timestamps (ISO 8601) |

### Operation

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Operation id |
| `runtime_id` | string | Runtime id |
| `workspace_id` | string | Workspace id |
| `action` | string | `create`, `wake`, `suspend`, `delete` |
| `status` | string | `pending`, `running`, `succeeded`, `failed` |
| `error` | string | Failure reason when `failed` |
| `actor_type` | string | Who started it: `user`, `api_key` or `system` |
| `actor_id` | string | The user or API key id; for `system`, the reason |
| `duration_ms` | number | Duration once finished |
| `started_at`, `finished_at` | string | Timestamps (ISO 8601) |
| `created_at`, `updated_at` | string | Timestamps (ISO 8601) |

One operation runs per runtime at a time. Repeating the request that is in flight returns that
operation instead of starting another, so retries are safe. A suspend takes over a wake in flight,
and a delete takes over anything; any other request while an operation runs returns `409`.

## List and get

```bash
curl "$TOSE_API/api/workspaces/$WS/runtimes" -H "X-API-Key: $TOSE_API_KEY"
curl "$TOSE_API/api/workspaces/$WS/runtimes/$RUNTIME_ID" -H "X-API-Key: $TOSE_API_KEY"
```

The list is newest first. To find an instance's runtime, match `template_id` against the instance's
id.

## Wake and suspend

```bash
curl -X POST "$TOSE_API/api/workspaces/$WS/runtimes/$RUNTIME_ID/wake" -H "X-API-Key: $TOSE_API_KEY"
curl -X POST "$TOSE_API/api/workspaces/$WS/runtimes/$RUNTIME_ID/suspend" -H "X-API-Key: $TOSE_API_KEY"
```

Both return `202` with `{runtime, operation}`. When the runtime is already in the requested state
they return `200` with `operation: null`.

- **Wake** starts the runtime on its existing disk. It needs a positive wallet balance (`402`
  otherwise), and returns `503` while TOSE has waking turned off.
- **Suspend** stops its compute and keeps the disk. Containers running on it stop.

You rarely need either: the instance wakes its runtime when a job needs Docker, and the runtime
suspends after `idle_suspend_minutes` without activity. Compute is billed per second from a
confirmed `ready` until a confirmed stop; see [Pricing](/guide/pricing#cloud-harness).

### Report activity

`POST /runtimes/{runtime_id}/activity` records that the runtime is in use, which postpones its idle
suspend. It returns `204`.

### Poll an operation

```bash
curl "$TOSE_API/api/workspaces/$WS/runtimes/$RUNTIME_ID/operations/$OPERATION_ID" \
  -H "X-API-Key: $TOSE_API_KEY"
```

Poll until `status` is `succeeded` or `failed`. `GET /runtimes/{runtime_id}/operations` lists the
most recent operations, newest first; `?limit=` takes 1 to 500 and defaults to 100.

## Create

`POST /runtimes` (admin)

Creating a Cloud Harness instance creates its runtime, so you do not normally call this.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `template_id` | string | yes | Template to attach to; it must be in the workspace and have no runtime yet |
| `kind` | string | no | `docker-host`, the only kind |
| `name` | string | no | 1 to 63 lowercase letters, digits or hyphens; defaults to `dh-<template_id>` |
| `cpu` | string | no | Cores (`"2"`) or millicores (`"500m"`), from 500m to 16; defaults to the platform's docker host size |
| `ram` | string | no | A bare number means GiB (`"4"`), or a quantity such as `"4Gi"`, from 1Gi to 64Gi; defaults to the platform's docker host size |
| `disk_size_gi` | number | no | Disk size in GiB; defaults to the platform's docker host disk |
| `storage_class` | string | no | Storage class for the disk |
| `idle_suspend_minutes` | number | no | 1 to 1440; defaults to the platform setting |

The runtime is created `cold`: nothing runs and nothing is billed for compute until it wakes. The
request fails with `402` when the wallet balance is not positive, and with `409` when the template
already has a runtime or the workspace has reached its limit. The runtime limit equals the
[Cloud Harness instance limit](/guide/cloud-harness#instance-limit), because every instance has one
runtime.

## Delete

`DELETE /runtimes/{runtime_id}?confirm={name}` (admin). The `confirm` parameter must equal the
runtime name; requests without it return `400`. Deleting removes the runtime's disk permanently.

The instance's pod mounts the same disk, so stop the instance first; while it runs, delete returns
`409`. An instance without a runtime has no docker host and nobody can sign in to it, so to remove
an instance, [delete the instance](/guide/cloud-harness#delete-an-instance) instead: that deletes
its runtime too.

```bash
curl -X DELETE "$TOSE_API/api/workspaces/$WS/runtimes/$RUNTIME_ID?confirm=dh-<template-id>" \
  -H "X-API-Key: $TOSE_API_KEY"
```

## Errors

Errors return a JSON body with an `error` message.

| Status | When |
|--------|------|
| `400` | Invalid body or parameters, or a delete without the right `confirm` |
| `402` | The wallet balance is not positive (create, wake) |
| `403` | Your role or the API key's scope is not enough, or a runtime-bound key called another route |
| `404` | Workspace, runtime or operation not found, or you are not a member |
| `409` | Another operation is in progress, the runtime is being deleted, the limit is reached, or the instance still runs (delete) |
| `502` | TOSE could not check whether the instance still runs (delete); try again |
| `503` | Waking is turned off, or docker hosts are not configured on this installation |
