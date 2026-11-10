# tose env

Manage environment variables for your project.

## tose env list

List all environment variables.

### Synopsis

```bash
tose env list [project]
```

### Usage

```bash
$ tose env list

KEY                          VALUE                                    SECRET
DATABASE_URL                 postgresql://user:pass@host/db           no
API_KEY                      ****...                                  yes
NODE_ENV                     production                               no
PORT                         3000                                     no
JWT_SECRET                   ****...                                  yes
```

### JSON Output

```bash
$ tose env list --json
```

```json
{
  "success": true,
  "data": [
    {
      "id": "env_abc123",
      "key": "DATABASE_URL",
      "value": "postgresql://user:pass@host/db",
      "is_secret": false
    },
    {
      "id": "env_def456",
      "key": "API_KEY",
      "value": "sk-xxxx...",
      "is_secret": true
    }
  ]
}
```

---

## tose env set

Set one or more environment variables.

### Synopsis

```bash
tose env set <KEY=VALUE...> [--apply]
```

### Usage

**Set a single variable:**

```bash
$ tose env set NODE_ENV=production

✓ Set 1 variable(s)
```

**Set multiple variables:**

```bash
$ tose env set DATABASE_URL=postgres://... API_KEY=secret PORT=3000

✓ Set 3 variable(s)
```

### Options

