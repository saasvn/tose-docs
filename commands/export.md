# tose export

Print a read-only inventory of a project for migration planning.

`tose export` calls `GET /api/workspaces/{slug}/projects/{project_slug}/export` and prints the `tose.dev/project-export/v1` document: the project's resources, environment variable **names**, domains, volume metadata and the running image, only if it is pinned by OCI digest.

::: warning An inventory, not a backup
The export does not copy your database, your persistent volume or your environment values, and it is not proof that a migration will work. Read `blockers` and `rollback` in the output, and back up PostgreSQL and volumes yourself. See the [migration guidance](https://github.com/saasvn/tose-app/blob/master/docs/portable-project-export.md) in the TOSE repository.
:::

## Synopsis

```bash
tose export [project] [--workspace <slug>] [--json]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `[project]` | Optional. Project slug or `workspace/project` format. Without it the CLI uses the linked project |

### Options

| Option | Description |
|--------|-------------|
| `--workspace <slug>` | Workspace of the project |
| `--json` | Print one JSON envelope whose `data` is the export, for scripts and agents |

The command never prompts and sends one `GET` request. It changes nothing in TOSE.

## Access

| Caller | Requirement |
|--------|-------------|
| Signed-in workspace member | Any role |
| API key | The `projects:export` scope. Create a key that has it in the workspace settings. See [API keys](/api/api-keys) |

Without the scope the command exits with `INSUFFICIENT_SCOPE` (exit code `3`) and `error.details.required_scope` is `projects:export`. A project that does not exist, or that belongs to another workspace, is `NOT_FOUND` (exit code `6`).

## What it prints

| Field | Content |
|-------|---------|
| `schema_version` | Always `tose.dev/project-export/v1`. The CLI refuses any other value |
| `generated_at` | When the export was built |
| `source` | `workspace_id`, `project_id`, `name`, `slug`. These identify the project in TOSE; do not reuse them as IDs at the target |
| `artifact` | `deployment_id`, `commit_sha` and `image_digest`. `image_digest` is present **only** when the latest running image is pinned by an OCI digest |
| `resources` | `port`, `replicas`, `cpu`, `ram` |
| `env_keys` | Environment variable **names** only |
| `domains` | Custom domains with `dns_status` and `ssl_status` |
| `volumes` | Persistent volume `id`, `size_gib`, `mount_path` and `status` |
| `blockers` | What is still unverified before a migration |
| `rollback` | What a rollback does and does not restore, for `artifact`, `config`, `schema` and `data` |

### What it never prints

Environment values, API keys, registry credentials, kubeconfig, build logs and database passwords. The CLI also checks the response against the contract and prints only the fields in the table above, so an unexpected field from the server does not reach your terminal or your logs. If an API key shows up inside a documented field it is redacted.

## What the CLI does not print {#not-printed}

The API export also returns `env_refs`, `databases` with their backup references and SHA-256 checksums, the `migration` contract and the `X-Tose-Export-Sha256` header. `tose export` prints only the fields in the table above, so it shows none of these. To see backup references, verify checksums or record the export checksum, call the API directly. See [Backup references](/api/projects#backup-references) and [Migration evidence](/api/projects#migration-evidence). Database backup download is admin only, and TOSE takes no volume backups.

## Blockers and rollback

`blockers` is a list of codes. An empty list does not mean a migration is safe. The API reports these:

| Blocker | Meaning |
|---------|---------|
| `immutable_oci_digest_unavailable` | The latest running image is not pinned by digest, so `artifact.image_digest` is missing |
| `volume_backup_and_restore_unverified` | TOSE does not back up or restore volumes through this API. Verify your own backup and restore |
| `database_dependencies_unresolved` | The API cannot prove which workspace database the project uses |
| `target_capabilities_unverified` | Nothing checked that the target supports the CPU, memory, port, volumes and health behavior |
| `dns_cutover_requires_approval` | A person must approve any DNS change |

The API can also report `env_values_unrecoverable`, `env_values_recoverability_unverified`, `volume_backup_unavailable`, `database_backup_unavailable`, `database_backup_checksum_unavailable` and `database_restore_unverified`. The CLI passes `blockers` through as returned. See [Blockers](/api/projects#blockers) for each meaning.

`rollback` states that rolling back in TOSE re-runs an earlier **image** on the **current** configuration. It does not restore environment variables, application configuration, database schema or data. Plan those rollbacks and their backups separately. A rollback normally returns a receipt that lists these layers; see [Rollback receipts](/api/projects#rollback-receipts).

## Usage

**Human summary:**

```bash
$ tose export web --workspace acme

Project export (tose.dev/project-export/v1, 2026-11-03T08:00:00Z)
This is a read-only inventory, not a backup and not a completed migration. Back up the database and volume separately.

Project:   Web (web)
Artifact:  registry.example/web@sha256:…  commit abc123
Resources: port 3000, 2 replica(s), cpu 500m, ram 512Mi

Environment variable names (values are never exported):
  - DATABASE_URL
  - SESSION_SECRET
Domains:
  - example.com (dns verified, ssl active)
Volumes:
  - /data 5 GiB (bound, vol_1)

Blockers (resolve before any migration):
  - volume_backup_and_restore_unverified
  - volume_backup_unavailable
  - database_dependencies_unresolved
  - target_capabilities_unverified
  - dns_cutover_requires_approval

Rollback:
  artifact: TOSE rollback reapplies a previous image to the current project.
  config:   Current environment variables and configuration are reused, not restored.
  schema:   Database schema is not rolled back.
  data:     Database and volume data are not rolled back; restore separately from verified backups.
```

**One JSON document for scripts and agents:**

```bash
tose export web --workspace acme --json > export.json
```

With `--json`, stdout is exactly one envelope. `data` is the export, and `message` repeats that it is not a backup or a completed migration.

## Errors

| Situation | Code | Exit code |
|-----------|------|-----------|
| Key without `projects:export` | `INSUFFICIENT_SCOPE` | `3` |
| Not allowed to read the project | `forbidden` | `3` |
| Project missing or in another workspace | `not_found` | `6` |
| `schema_version` is not `tose.dev/project-export/v1` | `ERROR` | `1` |
| The response is malformed | `ERROR` | `1` |

For an unsupported `schema_version` the message tells you to update the CLI (`npm i -g @tosesh/tose`). Nothing from the export is printed in that case. Every exit code is listed in the [commands overview](/commands/overview#exit-codes).

## Related

- [API keys](/api/api-keys) for scopes
- [Migration guidance](https://github.com/saasvn/tose-app/blob/master/docs/portable-project-export.md) in `saasvn/tose-app`: backing up PostgreSQL and volumes, restoring into a target, DNS cutover and rollback
- [Migration evidence](/api/projects#migration-evidence) and [Backup references](/api/projects#backup-references) in the Projects API
- [`tose deployment rollback`](/commands/deployment#tose-deployment-rollback)
- [`tose env`](/commands/env) and [`tose domain`](/commands/domain)
