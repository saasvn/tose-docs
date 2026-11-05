# Projects API

Endpoints to change, restart and delete a project, and to manage its Git connection. Creating and listing projects, deploying and reading logs are in the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml), served at `GET /api/openapi.yaml`; this page covers the workflows around them.

All paths are under `/api/workspaces/{slug}/projects/{project_slug}` and use the same authentication as the rest of the API; see [Authentication](/api/authentication). Every endpoint on this page requires the workspace `admin` or `owner` role, except [Export a project](#export), which any workspace member can call, and [reading a rollback receipt](#rollback-receipts), which any workspace member can read.

## Update a project

```http
PUT /api/workspaces/{slug}/projects/{project_slug}
```

A partial update: send only the fields you want to change.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name. A blank value is ignored |
| `slug` | string | New slug: 3-60 lowercase letters, numbers and hyphens, unique in the workspace |
| `framework` | string \| null | Detected framework label |
| `status` | string | `active`, `paused` or `archived` |
| `server_id` | string | Deployment server. It must belong to the workspace |
| `registry_id` | string | Container registry |
| `port` | integer | Container port. `0` or less is ignored |
| `replicas` | integer | Replica count. `0` or less is ignored |
| `cpu` | string | CPU limit in cores, for example `0.5`. Blank is ignored |
| `ram` | string | Memory limit in GB, for example `0.5`. Blank is ignored |

```bash
curl -X PUT "https://api.tose.sh/api/workspaces/$WS/projects/web" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"port": 8080, "cpu": "1", "ram": "1"}'
```

**Response:** `200` with the project. When nothing changed, the unchanged project is returned.

Changes take effect on the next deployment. A project with a [persistent disk](/guide/persistent-disks) must keep one replica and cannot change `server_id`.

| Status | Meaning |
|--------|---------|
| `400` | `status` is not one of the allowed values, the slug is malformed, the project has a persistent disk and you raise `replicas` above `1` or change `server_id`, or the server is not valid for the workspace |
| `409` | The slug is already taken in the workspace |

## Restart a project

```http
POST /api/workspaces/{slug}/projects/{project_slug}/restart
```

Triggers a rolling restart of the running deployment without building a new image. The call returns once the restart is requested, not when the new pods are ready; poll the project status to see it come back.

```json
{ "success": true, "message": "Project restarting", "restarted_pods": 1 }
```

`restarted_pods` is the replica count of the deployment that was restarted. A project with no server assigned returns `400`, and a project that was never deployed returns `404`.

## Delete a project

```http
DELETE /api/workspaces/{slug}/projects/{project_slug}
```

::: danger Cannot be undone
Deleting a project removes its running build containers, Kubernetes resources, custom domain DNS records, logs and **persistent disk with all its data**. Back up anything you need first.
:::

The project, its deployments, environment variables, domains, uptime monitor and Git connection are soft-deleted, so they stop appearing in the API. Usage records are kept for billing history.

**Response:** `200` with `{ "message": "..." }`. A `502` means the persistent disk could not be deleted: retry the call.

## Git connection

Connect a GitHub repository so each push can deploy. The workspace needs a GitHub App installation first; see [GitHub API](/api/github). The workflow is described in [Git Integration](/guide/git).

### Connect

```http
POST /api/workspaces/{slug}/projects/{project_slug}/git
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `repo_full_name` | string | yes | Repository as `owner/repo` |
| `branch` | string | no | Branch to track. Default `main` |
| `installation_id` | integer | no | GitHub App installation attached to the workspace. When omitted, the workspace's only installation is used, or one that can reach the repository is looked up |
| `auto_deploy` | boolean | no | Deploy on every push. Default `true` |

```bash
curl -X POST "https://api.tose.sh/api/workspaces/$WS/projects/web/git" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"repo_full_name": "acme/web", "branch": "main"}'
```

**Response:** `201` with the connection.

```json
{
  "id": "…",
  "project_id": "…",
  "provider": "github",
  "repo_full_name": "acme/web",
  "branch": "main",
  "installation_id": 12345678,
  "webhook_id": 987654,
  "auto_deploy": true,
  "created_at": "2026-11-02T07:00:00Z",
  "updated_at": "2026-11-02T07:00:00Z"
}
```

The call creates a push webhook. If the webhook cannot be created, the connection is still saved and `webhook_id` is `null`. When the project has a server, a first deployment is queued in the background, but only if the caller has `deployments:execute`. With only `projects:write`, the connection is created with `auto_deploy` off and no deployment is queued. See [Scopes and automatic deploys](/api/authentication#scopes-and-automatic-deploys).

| Status | Meaning |
|--------|---------|
| `400` | `repo_full_name` is missing or not `owner/repo`, the repository is not reachable through the installation, the branch does not exist, or no attached installation can reach the repository |
| `403` | `installation_id` is not attached to this workspace |
| `409` | The project already has a Git connection |
| `503` | The GitHub App is not configured on this deployment |

### Update

```http
PUT /api/workspaces/{slug}/projects/{project_slug}/git
```

Send `branch` and/or `auto_deploy`. Omitted fields stay as they are. The new branch is checked against the repository. **Response:** `200` with the connection.

### Disconnect

```http
DELETE /api/workspaces/{slug}/projects/{project_slug}/git
```

Removes the connection and deletes its GitHub webhook, unless another project still uses that webhook. Existing deployments keep running. **Response:** `200` with `{ "message": "..." }`.

## Export a project {#export}

```http
GET /api/workspaces/{slug}/projects/{project_slug}/export
```

Returns a read-only inventory of the project, schema `tose.dev/project-export/v1`, to help you plan a move to another platform. It is not a backup, it does not change anything, and it is not proof that a migration worked.

**Access.** A signed-in workspace member (any role) can call it. A workspace API key needs the separate `projects:export` scope; `projects:read` or `projects:write` are not enough. Allowed and denied requests are both written to the [audit log](/api/audit). A project that does not exist and a project in another workspace both return `404`, so the response does not reveal which slugs exist.

**What it contains**

| Field | Content |
|-------|---------|
| `schema_version`, `generated_at` | `tose.dev/project-export/v1` and the time of the export |
| `source` | `workspace_id`, `project_id`, `name`, `slug`. These identify the source; do not reuse the IDs at the target |
| `artifact` | `deployment_id` and `commit_sha` of the latest running deployment, and `image_digest` **only** when that image is pinned by an OCI digest (`name@sha256:...`). A tag such as `:latest` is omitted |
| `resources` | The effective `port`, `replicas`, `cpu` and `ram` |
| `env_keys` | Environment variable **names** only, sorted |
| `env_refs` | One entry per name in `env_keys`, in the same order: `key`, `secret` and `value_recoverable`. `value_recoverable` is `false` when TOSE can no longer decrypt the stored value, so it must come from elsewhere. No value, or part of one, is included |
| `domains` | Custom domains with `name`, `dns_status` and `ssl_status`. The default TOSE domain is not listed |
| `volumes` | Metadata of the project's persistent volumes: `id`, `size_gib`, `mount_path`, `status`, and `backup_refs`, which is always empty because TOSE takes no volume backups |
| `databases` | Workspace databases that an environment value names, by the in-cluster service `db-<name>` or by an external domain: `id`, `name`, `engine`, `version`, `storage_size`, `referenced_by_env_keys` and `backup_refs`. The list is inferred from values TOSE can decrypt, so it can be empty or incomplete even when the app uses a database |
| `blockers` | What is still unverified, see below |
| `migration` | The `tose.dev/data-migration/v1` contract, see [Migration evidence](#migration-evidence). Its `status` is always `not_started` |
| `rollback` | A notice about what a TOSE rollback does and does not restore, see [Rollback receipts](#rollback-receipts) |

**What it never contains:** environment variable values, API keys, registry or database credentials, kubeconfig, storage keys or build logs. Before it sends a bundle, TOSE checks it against the v1 schema and its safety rules. A bundle that fails the check (an unknown field, a `null`, a credential-shaped string, a missing required blocker, or a `migration.status` other than `not_started`) is refused with `500` instead of being sent.

**Response header.** `X-Tose-Export-Sha256` is the hex SHA-256 of the response body. Store it with the export as the evidence for the `record_export` step.

```json
{
  "schema_version": "tose.dev/project-export/v1",
  "generated_at": "2026-11-05T08:00:00Z",
  "source": { "workspace_id": "ws_...", "project_id": "prj_...", "name": "Shop", "slug": "shop" },
  "artifact": { "deployment_id": "dep_...", "image_digest": "registry.example/shop@sha256:<64 hex characters>", "commit_sha": "<commit>" },
  "resources": { "port": 3000, "replicas": 1, "cpu": "500m", "ram": "512Mi" },
  "env_keys": ["DATABASE_URL", "SESSION_SECRET"],
  "env_refs": [
    { "key": "DATABASE_URL", "secret": true, "value_recoverable": true },
    { "key": "SESSION_SECRET", "secret": true, "value_recoverable": true }
  ],
  "domains": [{ "name": "shop.example.com", "dns_status": "verified", "ssl_status": "active" }],
  "volumes": [{ "id": "vol_...", "size_gib": 10, "mount_path": "/data", "status": "bound", "backup_refs": [] }],
  "databases": [{
    "id": "db_...", "name": "shop-db", "engine": "postgres", "version": "16", "storage_size": "10Gi",
    "referenced_by_env_keys": ["DATABASE_URL"],
    "backup_refs": [{
      "id": "bk_...", "created_at": "2026-11-05T02:00:00Z", "size_bytes": 1048576,
      "sha256": "<64 hex characters>", "format": "pg_dumpall_sql", "encrypted_at_rest": true,
      "retention": "until_deleted_by_workspace_admin",
      "download_path": "/api/workspaces/acme/databases/db_.../backups/bk_.../download"
    }]
  }],
  "blockers": ["volume_backup_and_restore_unverified", "volume_backup_unavailable", "database_restore_unverified", "database_dependencies_unresolved", "target_capabilities_unverified", "dns_cutover_requires_approval"],
  "migration": { "contract_version": "tose.dev/data-migration/v1", "status": "not_started", "source_retained": true, "steps": ["..."] },
  "rollback": { "artifact": "...", "config": "...", "schema": "...", "data": "...", "receipt_version": "tose.dev/rollback-receipt/v1" }
}
```

The values above are examples only, and the `migration.steps` array is shortened. `artifact` is empty when the project has no running deployment.

### Backup references {#backup-references}

Each entry of `databases[].backup_refs` points at one completed backup of that database. TOSE lists up to the latest five, newest first. A reference carries:

| Field | Content |
|-------|---------|
| `id`, `created_at`, `size_bytes` | The backup, when it was taken and its size |
| `sha256` | SHA-256 of the downloaded (decrypted) dump. Absent for backups taken before TOSE recorded checksums |
| `format` | `pg_dumpall_sql`, `mysqldump_sql` or `mongodump_archive` |
| `encrypted_at_rest` | Whether the stored copy is encrypted |
| `retention` | `until_deleted_by_workspace_admin`: TOSE keeps the backup until an admin deletes it |
| `download_path` | The TOSE API path of the download |

A reference has no storage key and no credential. It is a pointer, not the data.

- **Download is admin only.** Calling `download_path` needs the workspace `owner` or `admin` role, and an API key also needs the `databases:read` scope. The export itself is open to any member, so a member sees that a backup exists but cannot download it.
- **Verify with SHA-256.** The download returns the checksum in the `X-Tose-Backup-Sha256` header. Compare it with `sha256` from the export and with `sha256sum` of the file you saved. TOSE also refuses to download or restore a dump that does not match its recorded checksum.
- **There are no volume backups.** TOSE does not back up persistent volumes. `volumes[].backup_refs` is always empty and the export carries `volume_backup_unavailable`. Copy the volume yourself and record its SHA-256.

### Blockers

`blockers` lists conditions the export cannot prove. Treat every entry as work to do before a cutover.

| Blocker | Meaning |
|---------|---------|
| `immutable_oci_digest_unavailable` | There is no running image pinned by digest, so the artifact cannot be reproduced exactly. Build or resolve a digest first |
| `env_values_unrecoverable` | TOSE can no longer decrypt at least one stored value (`value_recoverable: false`). Get it from your own secret store |
| `env_values_recoverability_unverified` | TOSE could not check whether the stored values can be decrypted. Check before you rely on them |
| `volume_backup_and_restore_unverified` | The project has a volume. Make a snapshot or consistent archive and test a restore |
| `volume_backup_unavailable` | A volume has no backup reference. TOSE never has one today |
| `database_backup_unavailable` | A listed database has no completed backup. Take one before you continue (TOSE does not back up Redis, so use your own dump) |
| `database_backup_checksum_unavailable` | The latest backup has no `sha256`, because it was taken before checksums were recorded. Take a new backup |
| `database_restore_unverified` | The project names a database. No restore has been tested; do a dry run |
| `database_dependencies_unresolved` | The database list is inferred and may be incomplete. Check the application's own configuration |
| `target_capabilities_unverified` | Check that the target supports the CPU, memory, port, volumes and health behavior |
| `dns_cutover_requires_approval` | Changing DNS needs an explicit approval by a person, after the target is healthy |

`database_dependencies_unresolved`, `target_capabilities_unverified` and `dns_cutover_requires_approval` are always present. An empty list never appears.

### Migration evidence {#migration-evidence}

`migration` is the `tose.dev/data-migration/v1` contract. TOSE only describes the work: `status` is always `not_started`, and TOSE never runs or reports a migration. The contract has five steps, always in this order, and a step counts as done only when you can show its evidence.

| Step | Evidence to keep | Approval |
|------|------------------|----------|
| `record_export` | `export_sha256` (the export's `X-Tose-Export-Sha256`) and `blockers_reviewed_by`, who resolved or accepted each blocker | No |
| `backup_data` | For every database and volume: `backup_id`, `sha256`, `created_at`, `retention_until` and `storage_location` of the independent copy | No |
| `restore_dry_run` | `checksum_verified`, `restored_at`, `smoke_test_result` and `data_check_result` (row-count or domain checks) from a restore into a separate target | No |
| `dns_cutover` | `approved_by` (the person who approved), `ttl_seconds`, `target_health_check` and `switched_at` | **Yes** (`approval_required: true`) |
| `retain_source` | `retain_until`: the date until which the source project, its data and its backups are kept. It must be after the target is validated and the agreed retention period | No |

Each step also lists its exact `evidence` items in the response. Use that list rather than this table when they differ.

The source keeps serving traffic in every step (`source_serving: true`). If any step fails, the source and its data stay as they are (`on_failure: keep_source`) and you stop and investigate. TOSE never deletes the source as part of a migration.

**Collect the dry-run evidence.** TOSE has not run a restore for you, so the evidence comes from your own run. The portable-export guide has a full Docker and Kubernetes restore drill for an HTTP and PostgreSQL app with a volume (see [Related](#related)). In short:

```sh
# 1. Record the export and check its checksum against the response header.
curl -sS -D headers.txt -H "X-API-Key: $TOSE_API_KEY" \
  "https://<api-host>/api/workspaces/<ws>/projects/<project>/export" -o export.json
