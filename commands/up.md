# tose up

Smart deploy: automatically initialize, connect Git, push env vars, and deploy in one command.

## Synopsis

```bash
tose up [--workspace <slug>] [--project <slug>] [-y]
```

## Description

`tose up` is the primary deployment command. It handles the entire deployment workflow in a single command:

1. **Resolve or create project** - Links to existing project or creates a new one
2. **Connect Git repository** - Detects and connects your GitHub repo
3. **Assign server** - Ensures a K8S server is assigned
4. **Push environment variables** - Detects `.env` files and offers to push them
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

Scans for `.env*` files and offers to push them:

```
Found 2 .env file(s). Push environment variables? Yes
✓ Pushing 8 variables...
✓ 8 variables pushed
```

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
    }
  }
}
```

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

## Related Commands

- [`tose deploy`](/commands/deploy) - Deploy without the full init flow
- [`tose status`](/commands/status) - Check deployment status
- [`tose logs`](/commands/logs) - View build or live logs
- [`tose init`](/commands/init) - Link project without deploying
