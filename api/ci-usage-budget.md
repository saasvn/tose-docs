# CI usage and budget API

Endpoints to read a workspace's CI usage and to read and set its prepaid budget caps. Concepts are in [CI usage and budget caps](/guide/ci-usage-and-budgets). Full schemas (`CIWorkspaceUsage`, `CIBudgetReport`, `CIWorkspaceBudget`, `CIPipelineBudget`) are in the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml).

All paths are under `/api/workspaces/{slug}/ci`.

| Method and path | Who | Purpose |
|-----------------|-----|---------|
| `GET /usage` | Any member, or `ci:read` | Sum usage |
| `GET /budget` | Any member, or `ci:read` | Every cap with spent, held and remaining |
| `PUT /budget` | Owner or admin; `ci:execute` for credentials | Set workspace-wide caps |
| `DELETE /budget` | Owner or admin signed in | Remove workspace-wide caps |
| `GET /pipelines/{pipeline_id}/budget` | Any member, or `ci:read` | One pipeline's caps |
| `PUT /pipelines/{pipeline_id}/budget` | Owner or admin; `ci:execute` for credentials | Set a pipeline's caps |
| `DELETE /pipelines/{pipeline_id}/budget` | Owner or admin signed in | Remove a pipeline's caps |

A pipeline or run of another workspace returns `404`.

## Get usage

```http
GET /api/workspaces/{slug}/ci/usage?group_by=day&from=2026-11-01&to=2026-11-08
```

| Query | Description |
|-------|-------------|
| `group_by` | `day` (default), `run`, `pipeline`, `job` (`run_id/job_name`) or `kind` |
| `pipeline_id`, `run_id` | Narrow the report |
| `from`, `to` | Inclusive start and exclusive end, RFC 3339 or `YYYY-MM-DD` (UTC). Without `from` or `run_id`: the last 30 UTC days. At most 366 days |

```bash
curl "https://api.tose.sh/api/workspaces/$WS/ci/usage?group_by=pipeline" \
  -H "X-API-Key: $TOSE_API_KEY"
```

**Response:** `200` with `group_by`, `from`, `to`, `rows`, `totals` and `truncated` (at most 1000 rows). Each row and the totals have `key`, `events`, `active_seconds`, `cost_nano_usd`, `billed_nano_usd`, `credit_nano_usd`, `capped_nano_usd`, `forgiven_nano_usd` and `charged_cents`, all integers.

## Get budget caps

```http
GET /api/workspaces/{slug}/ci/budget
```

**Response:** `200` with `balance_cents`, `held_nano_usd`, `workspace` (`max_daily_cost_cents`, `max_monthly_cost_cents`, `alert_percent`, `etag`, `caps`), `pipelines` (each with `max_run_cost_cents`, `max_daily_cost_cents`, `max_monthly_cost_cents`, `etag`, `caps`) and `rules`. The `ETag` header is the workspace caps' ETag.

Each entry of `caps` has `scope` (`daily`, `monthly`, `workspace_daily`, `workspace_monthly`), `limit_cents`, `spent_nano_usd`, `held_nano_usd`, `remaining_nano_usd`, `used_percent`, `state` (`ok`, `near`, `reached`), `period_start` and `resets_at`.

## Set caps

```http
PUT /api/workspaces/{slug}/ci/budget
PUT /api/workspaces/{slug}/ci/pipelines/{pipeline_id}/budget
If-Match: "<etag>"
```

Send at least one field; no other field is accepted. Values are USD cents from 1 to 10000000, and `0` means none.

| Route | Fields |
|-------|--------|
| Workspace | `max_daily_cost_cents`, `max_monthly_cost_cents`, `alert_percent` (1 to 100, default 80) |
| Pipeline | `max_run_cost_cents`, `max_daily_cost_cents`, `max_monthly_cost_cents` |

```bash
curl -X PUT "https://api.tose.sh/api/workspaces/$WS/ci/budget" \
  -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -H 'If-Match: "<etag from GET /budget>"' \
  -d '{"max_daily_cost_cents": 500}'
```

**Response:** `200` with the caps after the change and a new `ETag`.

## Remove caps

`DELETE` on either budget route removes the caps (the workspace alert share stays). It needs an owner or admin signed in to TOSE.

## Rules and errors

| Status | Code | Meaning |
|--------|------|---------|
| `403` | `person_required` | An API key or connected app tried to raise or remove a cap. Only add or lower |
| `412` | `precondition_failed` | `If-Match` no longer matches. Read the caps again |
| `402` | `CI_BUDGET_CAP_REACHED` | A manual run was refused because its largest job does not fit in a run, pipeline or workspace cap. See [the hard cap](/guide/ci-usage-and-budgets#hard-cap) |

A lower cap refuses new jobs that do not fit; running jobs keep their reservation. Every change is in the audit log with action `ci.budget` and notifies the workspace's members.

## MCP

For the workspace the connection is bound to: `ci_get_usage` and `ci_get_budget` (`ci:read`), and `ci_set_budget` (`ci:execute`, owner or admin). `ci_set_budget` takes `pipeline_id` (omit for the workspace), `max_run_cost_cents` (pipelines only), `max_daily_cost_cents`, `max_monthly_cost_cents` and `if_match` (the ETag from `ci_get_budget`), and can only add or lower a cap. See [MCP client setup](/mcp/clients).