sha256sum export.json   # must equal X-Tose-Export-Sha256 in headers.txt

# 2. Download a database backup with an owner or admin key, then verify it.
curl -sS -H "X-API-Key: $TOSE_ADMIN_KEY" "https://<api-host><download_path>" -o dump.sql
echo "<sha256>  dump.sql" | sha256sum -c -
```

Restore `dump.sql` into a separate target that is not your production database, restore your own volume archive there, and run the checks. Keep the output as the `restore_dry_run` evidence. Do not report the project as migrated without it.

::: warning
Do not change DNS until a person approves the `dns_cutover` step, and do not remove the source until the target is validated. If a dry run or a checksum fails, keep the source and fix the cause first.
:::

### Rollback receipts {#rollback-receipts}

A TOSE rollback reapplies the image of an earlier deployment to the **current** project. It reuses the current environment variables and configuration, and it does not restore the database schema, database data or volume data.

`POST /api/workspaces/{slug}/projects/{project_slug}/deployments/{id}/rollback` returns the new deployment with a `rollback_receipt` (`tose.dev/rollback-receipt/v1`) next to its fields. The deployment's `rollback_of_deployment_id` names the deployment whose image was reapplied. The receipt records the source deployment (`deployment_id`, `image`, `image_digest` when pinned, `commit_sha`, `created_at`) and four layers, always in this order:

| Layer | `rolled_back` | Meaning |
|-------|---------------|---------|
| `artifact` | `true` | The image was reapplied |
| `config` | `false` | Current environment variables, resource limits and domains are used |
| `schema` | `false` | The database schema was not changed |
| `data` | `false` | Database and volume data were not changed |

An image rollback therefore keeps the other three layers separate. Restoring configuration, schema or data needs its own restore from a verified backup, and its own record.

```http
GET /api/workspaces/{slug}/projects/{project_slug}/deployments/{id}/rollback-receipt
```

Returns the same receipt later, where `{id}` is the **rollback** deployment. It is open to any workspace member; an API key needs the `deployments:read` scope. A deployment that is not a rollback, and a rollback recorded before receipts existed, return `404`. The `rollback_receipt` field of the rollback response is absent only if the source deployment could not be read back after the rollback ran; fetch it with this call then.

The full request and response schemas are in the [backend OpenAPI document](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml) (operations `exportProject` and `getRollbackReceipt`).


## Related

- [Git Integration](/guide/git)
- [GitHub API](/api/github)
- [Persistent Disks](/guide/persistent-disks)
- [API keys and scopes](/api/api-keys)
- [`tose export`](/commands/export): the CLI inventory. It prints the inventory fields only, not `databases`, `env_refs` or `migration`, so call the API for backup references
- [`tose deployment rollback`](/commands/deployment#tose-deployment-rollback)
- [Portable project export guide](https://github.com/saasvn/tose-app/blob/master/docs/portable-project-export.md): the restore drill with Docker and Kubernetes steps
- [Backend OpenAPI document](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml)
