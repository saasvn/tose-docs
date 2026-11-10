# Recovery runbooks

A recovery runbook restarts a project, puts an earlier image back, changes its replica count or restores a database from a backup. It always takes three steps: a read-only **plan** of what is live now, a person's **approval** of that exact plan, then one **idempotent execution**. The REST API, the dashboard and the MCP connector use the same service, so the rules below hold for all of them.

Four runbooks exist:

| Runbook | What it does | Approving needs a recent sign-in |
|---------|--------------|----------------------------------|
| `restart` | Rolling restart of the live pods | No |
| `rollback` | An earlier deployment's image goes live again | Yes |
| `scale` | Changes the replica count of the live Deployment | No |
| `restore` | Applies a completed backup to a managed database, after backing up its current data | Yes |

See [Scale](#scale) and [Restore a database](#restore-a-database) for the rules that are specific to them, and [What is not covered](#what-is-not-covered) for what is still missing.

The older routes `POST .../restart` and `POST .../deployments/{id}/rollback`, and the MCP tool `rollback_deployment` (see the [MCP connector](/mcp)), keep working and now run through a runbook. A rollback through them needs the same recent sign-in, and an API key's call is planned and answers `409 APPROVAL_REQUIRED` until a person approves.

## The flow

| Step | REST | MCP tool | Who |
|------|------|----------|-----|
| 1. Plan | `POST /api/workspaces/{slug}/projects/{project_slug}/runbooks/{kind}`: nothing for `restart`, `{"deployment_id": "..."}` for `rollback`, `{"replicas": 3}` for `scale`, `{"database_id": "...", "backup_id": "..."}` for `restore` | `plan_runbook` (not `restore`, see [Permissions](#permissions)) | Owner or admin; an API key or connection with the runbook's scope |
| 2. Approve | `POST .../runbooks/v2/plans/{plan_id}/approve` with `{"plan_hash": "..."}`, the dashboard **Runbooks** page, or the approval page `/oauth/runbooks/{plan_id}` | none | A **signed-in** owner or admin only |
| 3. Execute | `POST .../runbooks/{kind}/{plan_id}/execute` with an `Idempotency-Key` header, or **Run now** on the dashboard | `execute_runbook` with `idempotency_key` | The credential that planned it, or a signed-in owner or admin |
| Read | `GET .../runbooks/v2/plans` and `GET .../runbooks/v2/plans/{plan_id}` | `get_runbook` | Anyone with read access to deployments |

`POST .../runbooks/v2/plans/{plan_id}/reject` closes a pending plan, or withdraws an approval that has not run. A rejected plan never runs. The earlier `.../runbooks`, `.../runbooks/{plan_id}`, `.../approve` and `.../reject` routes keep answering for restart and rollback only; use the `v2/plans` routes to list, read, approve or reject any of the four kinds.

On the dashboard, open a project's **Runbooks** page. It has a form for each kind, lists the plans, shows the selected plan with its effect, data effect, warnings and execution, and offers **Approve this plan**, **Reject** and **Run now**. A running plan refreshes every five seconds.

### 1. Plan

Planning reads the live Deployment and the project's disk claims and stores an immutable plan. Nothing in the cluster changes. The plan contains:

- the target: namespace, Deployment, current image, desired replicas and the live deployment record;
- every disk claim mounted in the live pods, with its size and mounts;
- health evidence: desired, ready, updated and available replicas, and whether the last rollout finished;
- for a scale: the replica change, the plan's replica limit, the estimated compute cost per hour before and after, and the wallet balance with the hours it covers at the new size;
- for a restore: the database, and the backup with its file, size, SHA-256 and time, plus the engine's warning;
- the expected effect, the data effect, the rollback path, how the result is verified, whether the runbook is destructive, and warnings.

The response carries a `plan_hash`, a SHA-256 of the plan. Show the plan to the person who will approve it.

### 2. Approve

Approval needs a signed-in workspace owner or admin. API keys and connected apps are refused with `403` whatever their scopes, and no MCP tool approves, so an agent can never approve the plan it is waiting for. The approver sends the plan's `plan_hash`, which proves they reviewed exactly the stored plan. Approving an approved plan again returns it unchanged.

A rollback or a restore is destructive, so approving it also needs a recent sign-in: see [Sign in again to approve a rollback or restore](#sign-in-again-to-approve-a-rollback-or-restore).

Over MCP, `plan_runbook` returns an `approval_url`. Open it in a browser where you are signed in. Any signed-in owner or admin of the workspace may approve there, not only the person who connected the agent.

### 3. Execute

Send a unique `Idempotency-Key` (8 to 128 characters from `A-Za-z0-9._:-`) and reuse it on every retry. A retry with the same key returns the first run, with the header `Idempotent-Replayed: true` over REST and `replayed` in the body, and never acts again, even after a crash. Another key for a plan that already ran is refused with `PLAN_ALREADY_EXECUTED`, and a key already used for another plan with `IDEMPOTENCY_KEY_REUSED`.

The call returns `200` for every recorded run. Read `execution.status`:

| `execution.status` | Meaning |
|--------------------|---------|
| `completed` | TOSE observed the planned state in the cluster. For a database restore it means PostgreSQL and pgvector were verified through the Service, or, for MySQL and MongoDB, that the restore command finished without an error; see [Restore a database](#restore-a-database). |
| `pending_verification` | The change was applied but the cluster has not reached the planned state yet. See [Pending verification](#pending-verification). |
| `started` | The change was requested and its outcome is not observed yet. A database restore stays here while its worker runs. |
| `failed` | See `execution.detail` for the reason. For example `WORKLOAD_UPDATE_REFUSED` means Kubernetes refused the update. The plan is spent: make a new plan. Retrying with the same key returns the same failed run, and another key gets `PLAN_ALREADY_EXECUTED`. |

For a rollback the plan is spent as soon as it runs. For a restore, the run also records `execution.pre_restore_backup_id`. See [Reading the execution state](#reading-the-execution-state) for what to do in each state.

The plan's own `status` only moves forward: `pending` to `approved` or `rejected`, and `approved` to `executed` or `rejected`.

## Plans that expire or go stale

- **Expired plan.** A plan lives for 30 minutes. If it is not approved and run before `expires_at`, approving or executing returns `PLAN_EXPIRED`. Nothing changed. Make a new plan.
- **Stale plan.** When you execute, TOSE compares the live target with the plan: Deployment identity and generation, image, desired replicas, the live deployment record, and the disk claims and their mounts (for a restore: the database and the backup, that is its status, file, size and checksum). If any of them changed since planning, for example a deploy landed while the plan waited, the run is refused with `PLAN_STALE` and nothing changes. Make a new plan and approve it again. Replica health may change while a plan waits and does not make it stale.
- **Hash mismatch.** Approving with a `plan_hash` that does not match the stored plan returns `PLAN_HASH_MISMATCH`. Reload the plan and review it again.
- **Closed plan.** A plan that was rejected, or already ran, answers `PLAN_REJECTED` or `PLAN_CLOSED`. A plan that is not approved yet answers `APPROVAL_REQUIRED` over REST and `APPROVAL_PENDING` over MCP, with the approval URL in the message.

## Sign in again to approve a rollback or restore

Approving a rollback or a restore needs a sign-in within the last 15 minutes. A session that signed in earlier, or that was revoked or has expired, is refused with `403 REAUTHENTICATION_REQUIRED`. Refreshing an access token keeps the session's original sign-in time, so only a new sign-in passes. Restart and scale approvals do not need it.

A plan's view carries `step_up_required`. The dashboard then shows a **Sign in again** link that returns to the plan, and the `/oauth/runbooks/{plan_id}` page hides the approve button behind the same link. This stops an agent that holds an old session from approving a destructive plan on its own. It does not stop one that can complete a sign-in, so do not sign in to TOSE in a browser an agent controls.

## Insufficient balance for a rollback

A rollback needs a funded wallet. While the workspace balance is zero or negative, planning a rollback returns `402 INSUFFICIENT_BALANCE`, so you are never asked to approve a plan that cannot run, and executing an approved rollback is refused the same way. Top up the wallet on the dashboard billing page and plan again. A restart is not checked against the wallet; a scale up has its own check, see [Scale](#scale). See [When the balance is zero](/guide/pricing#when-the-balance-is-zero).

## Scale

A scale plan changes only the replica count of the live Deployment.

- **Limits.** From 1 to 10 replicas. Scaling to zero is not a scale: stop the project instead. Asking for the replica count it already has is refused with `NO_CHANGE`, and a project that is not running with `NOT_RUNNING`.
- **A persistent disk limits a project to one replica.** A disk attaches to one pod, so a project with a persistent disk runs exactly one replica and a plan for more is refused with `REPLICA_LIMIT`. See [Persistent Disks](/guide/persistent-disks).
- **Scale up is prepaid.** Planning and running a scale up needs a wallet that covers at least one hour at the new size, otherwise `402 INSUFFICIENT_BALANCE`. The plan shows the compute cost per hour before and after, and how many hours the wallet covers. Compute stays prepaid: when the wallet runs out the project is stopped, so top up before you scale up. Scaling down needs no balance. See [When the balance is zero](/guide/pricing#when-the-balance-is-zero).
- **No pod is replaced.** Only `spec.replicas` changes and the pod template is untouched, so running pods keep running. TOSE writes the plan ID to the Deployment's `tose.sh/runbook-scale` annotation and reports `completed` only after it sees that annotation and the planned count, with every replica ready and available and the same disks. The project's stored replica count, which billing reads and the next deploy uses, follows when the change is applied.

Plan a scale up and a scale down the same way:

```bash
curl -X POST "$TOSE_API_URL/api/workspaces/$WORKSPACE/projects/$PROJECT/runbooks/scale" \
  -H "X-API-Key: $TOSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"replicas": 3}'
```

The response is `201` with the plan, its `plan_hash` and the cost. After a person approves, run it with `POST .../runbooks/scale/{plan_id}/execute` and an `Idempotency-Key`.

## Restore a database

A restore plan applies a completed backup to a managed database. It is destructive, so a person approves it with a recent sign-in, and executing it never writes over the database before its current data is saved.

```bash
curl -X POST "$TOSE_API_URL/api/workspaces/$WORKSPACE/projects/$PROJECT/runbooks/restore" \
  -H "X-API-Key: $TOSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"database_id": "<database_id>", "backup_id": "<backup_id>"}'
```

Take `backup_id` from `GET /api/workspaces/{slug}/databases/{db_id}/backups`; it must be a completed backup of that same database.

### A backup of the current data is taken first

Executing a restore first takes a new backup of the database's current data (dump, encrypt, upload, store a `completed` backup row). Only then is the selected backup applied. The run records that backup as `execution.pre_restore_backup_id`, and it is listed with the database's backups, so you can restore it the same way to undo the restore. If the backup cannot be taken and stored, the run fails with `PRE_RESTORE_BACKUP_FAILED` and the database is not changed.

### Refusals

| Code | When |
|------|------|
| `BACKUPS_UNAVAILABLE` (503) | Backup storage is not configured. |
| `DATABASE_NOT_ACTIVE` | The database is not active. |
| `UNSUPPORTED` | The engine has no restore command. PostgreSQL, pgvector, MySQL and MongoDB are supported; Redis is not. |
| `BACKUP_NOT_READY`, `NOT_FOUND` | The backup is not completed, or is not a backup of that database. |
| `RESTORE_IN_PROGRESS` | Another restore of the same database is running. A database lock refuses a second one. |

### Reasons a restore run fails

The execute call answers `200` with `execution.status: started` and the work continues in the background, so these show up as a `failed` run with the code in `execution.detail`, not as an HTTP error:

- `PRE_RESTORE_BACKUP_FAILED`: the backup of the current data could not be stored. The database is unchanged.
- `CHECKSUM_MISMATCH`: the backup does not match its recorded SHA-256. It is checked when the backup is read during the run, and the backup is not applied.
- `RESTORE_FAILED`: applying the backup did not finish. For MySQL and MongoDB the database may be partly restored; the pre-restore backup is the way back.

### PostgreSQL and pgvector

TOSE replays the dump in an isolated pod, then switches the database over to the result.

1. **Isolated replay.** The stock dump is replayed and validated in a separate pod that uses the running database's image digest. Its temporary volume has no connection to the live database or its storage.
2. **Temporary storage and free space.** The live volume must have free space for a second data directory, with headroom left for normal writes. Storage that cannot support this, or a cluster where network isolation is not available, makes the preparation fail before the cutover.
3. **Failure before cutover is harmless.** A replay or transfer failure leaves the original database serving from its existing directory.
4. **Restart at cutover.** The cutover restarts the database on the prepared directory. The existing Service and volume stay, so connection details do not change, and expect a short outage while it restarts.
5. **The original directory is kept.** The previous data directory is retained after the cutover.

Pause writes before you start. Writes made after the chosen backup are not part of the restored state.

The execute call returns `started` while the worker prepares the restore. If TOSE restarts, a worker resumes the same restore from its recorded state, so an interruption does not start it again or lose it. Each worker attempt is bounded by 30 minutes. The run becomes `completed` after TOSE authenticates through the existing Service and verifies the data directory. If the result of the cutover is uncertain it stays `pending_verification`, and verification resumes from the recorded state instead of replaying the restore.

### MySQL and MongoDB

These engines apply the dump itself, not the isolated replay and cutover that PostgreSQL uses. The run becomes `completed` when the restore command finishes without an error; TOSE does not run a further check of the data.

- **MySQL.** The dump drops and recreates every table it contains, replacing rows written since the backup.
- **MongoDB.** `mongorestore` skips documents whose `_id` already exists, so documents changed since the backup are not overwritten by older ones.
- **Partial data.** A failure during apply can leave partial data. The pre-restore backup named in the run is the way back.
- **Interruption.** A run that was interrupted without an outcome becomes `pending_verification` after 45 minutes and needs a fresh plan for another attempt.

The older direct route `POST /api/workspaces/{slug}/databases/{db_id}/backups/{backup_id}/restore` still starts an asynchronous restore. It also stores a backup first and shares the runbook's database lock. Use the restore runbook to get approval and a tracked result.

## Your data stays where it is

Restart, rollback and scale update the existing Deployment in place. A rollback changes the image only and leaves the live disk mounts and the replica count unchanged. A scale changes the replica count only. A runbook never creates, replaces or deletes a disk, and a restore never writes over a database without first storing a backup of it. If a disk the project records is missing or unavailable in the cluster, planning is refused with `VOLUME_MISSING` instead of starting the project with an empty volume. After a run, verification fails if a disk claim changed identity or mount. See [Persistent Disks](/guide/persistent-disks).

A rollback does not restore your database: migrations that already ran stay applied. The earlier image runs with the live Deployment's current environment variables and resources, and edits you made on the dashboard but have not deployed are applied on the next regular deploy. The plan lists these as warnings.

## Reading the execution state

Read `execution.status` from `GET .../runbooks/v2/plans/{plan_id}` (or `get_runbook`). The result only ever moves forward, and a run is never applied twice.

| State | What it means | What to do |
|-------|---------------|------------|
| `started` | The change was requested and TOSE has not observed the outcome. A restore stays here while its worker prepares and cuts over. | Poll. Do not execute again. |
| `pending_verification` | The change was applied but the result is unconfirmed: the cluster has not reached the planned state, the execution marker is missing after two minutes, a PostgreSQL cutover is uncertain, or a MySQL or MongoDB run had no outcome after 45 minutes. | Poll, see below. If it never settles, make a new plan. |
| `completed` | TOSE observed the planned state: for restart, rollback and scale the rollout, ready replicas and disks; for a PostgreSQL restore, authentication through the Service and the data directory. | Done. For a rollback, read the receipt. |
| `failed` | See `execution.detail`, for example `PRE_RESTORE_BACKUP_FAILED`, `WORKLOAD_UPDATE_REFUSED` or `ROLLBACK_FAILED`. | The plan is spent. Fix the cause and make a new plan. |

The dashboard shows the same states as Started, Waiting for the cluster to confirm, Completed and verified, and Failed.

## Pending verification

`completed` is reported only after TOSE sees the controller observe the rollout, every desired replica ready and available, and the same disk identities and mounts. If the cluster's answer was ambiguous, or the execution marker is not visible after two minutes, the run stays `pending_verification`.

Poll `GET .../runbooks/v2/plans/{plan_id}` (or call `get_runbook`). For restart, rollback and scale every read checks the cluster again (a restore is settled by its worker), so the status moves to `completed` or `failed` by itself. Do not execute again: a retry with the same key returns the same run and never reapplies the plan.

## Receipt after a verified rollout

When a rollback is verified, `execution.result_deployment_id` names the deployment record that carries the rollback receipt. It is set as soon as the rollback is applied, and is always empty for a restart. Until the run is `completed` the deployment record it points to is still `pending_verification`, so read the receipt only after `execution.status` is `completed`. The deployment can then be inspected like any other, for example with `inspect_deployment`.

## Permissions

| Action | Policy action | Needs |
|--------|---------------|-------|
| Plan or run a restart | `deployment.execute` | Owner or admin; scope `deployments:execute` or `deployments:write` |
| Plan or run a rollback | `deployment.rollback` | Owner or admin; scope `deployments:rollback` (over MCP the tools also need `deployments:execute` or `deployments:write`) |
| Plan or run a scale | `deployment.execute` | Owner or admin; scope `deployments:execute` or `deployments:write` |
| Plan or run a restore | `database.delete` | Owner or admin; scope `databases:write`. No MCP grant includes it today, so an MCP client cannot plan a restore. |
| Read plans | `deployment.read` | Any member with deployment read access |
| Approve or reject | `runbook.approve` | A signed-in owner or admin; sessions only |

Every request, including refusals, is written to the [audit log](/api/audit). The execution is recorded before the cluster is touched, with the route `runbook.<kind>.execute` and the outcome `started`.

## Errors

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `INVALID_ARGUMENT` | An argument is missing, extra or out of range: `deployment_id` for a rollback or sent for another kind, `replicas` outside 1 to 10, or `database_id` and `backup_id` for a restore. |
| 400 | `INVALID_IDEMPOTENCY_KEY` | The `Idempotency-Key` is missing or not 8 to 128 characters from `A-Za-z0-9._:-`. |
| 400 | `NO_IMAGE` | The rollback target has no built image. |
| 402 | `INSUFFICIENT_BALANCE` | The wallet is empty, so a rollback is refused; for a scale up, it does not cover one hour at the new size. |
| 403 | `forbidden` | An API key or connected app tried to approve or reject. |
| 403 | `REAUTHENTICATION_REQUIRED` | Approving a rollback or restore needs a sign-in within the last 15 minutes. |
| 403 | `insufficient_scope` | The credential lacks the scope; the body names `required_scope`. |
| 403 | `FORBIDDEN` | The member is not an owner or admin, or another credential than the one that planned the run tried to run it. |
| 404 | `NOT_FOUND` | Unknown project, deployment or plan. |
| 409 | `NO_WORKLOAD`, `NOT_RUNNING` | The project has no live workload, or is scaled to zero. Deploy or start it first. |
| 409 | `DEPLOY_IN_PROGRESS` | A deployment is still running. Wait for it. |
| 409 | `ALREADY_LIVE` | The rollback target's image is already live. |
| 409 | `VOLUME_MISSING` | A recorded disk claim is missing or unavailable. |
| 409 | `NO_CHANGE` | The scale asks for the replica count the project already has. |
| 409 | `REPLICA_LIMIT` | A project with a persistent disk runs one replica; the scale asks for more. |
| 409 | `DATABASE_NOT_ACTIVE`, `BACKUP_NOT_READY`, `UNSUPPORTED`, `RESTORE_IN_PROGRESS` | See [Restore a database](#restore-a-database). |
| 409 | `PLAN_HASH_MISMATCH`, `PLAN_EXPIRED`, `PLAN_CLOSED`, `PLAN_REJECTED`, `APPROVAL_REQUIRED`, `PLAN_STALE` | See [Plans that expire or go stale](#plans-that-expire-or-go-stale). |
| 409 | `PLAN_ALREADY_EXECUTED`, `IDEMPOTENCY_KEY_REUSED` | See [Execute](#_3-execute). |
| 409 | `CONFLICT` | Another operation holds the project. Try again shortly. |
| 503 | `UNAVAILABLE` | The cluster or lock could not be reached. Nothing changed. |
| 503 | `BACKUPS_UNAVAILABLE` | Backup storage is not configured, so a restore cannot be planned. |

## What is not covered

- The `tose runbook` CLI covers restart and rollback today; scale and restore from the CLI are tracked in [tose-cli#78](https://github.com/saasvn/tose-cli/issues/78). Use the REST API or the dashboard for them.
- A restore over MCP is not available, because no MCP grant maps to `databases:write`. Plan it over REST or on the dashboard.
- The approval page proves that a browser signed in as an owner or admin submitted the form, not that a person did. A recent sign-in narrows this for rollback and restore but does not remove it. Do not sign in to TOSE in a browser an agent controls.
- Scale, restore, the restart generation check and the disk claim comparison have been tested against fakes. Verification against a live production cluster and database is tracked separately. Treat the observed `execution.status` as the source of truth, not the plan.
- The direct database restore route still exists beside the restore runbook.
