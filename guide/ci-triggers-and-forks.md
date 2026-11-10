# CI triggers, dispatch and fork approval

This guide covers how a TOSE CI run starts and moves through the scheduler: typed `workflow_dispatch` runs, the run lifecycle and event history, branch concurrency, and the human approval that untrusted fork pull requests need. The full harness reference is [`docs/ci.md`](https://github.com/saasvn/tose-app/blob/master/docs/ci.md) in tose-app.

::: tip Workspace API
Workspace routes live under `/api/workspaces/{slug}/ci`. Paths below are relative to that prefix. They accept a signed-in session or an API key unless stated otherwise, and connected apps use the MCP tools.
:::

## What starts a run

- `push` to a branch, and `pull_request` with action `opened`, `synchronize` or `reopened`.
- `workflow_dispatch`, when `.tose/ci.yml` declares it (see below).
- `manual`, a rerun of a commit the pipeline already recorded.

Branch deletion and tag pushes start nothing. Each GitHub delivery is recorded once, so redeliveries are safe.

## Typed `workflow_dispatch`

Declare typed inputs in `.tose/ci.yml`:

```yaml
version: 1
on:
  push:
    branches: [master]
  workflow_dispatch:
    inputs:
      target: {type: choice, options: [staging, production], default: staging}
      dry_run: {type: boolean, default: true}
```

- An input has a `type` (`string`, the default, `boolean`, `number` or `choice` with `options`) and optional `required`, `default` and `description`.
- At most 10 inputs. Names use lowercase letters, digits and `_`. A string is at most 1024 bytes.
- Each value reaches the job only as the environment variable `TOSE_INPUT_<NAME>`, never inside the shell program, so a value cannot inject commands.
- A job can select this event with `when: {events: [workflow_dispatch]}`. `TOSE_CI_EVENT` is `workflow_dispatch`.

Start a run with the API:

```http
POST /pipelines/{pipeline_id}/dispatch
```

```json
{
  "ref": "main",
  "inputs": {"target": "staging", "dry_run": true},
  "head_sha": "optional recorded push of the branch",
  "idempotency_key": "optional"
}
```

`ref` is required and the call needs the `ci:execute` scope. The run uses the newest push of that branch that TOSE recorded from GitHub (or the given recorded `head_sha`), so an API caller never introduces new code.

- The request is checked against the configuration stored for that commit. An undeclared input, a missing required input or a value of the wrong type is `400` and names `inputs.<name>`. Defaults are applied and the resolved values are shown in the run summary.
- A commit whose configuration is unread, invalid or does not declare `on.workflow_dispatch` is `422 dispatch_not_available`.
- The same `idempotency_key` (body or `Idempotency-Key` header) from the same user returns the first run with `200` and `Idempotent-Replay: true`. Reusing a key for different inputs, a different branch or a different commit is `409 idempotency_conflict`.
- At most 10 manual and dispatch runs of a workspace may be unfinished at once (`429`, `Retry-After: 60`).
- `402 INSUFFICIENT_BALANCE` and `402 CI_BUDGET_CAP_REACHED` apply as for a manual run.

Connected apps use the MCP tool `ci_dispatch` (scope `ci:execute`), which is the same operation with `ref`, optional `head_sha`, `inputs` and `idempotency_key`. Its input values can be strings, booleans or numbers. It reports `INVALID_ARGUMENT`, `DISPATCH_NOT_AVAILABLE` and `IDEMPOTENCY_CONFLICT` for the cases above. `ci_run` starts manual runs only and takes no `ref` or `inputs`.

The dashboard cannot start a `workflow_dispatch` run yet. Use the API or `ci_dispatch`.

A rerun of a `workflow_dispatch` run keeps its event and inputs. Reruns are an operator action (`POST /admin/api/ci/runs/:id/rerun`); a rerun of a fork run needs a new approval.

## Scheduler states and event history

Read exact states with the additive fields. The existing `status`, `event` and `category` fields in REST and MCP responses are unchanged, so existing clients keep working.

| Use this field | When you need to tell apart |
|----------------|-----------------------------|
| `scheduler_status` | `preparing`, `blocked`, `timed_out` and `diagnosis` |
| `trigger_event` | `workflow_dispatch` runs |
| `scheduler_category` | `awaiting_approval` for a fork run waiting for approval |

Run statuses: `queued`, `blocked` (a fork run waiting for approval), `preparing` (handed to the cluster, container not started), `running`, `diagnosis` (every job ended, but one result is unknown and waits for a person), and the final `succeeded`, `failed`, `timed_out`, `cancelled`, `skipped` and `error`. Treat a status you do not know as not finished.

Every status change of a run or job, and every approval and policy change (with who made it), is appended to an append-only event log. Read it with:

```http
GET /runs/{run_id}/events?after=&limit=
```

The scope is `ci:read`, events come oldest first, `limit` is at most 500 and `after` continues from a previous page.

Each job also reports timings in milliseconds (`timings`): `queue`, `setup`, `execution` (the part that is billed) and `cleanup`. A phase that did not happen or is not over is `null`.

## Branch concurrency and newer commits

A newer commit replaces older runs, like `concurrency: cancel-in-progress` on GitHub Actions:

- A `pull_request` run cancels every unfinished run of the same pull request.
- A `push` run cancels only runs of the same branch that have not handed a job to the cluster yet, so a push that is already running finishes.
- Runs of the same commit, `manual` and `workflow_dispatch` runs, and fork pull requests skipped by policy neither replace nor are replaced.
- A cancelled run says "superseded by `<short sha>`". Closing a pull request does not cancel its runs.

A pipeline can also limit how many runs and jobs go at once. Read the policy with `GET /pipelines/{pipeline_id}/policy` (`ci:read`):

```json
{
  "fork_pull_requests": "require_approval",
  "max_concurrent_runs": 3,
  "max_concurrent_jobs": 4,
  "branches": [{"pattern": "main", "max_concurrent_runs": 1}]
}
```

- `max_concurrent_runs: 1` makes a scope a mutex, so two deploys of `main` never overlap. Runs start in the order they were recorded, and a later run never overtakes a waiting earlier one.
- `branches` holds at most 20 glob patterns. Every matching rule must have room. `0` means no limit.
- Policies are set on the server, never by `.tose/ci.yml`. A change applies to runs that have not started yet.

Changing the policy (`PUT /pipelines/{pipeline_id}/policy`) needs a signed-in owner or admin. API keys and connected apps get `403`.

## Fork pull requests need human approval

A pull request from a fork is untrusted code. The server-side `fork_pull_requests` policy decides what happens:

| Policy | Result |
|--------|--------|
| `disabled` (default) | The run is `skipped`. A neutral `tose-ci` check explains why, but only when the base branch configuration runs CI for that pull request. With `require_approval`, a run is blocked only under the same condition. |
| `require_approval` | The run is `blocked` with a `tose-ci` check "Waiting for approval". |

List the runs waiting for approval with `GET /approvals?limit=` (`ci:read`). It returns fork pull request runs that are `blocked` with `approval_state` `pending`, oldest first, with `repo_full_name`, `pr_number` and `base_ref`.

Approving or rejecting a blocked run:

```http
POST /runs/{run_id}/approve
POST /runs/{run_id}/reject
```

```json
{"note": "optional, for reject"}
```

- **Only a workspace member signed in as a person can approve.** An API key or connected app is always refused with `403`, whatever its scopes, so an agent can never approve the code it waits on. A run that is not waiting is `409 not_blocked`.
- An approved run is planned from the **base commit's** configuration. The fork's own `.tose/ci.yml` is never read, so a fork cannot widen its egress or change which jobs and steps run.
- **Approved fork jobs receive no secrets.** There is no checkout token (the commit is fetched anonymously, so only public repositories work), no artifact upload URL and no cache upload URL (caches may still be restored), and the job runtime refuses any secret.
- A rejected run ends `cancelled` without running anything.
- Every run needs its own approval, including a rerun and every new commit of the pull request. A new commit replaces the waiting run.
- Turning the policy off skips fork runs before their first job starts, even approved ones.

::: tip Dashboard
Owners and admins edit the policy in **Policies** on the pipeline page; members see it read-only. Waiting fork runs are listed on the **Approvals** tab (`/w/{slug}/ci/approvals`), where any member approves or rejects them.
:::

## Audit and access

- Every `POST`, allowed or denied, is recorded in the workspace audit log (`ci.execute`).
- A runtime-bound API key cannot use CI routes.
- Pipelines are created and changed by an operator, not from the workspace API.
