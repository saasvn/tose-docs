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

All disks in the workspace (projects, templates, databases, and cloud desktops).

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

### Resize Volume {#resize-volume}

Grow a disk. Requires admin.

```http
PATCH /api/workspaces/{slug}/volumes/{volume_id}
```

**Body:**

```json
{ "size_gib": 30 }
```

**Response:** `{ "volume": Volume }`

Sizes are grow-only. A smaller `size_gib` returns `400` with guidance on migrating data to a new, smaller disk. Growing a disk on an empty wallet returns `403` with `"code": "INSUFFICIENT_BALANCE"`; a `403` for a caller without the admin role has no such code, so a client can tell them apart. A wallet that cannot be read returns `500`. A cloud desktop's home disk can be grown only once it has bound (`409` before the desktop first starts) and up to the platform's desktop disk limit (`400` above it).

A curated coding agent (Claude Code, Codex, Pi) has one disk holding `/workspace` and `/home/agent` (`workload_type` `template`, `workload_id` the app ID). Growing it keeps the files, the agent keeps running, and the installation's recorded disk size follows the new size. The agent's page offers the same through the **Disk** block on its **Overview** tab ([Grow the disk](/guide/deploy-coding-agent#grow-the-disk)).

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

Opt a project into a disk, grow it, or change its mount path. Requires admin. Adding or growing a disk on an empty wallet returns `403` with `"code": "INSUFFICIENT_BALANCE"`, and a wallet that cannot be read returns `500`.

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

Public: send the request without an API key or session. It returns the standard CPU and RAM hourly rate, the [top-up bonus](#get-top-up-bonus) bands and the persistent storage tariff.

```http
GET /api/pricing
```

**Response:**

```json
{
  "compute": {
    "cpu_usd_per_hour": 0.02,
    "ram_gb_usd_per_hour": 0.01,
    "tiers": [
      { "min_balance_usd": 0, "cpu_usd_per_hour": 0.02, "ram_gb_usd_per_hour": 0.01 }
    ]
  },
  "topup_bonus": {
    "currency": "USD",
    "bands": [
      { "min_amount_usd": 100, "bonus_percent": 10, "most_popular": false },
      { "min_amount_usd": 250, "bonus_percent": 15, "most_popular": false },
      { "min_amount_usd": 500, "bonus_percent": 20, "most_popular": true },
      { "min_amount_usd": 1000, "bonus_percent": 25, "most_popular": false }
    ],
    "note": "..."
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

| Field | Description |
|-------|-------------|
| `compute.cpu_usd_per_hour` | Price of one vCPU-hour. The standard rate for every workspace |
| `compute.ram_gb_usd_per_hour` | Price of one GB of RAM per hour. The standard rate for every workspace |
| `compute.tiers` | **Deprecated.** Kept for older clients. It always holds one entry (`min_balance_usd: 0`) with the standard rate. Read `cpu_usd_per_hour` and `ram_gb_usd_per_hour` instead. It may be removed in a later release |
| `topup_bonus` | The same table as [`GET /api/billing/topup-bonus`](#get-top-up-bonus) |
| `storage` | The persistent storage tariff |

### Get Top-up Bonus {#get-top-up-bonus}

Public: send the request without an API key or session. It returns the bonus credit that a single wallet top-up earns. See [Top-up bonus](/guide/pricing#top-up-bonus) for the rules.

```http
GET /api/billing/topup-bonus
```

**Response:**

```json
{
  "currency": "USD",
  "bands": [
    { "min_amount_usd": 100, "bonus_percent": 10, "most_popular": false },
    { "min_amount_usd": 250, "bonus_percent": 15, "most_popular": false },
    { "min_amount_usd": 500, "bonus_percent": 20, "most_popular": true },
    { "min_amount_usd": 1000, "bonus_percent": 25, "most_popular": false }
  ],
  "note": "The bonus applies to one payment and is added as separate, non-expiring credit. Admin and promotional credit earn no bonus. A refund takes back the bonus in proportion."
}
```

| Field | Description |
|-------|-------------|
| `bands[].min_amount_usd` | Smallest single top-up that earns the band |
| `bands[].bonus_percent` | Bonus credit as a percentage of that top-up |
| `bands[].most_popular` | `true` for the band the top-up screen highlights |

Bands are listed lowest first. A top-up below the first band earns no bonus. The bonus is not granted on a payment with a promo code, and a refund takes it back in proportion. The bonus shows in the wallet history as a `topup_bonus` transaction (and `topup_bonus_clawback` when taken back).

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
