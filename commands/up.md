# tose up

Deploy or manage your application with the `tose up` command.

## Synopsis

```bash
tose up [options]
```

## Description

The `tose up` command is the primary deployment command in TOSE CLI. It handles:

- Creating new projects
- Updating existing projects
- Configuring Git repositories
- Managing environment variables
- Triggering deployments

This is an interactive command that guides you through the entire deployment process.

## Usage

### Basic Usage

```bash
tose up
```

This launches an interactive wizard that will:

1. Authenticate with your API key
2. Select or create a workspace
3. Select or create a project
4. Configure Git repository (optional)
5. Set application port
6. Select environment variable files
7. Review configuration summary
8. Deploy your application

### Example Session

```bash
$ tose up

? Enter your TOSE API key: ws_xxxxxxxxxxxxx
✓ API key validated

? Select a workspace:
  ❯ My Personal Workspace

? What would you like to do?
  ❯ Create new project

? Enter project name: my-api-server

✓ Detected Git repository: https://github.com/username/my-api-server

? Select branch:
  ❯ main

? Enter application port: 3000

? Select .env files to include:
  ❯◉ .env (5 variables)
   ◉ .env.production (8 variables)

📋 Configuration Summary
Project: my-api-server
  Port: 3000
Git Repository: https://github.com/username/my-api-server (main)
Environment Variables: 13 variables

? Proceed with deployment? Yes

✓ Project created successfully
✓ Deployment triggered
🚀 URL: https://my-api-server.tose.app
```

## Options

`tose up` currently has no command-line options. All configuration is done through interactive prompts.

## Workflow Steps

### Step 1: Authentication

If not cached, enter your API key:

```
? Enter your TOSE API key:
```

- API key must start with `ws_`
- Key is saved to `~/.tose/config.json`
- Used for all future commands

### Step 2: Workspace Selection

Select from available workspaces:

```
? Select a workspace:
  ❯ My Personal Workspace
    Company Team
```

- Single workspace is auto-selected
- Workspace ID is cached
- User-scoped keys can list workspaces
- Workspace-scoped keys use implicit workspace

### Step 3: Project Selection

Choose existing project or create new:

```
? What would you like to do?
  ❯ Create new project
    my-existing-app
    api-server
```

For new projects:

```
? Enter project name: my-app
```

Project names:
- Lowercase letters and numbers
- Hyphens allowed
- Used as URL slug: `my-app.tose.app`

### Step 4: Existing Deployment Check

If project has existing deployment:

```
✓ Found existing deployment

? What would you like to do?
  ❯ Redeploy with new configuration
    View existing logs
    Update configuration
    Cancel
```

Options:
- **Redeploy**: Start new deployment with updated config
- **View logs**: Show current deployment logs
- **Update config**: Change settings without redeploying
- **Cancel**: Exit without changes

### Step 5: Git Configuration

Auto-detect or manually enter Git repository:

```
✓ Detected: https://github.com/user/repo

? Confirm Git repository URL: (Y/n)
```

Supported formats:
- `https://github.com/user/repo.git`
- `git@github.com:user/repo.git`
- `user/repo` (GitHub shorthand)
- GitLab and Bitbucket URLs

Select branch:

```
? Select branch:
  ❯ main
    develop
    feature/new-api
```

::: tip Skip Git
Press Enter without selecting to skip Git configuration. You can add it later through the dashboard.
:::

### Step 6: Port Configuration

Enter application port:

```
? Enter application port: (3000)
```

- Default: 3000
- Range: 1-65535
- Must match your app's listen port

Common ports:
- `3000` - Node.js/Express
- `8080` - Spring Boot/Java
- `5000` - Flask/Python
- `4200` - Angular

### Step 7: Environment Variables

Select .env files:

```
✓ Found 3 .env files

? Select .env files:
  ❯◉ .env (5 variables)
   ◉ .env.production (8 variables)
   ◯ .env.local (3 variables)
```

Features:
- Multi-select with Space key
- Shows variable count per file
- Files are merged (later files override earlier)
- Sensitive values masked in preview

Preview:

```
Environment Variables (13 total):
  NODE_ENV=production
  API_URL=https://api.example.com
  DATABASE_URL=****** (masked)
  JWT_SECRET=****** (masked)
```

### Step 8: Configuration Summary

Review before deployment:

