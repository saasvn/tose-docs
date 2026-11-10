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
- Resource limits (CPU and memory) of the project's own container, plus the per-Pod process (PID) limit when the operator has declared one
- With [sidecars](/guide/project-sidecars): every container of each pod (readiness, restarts, state and reason such as `CrashLoopBackOff`), the per-replica total, and the saved sidecar settings
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

### Project with Sidecars

`CPU` and `Memory` stay the project container's own limits. `pod total` is one replica including its sidecars, the amount billed per replica. A pod counts as ready only when all of its containers are. Saved sidecars are configuration that applies at the next deployment; the container rows show what runs.

```bash
$ tose status

Pods:    0/1 ready
  pod-abc-1  Running  restarts=3  age=5m
    - my-app  ready  state=running  restarts=0
    - otel-collector  not ready  state=waiting (CrashLoopBackOff)  restarts=3
CPU:     0.5  (project container; pod total 0.75 incl. sidecars, billed per replica)
Memory:  1  (project container; pod total 1.25 GB incl. sidecars, billed per replica)

Saved sidecars: (apply at the next deployment)
  otel-collector: 0.25 vCPU / 0.25 GB, ghcr.io/acme/collector:1.4@sha256:…
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
      "cpu": { "limit": "2", "pod_total": "2" },
      "memory": { "limit": "4", "pod_total": "4" }
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

### Process limit {#process-limit-line}

When the operator of your TOSE deployment has declared a per-Pod process (PID) limit, the text output adds a line after `Memory:`, and `tose status --json` includes it as `data.resources.pids.limit`:

```
CPU:     2000m
Memory:  4Gi
PIDs:    4096 per Pod (operator-declared, shared by the Pod's containers; not verified live)
```

- **Operator-declared, not verified live.** The operator reports the number only after the runtime nodes enforce it (kubelet `podPidsLimit`). TOSE does not set or enforce it itself, and it does not read it back from the nodes.
- **Shared by the whole Pod.** The project container and all sidecars count against the same budget; it is not a per-container limit.
- **No line means unknown, not unlimited.** If the `PIDs:` line is missing, TOSE does not know the limit.
- **Older servers** do not send the field, and the CLI prints nothing extra.

See [Process limit](/api/projects#process-limit) in the Projects API.

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
