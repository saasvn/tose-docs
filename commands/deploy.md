# tose deploy / redeploy

Trigger deployments for your project.

## tose deploy

Deploy your linked project.

### Synopsis

```bash
tose deploy [project]
```

### Description

Triggers a new deployment for the specified project. Unlike [`tose up`](/commands/up), this command does not auto-init, connect Git, or push env vars. It simply triggers a deployment using the existing configuration.

### Arguments

| Argument | Description |
|----------|-------------|
| `[project]` | Optional. Project slug or `workspace/project` format |

### Usage

**Deploy linked project (from `.tose.json`):**

```bash
$ tose deploy

✓ Deploying my-workspace/my-app...
✓ Deployment triggered
  Deployment ID: dep_abc123
  Status: pending
  Commit: a1b2c3d

Stream build logs with: tose logs --build -f
```

**Deploy specific project:**

```bash
$ tose deploy my-workspace/my-app

✓ Deploying my-workspace/my-app...
✓ Deployment triggered
  Deployment ID: dep_abc123
  Status: pending
  Commit: a1b2c3d

Stream build logs with: tose logs --build -f
```

**Deploy with workspace/project flags:**

```bash
$ tose deploy --workspace my-ws --project my-app
```

### JSON Output

```bash
$ tose deploy --json
```

```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "status": "pending",
    "git_commit_sha": "a1b2c3d4e5f6...",
    "git_commit_message": "feat: add new feature"
  }
}
```

### Error: No Git Connection

```bash
$ tose deploy

Error: Project has no git connection.
Run 'tose up' to connect your repository first.
```

---

## tose redeploy

Redeploy with the current configuration without rebuilding the Docker image.

### Synopsis

```bash
tose redeploy [project]
```

### Description

Redeploys the project using the existing Docker image and configuration. This is faster than a full deployment because it skips the build step. Useful when you've only changed environment variables or server settings.

### Arguments

| Argument | Description |
|----------|-------------|
| `[project]` | Optional. Project slug or `workspace/project` format |

### Usage

```bash
$ tose redeploy

✓ Redeploying my-workspace/my-app...
✓ Redeploy complete
  Deployment ID: dep_xyz789
  Status: deploying
  URL: https://my-app.tose.sh
```

### JSON Output

```bash
$ tose redeploy --json
```

```json
{
  "success": true,
  "data": {
    "id": "dep_xyz789",
    "status": "deploying"
  }
}
```

## deploy vs redeploy

| Feature | `tose deploy` | `tose redeploy` |
|---------|---------------|-----------------|
| Builds new image | Yes | No |
| Uses latest code | Yes (latest commit) | No (existing image) |
| Speed | Slower (build + deploy) | Faster (deploy only) |
| Use case | Code changes | Config/env changes |

## Related Commands

- [`tose up`](/commands/up) - Full smart deploy with auto-init
- [`tose down`](/commands/down) - Stop deployment
- [`tose status`](/commands/status) - Check deployment status
- [`tose logs`](/commands/logs) - View deployment logs
