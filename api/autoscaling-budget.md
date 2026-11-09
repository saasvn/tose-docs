# Autoscaling budget API

Read and change the [autoscaling budget](/guide/autoscaling-budgets) of a workspace or a project. Routes live under `/api/workspaces/{slug}` and use the usual [authentication](/api/authentication). They exist only when the platform operator has turned budgets on; otherwise they return `404`.

## Conventions

- **Money** is an integer number of **nano-USD**. `1 cent = 10,000,000`, so `$0.05` is `50000000`. JSON keys end in `_nano_usd`.
- **Times** are RFC 3339, in UTC.
- **A missing or foreign resource** (workspace, project or plan, including one that belongs to another tenant) returns `404 NOT_FOUND`.
- **Raw wallet balance** never appears in a response. Only `reserve.funded` and `reserve.coverage_hours` do.

## Permissions

| Action | Minimum role | Scope | Notes |
|--------|--------------|-------|-------|
| `autoscaling.budget.read` | member | `projects:read` | |
| `autoscaling.budget.write` | admin | `projects:write` | A session applies the change. A credential gets a plan instead. |
| `autoscaling.budget.approve` | admin | `projects:write` | Session only. API keys and OAuth tokens are refused. |

## Routes

| Method | Path | Action | Success |
|--------|------|--------|---------|
| `GET` | `/api/workspaces/{slug}/autoscaling/budget` | read | `200` WorkspaceBudget and `ETag` |
| `PUT` | `/api/workspaces/{slug}/autoscaling/budget` | write | `200` WorkspaceBudget (session) or `202` PendingPlan (credential) |
| `GET` | `/api/workspaces/{slug}/projects/{project_slug}/autoscaling/budget` | read | `200` ProjectBudget and `ETag` |
| `PUT` | `/api/workspaces/{slug}/projects/{project_slug}/autoscaling/budget` | write | `200` ProjectBudget (session) or `202` PendingPlan (credential) |
| `GET` | `/api/workspaces/{slug}/autoscaling/budget/plans/{plan_id}` | read | `200` BudgetPlan |
| `POST` | `/api/workspaces/{slug}/autoscaling/budget/plans/{plan_id}/approve` | approve | `200` BudgetPlan, status `applied` |
| `POST` | `/api/workspaces/{slug}/autoscaling/budget/plans/{plan_id}/reject` | approve | `200` BudgetPlan, status `rejected` |

### Optimistic concurrency

Every budget has a `revision`. `GET` returns it as the weak ETag `W/"r{revision}"`. `PUT` accepts an optional `If-Match` with that value; if the revision has moved on, the answer is `412 PRECONDITION_FAILED` and nothing changes. Resending the same `PUT` with the same `If-Match` is safe: it can apply the change at most once.

## Shapes

### Caps

Every field is present on `PUT`. `null` means no cap. A cap is between `1` and `1000000000000000` nano-USD (10 million USD).

```json
{ "hourly_nano_usd": 50000000, "monthly_nano_usd": 30000000000 }
```

### Floor

Project scope only. `null` means no floor. `replicas` is `1` to `100`. `cpu` is a decimal string of cores, `"0.25"` to `"64"`, and `ram` a decimal string of GiB, `"0.5"` to `"256"`.

```json
{ "replicas": 1, "cpu": "0.5", "ram": "1" }
```

### Approval

Who last approved the budget, or `null` when it was never set.

```json
{
  "approved_by": "<user id>",
  "approved_via": "session",
  "plan_id": null,
  "approved_at": "2026-11-09T10:00:00Z"
}
```

`approved_via` is `session` or `plan`. `plan_id` is set when it is `plan`.

### WorkspaceBudget

```json
{
  "scope": "workspace",
  "workspace_slug": "acme",
  "revision": 3,
  "caps": { "hourly_nano_usd": 50000000, "monthly_nano_usd": 30000000000 },
  "approval": null,
  "usage": {
    "hourly_exposure_nano_usd": 40000000,
    "month_start": "2026-11-01T00:00:00Z",
    "month_to_date_nano_usd": 1230000000,
    "month_projection_nano_usd": 25000000000
  },
  "reserve": {
    "floor_hourly_nano_usd": 20000000,
    "target_nano_usd": 1440000000,
    "funded": true,
    "coverage_hours": 72
  },
  "projects": [
    {
      "project_slug": "api",
      "revision": 1,
      "caps": { "hourly_nano_usd": 20000000, "monthly_nano_usd": null },
      "floor": { "replicas": 1, "cpu": "0.5", "ram": "1" },
      "hourly_exposure_nano_usd": 20000000
    }
  ],
  "pending_plans": [
    { "id": "plan_01", "project_slug": "api", "expires_at": "2026-11-09T10:30:00Z" }
  ]
}
```

| Field | Meaning |
|-------|---------|
| `usage.hourly_exposure_nano_usd` | Configured hourly cost of the projects that are billable or starting. |
| `usage.month_to_date_nano_usd` | Compute billed so far this UTC month. |
| `usage.month_projection_nano_usd` | Month to date plus the hourly cost for the remaining hours of the month. |
| `reserve.floor_hourly_nano_usd` | Hourly cost of all project floors. |
| `reserve.target_nano_usd` | The floors' hourly cost times 72. |
| `reserve.funded` | The unreserved wallet covers the target. |
| `reserve.coverage_hours` | Hours of floor the wallet covers, at most 72. It is 72 when there is no floor. |
| `projects` | Only projects that have a budget. |
| `pending_plans` | Plans still waiting for approval. |

