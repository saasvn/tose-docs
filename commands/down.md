# tose down

Stop running deployments.

## Synopsis

```bash
tose down [options]
```

## Description

The `tose down` command stops active deployments. This is useful when you need to:

- Stop a deployment for maintenance
- Free up resources
- Switch to a different deployment
- Troubleshoot issues

::: warning Partially Implemented
The `tose down` command is currently in development. Full API implementation is pending. The command will prompt for confirmation before stopping deployments.
:::

## Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--project <id>` | `-p` | Stop specific project's deployment |
| `--force` | `-f` | Skip confirmation prompt |

## Usage

### Interactive Mode

Stop deployment with confirmation:

```bash
tose down
```

Prompts for:
1. Workspace selection (if multiple)
2. Project selection
3. Confirmation

### Stop Specific Project

```bash
tose down --project my-app
```

### Force Stop Without Confirmation

```bash
tose down --project my-app --force
```

## Example Session

```bash
$ tose down

? Select a workspace:
  ❯ My Personal Workspace

? Select project to stop:
  ❯ my-api-server (Running)
    frontend-app (Running)

Project: my-api-server
  Current Status: Running
  Deployment ID: dep_abc123
  URL: https://my-api-server.tose.app

⚠️  Warning: This will stop all running deployments for this project.

? Are you sure you want to stop this deployment? (y/N)
```

## Use Cases

### Stop for Maintenance

```bash
tose down --project my-app
# Perform maintenance
tose up  # Redeploy when ready
```

### Emergency Stop

```bash
tose down --project my-app --force
```

### CI/CD Cleanup

```bash
# In deployment script
tose down --project staging-app --force
tose up  # Deploy new version
```

### Switch Deployments

```bash
# Stop old deployment
tose down --project old-version

# Deploy new version
cd new-version
tose up
```

## What Happens When You Stop

When a deployment is stopped:

1. **Graceful Shutdown** - Application receives SIGTERM
2. **Connection Draining** - Active connections complete
3. **Container Stop** - Containers are terminated
4. **Resource Cleanup** - Resources are freed
5. **Status Update** - Deployment marked as "Stopped"

Timeout: 30 seconds before forced termination

## Best Practices

### 1. Check Status First

```bash
tose status --project my-app
tose down --project my-app
```

### 2. Use Confirmation in Production

```bash
# Interactive mode asks for confirmation
tose down
```

### 3. Force Only When Necessary

```bash
# Only use --force in scripts or emergencies
tose down --project my-app --force
```

### 4. Redeploy After Maintenance

```bash
tose down --project my-app
# Perform maintenance
tose up
tose status
```

### 5. Monitor After Stopping

```bash
tose down --project my-app
tose status --project my-app
# Verify status shows "Stopped"
```

## Safety Features

### Confirmation Prompt

By default, `tose down` requires confirmation:

```
⚠️  Warning: This will stop all running deployments

? Are you sure? (y/N)
```

### Force Flag

Skip confirmation with `--force`:

```bash
tose down --force
```

::: warning Use Force Carefully
The `--force` flag bypasses confirmation. Use it only in automation or when you're certain.
:::

## Troubleshooting

### Command Hangs

If the command doesn't respond:

- Press Ctrl+C to cancel
- Check network connection
- Verify API key is valid
- Try with `--force` flag

### Deployment Won't Stop

If deployment doesn't stop:

1. Check deployment status:
   ```bash
   tose status --project my-app
   ```

2. Try force stop:
   ```bash
   tose down --project my-app --force
   ```

3. Check dashboard for manual controls

### Already Stopped

If deployment is already stopped:

```
ℹ️ Deployment is already stopped
```

No action needed.

## Alternative Methods

### Via Dashboard

You can also stop deployments from the TOSE dashboard:

1. Log in to dashboard
2. Navigate to project
3. Click "Stop Deployment"
4. Confirm action

### Via API

Direct API call:

```bash
curl -X POST \
  https://api.tose.sh/api/v1/deployments/{id}/stop \
  -H "X-API-KEY: ws_xxxxx"
```

## Recovery After Stop

To restart a stopped deployment:

```bash
# Redeploy
tose up

# Or select "Redeploy" if asked
```

The new deployment will:
- Use latest Git commit (if linked)
- Apply current environment variables
- Start with fresh containers

## Related Commands

- [`tose status`](/commands/status) - Check if deployment is stopped
- [`tose up`](/commands/up) - Redeploy after stopping
- [`tose logs`](/commands/logs) - View logs before stopping

## Future Enhancements

Planned features for `tose down`:

- [ ] Graceful shutdown with custom timeout
- [ ] Stop specific deployment instances
- [ ] Schedule stop for future time
- [ ] Auto-restart option
- [ ] Rollback to previous deployment
- [ ] Bulk stop for multiple projects

## Implementation Status

::: info Development Status
The `tose down` command is currently being finalized. Core functionality works, but full API integration is pending. Expect complete implementation in version 0.1.0.
:::

Current capabilities:
- ✅ Interactive project selection
- ✅ Confirmation prompts
- ✅ Force flag support
- ⏳ Full API integration (pending)
- ⏳ Graceful shutdown (pending)
- ⏳ Status updates (pending)

## Next Steps

After stopping a deployment:

1. [Check status](/commands/status) to verify it stopped
2. [View logs](/commands/logs) if needed for debugging
3. [Redeploy](/commands/up) when ready to restart
