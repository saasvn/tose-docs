# tose status

Show project status and pod health.

## Synopsis

```bash
tose status [project]
```

## Description

Displays detailed status information for your project, including:

- Project status (active, stopped, etc.)
- Pod health (ready count, individual pod status, restarts, age)
- Resource limits (CPU and memory)
- Latest deployment info with time-ago formatting

## Arguments

| Argument | Description |
|----------|-------------|
| `[project]` | Optional. Project slug or `workspace/project` format |

## Usage

### Check Linked Project

```bash
$ tose status

Project: my-app
Status:  active
Pods:    3/3 ready
  pod-abc-1  Running  restarts=0  age=2h
  pod-abc-2  Running  restarts=0  age=2h
  pod-abc-3  Running  restarts=1  age=1h
CPU:     2000m
Memory:  4Gi

Latest deployment:
  ID:      dep_abc123
  Version: 5
  Status:  running
  Time:    2h ago
  URL:     https://my-app.tose.sh
```

### Check Specific Project

```bash
$ tose status my-workspace/my-app
```

### Minimal Output (No Pods Running)

```bash
$ tose status

Project: my-app
Status:  stopped

Latest deployment:
  ID:      dep_abc123
  Version: 3
  Status:  stopped
  Time:    1d ago
```

## Status Values

| Status | Description |
|--------|-------------|
| `active` | Project is running normally |
| `pending` | Deployment is queued |
| `building` | Docker image is being built |
| `deploying` | Containers are starting up |
| `running` | Application is live and healthy |
| `stopped` | Deployment has been stopped |
| `failed` | Deployment encountered an error |

## JSON Output

```bash
$ tose status --json
```

```json
{
  "success": true,
  "data": {
    "project": {
      "slug": "my-app",
      "status": "active"
    },
    "pods": {
      "ready": 3,
      "total": 3,
      "items": [
        {
          "name": "pod-abc-1",
          "status": "Running",
          "restarts": 0,
          "age": "2h"
        }
      ]
    },
    "resources": {
      "cpu": { "used": "100m", "limit": "2000m" },
      "memory": { "used": "500Mi", "limit": "4Gi" }
    },
    "latestDeployment": {
      "id": "dep_abc123",
      "version": 5,
      "status": "running",
      "service_url": "https://my-app.tose.sh"
    }
  }
}
```

## Use Cases

### Monitor After Deployment

```bash
tose deploy
tose status
```

### CI/CD Health Check

```bash
#!/bin/bash
tose status --json | jq -e '.data.pods.ready == .data.pods.total'
if [ $? -eq 0 ]; then
  echo "All pods healthy"
else
  echo "Unhealthy pods detected"
  exit 1
fi
```

### Check Pod Restarts

If a pod is restarting frequently, it may indicate a crash loop:

```
Pods:    2/3 ready
  pod-abc-1  Running      restarts=0   age=2h
  pod-abc-2  Running      restarts=0   age=2h
  pod-abc-3  CrashLoop    restarts=15  age=2h
```

Check the logs to debug: `tose logs -f`

## Related Commands

- [`tose logs`](/commands/logs) - View logs for debugging
- [`tose deploy`](/commands/deploy) - Trigger a new deployment
- [`tose restart`](/commands/down#tose-restart) - Restart pods
- [`tose open`](/commands/open) - Open project URL