| Option | Description |
|--------|-------------|
| `--apply` | Also roll the change out now. See [Saving and applying changes](#saving-and-applying-changes) |

### Behavior

- New variables are created
- Existing variables with the same key are updated
- Other existing variables are preserved (merge behavior)

### JSON Output

```json
{
  "success": true,
  "data": {
    "created": 2,
    "updated": 1,
    "deleted": 0
  }
}
```

---

## tose env rm

Remove one or more environment variables.

### Synopsis

```bash
tose env rm <KEY...> [--yes] [--apply]
```

### Options

| Option | Description |
|--------|-------------|
| `--yes` | Confirm the removal. Required without a terminal or with `--json` |
| `--apply` | Also roll the change out now. See [Saving and applying changes](#saving-and-applying-changes) |

### Usage

```bash
$ tose env rm DEBUG OLD_VAR UNUSED_KEY

  Deleted: DEBUG
  Deleted: OLD_VAR
  Not found: UNUSED_KEY

Deleted 2 variable(s)
```

### JSON Output

```json
{
  "success": true,
  "data": {
    "deleted": 2
  }
}
```

---

## tose env push

Push a local .env file to the project.

### Synopsis

```bash
tose env push [file] [--replace] [--apply]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `[file]` | Path to .env file (default: `.env`) |

### Options

| Option | Description |
|--------|-------------|
| `--replace` | Replace all existing vars (default: merge). Needs `--yes` without a terminal or with `--json` |
| `--apply` | Also roll the change out now. See [Saving and applying changes](#saving-and-applying-changes) |

### Usage

**Push default .env file (merge):**

```bash
$ tose env push

✓ Pushing 5 variables to my-app...
✓ 5 variables pushed
```

**Push specific file:**

```bash
$ tose env push .env.production

✓ Pushing 12 variables to my-app...
✓ 12 variables pushed
```

**Replace all variables:**

```bash
$ tose env push .env.production --replace

✓ Pushing 12 variables to my-app...
✓ 12 variables pushed (replaced all)
```

### .env File Format

```bash
# Comments are ignored
KEY=value
ANOTHER_KEY=value with spaces
QUOTED="value in double quotes"
SINGLE_QUOTED='value in single quotes'

# Empty lines are ignored
DATABASE_URL=postgres://user:pass@host:5432/db
```

### JSON Output

```json
{
  "success": true,
  "data": {
    "created": 5,
    "updated": 0,
    "deleted": 0
  }
}
```

---

## tose env pull

Pull environment variables from the project to a local file.

### Synopsis

```bash
tose env pull [file]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `[file]` | Output file path (default: `.env`) |

### Usage

```bash
$ tose env pull

✓ Fetching environment variables...
Pulled 8 variables to .env
```

**Pull to specific file:**

```bash
$ tose env pull .env.local

✓ Fetching environment variables...
Pulled 8 variables to .env.local
```

The generated file contains one `KEY=VALUE` per line:

```bash
DATABASE_URL=postgres://user:pass@host:5432/db
API_KEY=sk-xxxxxxxxxxxx
NODE_ENV=production
PORT=3000
```

### JSON Output

```json
{
  "success": true,
  "data": {
    "pulled": 8,
    "file": ".env",
    "skipped_masked": []
  }
}
```

## Saving and applying changes

`tose env set`, `tose env rm` and `tose env push` **only save by default**. Running pods pick the change up with the next deployment.

Add `--apply` to also roll the change out now. It uses the same rollout as [`tose redeploy`](/commands/deploy#tose-redeploy): the last successful image, with **no rebuild**.

```bash
tose env set LOG_LEVEL=debug --apply
tose env push prod.env --apply
tose env rm OLD_FLAG --yes --apply
```

The CLI sends `?apply=true` to the API and reports the outcome after the change is saved:

| Outcome | Meaning | Exit code |
|---------|---------|-----------|
| `applied: true` | Saved and rolled out. The result carries the `deployment_id` and `status` | `0` |
| `NO_DEPLOYMENT` or `NO_SERVER` | Saved. The project has no deployment or no server to roll out to, so the change applies with the next deploy | `0` |
| `ROLLOUT_FAILED` and other codes | Saved, but the rollout did not happen. Run `tose redeploy` to retry | `8` |
| `INSUFFICIENT_BALANCE` | Saved, but the wallet could not fund the rollout. Top up, then run `tose redeploy` | `9` |
| No `apply` in the response | An older server that does not report an outcome. The change is saved only | `0` |

With `--json`, the result also carries `apply` (the API's outcome) and `apply_message` (one sentence describing it):

```json
{
  "success": true,
  "data": {
    "created": 1,
    "updated": 0,
    "deleted": 0,
    "apply": { "applied": true, "deployment_id": "dep_abc123", "status": "running" },
    "apply_message": "Saved and applied: rolled out to the running project. Deployment dep_abc123 (running)."
  }
}
```

### Refusals

Some conditions refuse the request. They are reported as errors and the API **saves nothing**:

- The wallet balance is zero or negative (`INSUFFICIENT_BALANCE`, exit `9`).
- The API key lacks the `deployments:execute` scope (`INSUFFICIENT_SCOPE`).
- A connected app needs approval first.

With `--apply`, the CLI never falls back to one request per variable after a refusal. If a command needs several writes and the last one is refused, the earlier writes stay saved, and the CLI says so.

### One restart

When variables are written one by one, or several keys are removed, only the **last** write or delete asks for the rollout. The project restarts once, not once per variable.

Values stay masked as described in [Masked values for workspace members](#masked-values-for-workspace-members).

---

## Masked values for workspace members

Only workspace `admin` and `owner` can read environment values. For a `member`, the API returns the placeholder `********` instead of each value in the project env listing (and `***` in the template env listing). The CLI recognises these placeholders and never treats them as real values:

| Command | Behavior when values are masked |
|---------|---------------------------------|
| `tose env list` | Shows the placeholders as the API returns them |
| `tose env pull` | Skips masked keys and lists them in `skipped_masked` with `--json`. A value the local file already holds for a masked key is kept. If every value is masked, it fails without writing the file (`FORBIDDEN`, exit `1`) |
| `tose env push`, `tose env set`, `tose template env set` | Refuse a value that is a masked placeholder and send nothing (`VALIDATION_ERROR`, exit `2`) |
| `tose up` | When you choose to push an env file at its prompt, stops before sending any value if the file holds a masked placeholder (`VALIDATION_ERROR`, exit `2`). Without a terminal, `tose up` does not push env files |

The refusal protects you from overwriting a real value with a placeholder, for example after copying a listing into an env file. Replace the placeholders with the real values, or ask a workspace `admin` or `owner` to run the command.

```bash
$ tose env pull
Pulled 6 variables to .env
Skipped 2 masked variable(s) (API_KEY, JWT_SECRET): workspace members cannot read env values.
```

```json
{
  "success": true,
  "data": {
    "pulled": 6,
    "file": ".env",
    "skipped_masked": ["API_KEY", "JWT_SECRET"]
  }
}
```

---

## Workflow Examples

### Sync Variables Between Environments

```bash
# Pull from staging
tose env pull .env.staging --workspace my-ws --project staging-app

# Edit locally
vim .env.staging

# Push to production
tose env push .env.staging --workspace my-ws --project prod-app
```

### Set Variables in CI/CD

```bash
tose env set \
  NODE_ENV=production \
  DATABASE_URL=$DATABASE_URL \
  API_KEY=$API_KEY \
  --workspace my-ws \
  --project my-app \
  --apply
```

### Bulk Replace Environment

```bash
# Replace all variables with a fresh set
tose env push .env.production --replace

# Verify
tose env list
```

## Related Commands

- [`tose up`](/commands/up) - Deploy (auto-pushes env vars)
- [`tose redeploy`](/commands/deploy#tose-redeploy) - Redeploy to apply saved env changes (or use `--apply`)
- [`tose status`](/commands/status) - Check project status
