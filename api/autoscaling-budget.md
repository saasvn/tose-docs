# Autoscaling budget API

Read and change the [autoscaling budget](/guide/autoscaling-budgets) of a workspace or a project. Routes live under `/api/workspaces/{slug}` and use the usual [authentication](/api/authentication). They exist only when the platform operator has turned budgets on (`AUTOSCALING_BUDGET_ENABLED=true`, off by default); otherwise they return `404 not_found`.

## Conventions

- **Money** is an integer number of **nano-USD**. `1 cent = 10,000,000`, so `$0.05` is `50000000`. JSON keys end in `_nano_usd`.
- **Times** are RFC 3339, in UTC.
- **A missing workspace, or one you are not a member of,** returns `404 not_found`. A workspace API key used on another workspace returns `403 forbidden`. A missing project or plan inside your workspace returns `404 NOT_FOUND`.
- **Raw wallet balance** never appears in a response. Only `reserve.funded` and `reserve.coverage_hours` do.

## Permissions

| Action | Minimum role | Scope | Notes |
|--------|--------------|-------|-------|
| `autoscaling.budget.read` | member | `projects:read` | |
| `autoscaling.budget.write` | admin | `projects:write` | A session applies the change. An API key gets a plan instead. |
| `autoscaling.budget.approve` | admin | `projects:write` | Session only. API keys are refused with `403 HUMAN_APPROVAL_REQUIRED`. |

A session is a person signed in to TOSE: the dashboard's session cookie, or the session token `/api/auth/login` returns, sent as `Authorization: Bearer`. Anything holding that token can approve as the person, so give agents an API key instead. OAuth (MCP) tokens are not accepted on these routes; connected apps use the `autoscaling_budget_get` and `autoscaling_budget_plan` [MCP tools](/mcp#tools).

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

There is no route that lists plans. Read the pending ones from `pending_plans` of the workspace budget, then fetch one by `id`.

Every `PUT`, approve and reject also refuses a request that is authenticated with the session cookie from a browser origin other than the dashboard or the API itself (`403 CROSS_SITE_REQUEST`). API keys and `Authorization` headers are not affected. A `PUT` body must be exactly one JSON object with no unknown fields; anything after it is `400 INVALID_ARGUMENT`.
### Optimistic concurrency

Every budget has a `revision`. `GET` returns it as the weak ETag `W/"r{revision}"`. `PUT` accepts an optional `If-Match` with that value; if the revision has moved on, the answer is `412 PRECONDITION_FAILED` and nothing changes. Resending the same `PUT` with the same `If-Match` is safe: it can apply the change at most once. A value that names no revision (for example `W/"abc"`) never matches and is also `412`. An empty header or `*` skips the check.

With an API key the `If-Match` is compared when the plan is made, under the budget lock, so a stale value is `412` before any plan is stored. Proposing the same change again while its plan is pending returns that plan.

## Shapes

### Caps

Every field is present on `PUT`. `null` means no cap. A cap is between `1` and `1000000000000000` nano-USD (1 million USD).

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

The first is the workspace body. The second is the project body; `floor` is required there, and `null` means no floor. A floor on the workspace scope is refused with `400`.

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
  "before": { "caps": { "hourly_nano_usd": null, "monthly_nano_usd": null }, "floor": null },
  "after": { "caps": { "hourly_nano_usd": 50000000, "monthly_nano_usd": null }, "floor": null },
  "base_revision": 3,
  "plan_hash": "sha256:9f2c...",
  "requested_via": "api_key",
  "created_at": "2026-11-09T10:00:00Z",
  "expires_at": "2026-11-09T10:30:00Z",
  "decided_at": null
}
```

`status` is `pending`, `applied`, `rejected` or `expired`. `requested_via` is `api_key` or `mcp`. A plan lives 30 minutes. `before` and `after` always hold `caps` and `floor`; `floor` is `null` on a workspace plan.

### Approve and reject body

```json
{ "plan_hash": "sha256:9f2c..." }
```

`approve` and `reject` both require this body, with the `plan_hash` of the plan the person reviewed. The request must have `Content-Type: application/json` (otherwise `415 UNSUPPORTED_MEDIA_TYPE`) and carry exactly one object; a missing `plan_hash`, an unknown field or trailing data is `400 INVALID_ARGUMENT`. A hash that differs from the plan is `409 PLAN_HASH_MISMATCH`.

Approving applies the plan at once, provided the budget is still at `base_revision` and `plan_hash` matches. The floor is checked again: if the project grew since the plan was made and its floor now costs more than the plan's hourly cap, the approval is `422 INVALID_ARGUMENT`. Rejecting leaves the budget unchanged.

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
| 400 | `INVALID_ARGUMENT` | Malformed JSON or trailing data after it, an unknown field, a missing `caps`, `plan_hash` or project `floor`, a value out of range, a bad floor string, or a floor on workspace scope | `{field}` |
| 422 | `INVALID_ARGUMENT` | The floor's hourly cost is above the project's hourly cap, on a `PUT` or on approve | `{field: "floor"}` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Approve or reject without `Content-Type: application/json` | |
| 403 | [`CROSS_SITE_REQUEST`](/api/errors#CROSS_SITE_REQUEST) | A `PUT`, approve or reject authenticated with the session cookie from another origin | |
| 412 | [`PRECONDITION_FAILED`](/api/errors#PRECONDITION_FAILED) | `If-Match` does not match the current revision (for an API key, when the plan is made) | |
| 403 | [`forbidden`](/api/errors#forbidden) | The workspace role is too low, or a workspace API key was used on another workspace | |
| 403 | [`insufficient_scope`](/api/errors#insufficient_scope) | The API key lacks the scope; the body names `required_scope` | |
| 403 | [`HUMAN_APPROVAL_REQUIRED`](/api/errors#HUMAN_APPROVAL_REQUIRED) | Approve or reject was called with an API key | |
| 404 | [`not_found`](/api/errors#not_found) | The workspace does not exist or you are not a member, or budgets are not turned on | |
| 404 | [`NOT_FOUND`](/api/errors#NOT_FOUND) | The project or plan does not exist in this workspace | |
| 409 | [`PLAN_STALE`](/api/errors#PLAN_STALE) | The budget changed after the plan was made | `{base_revision, current_revision}` |
| 409 | [`PLAN_HASH_MISMATCH`](/api/errors#PLAN_HASH_MISMATCH) | The `plan_hash` sent with approve or reject does not match the plan | |
| 410 | [`PLAN_EXPIRED`](/api/errors#PLAN_EXPIRED) | The plan is past `expires_at` | |
| 409 | [`PLAN_CLOSED`](/api/errors#PLAN_CLOSED) | The plan is already applied or rejected | `{status}` |
| 503 | [`unavailable`](/api/errors#unavailable) | The permission check could not run. Retryable | |

The two guard codes, [`BUDGET_CAP`](/api/errors#BUDGET_CAP) and [`INSUFFICIENT_BALANCE`](/api/errors#INSUFFICIENT_BALANCE), come from the endpoints that raise an allocation (project update, deploy, redeploy, rollback, image deploy, environment apply and runbook scale), not from the budget routes.

## Related

- [Autoscaling budgets guide](/guide/autoscaling-budgets)
- [`tose autoscaling`](/commands/autoscaling)
- [Errors](/api/errors)
