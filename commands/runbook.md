# tose runbook

Plan, review and run a recovery runbook: a restart, or a rollback to an earlier deployment's image. A person approves each plan in the browser before it can run.

`tose runbook` uses the API's plan, approve, execute flow. [`tose restart`](/commands/down#tose-restart) and [`tose deployment rollback`](/commands/deployment#tose-deployment-rollback) keep working unchanged.

| Command | What it does | Changes anything? |
|---------|--------------|-------------------|
| `tose runbook plan restart [project]` | Read-only plan of the live workload | No |
| `tose runbook plan rollback <deployment_id> [project]` | Plan a return to an earlier deployment's image | No |
| `tose runbook list [project] [--limit <n>]` | Recent plans and their state (`--limit` is 1 to 50) | No |
| `tose runbook show <plan_id> [project]` | One plan, its state and what to do next | No |
| `tose runbook execute <plan_id> [project]` | Run an approved plan once | Yes |

## The flow

```bash
$ tose runbook plan rollback dep_abc123      # 1. Make a plan (nothing changes)
# 2. A signed-in owner or admin opens approval_url and approves the exact plan
$ tose runbook execute <plan_id> --wait      # 3. Run it once and wait for the verified result
```

## Approval is a person's step

A signed-in owner or admin approves the exact plan in the browser, using the `approval_url` in the output. The CLI and API keys cannot approve.

Running `execute` on a plan that is not approved sends nothing and exits with code `4` (`HUMAN_APPROVAL_REQUIRED`). The error carries the `approval_url`.

## Plan states

| State | Meaning |
|-------|---------|
| `awaiting_approval` | Waiting for a person to approve in the browser |
| `approved` | Approved, not run yet |
| `expired` | The plan passed its 30-minute life before it ran |
| `rejected` | A person rejected it. It never runs |
| `pending_verification` | Applied, but the cluster has not confirmed the rollout yet |
| `completed` | Applied and verified: every replica is ready |
| `failed` | Applied, but verification failed |

## Stale plans

A plan lives 30 minutes and is bound to the live image, replicas, deployment and disks. If it expires, `execute` fails with `PLAN_STALE`. If the target changed, the API refuses it with `PLAN_STALE` too. A rejected plan fails with `PLAN_CLOSED`. All of these change nothing. Make a new plan; the error suggests the command.

## tose runbook execute

```bash
tose runbook execute <plan_id> [project] [--wait] [--timeout <duration>] [--idempotency-key <key>]
```

| Option | Description |
|--------|-------------|
| `--wait` | Wait until the cluster verifies the rollout |
| `--timeout <duration>` | How long `--wait` may take, such as `90s` or `5m`. Default `5m` |
| `--idempotency-key <key>` | Override the key (8 to 128 characters) |

### One idempotency key per plan

`execute` sends one key per plan, `cli-runbook-<plan_id>` unless you pass `--idempotency-key`, on every retry and every re-run. A plan is applied at most once: a repeat returns the first run and prints that it already ran. Network failures and `502`, `503` and `504` answers are retried with that same key.

### Pending verification

If the cluster has not confirmed the rollout, the result is state `pending_verification`. With `--wait` the CLI keeps polling, and exits with code `7` (`TIMEOUT`) if `--timeout` runs out. The plan was still applied once and is never applied again. Check later with `tose runbook show <plan_id>`.

A runbook that fails verification exits with code `8` (`OPERATION_FAILED`).

### Rollback receipt

For a rollback, `receipt` (the deployment that carries it) appears only after the rollout is verified. Before that, and after a failure, it is `null`.

## Related Commands

- [`tose deployment rollback`](/commands/deployment#tose-deployment-rollback) - Direct rollback with `--yes`
- [`tose restart`](/commands/down#tose-restart) - Direct restart
- [`tose status`](/commands/status) - Find deployment IDs and check health
- [Agent access](/mcp/agent-access) - Approvals for agents
