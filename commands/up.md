# tose up

Smart deploy: automatically initialize, connect Git, push env vars, and deploy in one command.

## Synopsis

```bash
tose up [--workspace <slug>] [--project <slug>] [--disk-size <gib> --disk-mount <path>] [--env-file <path>] [--non-interactive] [-y]
```

## Description

`tose up` is the primary deployment command. It handles the entire deployment workflow in a single command:

1. **Resolve or create project** - Links to existing project or creates a new one
2. **Connect Git repository** - Detects and connects your GitHub repo
3. **Assign server** - Ensures a K8S server is assigned
4. **Push environment variables** - Offers to push a detected `.env` file in a terminal; headless runs push only a file you pass with `--env-file`
5. **Deploy** - Triggers the deployment

This is the recommended way to deploy for the first time. For subsequent deployments, you can use [`tose deploy`](/commands/deploy) directly.

## Usage

### First-Time Deployment

```bash
$ cd my-app
$ tose up

No project linked. Setting up...

Using workspace: my-workspace
Fetching projects...
? Select project:
  ❯ Create new project
    existing-app

? Project name: my-app
Creating project...
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

### Already Linked Project

When `.tose.json` exists, `tose up` skips the init step:

```bash
$ tose up

Detected git repo: username/my-app (main)
✓ Git connected: username/my-app (main)

✓ Deploying...
✓ Deployment triggered
  Deployment ID: dep_xyz789
  Status: pending
  URL: https://my-app.tose.sh

Stream build logs with: tose logs --build -f
```

### Non-Interactive Mode

```bash
$ tose up --workspace my-ws --project my-app -y
```

See [Headless and CI runs](#headless-and-ci-runs) for what `tose up` does, and refuses to do, without a terminal.

### With a Persistent Disk

| Option | Description |
|--------|-------------|
| `--disk-size <gib>` | Attach a persistent disk of this size (1–1000 GiB) to the new project |
| `--disk-mount <path>` | Mount path for the disk, e.g. `/data` |

```bash
$ tose up --disk-size 10 --disk-mount /data
```

These flags apply when `tose up` creates a new project. For an existing project use [`tose disk set`](/commands/disk#tose-disk-set). See [Persistent Disks](/guide/persistent-disks) for the rules and trade-offs.

## Workflow Steps

### Step 1: Resolve Context

If the project is not linked (no `.tose.json`), `tose up` runs the init flow:
- Selects or creates a workspace
- Selects or creates a project
- Saves `.tose.json`

### Step 2: Connect Git Repository

- Detects local `.git` directory
- Extracts GitHub repo from `git remote origin`
- Gets current branch name
- Calls the API to connect the repo with auto-deploy enabled

```
Detected git repo: username/my-app (main)
✓ Git connected: username/my-app (main)
```

::: warning Git Required
Your project must be a Git repository with a GitHub remote. If Git is not initialized:

```
Git not initialized. Please run:
  git init
  git remote add origin https://github.com/you/repo.git
  git push -u origin main
```
:::

::: tip GitHub App
TOSE needs access to your repository. If the TOSE GitHub App is not installed:

```
TOSE cannot access this repository.
Please install the TOSE GitHub App:
  https://github.com/apps/tosesh
```
:::

### Step 3: Assign Server

If no server is assigned to the project:
- Lists available K8S servers
- Auto-assigns if only one server available
- Prompts to select if multiple

```
Using server: TOSE Cloud
✓ Server assigned
```

### Step 4: Push Environment Variables

Environment variables are uploaded only with your explicit consent, never implied:

- **In a terminal**, `tose up` scans for `.env*` files and asks whether to push one:

  ```
  Found 2 .env file(s). Push environment variables? Yes
  ✓ Pushing 8 variables...
  ✓ 8 variables pushed
  ```

- **With `--env-file <path>`**, it pushes that file without asking. This is the only way to push variables headlessly.
- **Otherwise**, env files found in the directory are not uploaded.

Variables are merged (not replaced) - existing variables are preserved unless overridden.

### Step 5: Deploy

Triggers the deployment and shows the result:

```
✓ Deploying...
✓ Deployment triggered
  Deployment ID: dep_abc123
  Status: pending
  URL: https://my-app.tose.sh

Stream build logs with: tose logs --build -f
```

### API Key Without `deployments:execute`

Connecting Git and starting a deployment are separate permissions. With an API key that has `projects:write` but not `deployments:execute`, `tose up` still connects Git, but with auto-deploy off. It starts no deployment and exits with the error `INSUFFICIENT_SCOPE`:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_SCOPE",
    "message": "Git is connected, but no deployment was started: this API key lacks the `deployments:execute` scope. Run `tose deploy` with a key that includes it.",
    "details": {
      "required_scope": "deployments:execute",
      "git_connected": true,
      "deploy_skipped": true
    }
  }
}
```

