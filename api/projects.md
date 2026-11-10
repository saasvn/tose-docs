# Projects API

Endpoints to change, restart and delete a project, and to manage its Git connection. Creating and listing projects, deploying and reading logs are in the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml), served at `GET /api/openapi.yaml`; this page covers the workflows around them.

All paths are under `/api/workspaces/{slug}/projects/{project_slug}` and use the same authentication as the rest of the API; see [Authentication](/api/authentication). Every endpoint on this page requires the workspace `admin` or `owner` role.

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

## Process limit {#process-limit}

```http
GET /api/workspaces/{slug}/projects/{project_slug}/status
```

The status response carries a `resources` object with the project's CPU and memory limits. When an operator has declared a per-Pod process (PID) limit, it also carries `resources.pids.limit`:

```json
{ "resources": { "pids": { "limit": 4096 } } }
```

- **Per Pod, shared.** The number is one budget for the whole Pod: the project's container and every sidecar count against it together. It is not a per-container or per-project setting.
- **A declaration, not a measurement.** The value is whatever the operator of the TOSE deployment configured after confirming the node setting (`PROJECT_POD_PIDS_LIMIT`). TOSE does not read it back from the nodes, so it can be stale if the nodes change, and limits can differ between nodes.
- **Absent means unknown.** The field appears only when the operator configured a confirmed value. A missing `pids` object does not mean the limit is unlimited; it means TOSE does not know the limit.
- **Reporting only.** The field does not set or enforce a limit and no API call changes it. Enforcement is a node-level kubelet setting (`podPidsLimit`) outside this API.

## Restart a project

```http
POST /api/workspaces/{slug}/projects/{project_slug}/restart
```

Restarts the running deployment without building a new image. The restart is a recovery runbook (`restart`): TOSE plans it, records the approval and runs it. The caller must be a workspace owner or admin; an API key also needs the `deployments:execute` scope.

**Signed in (dashboard session).** Your call is the approval, so TOSE plans, approves and runs the restart at once and answers `200`:

```json
{ "success": true, "message": "Project restarting", "restarted_pods": 1, "runbook": { "id": "...", "status": "executed", "execution": { "status": "started" } } }
```

`restarted_pods` is the planned replica count. `runbook` is the plan with its run. The call returns once the restart has started, not when the new pods are ready; read the plan again with `GET .../runbooks/{plan_id}` to see the run finish.

**API key.** A key cannot approve a runbook. The call only stores the plan and answers `409 APPROVAL_REQUIRED` with the plan in `runbook`, plus `approval_url` and `details.runbook_id` when the server knows its public URL. A workspace owner or admin approves the plan while signed in, then the key runs it with `POST .../runbooks/restart/{plan_id}/execute`.

Send an optional `Idempotency-Key` header (8 to 128 characters, `[A-Za-z0-9._:-]`). A retry with the same key returns the first run with the `Idempotent-Replayed: true` header instead of restarting again.

| Status | Code | Meaning |
|--------|------|---------|
| `400` | `NO_SERVER` | The project has no server assigned |
| `403` | `FORBIDDEN`, `INSUFFICIENT_SCOPE` | You are not an owner or admin, or the key lacks `deployments:execute` |
| `409` | `APPROVAL_REQUIRED` | Called with an API key. The plan is stored and waits for a signed-in owner or admin |
| `409` | `DEPLOY_IN_PROGRESS` | A deployment of the project is still running. Wait until it finishes |
| `409` | `NOT_RUNNING` | The project is scaled to zero, so there is nothing to restart |
| `409` | `NO_WORKLOAD` | The project has no live workload in the cluster. Deploy it instead |
| `409` | `RUNBOOK_FAILED` or a more specific code | The run started but the cluster refused the change. The body has `runbook` |
| `409` | `CONFLICT` | Another operation on the project holds its lock. Try again shortly |
| `409` | (no code) | In a workspace with environments, the move guard refused the call: another write to the project is running, or the project is the retained source of a move (`Source is retained for a move. Restore it before making changes.`). The body has only `message` |
| `503` | `UNAVAILABLE` | TOSE could not read the cluster, take the project lock or check your membership. Nothing was changed |

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
| `400` | `repo_full_name` is missing or not `owner/repo`, the repository is not reachable through the installation, the branch does not exist, or no attached installation can reach the repository. A failure caused by GitHub has a [`github_*` code](/api/errors#github-upstream-codes) and is not retryable |
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

## Environment variables and apply {#environment-variables}

The environment variable routes are in the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml):
`POST`, `PUT` and `DELETE` on `/api/workspaces/{slug}/projects/{project_slug}/env[/{env_id}]`, and
`PUT .../env/bulk`. By default a change is only saved; running pods pick it up on the next deploy or
`POST .../redeploy`.

### Save and apply

Add `?apply=true` to save the change and then roll it out right away. The rollout is the same as
`POST /api/workspaces/{slug}/projects/{project_slug}/redeploy`: the last successful image with the
current variables and resource limits, **no rebuild**.

```bash
curl -X PUT "https://api.tose.sh/api/workspaces/$WS/projects/web/env/bulk?apply=true" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"variables": {"LOG_LEVEL": "debug"}, "merge": true}'
```

The response carries an `apply` object next to the usual result. The change is saved whatever it reports.

```json
{ "applied": true, "deployment_id": "dep_123", "status": "running" }
```

```json
{ "applied": false, "code": "NO_DEPLOYMENT", "reason": "The project has no successful deployment yet. The change was saved and applies with the next deploy." }
```

| Field | Description |
|-------|-------------|
| `applied` | `true` when the change was rolled out to the running pods |
| `deployment_id`, `status` | The deployment the rollout recorded, when applied |
| `code`, `reason` | Why it was not applied: `NO_DEPLOYMENT` (no successful deployment yet), `NO_SERVER`, `INSUFFICIENT_BALANCE`, `ROLLOUT_FAILED` and similar. Redeploy to retry |

Apply needs the same rights as a redeploy: the `owner` or `admin` role, the `deployments:execute`
scope for an API key, approval for a connected OAuth app, and a positive wallet balance. When one is
missing, the request is refused before anything is saved:

| Status | Meaning |
|--------|---------|
| `402` | The wallet balance is not positive (`INSUFFICIENT_BALANCE`). Nothing is saved |
| `403` | The key lacks `deployments:execute`, or an OAuth app needs approval (`approval_required`). Nothing is saved |

### Detect pending changes

`GET /api/workspaces/{slug}/projects/{project_slug}` returns `env_pending`: `true` when the saved
variables differ from the ones the running deployment was rolled out with. It is `false` when nothing
runs, for deployments made before this field existed, and after a runbook rollback.

## Related

- [Git Integration](/guide/git)
- [GitHub API](/api/github)
- [Persistent Disks](/guide/persistent-disks)
