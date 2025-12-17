# Commands Overview

TOSE CLI provides four main commands for managing your deployments. This page gives you an overview of all available commands and their usage.

## Available Commands

| Command | Description | Common Use Case |
|---------|-------------|-----------------|
| [`tose up`](/commands/up) | Deploy or manage project | Initial deployment, redeployment, config updates |
| [`tose status`](/commands/status) | Check deployment status | Monitor deployment health and progress |
| [`tose logs`](/commands/logs) | View deployment logs | Debug issues, monitor application output |
| [`tose down`](/commands/down) | Stop deployment | Stop running deployments |

## Command Structure

All TOSE CLI commands follow this pattern:

```bash
tose <command> [options]
```

### Global Options

These options work with all commands:

```bash
-V, --version    # Output the version number
-h, --help       # Display help for command
```

## Quick Reference

### Deploy Application

```bash
# Interactive deployment
tose up

# Get help
tose up --help
```

### Check Status

```bash
# Interactive project selection
tose status

# Check specific project
tose status --project my-app

# Check all projects
tose status --all
```

### View Logs

```bash
# Interactive deployment selection
tose logs

# View specific project logs
tose logs --project my-app

# View last 50 lines
tose logs -n 50

# Stream logs in real-time
tose logs --follow

# View specific deployment
tose logs --deployment dep_abc123
```

### Stop Deployment

```bash
# Interactive stop with confirmation
tose down

# Force stop without confirmation
tose down --force

# Stop specific project
tose down --project my-app
```

## Command Workflows

### Initial Deployment Workflow

```bash
# 1. Navigate to your project
cd /path/to/your/project

# 2. Deploy
tose up

# 3. Monitor status
tose status

# 4. View logs
tose logs
```

### Update Configuration Workflow

```bash
# 1. Run up command
tose up

# 2. Select "Update configuration"

# 3. Update env vars or settings

# 4. Check status
tose status
```

### Redeploy Workflow

```bash
# 1. Trigger redeployment
tose up

# 2. Select "Redeploy with new configuration"

# 3. Monitor progress
tose logs --follow
```

### Debug Workflow

```bash
# 1. Check status
tose status --project my-app

# 2. View recent logs
tose logs --project my-app -n 100

# 3. Stream logs if needed
tose logs --project my-app --follow
```

## Interactive vs Flag-Based Usage

TOSE CLI supports both interactive prompts and command-line flags.

### Interactive Mode (Recommended)

Run commands without flags for guided setup:

```bash
tose status
```

The CLI will prompt you to:
1. Select workspace (if multiple)
2. Select project
3. View results

### Flag-Based Mode

Use flags for scripting or quick access:

```bash
tose status --project my-app
tose logs --project my-app -n 50
tose down --project my-app --force
```

## Command Help

Get help for any command:

```bash
# General help
tose --help

# Command-specific help
tose up --help
tose status --help
tose logs --help
tose down --help
```

## Command Aliases

Currently, TOSE CLI doesn't support command aliases, but you can create shell aliases:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias tup='tose up'
alias tstatus='tose status'
alias tlogs='tose logs'
alias tdown='tose down'
```

## Exit Codes

TOSE CLI uses standard exit codes:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid usage/arguments |

Check exit code in scripts:

```bash
tose status
if [ $? -eq 0 ]; then
  echo "Success"
else
  echo "Failed"
fi
```

## Environment Variables

TOSE CLI respects these environment variables:

### `TOSE_API_URL`

Override the default API URL:

```bash
export TOSE_API_URL=https://custom-api.tose.sh
tose up
```

### Standard Variables

- `HOME` - Used for config file location (`~/.tose/`)
- `CI` - Detected in CI environments
- `NO_COLOR` - Disable colored output

## Configuration File

TOSE CLI stores configuration at:

```bash
~/.tose/config.json
```

Example content:

```json
{
  "apiKey": "ws_xxxxxxxxxxxxx",
  "workspaceId": "ws_123456",
  "baseUrl": "https://api.tose.sh"
}
```

To reset configuration:

```bash
rm ~/.tose/config.json
tose up  # Will prompt for API key again
```

## Common Patterns

### CI/CD Integration

Use in your CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Deploy to TOSE
  env:
    TOSE_API_KEY: ${{ secrets.TOSE_API_KEY }}
  run: |
    npm install -g @tosesh/tose
    # Store API key
    mkdir -p ~/.tose
    echo '{"apiKey":"'$TOSE_API_KEY'"}' > ~/.tose/config.json
    # Deploy
    tose up
```

### Automated Status Checks

Monitor deployments:

```bash
#!/bin/bash
# check-status.sh

tose status --project my-app > /tmp/status.txt

if grep -q "Running" /tmp/status.txt; then
  echo "✓ Deployment is running"
  exit 0
else
  echo "✗ Deployment issue detected"
  exit 1
fi
```

### Log Aggregation

Save logs for analysis:

```bash
# Save last 1000 lines
tose logs --project my-app -n 1000 > logs-$(date +%Y%m%d).txt

# Stream to file
tose logs --project my-app --follow >> continuous-logs.txt
```

## Best Practices

### 1. Use Interactive Mode for First-Time Setup

Interactive prompts help you understand options:

```bash
tose up  # Guides you through all options
```

### 2. Use Flags for Automation

Flags work better in scripts:

```bash
tose status --project my-app
```

### 3. Check Status After Deployment

Always verify successful deployment:

```bash
tose up && tose status
```

### 4. Monitor Logs During Deployment

Watch deployment progress:

```bash
tose up
# In another terminal
tose logs --follow
```

### 5. Store API Keys Securely

Don't hardcode API keys:

```bash
# Good: Use environment variables
export TOSE_API_KEY=$(cat ~/.secrets/tose-key)

# Bad: Hardcode in scripts
TOSE_API_KEY="ws_123..."  # Don't do this
```

## Next Steps

Explore each command in detail:

- [tose up](/commands/up) - Complete deployment guide
- [tose status](/commands/status) - Status monitoring
- [tose logs](/commands/logs) - Log viewing and streaming
- [tose down](/commands/down) - Stopping deployments

Or learn about:

- [Configuration](/guide/configuration) - Configure TOSE CLI
- [Git Integration](/guide/git) - Set up Git workflows
- [Environment Variables](/guide/environment) - Manage env vars
