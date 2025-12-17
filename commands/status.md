# tose status

Check the status of your deployments.

## Synopsis

```bash
tose status [options]
```

## Description

The `tose status` command displays the current status of your deployments, including:

- Deployment ID and version
- Current phase (Building, Running, Failed, etc.)
- Creation timestamp
- Project URL
- Health status and replica counts

## Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--project <id>` | `-p` | Check specific project by ID or slug |
| `--all` | `-a` | Show status for all projects |

## Usage

### Interactive Mode

Check status with guided selection:

```bash
tose status
```

Prompts for:
1. Workspace selection (if multiple)
2. Project selection

### Check Specific Project

```bash
tose status --project my-app
```

or by project ID:

```bash
tose status --project prj_abc123
```

### Check All Projects

```bash
tose status --all
```

## Example Output

```
Deployment Status

Project: my-api-server
  Slug: my-api-server
  URL: https://my-api-server.tose.app

Latest Deployment:
  ID: dep_xyz789
  Status: ✅ Running
  Version: v12
  Created: 2 hours ago

Health:
  Replicas: 2/2 healthy
  Uptime: 99.8%
  Last Check: 30 seconds ago
```

## Status Phases

| Phase | Icon | Description |
|-------|------|-------------|
| Pending | ⏳ | Deployment queued |
| Building | 🔨 | Building application |
| Deploying | 🚀 | Deploying containers |
| Running | ✅ | Successfully running |
| Failed | ❌ | Deployment failed |
| Stopped | ⏸️ | Manually stopped |

## Use Cases

### Quick Health Check

```bash
tose status
```

### Monitor After Deployment

```bash
tose up
tose status
```

### CI/CD Integration

```bash
#!/bin/bash
tose status --project my-app

if [ $? -eq 0 ]; then
  echo "Deployment healthy"
else
  echo "Deployment issue detected"
  exit 1
fi
```

### Check Multiple Projects

```bash
tose status --all > status-report.txt
```

## Related Commands

- [`tose up`](/commands/up) - Deploy application
- [`tose logs`](/commands/logs) - View detailed logs
- [`tose down`](/commands/down) - Stop deployment
