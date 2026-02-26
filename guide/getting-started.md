# Getting Started

Deploy your first application with TOSE CLI in under 5 minutes.

## Prerequisites

- [TOSE CLI installed](/guide/installation)
- A TOSE account with an [API key](/guide/installation#getting-your-api-key)
- A project with a Git repository on GitHub

## Step 1: Login

```bash
$ tose login

? Enter your TOSE API key: tose_sk_xxxxxxxxxxxx
✓ API key verified
Default workspace: my-workspace
Logged in! API key saved to ~/.tose/config.json
```

## Step 2: Deploy

Navigate to your project and run `tose up`:

```bash
$ cd my-app
$ tose up

No project linked. Setting up...

Using workspace: my-workspace
Fetching projects...
? Select project:
  ❯ Create new project
? Project name: my-app
Creating project...
✓ Project "my-app" created

Linked to my-workspace/my-app

Detected git repo: username/my-app (main)
✓ Git connected: username/my-app (main)
Using server: TOSE Cloud
✓ Server assigned

Found 1 .env file(s). Push environment variables? Yes
✓ Pushing 3 variables...
✓ 3 variables pushed

✓ Deploying...
✓ Deployment triggered
  Deployment ID: dep_abc123
  Status: pending
  URL: https://my-app.tose.sh

Stream build logs with: tose logs --build -f
```

That's it. `tose up` handles everything: project creation, Git connection, environment variables, and deployment.

## Step 3: Monitor

### Watch the Build

```bash
$ tose logs --build -f

Step 1/12 : FROM node:18-alpine AS builder
 ---> a1b2c3d4e5f6
Step 2/12 : WORKDIR /app
 ---> Using cache
Step 3/12 : COPY package*.json ./
Step 4/12 : RUN npm ci
 ---> Running in abc123def456
added 834 packages in 12s
Step 5/12 : COPY . .
Step 6/12 : RUN npm run build
...
Successfully built a1b2c3d4e5f6
```

### Check Status

```bash
$ tose status

Project: my-app
Status:  active
Pods:    2/2 ready
  pod-abc-1  Running  restarts=0  age=5m
  pod-abc-2  Running  restarts=0  age=5m
CPU:     1000m
Memory:  2Gi

Latest deployment:
  ID:      dep_abc123
  Version: 1
  Status:  running
  Time:    5m ago
  URL:     https://my-app.tose.sh
```

### Open in Browser

```bash
$ tose open

Opening https://my-app.tose.sh
```

## Step 4: Make Changes

After pushing code changes to GitHub:

```bash
$ tose deploy

✓ Deploying my-workspace/my-app...
✓ Deployment triggered
  Deployment ID: dep_xyz789
  Status: pending
  Commit: a1b2c3d

Stream build logs with: tose logs --build -f
```

## Project Structure

A typical project that works with TOSE:

```
my-app/
├── .git/                    # Git repository
├── .env                     # Environment variables
├── .tose.json               # TOSE project link (created by tose up)
├── Dockerfile               # Docker build instructions
├── package.json             # Dependencies
└── src/
    └── index.js             # Application entry point
```

::: tip No Dockerfile?
If your project doesn't have a Dockerfile, use `tose generate` to create one with AI:

```bash
$ tose generate

Scanning source code...
✓ Language: Node.js | Framework: Express | Package Manager: npm
Generating Dockerfile with AI...
✓ Dockerfile generated and saved
```
:::

## Common Workflows

### Update Environment Variables

```bash
# Set variables directly
tose env set NODE_ENV=production PORT=3000

# Or push from .env file
tose env push .env.production

# Redeploy to apply
tose redeploy
```

### Add a Custom Domain

```bash
tose domain add myapp.com
# Then configure DNS CNAME to point to your-project.tose.sh
```

### Create a Database

```bash
$ tose db create

? Database name: my-app-db
? Database type: PostgreSQL
✓ Database "my-app-db" created
  Connection: postgresql://user:pass@db.tose.sh:5432/my-app-db

# Set connection string as env var
$ tose env set DATABASE_URL=postgresql://user:pass@db.tose.sh:5432/my-app-db
$ tose redeploy
```

### Stop and Restart

```bash
# Stop deployment
tose down

# Restart pods (no rebuild)
tose restart

# Redeploy (same image, new pods)
tose redeploy

# Full deploy (rebuild from latest commit)
tose deploy
```

## What's Next?

- [Commands Overview](/commands/overview) - Full command reference
- [Configuration](/guide/configuration) - Configuration file reference
- [Environment Variables](/guide/environment) - Manage env vars
- [Git Integration](/guide/git) - Git workflow details
- [Dockerfile Examples](/guide/dockerfile) - Dockerfile templates
