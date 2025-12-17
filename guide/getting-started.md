# Getting Started

This guide will walk you through deploying your first application with TOSE CLI.

## Prerequisites

Before you begin, make sure you have:

- [Node.js 14+](/guide/installation#prerequisites) installed
- [TOSE CLI](/guide/installation) installed globally
- A TOSE account with an API key
- A project ready to deploy (optional: with Git repository)

## Step 1: Prepare Your Project

Navigate to your project directory:

```bash
cd /path/to/your/project
```

TOSE CLI works best with projects that have:

- A Git repository initialized (optional but recommended)
- Environment variables in `.env` files (optional)
- A Node.js application running on a specific port

::: tip Git Integration
If your project is connected to a Git repository (GitHub, GitLab, Bitbucket), TOSE CLI will auto-detect it and offer continuous deployment.
:::

## Step 2: Deploy Your Application

Run the deployment command:

```bash
tose up
```

TOSE CLI will guide you through an interactive setup process.

### 2.1 Authentication

If this is your first time, you'll be prompted for your API key:

```
? Enter your TOSE API key: ws_xxxxxxxxxxxxx
```

Your API key will be securely saved to `~/.tose/config.json` for future use.

::: tip Getting Your API Key
You can get your API key from [TOSE Dashboard](https://tose.sh) > Settings > API Keys
:::

### 2.2 Workspace Selection

If you have multiple workspaces, select one:

```
? Select a workspace:
  ❯ My Personal Workspace
    Company Team Workspace
    [Create New Workspace]
```

For single-workspace accounts, this step is skipped automatically.

### 2.3 Project Selection

Choose an existing project or create a new one:

```
? What would you like to do?
  ❯ Create new project
    Select existing project: my-app
    Select existing project: api-server
```

If creating a new project:

```
? Enter project name: my-awesome-app
```

### 2.4 Check Existing Deployment

If the project has an existing deployment, you'll see:

```
✓ Found existing deployment: dep_abc123

Deployment Information:
  ID: dep_abc123
  Status: Running
  URL: https://my-awesome-app.tose.app
  Created: 2 hours ago

? What would you like to do?
  ❯ Redeploy with new configuration
    View existing logs
    Update configuration
    Cancel
```

### 2.5 Git Configuration

TOSE CLI will attempt to auto-detect your Git repository:

```
✓ Detected Git repository: https://github.com/username/my-awesome-app

? Confirm Git repository URL: (Y/n)
```

If not detected or you want to change it:

```
? Enter Git repository URL: https://github.com/username/my-app
```

Supported formats:
- HTTPS: `https://github.com/username/repo.git`
- SSH: `git@github.com:username/repo.git`
- Short: `username/repo`

Select a branch:

```
? Select branch:
  ❯ main
    develop
    feature/new-ui
    [Enter custom branch]
```

::: warning Git Repository Linking
For automatic deployments on Git push, make sure your Git repository is connected to your TOSE workspace in the dashboard.
:::

### 2.6 Port Configuration

Specify the port your application runs on:

```
? Enter application port: (3000)
```

Common ports:
- `3000` - Node.js/React apps (default)
- `8080` - Java/Spring apps
- `5000` - Python/Flask apps
- `4200` - Angular apps

### 2.7 Environment Variables

TOSE CLI will search for `.env` files in your project:

```
✓ Found 3 .env files

? Select .env files to include: (Use <space> to select, <return> to submit)
  ❯◉ .env (5 variables)
   ◯ .env.local (3 variables)
   ◯ .env.production (8 variables)
```

Preview selected variables:

```
Environment Variables Preview (13 total):
  NODE_ENV=production
  API_URL=https://api.example.com
  DATABASE_URL=postgres://... (masked)
  JWT_SECRET=****** (masked)
  PORT=3000
  ... (8 more)
```

::: tip Sensitive Values
TOSE CLI automatically masks sensitive values like passwords, tokens, and API keys in the preview.
:::

### 2.8 Configuration Summary

Review your configuration before deployment:

```
📋 Configuration Summary

Project: my-awesome-app
  ID: prj_xyz789
  Slug: my-awesome-app
  Port: 3000

Git Repository:
  URL: https://github.com/username/my-awesome-app
  Branch: main

Environment Variables:
  13 variables from:
    - .env (5 variables)
    - .env.production (8 variables)

? Proceed with deployment? (Y/n)
```

### 2.9 Deployment

After confirmation, TOSE CLI will:

1. Create or update the project
2. Upload environment variables
3. Link the Git repository
4. Trigger deployment

```
✓ Project created successfully
✓ Environment variables uploaded
✓ Git repository linked
✓ Deployment triggered

🚀 Deployment started!
  ID: dep_new123
  URL: https://my-awesome-app.tose.app

View logs: tose logs --deployment dep_new123
Check status: tose status --project my-awesome-app
```

## Step 3: Monitor Deployment

Check the deployment status:

```bash
tose status
```

Output:

```
Deployment Status

Deployment ID: dep_new123
Status: Building
Created: Just now
URL: https://my-awesome-app.tose.app

Build Progress:
  ✓ Cloning repository
  ⏳ Installing dependencies
  ⏳ Building application
  ⏳ Starting containers
```

## Step 4: View Logs

Stream deployment logs in real-time:

```bash
tose logs
```

Or view last 50 lines:

```bash
tose logs -n 50
```

Example output:

```
[2025-01-15 10:30:15] INFO Cloning repository...
[2025-01-15 10:30:18] INFO Installing dependencies...
[2025-01-15 10:30:45] INFO npm install completed
[2025-01-15 10:30:46] INFO Building application...
[2025-01-15 10:31:20] INFO Build successful
[2025-01-15 10:31:22] INFO Starting application on port 3000
[2025-01-15 10:31:25] INFO Application started successfully
```

## Step 5: Access Your Application

Once deployed, your application is available at:

```
https://[project-slug].tose.app
```

For example:
```
https://my-awesome-app.tose.app
```

::: tip Custom Domains
You can add custom domains in the TOSE Dashboard under Project Settings.
:::

## Common Workflows

### Update Deployment Configuration

To update environment variables or settings:

```bash
tose up
```

Select "Update configuration" when prompted.

### Redeploy Application

To trigger a new deployment:

```bash
tose up
```

Select "Redeploy with new configuration".

### View Status

Quick status check:

```bash
tose status --project my-awesome-app
```

### Stream Logs

Follow logs in real-time:

```bash
tose logs --follow
```

### Stop Deployment

Stop a running deployment:

```bash
tose down
```

## Project Structure Example

Here's a typical project structure that works well with TOSE CLI:

```
my-awesome-app/
├── .git/                    # Git repository
├── .env                     # Development variables
├── .env.production          # Production variables
├── src/
│   ├── index.js            # Application entry point
│   └── ...
├── package.json            # Dependencies
└── README.md
```

## Environment Variables Best Practices

### Organizing .env Files

Use different files for different environments:

```bash
.env                 # Default/development
.env.local          # Local overrides (gitignored)
.env.production     # Production values
.env.staging        # Staging values
```

### Naming Conventions

Use clear, uppercase names:

```bash
# Good
DATABASE_URL=postgres://...
API_KEY=abc123
JWT_SECRET=secret123

# Avoid
db=postgres://...
key=abc123
secret=secret123
```

### Sensitive Values

Keep sensitive data out of Git:

```bash
# .gitignore
.env.local
.env*.local
```

TOSE CLI will mask these automatically:
- `*PASSWORD*`
- `*SECRET*`
- `*TOKEN*`
- `*API_KEY*`
- `*PRIVATE_KEY*`

## Troubleshooting

### Git Repository Not Detected

If Git detection fails:

1. Ensure you're in a Git repository:
   ```bash
   git status
   ```

2. Check remote URL:
   ```bash
   git remote get-url origin
   ```

3. Manually enter the URL when prompted

### API Key Invalid

If your API key doesn't work:

1. Verify it starts with `ws_`
2. Check it's not expired in the dashboard
3. Ensure you copied it completely
4. Try generating a new key

### Deployment Failed

If deployment fails:

1. Check logs for errors:
   ```bash
   tose logs -n 100
   ```

2. Verify environment variables:
   ```bash
   tose up
   # Select "Update configuration"
   ```

3. Check application port is correct

4. Ensure Git repository is accessible

### Port Already in Use

If the port is in use:

```bash
tose up
# Enter a different port when prompted
```

## Next Steps

Now that you've deployed your first application:

- [Learn about all commands](/commands/overview)
- [Configure environment variables](/guide/environment)
- [Set up Git integration](/guide/git)
- [Explore configuration options](/guide/configuration)

## Getting Help

Need assistance?

- View command help: `tose --help`
- Check specific command: `tose up --help`
- Visit [documentation](/)
- Email: tobi@wearetopgroup.com
- [GitHub Issues](https://github.com/tosesh/tose/issues)
