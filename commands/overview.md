# Commands Overview

TOSE CLI provides a comprehensive set of commands for deploying and managing your applications. This page gives you a complete reference of all available commands.

## Global Options

These options are available on **all** commands:

```bash
--json                 # Output JSON (for scripting and AI agents)
-y, --yes              # Skip confirmation prompts
--api-key <key>        # Override API key
--workspace <slug>     # Override workspace
--project <slug>       # Override project
-V, --version          # Output version number
-h, --help             # Display help for command
```

## Command Reference

### Authentication

| Command | Description |
|---------|-------------|
| [`tose login`](/commands/login) | Save and verify your API key |
| [`tose logout`](/commands/login#tose-logout) | Remove stored credentials |
| [`tose whoami`](/commands/login#tose-whoami) | Show current user and workspace info |

### Project Context

| Command | Description |
|---------|-------------|
| [`tose init`](/commands/init) | Link current directory to a TOSE project |
| [`tose use`](/commands/init#tose-use) | Set the active project globally |

### Deployment

| Command | Description |
|---------|-------------|
| [`tose up`](/commands/up) | Smart deploy: auto-init, git connect, and deploy |
| [`tose deploy`](/commands/deploy) | Trigger a new deployment |
| [`tose redeploy`](/commands/deploy#tose-redeploy) | Redeploy with current config (no rebuild) |
| [`tose down`](/commands/down) | Stop current deployment |
| [`tose restart`](/commands/down#tose-restart) | Restart pods without redeploying |
| [`tose deployment rollback`](/commands/deployment#tose-deployment-rollback) | Roll back to an earlier deployment (needs `--yes`) |
| [`tose runbook`](/commands/runbook) | Plan, review and run a restart or rollback that a person approves in the browser |

### Monitoring

| Command | Description |
|---------|-------------|
| [`tose status`](/commands/status) | Show project status and pod health |
| [`tose logs`](/commands/logs) | View build or live logs |
| [`tose open`](/commands/open) | Open project URL in browser |

### Environment Variables

| Command | Description |
|---------|-------------|
| [`tose env list`](/commands/env) | List environment variables |
| [`tose env set`](/commands/env#tose-env-set) | Set one or more variables |
| [`tose env rm`](/commands/env#tose-env-rm) | Remove variables |
| [`tose env push`](/commands/env#tose-env-push) | Push .env file to project |
| [`tose env pull`](/commands/env#tose-env-pull) | Pull variables to local .env file |

### Domains

| Command | Description |
|---------|-------------|
| [`tose domain list`](/commands/domain) | List custom domains |
| [`tose domain add`](/commands/domain#tose-domain-add) | Add a custom domain |
| [`tose domain rm`](/commands/domain#tose-domain-rm) | Remove a custom domain |

### Databases

| Command | Description |
|---------|-------------|
| [`tose db list`](/commands/db) | List databases in workspace |
| [`tose db create`](/commands/db#tose-db-create) | Create a new database |
| [`tose db info`](/commands/db#tose-db-info) | Show database connection info |

### Cloud Desktops (Coming soon)

Status: **Coming soon**. The commands ship in CLI 0.1.3, but Cloud Desktops are not switched on in
production yet.

| Command | Description |
|---------|-------------|
| [`tose desktop list`](/commands/desktop#tose-desktop-list) | List desktops in workspace |
| [`tose desktop create`](/commands/desktop#tose-desktop-create) | Create a persistent desktop |
| [`tose desktop status`](/commands/desktop#tose-desktop-status) | Show desktop details |
| [`tose desktop wake / sleep`](/commands/desktop#tose-desktop-wake-sleep) | Start or stop compute, keep the disk |
| [`tose desktop delete`](/commands/desktop#tose-desktop-delete) | Delete a desktop and its disk |
| [`tose desktop events`](/commands/desktop#tose-desktop-events) | Show the desktop audit log |
| [`tose desktop screenshot`](/commands/desktop#tose-desktop-screenshot) | Save a screenshot |
| [`tose desktop exec`](/commands/desktop#tose-desktop-exec) | Run a shell command on the desktop |

### Disks and Pricing

| Command | Description |
|---------|-------------|
| [`tose disk get`](/commands/disk) | Show the project's persistent disk |
| [`tose disk set`](/commands/disk#tose-disk-set) | Add, grow, or move a project disk |
| [`tose disk delete`](/commands/disk#tose-disk-delete) | Delete a project disk and its data |
| [`tose volumes list`](/commands/disk#tose-volumes-list) | List all disks in the workspace |
| [`tose volumes resize`](/commands/disk#tose-volumes-resize) | Grow any disk by volume ID |
| [`tose pricing`](/commands/disk#tose-pricing) | Show compute and storage rates |

### Migration Planning

| Command | Description |
|---------|-------------|
| [`tose export`](/commands/export) | Print a read-only, secret-free project inventory (not a backup) |

### Autoscaling budgets

| Command | Description |
|---------|-------------|
| [`tose autoscaling budget get`](/commands/autoscaling#tose-autoscaling-budget-get) | Show spend caps, usage and pending approvals |
| [`tose autoscaling budget set`](/commands/autoscaling#tose-autoscaling-budget-set) | Propose caps and a project floor; a person approves the plan in the dashboard |

Budgets work only where the platform operator has turned them on.

### Agent Skills

| Command | Description |
|---------|-------------|
| [`tose skills list`](/commands/skills#tose-skills-list) | List skills in the public catalogue |
| [`tose skills install`](/commands/skills#tose-skills-install) | Install a skill after verifying every file's digest |

### Utilities

| Command | Description |
|---------|-------------|
| [`tose feedback`](/commands/feedback) | Report a bug or request a feature, no GitHub account needed |
| [`tose generate`](/commands/generate) | Generate Dockerfile using AI |

## Quick Start

```bash
# 1. Login
tose login

# 2. Navigate to your project and deploy
cd my-app
tose up

# 3. Monitor
tose status
tose logs --build -f

# 4. Manage env vars
tose env set NODE_ENV=production PORT=3000
tose env list
```

## Common Workflows

### First Deployment

```bash
cd /path/to/your-app
tose up
```

`tose up` handles everything automatically:

```
No project linked. Setting up...

Using workspace: my-workspace
Fetching projects...
? Select project: Create new project
? Project name: my-app
✓ Project "my-app" created

Linked to my-workspace/my-app

Detected git repo: username/my-app (main)
✓ Git connected: username/my-app (main)
Using server: TOSE Cloud
✓ Server assigned

Found 1 .env file(s). Push environment variables? Yes
✓ Pushing 5 variables...
✓ 5 variables pushed

✓ Deploying...
✓ Deployment triggered
  Deployment ID: dep_abc123
  Status: pending
  URL: https://my-app.tose.sh

Stream build logs with: tose logs --build -f
```

### Update and Redeploy

```bash
git push origin main
tose deploy
```

```
✓ Deploying my-workspace/my-app...
✓ Deployment triggered
  Deployment ID: dep_xyz789
  Status: pending
  Commit: a1b2c3d

Stream build logs with: tose logs --build -f
```

### Manage Environment

```bash
# Set variables
tose env set DATABASE_URL=postgres://... API_SECRET=mysecret

# Push from .env file
tose env push .env.production

# Pull to local file
tose env pull .env.local
```

### Monitor and Debug

```bash
# Check status with pod health
tose status

# Stream build logs
tose logs --build -f

# Stream live application logs
tose logs -f

# Open in browser
tose open
```

## Context Resolution

TOSE CLI resolves workspace and project context from multiple sources, in order of priority:

### Workspace

1. Positional argument (e.g., `tose deploy ws/proj`)
2. `--workspace` flag
3. `TOSE_WORKSPACE` environment variable
4. `.tose.json` in current directory
5. Active workspace (set via `tose use`)
6. Config default workspace
7. Interactive prompt

### Project

1. Positional argument (e.g., `tose deploy ws/proj`)
2. `--project` flag
3. `TOSE_PROJECT` environment variable
4. `.tose.json` in current directory
5. Active project (set via `tose use`)
6. Interactive prompt

### API Key

1. `--api-key` flag
2. `TOSE_API_KEY` environment variable
3. `~/.tose/config.json`
4. Interactive prompt

## JSON Output

All commands support `--json` for machine-readable output. With `--json`, stdout carries exactly one JSON document; progress and warnings go to stderr. `--json` never confirms a destructive operation.

```bash
tose status --json
```

**Success response:**

```json
{
  "schema_version": "1",
  "status": "ok",
  "success": true,
  "data": { ... },
  "next_actions": []
}
```

`status` is `pending` when the API accepted work that is still running, such as a build after `tose deploy`.

**Error response:**

```json
{
  "schema_version": "1",
  "status": "error",
  "success": false,
  "error": {
    "code": "not_found",
    "message": "workspace not found",
    "request_id": "req_123",
    "retryable": false,
    "details": null,
    "doc_url": null
  },
  "next_actions": []
}
```

### Error fields

| Field | Meaning |
|-------|---------|
| `code` | The `code` of the API error envelope when the API sent one: stable snake_case values such as `not_found`, `forbidden` or `credentials_in_url`. Branch on it, never on `message`. Without an envelope the code comes from the HTTP status (`UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED`, `SERVER_ERROR`, …). A 403 caused by your key is reported as `INSUFFICIENT_SCOPE` (with `details.required_scope`) or `API_KEY_WORKSPACE_SCOPED` instead of the API's code. The CLI raises some codes itself, for example `INPUT_REQUIRED`, `CONFIRMATION_REQUIRED`, `DEPLOY_FAILED` and `SKILL_INTEGRITY` |
| `request_id` | From the API error body or its `X-Request-Id` header. Quote it when you report a problem |
| `retryable` | `true` means the same command may succeed if you run it again later |
| `details` | Extra context from the API, for example `required_scope`, which the CLI sets when `code` is `INSUFFICIENT_SCOPE` |
| `doc_url` | Link to documentation for this error, or `null` |

`schema_version` changes only when a field is removed or changes meaning. New fields can appear at any time, so ignore the ones you do not know.

## API key handling

The CLI sends your key only in the `X-API-Key` header, never in a URL. That includes the WebSocket behind `tose logs -f`, and the CLI refuses to open a stream whose URL carries a credential parameter such as `api_key`, `x-api-key` or `access_token`.

If the API answers `400 credentials_in_url`, something put the key in a query string, such as an old client, a proxy or a hand-built URL. The CLI says so and tells you to rotate that key. To rotate: create a new key, run `tose login` with it, then revoke the old one. In `--json` mode the error has `code` `credentials_in_url`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TOSE_API_KEY` | Override API key |
| `TOSE_API_URL` | Override API base URL (default: `https://api-v2.tose.sh`) |
| `TOSE_WORKSPACE` | Override workspace slug |
| `TOSE_PROJECT` | Override project slug |

## Exit Codes

| Code | Name | Meaning |
|------|------|---------|
| `0` | `SUCCESS` | Done, or accepted and still running (`status: "pending"`) |
| `1` | `ERROR` | Any other failure, including API and network errors |
| `2` | `USAGE` | Invalid or missing flags, arguments or input, or the API rejected the request as invalid (400/422, including `credentials_in_url`) |
| `3` | `UNAUTHORIZED` | No API key, or the API rejected it (401/403, including a missing key scope) |
| `4` | `CONFIRMATION_REQUIRED` | A destructive command needs `--yes` or `--confirm <name>` |
| `5` | `CANCELLED` | You declined the prompt, a wait was interrupted, or the deployment was cancelled |
| `6` | `NOT_FOUND` | The workspace, project or resource does not exist |
| `7` | `TIMEOUT` | Waiting took too long; the operation may still finish |
| `8` | `OPERATION_FAILED` | A deploy, build or desktop operation ended in a failed state |
| `9` | `INSUFFICIENT_BALANCE` | The workspace wallet balance is zero or negative, so a deploy, redeploy or rollback was refused. `next_actions` carries the top-up page in `url` |

## Next Steps

- [Installation](/guide/installation) - Install TOSE CLI
- [Getting Started](/guide/getting-started) - Deploy your first app
- [Configuration](/guide/configuration) - Configuration reference
