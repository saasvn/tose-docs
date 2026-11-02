# Templates API

Endpoints for [1-click templates](/commands/template): read a template, change its image, deploy it, and read its deployment history.

Template endpoints live under `/api/workspaces/{slug}/templates` and use the same authentication as the rest of the API; see [Authentication](/api/authentication). Reading is available to any workspace member. Changing a template or deploying it requires a workspace admin.

## How a template picks its image

A template stores at most one **custom image**. An image deploy runs that stored image. It never swaps it for the catalog default on its own.

| `image_source` | Meaning |
|----------------|---------|
| `custom` | An image you set with `PUT` (`custom_image`). Never replaced implicitly. Every template that existed before this behavior is treated as `custom`. A template created from the catalog starts as `catalog`, with the catalog image stored. |
| `catalog` | The catalog default image, chosen explicitly with `image_source=catalog`. |
| `rollback` | The image of an earlier deployment, chosen explicitly with `rollback_to`. |

When a template has no stored image, an image deploy runs the catalog default and records `catalog` as the source. A deploy of the stored image is recorded on the deployment as `custom`, even when the template itself is still marked `catalog`.

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
