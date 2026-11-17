# Workspace analytics API

Read-only analytics for one workspace: cost, resources, service health and deployments. Each answer says how
complete its data is, and a value that was not measured is never reported as zero or as healthy. The response
schemas (`AnalyticsOverview`, `AnalyticsCosts`, `AnalyticsResources`, `AnalyticsReliability`, `AnalyticsMeta`) are in
the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml) under the `Analytics` tag; this page describes the nested
fields in more detail than the spec does.

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

Any workspace member signed in to the dashboard may read every route. An API key needs the scope in the table
(a key created without `scopes` has full access to its workspace); see [API Keys and Scopes](/api/api-keys#scopes). `deployments:read` also grants `workspace:read` and
`projects:read`, so a key with only `deployments:read` reads the overview, resources and reliability, but not
costs.

No scope other than `billing:read` (or `billing:write`, which includes it) returns a billing number, in the
overview or anywhere else. `projects:read` and `deployments:read` never expose costs.

| Status | When |
|--------|------|
| `200` | The answer |
| `400` | `window` is not `24h`, `7d` or `30d` (`{"error":"window must be one of 24h, 7d, 30d"}`) |
| `401` | No valid credential |
| `403` | The API key lacks the route's scope (`code: insufficient_scope`, with `required_scope`), or the key belongs to another workspace or is bound to a runtime (`code: forbidden`) |
| `404` | Analytics is off, the workspace does not exist, or you are not a member |
| `429` | Too many analytics reads from this credential (`code: rate_limited`, with `Retry-After: 5`). See [Rate limit](#rate-limit) |
| `500` | A source could not be read (`"Failed to load analytics"`). Each request has a 10-second limit |
| `503` | The permission check could not run (`"Authorization is temporarily unavailable"`); retry |

The `error` field is shown above; the full error body is described in [Errors](/api/errors). A key of another
workspace gets `403` whether or not the slug exists, so slugs cannot be probed.

### Rate limit {#rate-limit}

Each credential (an API key, or a signed-in user) may make 2 analytics reads a second, with bursts of 20, across the
four routes. An API key has its own budget, apart from its owner's session. Each API replica keeps its own budget in
memory, so with several replicas the limit applies per replica, and a restart resets it. The limit is checked before
the `ANALYTICS_ENABLED` switch, so a caller over the limit gets `429` even while analytics is off.

## The `window` filter

Every route takes `?window=24h|7d|30d`, a window that ends now. The default is `24h`. History is limited to about 30
days (the `30d` window starts at the beginning of its first UTC day); older rows are not deleted to enforce it, they
are simply never read.

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

A value that was not measured (an amount, memory, ready pods, a ratio, a duration) is `null`, and a part that
could not be computed is `unavailable`. It is never zero, and a project without evidence is never counted as
healthy or up. Counts such as `workloads` or `pods` in a bucket with no sample are `0`; use `meta.coverage` to tell
an empty bucket from a measured one.

Every detail answer, and every `ok` section of the overview, carries `meta`:

| Field | Meaning |
|-------|---------|
| `observed_at` | When the answer was computed |
| `from`, `to` | `from` is aligned down to the start of the first bucket; `to` is the observation time |
| `window`, `granularity` | `24h`/`7d`/`30d` and `15m`/`1h`/`1d` |
| `source` | The tables the numbers come from |
| `complete` | `false` when a closed bucket has no data or no bucket has data, or when the source is behind (see [When a source is behind](#source-behind)). In reliability, `false` while a monitored project is `stale` or `unknown` (its `coverage.ratio` is always 1, because deployment and incident records are complete) |
| `incomplete_reasons` | Stable codes for a source that is behind even though its buckets look covered. The only code is `ledger_stale`, for costs. Empty otherwise |
| `collector_stale` | Resources only, and present only as `true` when the metrics collector is behind. Absent otherwise; a server that predates the field never sends it |
| `coverage` | `expected_points`, `observed_points`, `ratio`, `first_at` and `last_at` of the buckets |
| `units` | The unit of each kind of number, for example `{"cost":"nano_usd","balance":"usd_cents"}` |
| `notes` | Plain statements of what the numbers do and do not mean |

### When a source is behind {#source-behind}

Full bucket coverage does not prove a source is current: a daily bucket can be covered by a sample taken hours ago.
Two checks look at the newest record instead, set `complete` to `false` and add a note to `notes`.

- **`ledger_stale`** in `incomplete_reasons` (costs). The newest usage ledger row ended more than 3 hours before
  `observed_at` while the workspace has a wallet and runs a project or template that billing charges, has charged
  before, and that has not changed in those 3 hours. A workload just started, resumed or resized is not expected in
  the ledger yet, and one whose hourly cost rounds to zero cents never gets a row. The totals stop short of now. A
  workspace with nothing running is never stale.
- **`collector_stale: true`** (resources). The newest sample in the window is more than 30 minutes old, or there is
  none, while the workspace has a workload due a sample: an active project or running template with at least one
  replica, assigned to a server, and neither created nor changed in the last 30 minutes. It is not a code in
  `incomplete_reasons`, which keeps the same values.

In the overview, the `costs` and `resources` sections stay `ok` and carry the same `meta`, so the flag and the notes
show there too.

`collector_stale` is a workspace-wide check against the newest sample of any workload, so it has known limits:

- A recent sample from one server hides a collection gap on another server. Read each workload's `last_sample_at`
  and `state` to find the workloads that are behind.
- A template that was woken recently can show the flag until its first sample arrives, because waking does not
  change its update time.

## Overview

```http
GET /api/workspaces/{slug}/analytics/overview?window=24h
```

The answer has `observed_at`, `window`, `from`, `to` (the window before alignment) and three sections, `costs`, `resources` and `reliability`.
Each section has a `status`:

| `status` | `data` |
|----------|--------|
| `ok` | The summary of that section |
| `forbidden` | `null`. The credential lacks the section's scope (`billing:read`, `projects:read` or `deployments:read`); `reason` says which data it cannot read |
| `unavailable` | `null`. Its source could not be read. The route still answers `200` with the other sections; the three sections share one 10-second limit, so a timeout can mark more than one `unavailable` |

The summaries are: `costs` with `meta`, `totals`, `prepaid`, `budget_status` and `unavailable`; `resources` with
`meta`, `totals` and `latest_memory_bytes` (the memory of the newest bucket that has samples; `null` when any workload in that bucket lacks a valid reading, never an older bucket's value); `reliability` with
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
| `resources`, `resources_truncated` | The top resources by cost (`type`, `id`, `name`, `project_id` for a disk of a project, the three amounts, `usage_records`), and whether some were left out |
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
- **Observed** memory is the workload's memory **summed over its running pods** (up to 10), read about every five
  minutes. A sample in which some running pod could not be read is ignored, and so is a reading of zero bytes. Samples
  stored before the collector read every pod describe one pod, so they count only for a workload with at most one pod.
- **CPU use is not collected.** CPU appears only as configured and allocated.
- A CPU size is read as a Kubernetes quantity, so `"0.5"` and `"500m"` are both half a core, the same way
  [billing](/guide/pricing#compute) reads it.

| Field | Meaning |
|-------|---------|
| `series` | Per bucket: `at`, `workloads`, `memory_workloads`, `memory_bytes` (the sum, over workloads, of each one's average all-pod reading in the bucket; `null` when nothing was observed), `pods`, `ready_pods` |
| `totals` | `workloads` (every listed project and template), then for those running with replicas: `running`, `replicas`, `allocated_cpu_cores`, `allocated_ram_gib`, and `no_samples` (running workloads with no sample in the window) |
| `workloads`, `workloads_truncated` | The largest workloads by allocated RAM, and whether some were left out |

Each workload has `type` (`project` or `template`), `id`, `name`, `status`, `replicas`, the configured and allocated
sizes, `sampled` (a sample is expected), `samples`, `observed_memory_bytes_last`, `observed_memory_bytes_avg`, `observed_memory_bytes_max`,
`last_sample_at`, `pods`, `ready_pods` and `state`:

| `state` | Meaning |
|---------|---------|
| `observed` | The collector has at least one sample in the window (the memory fields can still be `null` if every reading was zero) |
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
| `incidents` | `open` and `open_by_severity` now, `opened_in_window`, `resolved_in_window`, and `mttr_seconds` (mean time to resolve, `null` when none was resolved in the window) |
| `uptime` | Per project, from the latest check of its monitor: `projects`, `up`, `down`, `unknown`, `stale`, `not_monitored` |
| `deployments` | `total`, `succeeded`, `failed`, `in_flight`, `other`, `success_ratio`, `duration_avg_seconds`, `duration_p95_seconds`, and `series` (`at`, `succeeded`, `failed` per bucket) |

Deployments are project deployments created in the window. Incidents and uptime are as of `observed_at`.

### Deployment success

- A deployment **succeeded** when its rollout finished, its status is not `failed` and it carries no error. A later
  stop or rollback does not undo that.
- It **failed** when its status is `failed`.
- Deployments still in progress, including a rollback awaiting verification, are `in_flight`. Everything else is
  `other`: for example those stopped or rolled back before the rollout finished, or finished with an error but not
  marked `failed`. Neither counts as succeeded or failed.
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

## Dashboard {#dashboard}

When `GET /api/public/features` reports `analytics: true`, the dashboard shows **Analytics** under **Monitor** in the
sidebar, at `/w/{slug}/analytics?window=24h|7d|30d`, and the workspace **Overview** shows an **Analytics** section
after **Needs attention** and the active incidents. That section reads the overview route for the last 24 hours and
shows one card each for costs, resources, and service health with deployments; each card links to its section of the
Analytics page. If the overview route answers `404`, the section hides itself.

Both read the routes above as the signed-in person, so they show nothing that person cannot read through the API.

- Each section of the Analytics page loads on its own. A section the person cannot read shows a permission message,
  and the others still load. A failed request or an unreadable answer shows an error with **Try again**. A `429`
  asks the person to wait five seconds. A section whose route answers `404` says it is not available on this
  platform. On the Overview, a section that is `unavailable` shows its error while the other cards stay.
- Warnings follow `meta`: coverage from `coverage`, and `complete` with `incomplete_reasons`. `ledger_stale` warns
  that recent spend may be missing. `collector_stale: true` warns that the collector has stopped reporting and hides
  the current resource readings rather than showing old ones as current.
- An unmeasured value shows as a dash (`—`), never as zero, and a missing bucket breaks the chart line.
- Costs show actual metered spend (ended ledger periods) and live metered spend (the period in progress) as separate
  tiles. The month-end forecast and compute runway are shown apart from observed spend.
- Resources show allocated CPU and RAM, each workload's per-replica size, and sampled memory: each workload's running pods, summed
  across workloads. CPU in use is shown as not measured.
- Service health shows open incidents by severity, the latest uptime check counts, deployment outcomes, the success
  ratio, and average and p95 deployment time. Its chart counts finished deployments.

## Not in v1

- Account-level or cross-workspace analytics.
- CI and agent usage. Use [CI usage and budget](/api/ci-usage-budget), [Agent usage and budgets](/api/agent-usage),
  the MCP tools `ci_get_usage` and `get_agent_usage`, or `tose ci usage`.
- Alerts, anomaly detection, HTTP latency percentiles and any write.
- CPU use, and history older than 30 days.

[`tose analytics`](/commands/analytics) is merged in tose-cli
([saasvn/tose-cli#108](https://github.com/saasvn/tose-cli/pull/108)) but is not in a released version yet (the latest
is v0.2.0). There are no analytics MCP tools or WebMCP
adapters yet; until there are, read these routes directly.

## Related documentation

- [API Keys and Scopes](/api/api-keys)
- [Errors](/api/errors)
- [CI usage and budget](/api/ci-usage-budget)
- [Agent usage and budgets](/api/agent-usage)
