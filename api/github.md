# GitHub API

Endpoints to find the GitHub repositories, branches and App installations a workspace can use. They feed the [project Git connection](/api/projects#git-connection).

Unlike most endpoints, these live under `/api/github`, not under a workspace. Pass the workspace as the `workspace_slug` query parameter (`workspace` is accepted as an alias).

## Who can call what

| Endpoint | User session | API key |
|----------|--------------|---------|
| `GET /api/github/repos` | yes | needs the `projects:read` scope |
| `GET /api/github/repos/{owner}/{repo}/branches` | yes | needs the `projects:read` scope |
| `GET /api/github/installations` | yes | needs the `projects:read` scope |
| `GET /api/github/available-installations` | yes | needs the `projects:read` scope |
| `POST /api/github/check-install` | yes | refused with `403` |
| `POST /api/github/workspace-installations` | yes | refused with `403` |
| `DELETE /api/github/workspace-installations/{installation_id}` | yes | refused with `403` |

An API key that names a workspace other than its own in `workspace_slug` gets `403`. An API key that omits it falls back to the installations linked to the key creator's account. The three write endpoints change the user's account or the workspace's trust, so they work only with a signed-in user session, never an API key or a connected app. See [Authentication](/api/authentication).

## Read endpoints

All return a bare JSON array, possibly empty, except that `GET /api/github/repos` returns `400` when no GitHub App installation is accessible. A `503` means the GitHub App is not configured on this deployment.

### List repositories

```http
GET /api/github/repos?workspace_slug={slug}
```

Repositories the TOSE GitHub App can read, de-duplicated by `full_name`. With `workspace_slug`, only installations attached to that workspace are searched, and you must be a member of it. Add `installation_id` to list a single installation; a failure then returns `500`. Without it, an installation that fails to load is skipped.

| Field | Type | Description |
|-------|------|-------------|
| `full_name` | string | `owner/repo`. Use it as `repo_full_name` when connecting |
| `private` | boolean | Whether the repository is private |
| `default_branch` | string | Default branch |
| `description`, `language` | string | Repository metadata |
| `html_url`, `clone_url` | string | GitHub links |
| `installation_id` | integer | Installation that exposes it. Omitted when `0` |

### List branches

```http
GET /api/github/repos/{owner}/{repo}/branches?workspace_slug={slug}
```

Branches of a repository, read through an installation: `installation_id` when given; otherwise, with `workspace_slug`, the workspace's only attached installation (`400` when it has none or several); otherwise the account's default installation. Results may come from a short cache. Each item has `name`, `protected` and a `commit` object.

### List installations

```http
GET /api/github/installations?workspace_slug={slug}
```

Installations attached to the workspace or used by its projects. Each item has `id`, `account_name`, `avatar_url` and `type` (`User` or `Organization`). Without `workspace_slug`, you see the installations linked to your own account.

### List installations you can attach

```http
GET /api/github/available-installations?workspace_slug={slug}
```

The workspace's installations plus those linked to your account, each flagged `attached`. Use it to pick an `installation_id` to attach.

## Install and attach (user session only)

### Check or link the installation

```http
POST /api/github/check-install
```

| Request | Result |
|---------|--------|
| No body | Current status: `installed`, and `install_url` when the app is not installed |
| `{ "installation_id": 123 }` | Links a known installation to your account, after checking that your own GitHub identity can access it (`403` otherwise, `400` when GitHub cannot see it) |
| `?poll=true&timeout=120` | Waits up to `timeout` seconds (1-300, default 120) for the installation to appear, then returns |

With `workspace_slug`, the answer is narrowed to that workspace and may set `needs_workspace_attach`. `install_url` embeds a short-lived token that identifies you: open it in a browser, but never log or share it.

### Attach to a workspace

```http
POST /api/github/workspace-installations
```

```json
{ "workspace_slug": "my-workspace", "installation_id": 12345678 }
```

Makes an installation linked to your account usable by the workspace. Requires the workspace `owner` or `admin` role. Attaching an installation twice succeeds and refreshes its stored account details. `workspace_slug` may be sent in the body or as a query parameter.

### Detach from a workspace

```http
DELETE /api/github/workspace-installations/{installation_id}?workspace_slug={slug}
```

Requires the `owner` or `admin` role. Returns `409` while any project of the workspace, including deleted ones and projects whose Git connection was removed, has or had a connection through that installation; the message lists the project slugs.

## Related

- [Projects API](/api/projects)
- [Git Integration](/guide/git)
