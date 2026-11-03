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

## Related

- [Git Integration](/guide/git)
- [GitHub API](/api/github)
- [Persistent Disks](/guide/persistent-disks)
