# Workspace analytics API

Read-only analytics for one workspace: cost, resources, service health and deployments. Each answer says how
complete its data is, and missing data is never reported as zero or as healthy. Full schemas
(`AnalyticsOverview`, `AnalyticsCosts`, `AnalyticsResources`, `AnalyticsReliability`, `AnalyticsMeta`) are in the
[OpenAPI spec](https://api.tose.sh/api/openapi.yaml) under the `Analytics` tag.

Nothing here writes, raises alerts or changes billing.

::: warning Off by default
The routes answer only when the server sets `ANALYTICS_ENABLED=true`. While the flag is off they return `404`,
the same answer as for an unknown workspace. A credential that lacks the route's scope still gets `403`, because
the permission check runs before the flag is read. If you self-host TOSE, set the variable on the API.
:::

## Routes

All paths are under `/api/workspaces/{slug}/analytics`.

| Method and path | Scope | Answers |
|-----------------|-------|---------|
| `GET /overview` | `workspace:read` | A summary of the cost, resource and reliability sections. A section the credential cannot read is `forbidden` and carries no numbers |
| `GET /costs` | `billing:read` | Spend over time, totals, top projects and resources, prepaid balance, forecast and budget |
| `GET /resources` | `projects:read` | Configured and allocated CPU and RAM per workload, observed memory, pods |
| `GET /reliability` | `deployments:read` | Incidents, the latest uptime check of each project, deployments |

Any workspace member signed in to the dashboard may read every route. An API key or OAuth grant needs the scope
in the table; see [API Keys & Scopes](/api/api-keys#scopes). `deployments:read` also grants `workspace:read` and
`projects:read`, so a key with only `deployments:read` reads the overview, resources and reliability, but not
costs.

One scope never exposes another area. `projects:read` returns no billing number, in the overview or anywhere else:
billing data always needs `billing:read`.

| Status | When |
|--------|------|
| `200` | The answer |
| `400` | `window` is not `24h`, `7d` or `30d` (`{"error":"window must be one of 24h, 7d, 30d"}`) |
| `401` | No valid credential |
| `403` | The credential lacks the route's scope (`code: insufficient_scope`) |
| `404` | Analytics is off, the workspace does not exist, you are not a member, or the API key belongs to another workspace |
| `500` | A source could not be read (`{"error":"Failed to load analytics"}`). Each query has a 10-second limit |

## The `window` filter

Every route takes `?window=24h|7d|30d`, a window that ends now. The default is `24h`. History is limited to 30
days; older rows are not deleted to enforce it, they are simply never read.

The bucket size follows the window and the source:

| Window | Costs | Resources | Reliability |
|--------|-------|-----------|-------------|
| `24h` | 1h | 15m | 1h |
| `7d` | 1h | 1h | 1d |
| `30d` | 1d | 1d | 1d |

Costs come from hourly ledger rows and resources from five-minute collector samples, so a bucket is never finer
than its source and is never interpolated. The window start is aligned down to the start of its first bucket, and
`meta.from` reports that aligned start.

```bash
curl "https://api.tose.sh/api/workspaces/$WS/analytics/costs?window=7d" \
  -H "X-API-Key: $TOSE_API_KEY"
```

## Missing data and `meta`

Missing data is `null` or `unavailable`. It is never zero, and a project without evidence is never counted as
healthy or up.

Every detail answer, and every `ok` section of the overview, carries `meta`:

| Field | Meaning |
|-------|---------|
| `observed_at` | When the answer was computed |
| `from`, `to` | The aligned window |
| `window`, `granularity` | `24h`/`7d`/`30d` and `15m`/`1h`/`1d` |
| `source` | The tables the numbers come from |
| `complete` | `false` when a closed bucket has no data or the evidence is stale |
| `coverage` | `expected_points`, `observed_points`, `ratio`, `first_at` and `last_at` of the buckets |
| `units` | The unit of each kind of number, for example `{"cost":"nano_usd","balance":"usd_cents"}` |
| `notes` | Plain statements of what the numbers do and do not mean |

## Overview

```http
GET /api/workspaces/{slug}/analytics/overview?window=24h
```

The answer has `observed_at`, `window`, `from`, `to` and three sections, `costs`, `resources` and `reliability`.
Each section has a `status`:

| `status` | `data` |
|----------|--------|
| `ok` | The summary of that section |
| `forbidden` | `null`. The credential lacks the section's scope (`billing:read`, `projects:read` or `deployments:read`); `reason` says which data it cannot read |
| `unavailable` | `null`. Its source could not be read; the other sections are still answered |

The summaries are: `costs` with `meta`, `totals`, `prepaid`, `budget_status` and `unavailable`; `resources` with
`meta`, `totals` and `latest_memory_bytes` (the newest bucket with observed memory, or `null`); `reliability` with
`meta`, `incidents`, `uptime` and `deployments`. For the full detail of a section, call its own route with the same
window.

```json
{
  "observed_at": "2026-11-10T09:00:00Z",
  "window": "24h",
  "from": "2026-11-09T09:00:00Z",
  "to": "2026-11-10T09:00:00Z",
  "costs": { "status": "forbidden", "reason": "This credential cannot read billing data", "data": null },
  "resources": { "status": "ok", "data": { "meta": { "...": "..." }, "totals": { "...": "..." }, "latest_memory_bytes": 412090368 } },
  "reliability": { "status": "ok", "data": { "meta": { "...": "..." }, "incidents": { "...": "..." }, "uptime": { "...": "..." }, "deployments": { "...": "..." } } }
}
```

## Costs

```http
GET /api/workspaces/{slug}/analytics/costs?window=30d
```

Amounts are **nano-USD** (1 USD = 1,000,000,000) unless the field name ends in `_cents` (USD cents).

| Field | Meaning |
|-------|---------|
| `series` | One point per bucket: `at` and `actual_nano_usd`. A bucket with no ledger row is `null`, not `0` |
| `totals` | `actual_nano_usd` (metered ledger periods that have ended), `live_nano_usd` (the period still in progress), `compute_nano_usd` and `storage_nano_usd` (the split of `actual`) |
| `projects` | Cost per project: `id`, `name`, `compute_nano_usd`, `storage_nano_usd`, `total_nano_usd` |
| `resources`, `resources_truncated` | The top resources by cost (`type`, `id`, `name`, the three amounts, `usage_records`), and whether some were left out |
| `prepaid` | `balance_cents`, `unbilled_nano_usd`, `monthly_budget_cents`, `runway_days`, `depletes_at` |
| `forecast` | A projection kept apart from the metered amounts: daily compute and storage spend, projected spend, `compute_runway_days`, `depletes_at` |
| `budget` | `monthly_budget_cents`, `month_to_date_nano_usd`, `projected_month_end_nano_usd`, `status` (`none`, `ok`, `at_risk`, `over`) and `note` |
| `unavailable` | The parts that could not be computed. Without a wallet, `prepaid`, `forecast` and `budget` are `null` and listed here |

The breakdown is the same cost report as `GET /api/workspaces/{slug}/wallet/costs`, so `actual + live` equals its
total. Compute metered in an hour that began with a zero balance is listed but was never charged. When there is no
compute spend in the forecast window, `runway_days` is `null` (unknown, not infinite) and `meta.notes` says so.

## Resources

```http
GET /api/workspaces/{slug}/analytics/resources?window=24h
```

Resources keep configuration and observation apart:

- **Configured** is the size of one replica (`configured_cpu_cores`, `configured_ram_gib`).
- **Allocated** is the configured size times replicas (`allocated_cpu_cores`, `allocated_ram_gib`). Neither is usage.
- **Observed** memory comes from **one pod per workload**, read about every five minutes. It describes one replica
  and is **not** multiplied by replicas. A reading of zero bytes means the pod could not be read and is ignored.
- **CPU use is not collected.** CPU appears only as configured and allocated.

| Field | Meaning |
|-------|---------|
| `series` | Per bucket: `at`, `workloads`, `memory_workloads`, `memory_bytes` (`null` when nothing was observed), `pods`, `ready_pods` |
| `totals` | For the workloads running now: `workloads`, `running`, `replicas`, `allocated_cpu_cores`, `allocated_ram_gib`, and `no_samples` (running workloads with no sample in the window) |
| `workloads`, `workloads_truncated` | The largest workloads by allocated RAM, and whether some were left out |

Each workload has `type` (`project` or `template`), `id`, `name`, `status`, `replicas`, the configured and allocated
sizes, `samples`, `observed_memory_bytes_last`, `observed_memory_bytes_avg`, `observed_memory_bytes_max`,
`last_sample_at`, `pods`, `ready_pods` and `state`:

| `state` | Meaning |
|---------|---------|
| `observed` | The collector has a reading in the window |
| `no_samples` | Running with replicas, but the collector recorded nothing in the window |
| `not_sampled` | Stopped or without replicas, so no sample is expected |

Ready pods are known only from samples that counted every pod. Samples stored before that counted only the first
running pod, so their buckets report `ready_pods` as `null`.

## Reliability

```http
GET /api/workspaces/{slug}/analytics/reliability?window=7d
```

| Field | Meaning |
|-------|---------|
| `incidents` | `open` and `open_by_severity` now, `opened_in_window`, `resolved_in_window`, and `mttr_seconds` (mean time to resolve, `null` when none was resolved) |
| `uptime` | Per project, from the latest check of its monitor: `projects`, `up`, `down`, `unknown`, `stale`, `not_monitored` |
| `deployments` | `total`, `succeeded`, `failed`, `in_flight`, `other`, `success_ratio`, `duration_avg_seconds`, `duration_p95_seconds`, and `series` (`at`, `succeeded`, `failed` per bucket) |

Deployments are project deployments created in the window. Incidents and uptime are as of `observed_at`.

### Deployment success

- A deployment **succeeded** when its rollout finished, its status is not `failed` and it carries no error. A later
  stop or rollback does not undo that.
- It **failed** when its status is `failed`.
- Deployments still in progress, including a rollback awaiting verification, are `in_flight`. Those stopped or rolled
  back before the rollout finished are counted in `other`. Neither counts as succeeded or failed.
- `success_ratio` is succeeded / (succeeded + failed), a fraction from 0 to 1, and `null` when none finished.
- Durations run from the build start (or creation) to the end of the rollout, over succeeded deployments only.

**Known limit:** a deployment that a person stopped in the instant it failed can keep a finish time without an
error, and then counts as succeeded.

### Uptime

Uptime is the **latest check** of each project's [uptime monitor](/api/projects#uptime). Check history is not stored, so
there is **no uptime percentage**.

| State | Meaning |
|-------|---------|
| `up`, `down` | The latest check's result |
| `stale` | The last check is older than three check intervals |
| `unknown` | The monitor never ran, or reports neither up nor down |
| `not_monitored` | The project has no enabled monitor |

`stale`, `unknown` and `not_monitored` never count as up.

## Not in v1

- Account-level or cross-workspace analytics.
- CI and agent usage. Use [CI usage and budget](/api/ci-usage-budget), [Agent usage and budgets](/api/agent-usage),
  the MCP tools `ci_get_usage` and `get_agent_usage`, or `tose ci usage`.
- Alerts, anomaly detection, HTTP latency percentiles and any write.
- CPU use, and history older than 30 days.

The analytics CLI commands, MCP tools and WebMCP adapters are not released yet. Until they are, read these routes
directly.

## Related documentation

- [API Keys & Scopes](/api/api-keys)
- [Errors](/api/errors)
- [CI usage and budget](/api/ci-usage-budget)
- [Agent usage and budgets](/api/agent-usage)
