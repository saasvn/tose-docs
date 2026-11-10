# tose down / restart

Stop deployments or restart pods.

## tose down

Stop the current deployment.

### Synopsis

```bash
tose down [project] [-y]
```

### Description

Stops the project. If the project has a `running` deployment, `tose down` stops that one, even when a newer build is in progress. This scales the app to zero **and** cancels the project's builds that have not reached deploy (`pending`, `cloning`, `building`, `pushing`). With nothing running, it only cancels the latest build.

After the stop, the CLI re-reads the deployment and the project's deployments and reports the **final** status. It never prints `stopped` for a stop that did not take effect. See [What Happens When You Stop](#what-happens-when-you-stop) and [Exit codes](#exit-codes).

### Arguments

| Argument | Description |
|----------|-------------|
| `[project]` | Optional. Project slug or `workspace/project` format |

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--yes` | `-y` | Skip confirmation prompt. Required without a terminal or with `--json` |

### Usage

**Interactive stop with confirmation:**

```bash
$ tose down

Stop deployment for my-workspace/my-app? No
? Confirm: Yes

✓ Project stopped
  Deployment dep_abc123 is now stopped.
  Builds of this project that had not reached deploy were cancelled too.
```

**Stop specific project:**

```bash
$ tose down my-workspace/my-app

Stop deployment for my-workspace/my-app? Yes
✓ Project stopped
  Deployment dep_abc123 is now stopped.
  Builds of this project that had not reached deploy were cancelled too.
```

**Skip confirmation:**

```bash
$ tose down -y

✓ Project stopped
  Deployment dep_abc123 is now stopped.
  Builds of this project that had not reached deploy were cancelled too.
```

**Project is busy (the CLI retries):**

```bash
$ tose down -y

⠹ Project is busy; retrying the stop in 12s (attempt 1/4)...
✓ Project stopped
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
- If the project's workload lock cannot be taken within 60 seconds, the API answers `503 Service Unavailable` with a `Retry-After` header and nothing is stopped. See [Retries and timeouts](#retries-and-timeouts).
- A later redeploy never picks the image of a cancelled rollout.

See [Stop Deployment](/api/reference#stop-deployment) in the API reference.

### Retries and timeouts

- **503 with `Retry-After`:** nothing was stopped. The CLI waits for the `Retry-After` time (at most 60 seconds, or 5 seconds when the header is absent) and sends the Stop request again, up to 4 attempts in total.
- **Still busy after 4 attempts:** the command fails with `OPERATION_FAILED` (exit code `8`, `retryable: true`). The message says the stop did **not** happen; run `tose down` again in a minute.
- **Timeout:** the CLI waits up to about 100 seconds for the Stop request. If that runs out, it fails with `TIMEOUT` (exit code `7`, `retryable: true`) and the outcome is marked unknown (`details.stop_outcome: "unknown"`). The server may still have finished the stop, so run [`tose status`](/commands/status) before retrying.

### Final status

After the Stop request is accepted, the CLI re-reads the deployment (waiting up to about 30 seconds while it is still `deploying`) and then the project's deployments:

- The deployment is `stopped` and no deployment of the project is `running`: success, exit code `0`.
- The deployment, or another deployment of the project, ended `running` again, for example because a rollout's own image was still serving: the command fails with `OPERATION_FAILED` (exit code `8`) and shows the deployment's `error_message`. It does not claim `stopped`.
- The deployment is still `deploying` after the wait: the command fails with `TIMEOUT` (exit code `7`). Run `tose status` to see the final state.

### Exit codes

| Code | Name | When |
|------|------|------|
| `0` | `SUCCESS` | The project is stopped, or the only build was cancelled |
| `4` | `CONFIRMATION_REQUIRED` | No terminal, or `--json`, without `--yes`. Nothing is sent |
| `5` | `CANCELLED` | You declined the prompt |
| `6` | `NOT_FOUND` | The project has no deployments |
| `7` | `TIMEOUT` | The Stop request timed out (outcome unknown), or the deployment is still `deploying` after the stop |
| `8` | `OPERATION_FAILED` | The project stayed busy after 4 attempts, or the stop ended with a deployment `running` again |

The latest deployment already being `stopped`, `failed` or otherwise finished is not an error: the CLI warns and exits `0` without sending a request. See [Exit codes](/commands/overview#exit-codes) for the full list.

`tose deployment cancel <id>` uses the same retry and final-status check. See [`tose deployment cancel`](/commands/deployment#tose-deployment-cancel).

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
- [`tose deployment cancel`](/commands/deployment#tose-deployment-cancel) - Cancel one build by ID
- [`tose deploy`](/commands/deploy) - Deploy after stopping
- [`tose redeploy`](/commands/deploy#tose-redeploy) - Redeploy without rebuilding
- [`tose logs`](/commands/logs) - View logs before stopping
- [`tose runbook`](/commands/runbook) - Restart or roll back through a plan a person approves
