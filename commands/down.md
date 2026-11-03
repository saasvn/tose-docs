# tose down / restart

Stop deployments or restart pods.

## tose down

Stop the current deployment.

### Synopsis

```bash
tose down [project] [-y]
```

### Description

Stops the latest active deployment for the specified project. The command finds the most recent deployment and sends a stop signal. Only deployments in stoppable states (running, pending, building, deploying) can be stopped.

Stopping a `running` deployment stops the **whole project**, not only that deployment. See [What Happens When You Stop](#what-happens-when-you-stop).

### Arguments

| Argument | Description |
|----------|-------------|
| `[project]` | Optional. Project slug or `workspace/project` format |

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--yes` | `-y` | Skip confirmation prompt |

### Usage

**Interactive stop with confirmation:**

```bash
$ tose down

Stop deployment for my-workspace/my-app? No
? Confirm: Yes

✓ Stopping deployment...
✓ Deployment stopped
  Deployment dep_abc123 stopped.
```

**Stop specific project:**

```bash
$ tose down my-workspace/my-app

Stop deployment for my-workspace/my-app? Yes
✓ Stopping deployment...
✓ Deployment stopped
  Deployment dep_abc123 stopped.
```

**Skip confirmation:**

```bash
$ tose down -y

✓ Stopping deployment...
✓ Deployment stopped
  Deployment dep_abc123 stopped.
```

### JSON Output

```bash
$ tose down -y --json
```

```json
{
  "success": true,
  "data": {
    "id": "dep_abc123",
    "status": "stopped"
  }
}
```

### What Happens When You Stop

1. Application receives a graceful shutdown signal
2. Active connections are drained
3. Containers are terminated
4. Deployment status changes to `stopped`

Stopping a `running` deployment stops the whole project. In one locked write, every deployment of the project that is `running` or `deploying`, and every one still before deploy (`pending`, `cloning`, `building`, `pushing`), is recorded as `stopped`. The project stays at zero replicas until you deploy again.

- Only deployments created before the stop began are affected. A deploy requested after the stop builds and ships normally.
- A stopped build gets no deploy, no email and no success or failure event.
- Stopping a `deploying` deployment finishes asynchronously. The builder puts back the version that served last, if one exists, otherwise it scales the workload to 0. The deployment can end `running` again, with the reason in `error_message`, if its own image is still the one serving. Run [`tose status`](/commands/status) after a stop to see the final state.
- If the project's workload lock cannot be taken within 60 seconds, the API answers `503 Service Unavailable` with a `Retry-After` header and nothing is stopped. Run `tose down` again after the given delay. A stop answers within about 100 seconds.
- A later redeploy never picks the image of a cancelled rollout.

See [Stop Deployment](/api/reference#stop-deployment) in the API reference.

---

## tose restart

Restart pods without redeploying.

### Synopsis

```bash
tose restart [project]
```

### Description

Restarts all running pods for the project. This does not trigger a new deployment or rebuild - it simply restarts the existing containers. Useful for recovering from transient issues or applying config changes that only require a restart.

### Arguments

| Argument | Description |
|----------|-------------|
| `[project]` | Optional. Project slug or `workspace/project` format |

### Usage

```bash
$ tose restart

✓ Restarting my-workspace/my-app...
✓ Restart initiated
  5 pod(s) restarting
```

**Restart specific project:**

```bash
$ tose restart my-workspace/my-app

✓ Restarting my-workspace/my-app...
✓ Restart initiated
  3 pod(s) restarting
```

### JSON Output

```bash
$ tose restart --json
```

```json
{
  "success": true,
  "data": {
    "restarted_pods": 5
  }
}
```

## down vs restart vs redeploy

| Action | What it does | Use when |
|--------|-------------|----------|
| `tose down` | Stops deployment completely | Maintenance, freeing resources |
| `tose restart` | Restarts pods (same image) | Transient errors, memory leaks |
| `tose redeploy` | Redeploys (same image, new pods) | Config changes |
| `tose deploy` | Full build + deploy | Code changes |

## Recovery After Stop

To bring a stopped deployment back up:

```bash
# Redeploy (no rebuild)
tose redeploy

# Or full deploy (rebuild from latest commit)
tose deploy
```

## Related Commands

- [`tose status`](/commands/status) - Check if deployment is stopped
- [`tose deploy`](/commands/deploy) - Deploy after stopping
- [`tose redeploy`](/commands/deploy#tose-redeploy) - Redeploy without rebuilding
- [`tose logs`](/commands/logs) - View logs before stopping
