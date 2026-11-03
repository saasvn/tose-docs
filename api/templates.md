# Templates API

Endpoints for [1-click templates](/commands/template): browse the catalog, create a template, change its image, environment and domains, deploy or stop it, and read its deployment history and logs.

Template endpoints live under `/api/workspaces/{slug}/templates` and use the same authentication as the rest of the API; see [Authentication](/api/authentication). Reading is available to any workspace member. Changing a template or deploying it requires the workspace `owner` or `admin` role.

The [OpenAPI spec](https://api.tose.sh/api/openapi.yaml) is the source of truth for every field. This page explains the behavior around it.

## How a template picks its image

A template stores at most one **custom image**. An image deploy runs that stored image. It never swaps it for the catalog default on its own.

| `image_source` | Meaning |
|----------------|---------|
| `custom` | An image you set with `PUT` (`custom_image`). Never replaced implicitly. Every template that existed before this behavior is treated as `custom`. A template created from the catalog starts as `catalog`, with the catalog image stored. |
| `catalog` | The catalog default image, chosen explicitly with `image_source=catalog`. |
| `rollback` | The image of an earlier deployment, chosen explicitly with `rollback_to`. |

When a template has no stored image, an image deploy runs the catalog default and records `catalog` as the source. A deploy of the stored image is recorded on the deployment as `custom`, even when the template itself is still marked `catalog`.

## Catalog and creation

### List the catalog

```http
GET /api/workspaces/available-templates
```

Any authenticated caller may read it. `available-templates` is a fixed route, not a workspace slug. Entries have `name`, `key`, `description`, `source`, `branch`, `default_port`, `default_cpu`, `default_ram`, `default_image`, `required_envs` and `unlock_fee_vnd`. Some entries differ: the Cloud Harness entry is built from a release manifest, so it returns `source`, `branch` and `default_image` as empty strings, and adds `release`, `max_instances` and `pricing`. Read the field list for each entry from the response or the OpenAPI spec. Use `key` as `template_name` when you create a template.

### Create a template

```http
POST /api/workspaces/{slug}/templates
```

```json
{ "name": "My agent", "template_name": "goclaw", "cpu": "1", "ram": "2" }
```

Creates the template in status `pending`; nothing runs until you [deploy](#deploy-template) it. The slug comes from `name`, with a random suffix when it is taken. Templates with a positive `unlock_fee_vnd` are gated: the workspace must pay the one-time unlock first, and until then the call returns `402` with the unlock details. Gated templates accept `cpu` `1` or `2` and `ram` `2` or `4`; other values return `400`. Other templates need a wallet with a positive balance, otherwise the call returns `402`, and a whole-number `cpu` and `ram`, otherwise `400`.

Returns `409` when a template with the same name is being created at the same moment (retry once the other call finishes). For Cloud Harness it also returns `409` when the workspace is at its instance limit, and `503` when no cluster is available.

### Unlock status

```http
GET /api/workspaces/{slug}/templates/unlock-status
```

An object keyed by template key, with one entry per gated template: `unlocked`, `unlock_fee_vnd`, `unlock_credit_usd_cents`, `exchange_rate_vnd_per_usd`, `unlock_url` and `payment_purpose`. The fee stays available as wallet credit. See [Pricing](/guide/pricing).

### List templates

```http
GET /api/workspaces/{slug}/templates
```

A bare array of templates, newest first, with no paging. Deployment details come from [Get Template](#get-template).

## Lifecycle

### Stop

```http
POST /api/workspaces/{slug}/templates/{template_slug}/stop
```

Scales the workload to zero replicas and sets the status to `stopped`. Returns `400` when the template has no server assigned, and `409` while the template is being deleted.

Stop also ends a build that is still running. Every deployment of the template in `pending`, `building` or `deploying` is marked `stopped` first, then its build and push containers are removed, so nothing keeps building or pushing an image for a template you stopped. The deployment log ends with `=== Build Stopped ===` and is then replayed like any finished log (see [Logs](#logs)). The call returns `500` with `Failed to stop the template's builds` if the builds could not be ended; the template is left as it was, so retry.

A Cloud Harness instance is marked `stopped` only after the cluster has stopped its pod. `502` means the pod is still running and the call can be retried. `503` means Cloud Harness is disabled on this platform.

### Delete

```http
DELETE /api/workspaces/{slug}/templates/{template_slug}
```

::: danger Cannot be undone
Deleting a template removes its persistent disk with all data, the Kubernetes workload, ingress, DNS records, environment variables, domains and deployment history.
:::

A build or image deploy that is still running is ended first, exactly as for [Stop](#stop): its deployments are marked `stopped` and its build and push containers are removed before the deployment history is deleted. The same happens to every template of a workspace when the workspace is deleted.

If the disk cannot be deleted, the call returns `502` and leaves the template untouched, so you can retry. Deleting a Cloud Harness template instead returns `202` with `status: "deleting"` and finishes in the background, or `503` when Cloud Harness is disabled. While it is `deleting`, every other change to the instance returns `409`, and a repeated `DELETE` returns `202` again.

## Environment variables

```http
GET    /api/workspaces/{slug}/templates/{template_slug}/envs
POST   /api/workspaces/{slug}/templates/{template_slug}/envs
DELETE /api/workspaces/{slug}/templates/{template_slug}/envs/{key}
GET    /api/workspaces/{slug}/templates/{template_slug}/envs/{key}/reveal
```

- **List:** any member. A member below `admin` sees every value as `***`. An admin or owner sees plain values, except variables marked `is_secret`, which are always `***`.
- **Set:** `owner` or `admin`. The body is a bare array of `{ "key", "value", "is_secret" }`. Each item is upserted by `key`, items with an empty `key` are skipped, and values are stored encrypted. Changes take effect on the next deploy. Returns `409` while the template is being deleted. For Dewee and GoClaw it also returns `409` with `GATEWAY_TOKEN_CONFLICT` (the two gateway token variables differ), `422` with `GATEWAY_TOKEN_INVALID` (the token is malformed or too short) and `500` with `GATEWAY_TOKEN_UNAVAILABLE` (it could not be checked). None of these errors echoes the value. See [Gateway token codes](/api/template-deploy#gateway-token-codes).
- **Delete:** `owner` or `admin`. Deleting a key that does not exist still returns `200`. For a template that requires a gateway token, deleting `GOCLAW_GATEWAY_TOKEN` returns `409` with `GATEWAY_TOKEN_REQUIRED`; `DEWEE_GATEWAY_TOKEN` is not protected and is deleted with `200`. Any delete returns `409` while the template is being deleted.
- **Reveal:** `owner` or `admin` only. Returns `{ "value": "..." }`, the decrypted value of one variable, including secrets. It is the only call that returns a secret value, and the access policy rates it as high risk (`env.reveal`). Do not log or cache the response.

```bash
curl "https://api.tose.sh/api/workspaces/$WS/templates/demo/envs/API_KEY/reveal" \
  -H "X-API-Key: $TOSE_API_KEY"
```

## Domains

```http
GET    /api/workspaces/{slug}/templates/{template_slug}/domains
POST   /api/workspaces/{slug}/templates/{template_slug}/domains
DELETE /api/workspaces/{slug}/templates/{template_slug}/domains/{domain_id}
```

Add takes `{ "domain": "app.example.com" }` and stores it lower-cased (`201`). Platform subdomains become active at once when platform DNS is configured. For a custom domain, point an A record at `target_ip`. The platform does not check it, so a custom domain's `dns_status` stays `pending`. A domain already used by another template, or a template that is being deleted, returns `409`. A Cloud Harness instance is reached on its default domain only, so adding a domain returns `400`. Removing a domain also returns `409` while the template is being deleted. Adding back a removed domain of this template restores it. The default domain cannot be removed (`400`).

## Logs

```http
GET /api/workspaces/{slug}/templates/{template_slug}/deployments/{id}/logs
GET /api/workspaces/{slug}/templates/{template_slug}/live-logs
```

Both are WebSockets with the same authentication and origin rules as project log streaming. Frames from the client are ignored, and the server sends text frames only. Errors found before the upgrade (unknown template or deployment, missing membership) are normal JSON error responses.

- **Build logs** (`deployments/{id}/logs`): one build log line per frame. For a deployment that already finished (`running`, `failed` or `stopped`), the stored log is replayed and then `[END]` is sent and the connection closes. A build ended by Stop or Delete finishes with the line `=== Build Stopped ===` before `[END]`. Otherwise new lines are pushed as the build runs, and `[END]` closes it. `[END]` is the only control frame, so read the final status from `GET .../deployments/{id}`.
- **Runtime logs** (`live-logs`): follows the stdout and stderr of the template's pods, starting with the last 200 lines. The template must be `running` (`400` otherwise). Each frame is a raw chunk of up to 4096 bytes, not aligned to lines. The stream ends with `[END]`. If the log stream cannot be opened, the server sends one frame that starts with `[ERROR] ` and closes without `[END]`; a read error mid-stream sends `[ERROR] ` and then `[END]`. Handle both.

## Get Template

```http
GET /api/workspaces/{slug}/templates/{template_slug}
```

**Response:**

```jsonc
{
  "template": { /* the template */ },
  "last_deployment": { /* Deployment */ },
  "image": {
    "deployed": "registry.example.com/app:1.4.0",
    "configured": "registry.example.com/app:1.4.0",
    "source": "custom",
    "available": "registry.example.com/app:1.5.0",
    "update_available": true,
    "rollback_warning": "Rolling back the image does not roll back the database schema or data. ..."
  }
}
```

### Image block

| Field | Type | Description |
|-------|------|-------------|
| `deployed` | string | Image of the latest deployment |
| `configured` | string | The stored custom image that image deploys run. Empty when none is set |
| `source` | string | `custom`, `catalog` or `rollback` |
| `available` | string | The catalog default image. Empty when the template has no catalog version |
| `update_available` | boolean | The catalog image is different from the configured one |
| `rollback_warning` | string | The caveat about rolling back; show it next to any rollback action |

## Update Template

```http
PUT /api/workspaces/{slug}/templates/{template_slug}
```

Send only the fields you want to change: `name`, `port`, `cpu`, `ram`, `replicas` and `custom_image`. Templates run a single replica, so `replicas` above `1` is refused. Setting a different `custom_image` records `image_source=custom`. Send `""` to clear it.

A custom image must be publicly pullable. The platform attaches no registry credentials to an image it does not own for the template, so a private image fails to pull. Private images in other registries are not supported yet.

| Status | Meaning |
|--------|---------|
| `400` | The image reference is malformed, the body is invalid, `cpu` or `ram` is not a valid size for the template, or `replicas` is above `1` |
| `409` | Changing `custom_image` while a build or image deploy is in flight. Change the image after it finishes. Other fields can still be changed. Also returned while the template is being deleted |

A valid reference has the form `[host[:port]/]repository[:tag][@algorithm:hex]`, with no spaces and at most 512 characters. A malformed tag or digest is rejected. A well-formed reference that the registry does not have fails later, when the deploy pulls it.

## Deploy Template

```http
POST /api/workspaces/{slug}/templates/{template_slug}/deploy
```

**Body (all fields optional):**

| Field | Type | Description |
|-------|------|-------------|
| `mode` | string | `build` (default) or `image`. The fields below apply only to `image` |
| `image_source` | string | `custom` (default) runs the stored image. `catalog` upgrades to the catalog default and stores it. Refused with `400` when the template has no catalog version |
| `rollback_to` | string | ID of an earlier deployment of this template that ran. Its image is deployed again and becomes the stored image, so later image deploys keep running it |
| `expected_image` | string | The image you last saw as `image.configured`. If the stored image differs, the deploy is refused with `409`. An empty value turns the check off |

`image_source` must be `custom` or `catalog`. When `rollback_to` is set it takes precedence and `image_source` is not checked. Any `mode` other than `image` runs a build, and the image fields are ignored.

```bash
# Run the stored image (the default)
curl -X POST https://api.tose.sh/api/workspaces/$WS/templates/demo/deploy \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"mode":"image"}'

# Upgrade explicitly, and refuse if someone changed the image since you looked
curl -X POST https://api.tose.sh/api/workspaces/$WS/templates/demo/deploy \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"mode":"image","image_source":"catalog","expected_image":"registry.example.com/app:1.4.0"}'

# Roll back to an earlier deployment
curl -X POST https://api.tose.sh/api/workspaces/$WS/templates/demo/deploy \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"mode":"image","rollback_to":"<deployment id>"}'
```

**Response:** `201 Created` with the [Deployment](#deployment) and, when there is something to tell you, a `warnings` array.

```jsonc
{
  "id": "…",
  "status": "pending",
  "docker_image": "registry.example.com/app:1.4.0",
  "image_source": "custom",
  "previous_image": "registry.example.com/app:1.4.0",
  "config_fingerprint": "sha256:…",
  "warnings": [
    "A different catalog version is available. This deploy kept your custom image; send image_source=catalog to upgrade explicitly."
  ]
}
```

### Warnings

| When | Warning |
|------|---------|
| The stored image differs from the catalog version | The deploy kept your custom image. Send `image_source=catalog` to upgrade |
| `rollback_to` is used | Rolling back the image does **not** roll back the database schema or data. If the newer version migrated them, the older image may fail or misread them; restore a backup first if it did |

### Rollback

`rollback_to` accepts only a deployment of the same template that actually ran: status `running` or `stopped`, a finish time and an image recorded. A failed build is not accepted, because the tag it recorded was never pushed. Any other ID returns `404`.

The image is restored, but the data is not. Back up the template's database and disk before you roll back across a version that changed the schema. See [Persistent Disks](/guide/persistent-disks).

### Errors

| Status | Meaning |
|--------|---------|
| `400` | The image reference is malformed, `image_source` is not `custom` or `catalog`, there is no image to deploy (no custom image and no catalog version), no cluster server is configured for the template, or Cloud Harness is not enabled |
| `404` | `rollback_to` does not name a deployment of this template that ran |
| `409` | Another build or image deploy of this template is in flight, or `expected_image` does not match the stored image, the image changed while the request was starting, or the template is being deleted |

A `409` changes nothing. Read the template, check the `image` block and retry. Two concurrent retries get the same `409`: only one of them starts a deploy. An in-flight claim older than 90 minutes no longer blocks a new deploy.

## Deployments

```http
GET /api/workspaces/{slug}/templates/{template_slug}/deployments
GET /api/workspaces/{slug}/templates/{template_slug}/deployments/{id}
```

### Deployment

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Deployment ID. Use it as `rollback_to` |
| `status` | string | `pending`, `building`, `deploying`, `running`, `failed` or `stopped` |
| `docker_image` | string | The image this deployment ran |
| `image_source` | string | `catalog`, `custom` or `rollback` |
| `image_digest` | string | The `algorithm:hex` digest (usually `sha256:…`) when the reference is pinned to one. Omitted for tag-only references |
| `previous_image` | string | The image the template had stored before this deployment |
| `config_fingerprint` | string | `sha256:…` hash of the image, port, CPU, RAM and replicas that the deployment applied. Two deployments with the same fingerprint ran the same configuration |
| `trigger_type` | string | `manual`, or `image_only` for an image deploy |
| `triggered_by` | string \| null | ID of the user who requested it |
| `error_message` | string \| null | Why the deployment failed, if it did |
| `created_at` / `updated_at` | string (RFC 3339) | Timestamps |

These four receipt fields are recorded for image deploys only; build deploys leave them out. Together, `image_source`, `image_digest`, `previous_image`, `config_fingerprint` and `triggered_by` are the deploy receipt: what ran, what it replaced, and who asked.

A tag can move. To know exactly which build ran, pin your custom image to a digest (`repository:tag@sha256:…`) so `image_digest` is recorded.
