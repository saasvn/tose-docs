# Disks, Volumes & Pricing API

Endpoints for [persistent disks](/guide/persistent-disks), workspace volumes, and [pricing](/guide/pricing).

Workspace endpoints live under `/api/workspaces/{slug}` and use the same authentication as the rest of the API; see [Authentication](/api/authentication). Read endpoints are available to any workspace member; changes require a workspace admin.

## Objects

### Volume

One persistent disk, owned by a project, template, managed database, or cloud desktop.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Volume ID |
| `workspace_id` | string | Owning workspace |
| `workload_type` | string | `project`, `template`, `database`, or `desktop` |
| `workload_id` | string | ID of the owning workload |
| `workload_name` | string | Name of the owning workload |
| `pvc_name` | string | Underlying Kubernetes PVC name |
| `namespace` | string | Kubernetes namespace |
| `size_gib` | integer | Provisioned size in GiB (billed size) |
| `mount_path` | string | Mount path inside the container |
| `storage_class` | string | Storage class |
| `status` | string | `provisioning`, `bound`, `resizing`, `failed`, or `released` |
| `last_error` | string | Last provisioning or resize error, if any |
| `billing_starts_at` | string (RFC 3339) | When storage billing started |
| `released_at` | string \| null | When the disk was deleted and billing ended |
| `created_at` / `updated_at` | string (RFC 3339) | Timestamps |
| `monthly_cost_usd` | number | Cost of the current size per 730-hour month |
| `hourly_cost_usd` | number | Cost of the current size per hour |

### StoragePricing

| Field | Type | Description |
|-------|------|-------------|
| `usd_per_gib_month` | number | Price per GiB per month |
| `hours_per_month` | integer | Hours in a billing month (`730`) |
| `min_size_gib` | integer | Smallest allowed disk (`1`) |
| `max_size_gib` | integer | Largest allowed disk (`1000`) |
| `version` | string | Pricing version recorded on usage |
| `enabled` | boolean | Whether storage is currently charged |

## Volumes

### List Volumes

All disks in the workspace (projects, templates, and databases).

```http
GET /api/workspaces/{slug}/volumes
```

**Response:**

```jsonc
{
  "volumes": [ /* Volume */ ],
  "pricing": { /* StoragePricing */ }
}
```

### Resize Volume

Grow a disk. Requires admin.

```http
PATCH /api/workspaces/{slug}/volumes/{volume_id}
```

**Body:**

```json
{ "size_gib": 30 }
```

**Response:** `{ "volume": Volume }`

Sizes are grow-only. A smaller `size_gib` returns `400` with guidance on migrating data to a new, smaller disk. Growing a disk on an empty wallet returns `403`.

## Project Disk

### Get Project Disk

```http
GET /api/workspaces/{slug}/projects/{project_slug}/disk
```

**Response:**

```jsonc
{
  "disk": null,
  "pricing": { /* StoragePricing */ }
}
```

`disk` is a Volume, or `null` when the project is stateless.

### Create or Update Project Disk

Opt a project into a disk, grow it, or change its mount path. Requires admin.

```http
PUT /api/workspaces/{slug}/projects/{project_slug}/disk
```

**Body:**

```json
{ "size_gib": 10, "mount_path": "/data" }
```

**Response:**

```jsonc
{
  "disk": { /* Volume */ },
  "redeploy_required": true
}
```

The change applies on the next deploy. Size and mount path rules are listed in [Persistent Disks](/guide/persistent-disks#size). Shrinking is rejected.

### Delete Project Disk

Delete the disk and **all its data**, and stop storage billing. Requires admin.

```http
DELETE /api/workspaces/{slug}/projects/{project_slug}/disk?confirm={project_slug}
```

The `confirm` query parameter must equal the project slug. Returns `409` while the project has a running deployment; stop it first.

**Response:** `{ "message": "..." }`

### Create Project with a Disk

`POST /api/workspaces/{slug}/projects` accepts an optional `disk` object:

```json
{
  "name": "my-app",
  "disk": { "size_gib": 10, "mount_path": "/data" }
}
```

Omit `disk` to create a stateless project.

## Pricing

### Get Pricing

Public; no authentication required.

```http
GET /api/pricing
```

**Response:**

```json
{
  "compute": {
    "tiers": [
      { "min_balance_usd": 0, "cpu_usd_per_hour": 0.02, "ram_gb_usd_per_hour": 0.01 },
      { "min_balance_usd": 100, "cpu_usd_per_hour": 0.014, "ram_gb_usd_per_hour": 0.007 },
      { "min_balance_usd": 200, "cpu_usd_per_hour": 0.012, "ram_gb_usd_per_hour": 0.006 }
    ]
  },
  "storage": {
    "usd_per_gib_month": 0.15,
    "hours_per_month": 730,
    "min_size_gib": 1,
    "max_size_gib": 1000,
    "version": "...",
    "enabled": true
  }
}
```

## Usage Records

`GET /api/workspaces/{slug}/wallet/usage` returns hourly usage records. Each record includes:

| Field | Type | Description |
|-------|------|-------------|
| `kind` | string | `compute` or `storage` |
| `volume_id` | string \| null | Volume billed, for `storage` records |
| `storage_gib` | integer | Billed disk size, for `storage` records |
| `cost_nano_usd` | integer | Exact storage cost in billionths of a dollar |

For `storage` records, `cost_nano_usd` is the exact amount; sub-cent remainders are carried forward on the wallet and deducted once they reach a whole cent. `cost_usd` (cents) carries the compute cost.

## Related

- [Persistent Disks](/guide/persistent-disks)
- [Pricing](/guide/pricing)
- [`tose disk` / `tose volumes` / `tose pricing`](/commands/disk)