### ProjectBudget

```json
{
  "scope": "project",
  "workspace_slug": "acme",
  "project_slug": "api",
  "revision": 1,
  "caps": { "hourly_nano_usd": 20000000, "monthly_nano_usd": null },
  "floor": { "replicas": 1, "cpu": "0.5", "ram": "1" },
  "approval": null,
  "usage": {
    "hourly_exposure_nano_usd": 20000000,
    "month_start": "2026-11-01T00:00:00Z",
    "month_to_date_nano_usd": 0,
    "month_projection_nano_usd": 0,
    "floor_hourly_nano_usd": 20000000
  }
}
```

### Request bodies

`PUT` replaces the caps (and, for a project, the floor). To change one cap, send the other one as it is now.

```json
{ "caps": { "hourly_nano_usd": 50000000, "monthly_nano_usd": null } }
```

```json
{
  "caps": { "hourly_nano_usd": 20000000, "monthly_nano_usd": null },
  "floor": { "replicas": 1, "cpu": "0.5", "ram": "1" }
}
```

The first is the workspace body. The second is the project body; `floor` may be `null`. A floor on the workspace scope is refused with `400`.

### PendingPlan

Returned with `202` when a credential, not a signed-in session, calls `PUT`. Nothing has changed yet.

```json
{
  "status": "pending",
  "plan": { "id": "plan_01", "status": "pending", "...": "see BudgetPlan" },
  "approval_url": "https://tose.sh/w/acme/autoscaling?plan=plan_01"
}
```

Give the `approval_url` to a person. The plan cannot be approved with an API key.

### BudgetPlan

```json
{
  "id": "plan_01",
  "scope": "workspace",
  "project_slug": null,
  "status": "pending",
  "before": { "caps": { "hourly_nano_usd": null, "monthly_nano_usd": null } },
  "after": { "caps": { "hourly_nano_usd": 50000000, "monthly_nano_usd": null } },
  "base_revision": 3,
  "plan_hash": "sha256:9f2c...",
  "requested_via": "api_key",
  "created_at": "2026-11-09T10:00:00Z",
  "expires_at": "2026-11-09T10:30:00Z",
  "decided_at": null
}
```

`status` is `pending`, `applied`, `rejected` or `expired`. `requested_via` is `api_key` or `mcp`. A plan lives 30 minutes. For a project plan, `before` and `after` also hold the `floor`.

### Approve body

```json
{ "plan_hash": "sha256:9f2c..." }
```

Approving applies the plan at once, provided the budget is still at `base_revision` and `plan_hash` matches. `reject` takes no body.

## Example

```bash
curl -X PUT https://api-v2.tose.sh/api/workspaces/acme/autoscaling/budget \
  -H "X-API-Key: $TOSE_API_KEY" \
  -H 'If-Match: W/"r3"' \
  -H 'Content-Type: application/json' \
  -d '{"caps":{"hourly_nano_usd":50000000,"monthly_nano_usd":null}}'
```

With an API key this returns `202` and a `PendingPlan`. With a signed-in session it returns `200` and the new budget.

## Errors

These use the standard [error envelope](/api/errors). Branch on `code`.

| HTTP | `code` | When | `details` |
|------|--------|------|-----------|
| 400 | `INVALID_ARGUMENT` | Malformed JSON, a missing `caps` key, a value out of range, a bad floor string, or a floor on workspace scope | `{field}` |
| 422 | `INVALID_ARGUMENT` | The floor's hourly cost is above the project's hourly cap | `{field: "floor"}` |
| 412 | [`PRECONDITION_FAILED`](/api/errors#PRECONDITION_FAILED) | `If-Match` does not match the current revision | |
| 403 | `FORBIDDEN` | The role or scope is too low | |
| 403 | [`HUMAN_APPROVAL_REQUIRED`](/api/errors#HUMAN_APPROVAL_REQUIRED) | Approve or reject was called with an API key or OAuth token | |
| 404 | `NOT_FOUND` | Unknown, or belongs to another tenant | |
| 409 | [`PLAN_STALE`](/api/errors#PLAN_STALE) | The budget changed after the plan was made | `{base_revision, current_revision}` |
| 409 | [`PLAN_HASH_MISMATCH`](/api/errors#PLAN_HASH_MISMATCH) | The `plan_hash` sent does not match the plan | |
| 410 | [`PLAN_EXPIRED`](/api/errors#PLAN_EXPIRED) | The plan is past `expires_at` | |
| 409 | [`PLAN_CLOSED`](/api/errors#PLAN_CLOSED) | The plan is already applied or rejected | `{status}` |

The two guard codes, [`BUDGET_CAP`](/api/errors#BUDGET_CAP) and [`INSUFFICIENT_BALANCE`](/api/errors#INSUFFICIENT_BALANCE), come from the endpoints that raise an allocation (project update, deploy, redeploy, rollback, image deploy, environment apply and runbook scale), not from the budget routes.

## Related

- [Autoscaling budgets guide](/guide/autoscaling-budgets)
- [`tose autoscaling`](/commands/autoscaling)
- [Errors](/api/errors)
