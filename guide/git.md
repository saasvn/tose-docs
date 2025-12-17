# Git Integration

Set up Git integration for automatic deployments with TOSE CLI.

## Overview

TOSE CLI integrates with Git repositories to enable:

- **Auto-detection** - Automatically detect Git remote and branch
- **Continuous Deployment** - Deploy on Git push
- **Multiple Providers** - Support for GitHub, GitLab, Bitbucket
- **Branch Selection** - Deploy from any branch
- **URL Flexibility** - HTTPS, SSH, or shorthand formats

## Supported Git Providers

TOSE CLI works with:

- **GitHub** - github.com
- **GitLab** - gitlab.com and self-hosted
- **Bitbucket** - bitbucket.org
- **Generic Git** - Any Git server

## Git Auto-Detection

### How It Works

When you run `tose up`, TOSE CLI automatically:

1. Checks for `.git` directory
2. Reads `git remote get-url origin`
3. Lists available branches
4. Suggests current branch

### Example

```bash
$ tose up

✓ Detected Git repository: https://github.com/username/my-app
✓ Current branch: main

? Confirm Git repository URL: (Y/n)
```

## URL Formats

### HTTPS Format

```bash
https://github.com/username/repo.git
https://gitlab.com/username/repo.git
https://bitbucket.org/username/repo.git
```

### SSH Format

```bash
git@github.com:username/repo.git
git@gitlab.com:username/repo.git
git@bitbucket.org:username/repo.git
```

### GitHub Shorthand

```bash
username/repo
```

Automatically expands to: `https://github.com/username/repo.git`

### Self-Hosted GitLab

```bash
https://gitlab.mycompany.com/team/project.git
git@gitlab.mycompany.com:team/project.git
```

## Branch Selection

### Interactive Selection

```bash
? Select branch:
  ❯ main
    develop
    staging
    feature/new-api
    [Enter custom branch]
```

### Branch Types

- **Main branches** - `main`, `master`
- **Development** - `develop`, `dev`
- **Feature branches** - `feature/*`
- **Release branches** - `release/*`
- **Hotfix branches** - `hotfix/*`

## Manual Git Configuration

### If Auto-Detection Fails

```bash
$ tose up

? Enter Git repository URL: https://github.com/username/my-app
? Select branch: main
```

### Enter Custom Branch

```bash
? Select branch:
  main
  develop
  ❯ [Enter custom branch]

? Enter branch name: feature/new-ui
```

## Linking Repository

### During Deployment

Git repository is automatically linked when you:

1. Provide Git URL during `tose up`
2. Confirm configuration
3. Deploy

```bash
✓ Git repository linked
✓ Deployment triggered
```

### Continuous Deployment

Once linked, pushes to the selected branch trigger automatic deployments.

## Continuous Deployment Setup

### Step 1: Link Repository in Dashboard

1. Log in to [TOSE Dashboard](https://tose.sh)
2. Navigate to **Settings** > **Git Integration**
3. Click **Connect Repository**
4. Authorize TOSE to access your Git provider
5. Select repository

### Step 2: Configure Webhook

TOSE automatically creates a webhook on your repository to listen for push events.

### Step 3: Push to Deploy

```bash
git add .
git commit -m "Update application"
git push origin main

# Deployment triggers automatically
```

### Step 4: Monitor Deployment

```bash
tose logs --follow
```

## Working With Branches

### Deploy Different Branch

```bash
tose up
# Enter repository URL
# Select different branch (e.g., staging)
```

### Deploy Feature Branch

```bash
git checkout -b feature/new-feature
git push origin feature/new-feature

tose up
# Select branch: feature/new-feature
```

### Switch Branch for Project

```bash
tose up
# Select "Update configuration"
# Change branch selection
```

## Multiple Environments

### Development Environment

```bash
# Deploy from develop branch
tose up
# Project: my-app-dev
# Branch: develop
```

### Staging Environment

```bash
# Deploy from staging branch
tose up
# Project: my-app-staging
# Branch: staging
```

### Production Environment

```bash
# Deploy from main branch
tose up
# Project: my-app-prod
# Branch: main
```

## Git Configuration Best Practices

### 1. Use Branches for Environments

```
main → Production
staging → Staging
develop → Development
```

### 2. Protected Branches

Configure protected branches in your Git provider:
- `main` - Require pull request reviews
- `staging` - Require status checks

### 3. Tag Releases

```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

### 4. Commit Before Deploying

```bash
git status  # Check for uncommitted changes
git add .
git commit -m "Ready for deployment"
git push
tose up
```

### 5. Review Before Push

For production:
```bash
# Create pull request
git checkout -b feature/my-feature
git push origin feature/my-feature
# Review → Merge → Auto-deploy
```

## Troubleshooting

### Git Repository Not Detected

```bash
# Check if Git is initialized
git status

# Check remote exists
git remote -v

# If no remote, add one
git remote add origin https://github.com/username/repo.git
```

### Repository Not Accessible

If TOSE can't access your repository:

1. **Public Repository** - Ensure URL is correct
2. **Private Repository** - Link repository in dashboard first
3. **Self-Hosted** - Verify TOSE has network access

### Branch Not Found

If branch doesn't appear:

```bash
# Fetch latest branches
git fetch origin

# Push branch if local only
git push origin my-branch
```

### Webhook Not Working

If deployments don't trigger:

1. Check webhook in repository settings
2. Verify webhook URL is correct
3. Check webhook delivery history
4. Re-link repository in dashboard

### Permission Denied

For SSH URLs:

```bash
# Check SSH key is added to Git provider
ssh -T git@github.com

# If failed, add SSH key to your Git account
```

## Advanced Git Workflows

### Monorepo Support

Deploy specific directories:

```bash
# Not yet supported via CLI
# Configure in dashboard:
# Project Settings → Build → Root Directory
```

### Git Submodules

```bash
# Initialize submodules
git submodule update --init --recursive

# TOSE CLI will detect and use submodules
tose up
```

### Multiple Remotes

```bash
# List remotes
git remote -v

# If multiple remotes, specify origin
git remote set-url origin https://github.com/username/repo.git
```

## Related Topics

- [Getting Started](/guide/getting-started) - Deployment guide
- [tose up](/commands/up) - Deployment command
- [Environment Variables](/guide/environment) - Managing env vars
- [Configuration](/guide/configuration) - CLI configuration
