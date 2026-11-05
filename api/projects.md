# Projects API

Endpoints to change, restart and delete a project, and to manage its Git connection. Creating and listing projects, deploying and reading logs are in the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml), served at `GET /api/openapi.yaml`; this page covers the workflows around them.

All paths are under `/api/workspaces/{slug}/projects/{project_slug}` and use the same authentication as the rest of the API; see [Authentication](/api/authentication). Every endpoint on this page requires the workspace `admin` or `owner` role, except [Export a project](#export), which any workspace member can call.

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
| `domains` | Custom domains with `name`, `dns_status` and `ssl_status`. The default TOSE domain is not listed |
| `volumes` | Metadata of the project's persistent volumes: `id`, `size_gib`, `mount_path`, `status` |
| `blockers` | What is still unverified, see below |
| `rollback` | A notice about what a TOSE rollback does and does not restore |

**What it never contains:** environment variable values, API keys, registry credentials, kubeconfig, build logs or database passwords.

```json
{
  "schema_version": "tose.dev/project-export/v1",
  "generated_at": "2026-11-03T08:00:00Z",
  "source": { "workspace_id": "ws_...", "project_id": "prj_...", "name": "Shop", "slug": "shop" },
  "artifact": { "deployment_id": "dep_...", "image_digest": "registry.example/shop@sha256:<64 hex characters>", "commit_sha": "<commit>" },
  "resources": { "port": 3000, "replicas": 1, "cpu": "500m", "ram": "512Mi" },
  "env_keys": ["DATABASE_URL", "SESSION_SECRET"],
  "domains": [{ "name": "shop.example.com", "dns_status": "verified", "ssl_status": "active" }],
  "volumes": [{ "id": "vol_...", "size_gib": 10, "mount_path": "/data", "status": "bound" }],
  "blockers": ["volume_backup_and_restore_unverified", "database_dependencies_unresolved", "target_capabilities_unverified", "dns_cutover_requires_approval"],
  "rollback": { "artifact": "...", "config": "...", "schema": "...", "data": "..." }
}
```

The values above are examples only. `artifact` is empty when the project has no running deployment.

### Blockers

`blockers` lists conditions the export cannot prove. Treat every entry as work to do before a cutover.

| Blocker | Meaning |
|---------|---------|
| `immutable_oci_digest_unavailable` | There is no running image pinned by digest, so the artifact cannot be reproduced exactly. Build or resolve a digest first |
| `volume_backup_and_restore_unverified` | The project has a volume. TOSE does not back it up through this endpoint; make a snapshot or consistent archive and test a restore |
| `database_dependencies_unresolved` | The API cannot tell which workspace database the project uses. Identify it and back it up (for PostgreSQL, `pg_dump --format=custom`) |
| `target_capabilities_unverified` | Check that the target supports the CPU, memory, port, volumes and health behavior |
| `dns_cutover_requires_approval` | Changing DNS needs an explicit approval by a person, after the target is healthy |

The last three are always present.

### Rollback is not a restore

The `rollback` object states what a TOSE rollback covers. It reapplies an earlier image to the **current** project. It reuses the current environment variables and configuration, and it does not roll back the database schema, database data or volume data. Plan artifact, configuration, schema and data rollback separately, from verified backups.

## Related

- [Git Integration](/guide/git)
- [GitHub API](/api/github)
- [Persistent Disks](/guide/persistent-disks)
- [API keys and scopes](/api/api-keys)
