# Recovery runbooks

A recovery runbook restarts a project, or puts an earlier image back, in three steps: a read-only **plan** of what is live now, a person's **approval** of that exact plan, then one **idempotent execution**. The REST API and the MCP connector use the same service, so the rules below hold for both.

Two runbooks exist: `restart` (rolling restart of the live pods) and `rollback` (an earlier deployment's image goes live again). Scale and restore are not available yet; see [What is not covered](#what-is-not-covered).

The older routes `POST .../restart` and `POST .../deployments/{id}/rollback`, and the MCP tool `rollback_deployment` (see the [MCP connector](/mcp)), keep working and do not go through runbooks.

## The flow

| Step | REST | MCP tool | Who |
|------|------|----------|-----|
| 1. Plan | `POST /api/workspaces/{slug}/projects/{project_slug}/runbooks/restart`, or `.../runbooks/rollback` with `{"deployment_id": "..."}` | `plan_runbook` | Owner or admin; an API key or connection with the deployment scope |
| 2. Approve | `POST .../runbooks/{plan_id}/approve` with `{"plan_hash": "..."}`, or the approval page `/oauth/runbooks/{plan_id}` | none | A **signed-in** owner or admin only |
| 3. Execute | `POST .../runbooks/restart/{plan_id}/execute` or `.../rollback/{plan_id}/execute`, with an `Idempotency-Key` header | `execute_runbook` with `idempotency_key` | The credential that planned it, or a signed-in owner or admin |
| Read | `GET .../runbooks` and `GET .../runbooks/{plan_id}` | `get_runbook` | Anyone with read access to deployments |

`POST .../runbooks/{plan_id}/reject` closes a pending plan, or withdraws an approval that has not run. A rejected plan never runs.

### 1. Plan

Planning reads the live Deployment and the project's disk claims and stores an immutable plan. Nothing in the cluster changes. The plan contains:

- the target: namespace, Deployment, current image, desired replicas and the live deployment record;
- every disk claim mounted in the live pods, with its size and mounts;
- health evidence: desired, ready, updated and available replicas, and whether the last rollout finished;
- the expected effect, the data effect, the rollback path, how the result is verified, and warnings.

The response carries a `plan_hash`, a SHA-256 of the plan. Show the plan to the person who will approve it.

### 2. Approve

Approval needs a signed-in workspace owner or admin. API keys and connected apps are refused with `403` whatever their scopes, and no MCP tool approves, so an agent can never approve the plan it is waiting for. The approver sends the plan's `plan_hash`, which proves they reviewed exactly the stored plan. Approving an approved plan again returns it unchanged.

Over MCP, `plan_runbook` returns an `approval_url`. Open it in a browser where you are signed in. Any signed-in owner or admin of the workspace may approve there, not only the person who connected the agent.

### 3. Execute

Send a unique `Idempotency-Key` (8 to 128 characters from `A-Za-z0-9._:-`) and reuse it on every retry. A retry with the same key returns the first run, with the header `Idempotent-Replayed: true` over REST and `replayed` in the body, and never acts again, even after a crash. Another key for a plan that already ran is refused with `PLAN_ALREADY_EXECUTED`, and a key already used for another plan with `IDEMPOTENCY_KEY_REUSED`.

The call returns `200` for every recorded run. Read `execution.status`:

| `execution.status` | Meaning |
|--------------------|---------|
| `completed` | TOSE observed the planned state in the cluster. |
| `pending_verification` | The change was applied but the cluster has not reached the planned state yet. See [Pending verification](#pending-verification). |
| `started` | The change was requested and its outcome is not observed yet. |
| `failed` | See `execution.detail` for the reason. |

The plan's own `status` moves one way: `pending`, then `approved` or `rejected`, then `executed`.

## Plans that expire or go stale

- **Expired plan.** A plan lives for 30 minutes. If it is not approved and run before `expires_at`, approving or executing returns `PLAN_EXPIRED`. Nothing changed. Make a new plan.
- **Stale plan.** When you execute, TOSE compares the live target with the plan: Deployment identity and generation, image, desired replicas, the live deployment record, and the disk claims and their mounts. If any of them changed since planning, for example a deploy landed while the plan waited, the run is refused with `PLAN_STALE` and nothing changes. Make a new plan and approve it again. Replica health may change while a plan waits and does not make it stale.
- **Hash mismatch.** Approving with a `plan_hash` that does not match the stored plan returns `PLAN_HASH_MISMATCH`. Reload the plan and review it again.
- **Closed plan.** A plan that was rejected, or already ran, answers `PLAN_REJECTED` or `PLAN_CLOSED`. A plan that is not approved yet answers `APPROVAL_REQUIRED`.

## Insufficient balance for a rollback

A rollback needs a funded wallet. While the workspace balance is zero or negative, planning a rollback returns `402 INSUFFICIENT_BALANCE`, so you are never asked to approve a plan that cannot run, and executing an approved rollback is refused the same way. Top up the wallet on the dashboard billing page and plan again. A restart is not checked against the wallet. See [When the balance is zero](/guide/pricing#when-the-balance-is-zero).

## Your data stays where it is

Both runbooks update the existing Deployment in place. A rollback changes the image only and leaves the live disk mounts and the replica count unchanged. A runbook never creates, replaces or deletes a disk. If a disk the project records is missing or unavailable in the cluster, planning is refused with `VOLUME_MISSING` instead of starting the project with an empty volume. After a run, verification fails if a disk claim changed identity or mount. See [Persistent Disks](/guide/persistent-disks).

A rollback does not restore your database: migrations that already ran stay applied. The earlier image runs with the live Deployment's current environment variables and resources, and edits you made on the dashboard but have not deployed are applied on the next regular deploy. The plan lists these as warnings.

## Pending verification

`completed` is reported only after TOSE sees the controller observe the rollout, every desired replica ready and available, and the same disk identities and mounts. If the cluster's answer was ambiguous, or the execution marker is not visible after two minutes, the run stays `pending_verification`.

Poll `GET .../runbooks/{plan_id}` (or call `get_runbook`). Every read checks the cluster again, so the status moves to `completed` or `failed` by itself. Do not execute again: a retry with the same key returns the same run and never reapplies the plan.

## Receipt after a verified rollout

When a rollback is verified, `execution.result_deployment_id` names the deployment record that carries the rollback receipt. It is empty before verification and for a restart, so read the receipt only after `execution.status` is `completed`. The deployment can then be inspected like any other, for example with `inspect_deployment`.

## Permissions

| Action | Policy action | Needs |
|--------|---------------|-------|
| Plan or run a restart | `deployment.execute` | Owner or admin; scope `deployments:execute` or `deployments:write` |
| Plan or run a rollback | `deployment.rollback` | Owner or admin; scope `deployments:rollback` (over MCP the tools also need `deployments:execute` or `deployments:write`) |
| Read plans | `deployment.read` | Any member with deployment read access |
| Approve or reject | `runbook.approve` | A signed-in owner or admin; sessions only |

Every request, including refusals, is written to the [audit log](/api/audit). The execution is recorded before the cluster is touched, with the route `runbook.<kind>.execute` and the outcome `started`.

## Errors

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `INVALID_ARGUMENT` | `deployment_id` is missing for a rollback, or was sent for a restart. |
| 400 | `INVALID_IDEMPOTENCY_KEY` | The `Idempotency-Key` is missing or not 8 to 128 characters from `A-Za-z0-9._:-`. |
| 400 | `NO_IMAGE` | The rollback target has no built image. |
| 402 | `INSUFFICIENT_BALANCE` | The wallet is empty; a rollback is refused. |
| 403 | `HUMAN_APPROVAL_REQUIRED` | An API key or connected app tried to approve or reject. |
| 403 | `FORBIDDEN`, `INSUFFICIENT_SCOPE` | Wrong role, missing scope, or another credential than the one that planned the run. |
| 404 | `NOT_FOUND` | Unknown project, deployment or plan. |
| 409 | `NO_WORKLOAD`, `NOT_RUNNING` | The project has no live workload, or is scaled to zero. Deploy or start it first. |
| 409 | `DEPLOY_IN_PROGRESS` | A deployment is still running. Wait for it. |
| 409 | `ALREADY_LIVE` | The rollback target's image is already live. |
| 409 | `VOLUME_MISSING` | A recorded disk claim is missing or unavailable. |
| 409 | `PLAN_HASH_MISMATCH`, `PLAN_EXPIRED`, `PLAN_CLOSED`, `PLAN_REJECTED`, `APPROVAL_REQUIRED`, `PLAN_STALE` | See [Plans that expire or go stale](#plans-that-expire-or-go-stale). |
| 409 | `PLAN_ALREADY_EXECUTED`, `IDEMPOTENCY_KEY_REUSED` | See [Execute](#_3-execute). |
| 409 | `CONFLICT`, `WORKLOAD_UPDATE_REFUSED` | Another operation holds the project, or Kubernetes refused the update. Try again. |
| 503 | `UNAVAILABLE` | The cluster or lock could not be reached. Nothing changed. |

## What is not covered

- Scale and restore runbooks are not available. A future restore will go into a new claim or a paused workload and never replace your existing disk.
- There is no dashboard list of plans yet. Approve with a signed-in session (dashboard cookie or CLI login) or on `/oauth/runbooks/{plan_id}`.
- The approval page proves that a browser signed in as an owner or admin submitted the form, not that a person did. Do not sign in to TOSE in a browser an agent controls.
- Verification against a live production cluster is tracked separately. Treat the observed `execution.status` as the source of truth, not the plan.