The project is already set up, so nothing needs to be repeated. Run [`tose deploy`](/commands/deploy) with a key that includes `deployments:execute`. Until then, Git pushes do not deploy automatically. See [Scopes and automatic deploys](/api/authentication#scopes-and-automatic-deploys) and [API Keys and Scopes](/api/api-keys).

## Headless and CI runs

With `--json`, `--non-interactive`, or no terminal (CI, an agent, a pipe), `tose up` never prompts.

### Missing input fails with `INPUT_REQUIRED`

An API key belongs to one workspace, so `tose up` uses that workspace without asking; you only need `--workspace` (or `TOSE_WORKSPACE`) if the API returns several. A project is the usual missing input.

If a workspace, a project, or a K8S server cannot be decided without asking, `tose up` exits with code `2` and error code `INPUT_REQUIRED`. The server case applies when several servers are active and none is assigned to the project.

Nothing is created or written in that case: no project, no Git connection, no `.tose.json`, and no default workspace in your user config. You can fix the input and run again safely.

Fix it by passing the value, or setting it in the environment:

```bash
tose up --workspace my-ws --project my-app --json
# or
TOSE_WORKSPACE=my-ws TOSE_PROJECT=my-app tose up --json
```

`--json` only chooses the output format. It never implies consent, so it does not create a project or upload variables for you.

### Push variables with `--env-file`

```bash
tose up --workspace my-ws --project my-app --env-file ./.env.production --json
```

| Behavior | Detail |
|----------|--------|
| Validated first | The file is read and checked before any request is made. A missing, unreadable or empty file, or one with masked placeholder values, fails the run before anything is created. |
| Values stay private | Values are never printed. They are redacted even if the server echoes them back. |
| Fails closed | If the upload fails, the run stops before deploying. It does not fall back to pushing one variable at a time, so a run never reports success with only some variables uploaded. |

### Without `--env-file`

Env files found in the directory are not uploaded. The JSON result reports what happened in `env`:

| `env.status` | Meaning |
|--------------|---------|
| `pushed` | Variables were uploaded. `env.variables` is the count. |
| `skipped` | Nothing was uploaded. `env.reason` says why, for example `env_files_found_no_consent` (files were found, but no `--env-file`), `none_requested` (no env files) or `declined` (you answered no at the prompt). |

### No local GitHub repository

A new project is not created when the directory has no local GitHub repository, because it could not be deployed. `tose up` fails with `GIT_CONNECTION_REQUIRED` and nothing is created. It cannot tell beforehand whether the TOSE GitHub App can reach the repository; that is checked when Git is connected.

### Key without `deployments:execute`

Git is connected but no deployment starts; see [API Key Without `deployments:execute`](#api-key-without-deployments-execute).

## JSON Output

```bash
$ tose up --json -y
```

```json
{
  "success": true,
  "data": {
    "workspace": "my-workspace",
    "project": "my-app",
    "deployment": {
      "id": "dep_abc123",
      "status": "pending",
      "docker_image": "..."
    },
    "env": {
      "status": "skipped",
      "reason": "none_requested"
    }
  }
}
```

When the directory has a `.env` file but you did not pass `--env-file`, nothing is uploaded and the result says so: `"env": { "status": "skipped", "reason": "env_files_found_no_consent" }`.

## Best Practices

### 1. Commit and Push Before Deploying

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
tose up
```

### 2. Monitor After Deployment

```bash
tose up
# In another terminal:
tose logs --build -f
```

### 3. Use for First Deploy, `deploy` for Updates

```bash
# First time
tose up

# Subsequent deploys
tose deploy
```

## Troubleshooting

### Git Repository Not Detected

Ensure your project has a Git remote:

```bash
git remote -v
# Should show: origin  https://github.com/you/repo.git
```

### Deployment Doesn't Start

1. Verify Git repository is accessible by TOSE
2. Check if GitHub App is installed
3. Ensure branch exists on remote: `git push origin main`
4. Check logs: `tose logs --build -f`

### `INSUFFICIENT_SCOPE` After "Git connected"

The key lacks `deployments:execute`. Git is connected and no deployment was started. Run `tose deploy` with a key that has that scope, or add the scope to the key. See [API Key Without `deployments:execute`](#api-key-without-deployments-execute).

## Related Commands

- [`tose deploy`](/commands/deploy) - Deploy without the full init flow
- [`tose status`](/commands/status) - Check deployment status
- [`tose logs`](/commands/logs) - View build or live logs
- [`tose init`](/commands/init) - Link project without deploying
