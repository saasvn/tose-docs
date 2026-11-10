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
- Resource limits (CPU and memory), plus the per-Pod process (PID) limit when the operator has declared one
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

### Process limit line

When the operator of your TOSE deployment has declared a per-Pod process (PID) limit, the text output adds a line after `Memory:`:

```
CPU:     2000m
Memory:  4Gi
PIDs:    4096 per Pod (operator-declared, shared by the Pod's containers; not verified live)
```

- **Operator-declared, not verified.** The number is a value the operator configured, not a live reading from the nodes.
- **Shared by the whole Pod.** The project container and all sidecars count against the same budget; it is not a per-container limit.
- **No line means unknown, not unlimited.** If the `PIDs:` line is missing, TOSE does not know the limit. Do not read that as "no limit".
- **Older servers.** A server that does not send the field leaves the line out, and the CLI prints nothing extra.
- **Not a guarantee.** TOSE does not enforce this limit yet, so do not rely on it to contain a runaway process.

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
      "memory": { "used": "500Mi", "limit": "4Gi" },
      "pids": { "limit": 4096 }
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

`resources.pids.limit` appears only when the operator has declared a per-Pod PID limit. When the field is absent the limit is unknown, not unlimited. See [Process limit](#process-limit-line) and the [Projects API](/api/projects#status).

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