```
📋 Configuration Summary

Project: my-app
  ID: prj_abc123
  Slug: my-app
  Port: 3000

Git Repository:
  URL: https://github.com/user/my-app
  Branch: main

Environment Variables:
  13 variables from 2 files

? Proceed with deployment? (Y/n)
```

### Step 9: Deployment

After confirmation:

```
✓ Project created/updated
✓ Environment variables uploaded
✓ Git repository linked
✓ Deployment triggered

🚀 Deployment started
  ID: dep_xyz789
  URL: https://my-app.tose.app

Commands:
  View logs:   tose logs --deployment dep_xyz789
  Check status: tose status --project my-app
```

## Use Cases

### First Deployment

Deploy a brand new application:

```bash
cd /path/to/your-app
tose up
# Select "Create new project"
# Follow prompts
```

### Redeploy After Code Changes

Trigger new deployment:

```bash
cd /path/to/your-app
tose up
# Select "Redeploy with new configuration"
```

### Update Environment Variables

Change env vars without redeploying:

```bash
tose up
# Select "Update configuration"
# Update .env files or selections
```

### Deploy Different Branch

Deploy feature branch:

```bash
tose up
# Enter Git repository URL
# Select feature branch
```

### Deploy Without Git

Deploy without Git integration:

```bash
tose up
# Skip Git repository prompt
# Manual deploys via dashboard
```

## Best Practices

### 1. Commit Before Deploying

Ensure your code is committed:

```bash
git status
git add .
git commit -m "Ready for deployment"
git push
tose up
```

### 2. Review Configuration Summary

Always review before confirming:
- Check port number
- Verify Git branch
- Confirm environment variables

### 3. Use Appropriate .env Files

Select correct files for environment:
- Development: `.env`, `.env.local`
- Production: `.env`, `.env.production`
- Staging: `.env`, `.env.staging`

### 4. Check Status After Deployment

Verify deployment succeeded:

```bash
tose up
# Wait for deployment to start
tose status
```

### 5. Monitor Logs

Watch deployment progress:

```bash
tose up
# In another terminal
tose logs --follow
```

## Troubleshooting

### API Key Not Accepted

If API key validation fails:

```bash
# Remove cached config
rm ~/.tose/config.json

# Try again
tose up
```

### Git Repository Not Detected

If auto-detection fails:

1. Check you're in a Git repository:
   ```bash
   git status
   ```

2. Verify remote exists:
   ```bash
   git remote -v
   ```

3. Manually enter URL when prompted

### Port Validation Error

If port is rejected:

- Must be a number between 1 and 65535
- Check your app actually uses this port
- Verify it's not a reserved port (< 1024 may need privileges)

### Environment File Not Found

If .env files aren't found:

- Check files exist: `ls -la .env*`
- Verify file names match patterns: `.env`, `.env.*`
- Files must be in current directory or subdirectories

### Deployment Doesn't Start

If deployment doesn't trigger:

1. Check Git repository is linked in dashboard
2. Verify Git repository is accessible
3. Check workspace has Git integration enabled
4. Review logs for errors: `tose logs`

## Advanced Usage

### Scripted Deployments

While `tose up` is interactive, you can prepare for automation:

```bash
# Ensure API key is cached
export TOSE_API_KEY="ws_xxxxx"
mkdir -p ~/.tose
echo "{\"apiKey\":\"$TOSE_API_KEY\"}" > ~/.tose/config.json

# Then run (still needs manual project selection)
tose up
```

### Multiple Environment Deployments

Deploy to different environments:

```bash
# Production
cd my-app
tose up  # Select production project, .env.production

# Staging
tose up  # Select staging project, .env.staging
```

### Monorepo Deployments

Deploy multiple services from monorepo:

```bash
# Service 1
cd monorepo/service-1
tose up  # Configure for service-1

# Service 2
cd ../service-2
tose up  # Configure for service-2
```

## Related Commands

- [`tose status`](/commands/status) - Check deployment status after `tose up`
- [`tose logs`](/commands/logs) - View deployment logs
- [`tose down`](/commands/down) - Stop deployment

## Next Steps

After deploying with `tose up`:

1. [Check status](/commands/status) to monitor deployment
2. [View logs](/commands/logs) to see deployment progress
3. [Configure Git](/guide/git) for automatic deployments
4. [Manage environment variables](/guide/environment) for different environments
