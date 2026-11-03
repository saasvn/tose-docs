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

### Error: Insufficient Wallet Balance

When the workspace wallet balance is zero or negative, the API refuses `deploy`, `redeploy` and
`rollback` with `402` and the code `INSUFFICIENT_BALANCE`. No deployment is created. The CLI exits
with code `9`.

```bash
$ tose deploy

Error: insufficient wallet balance
```

With `--json`, `error.code` is `INSUFFICIENT_BALANCE` and `next_actions` carries the top-up page in
its `url` field and the command to run once the wallet has credit:

```json
{
  "schema_version": "1",
  "status": "error",
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "insufficient wallet balance"
  },
  "next_actions": [
    {
      "command": "tose deploy",
      "description": "Top up the workspace wallet at https://tose.sh/w/my-workspace/billing, then retry",
      "url": "https://tose.sh/w/my-workspace/billing"
    }
  ]
}
```

A deployment queued by a push to GitHub is not refused up front. The build pipeline marks it
`failed` with an `error_message` that starts with `insufficient wallet balance` (or
`no wallet found`). `tose deploy --wait` and `tose deployment wait <id>` recognize that failure,
exit `9` instead of `8` and print the same top-up hint. See [Billing](/guide/pricing) for how the
wallet works.

### Diagnose with `tose doctor`

```bash
tose doctor [workspace/project] --json
```

`tose doctor` checks the Node version, API key, project, Git integration, server and port, quota,
latest deployment, pod health and custom domain DNS/SSL. When the latest deployment failed because
of the wallet balance, the deployment check fails with the top-up hint, `next_actions` includes
the billing `url`, and the command exits `1` with `CHECKS_FAILED`.

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

### Error: Insufficient Wallet Balance

`tose redeploy` and `tose rollback` are refused the same way as `tose deploy`: exit code `9`,
`error.code: "INSUFFICIENT_BALANCE"` and a `next_actions` entry with the top-up `url`. Top up the
wallet, then run the command again.

### Error: redeploy or rollback failed

If the cluster refuses the redeploy, the API answers `500` with `Redeploy failed. See the server log for details.`. A failed `tose rollback` answers `ROLLBACK_FAILED` with `Rollback failed. See the server log for details.`. Both messages are generic on purpose: the cluster error can contain infrastructure detail, so it stays in the server log. Run the command again, and quote the `request_id` to support if it keeps failing.

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
- [Exit codes](/commands/overview#exit-codes) - Meaning of exit code `9`
