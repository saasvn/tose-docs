# CI usage and budget caps

TOSE CI is paid from the workspace's prepaid wallet. This page explains how to see what CI spent and how to put a hard ceiling on it. The route and tool details are in [CI usage and budget API](/api/ci-usage-budget).

## Reading usage {#usage}

Every finished job attempt that reached the cluster leaves one usage event. Any workspace member (or a credential with `ci:read`) can sum those events:

- **Window.** Without `from` or `run_id`, the report covers the last 30 UTC days. `from` is inclusive and `to` is exclusive, as RFC 3339 or `YYYY-MM-DD` (UTC). A window is at most 366 days, and at most 1000 rows come back (`truncated` tells you when rows were cut).
- **Grouping.** `group_by` is `day` (default), `run`, `pipeline`, `job` or `kind` (`compute`, `credit`, `review`). Narrow the report with `pipeline_id` or `run_id`.
- **Amounts.** Every amount is an exact integer sum: `cost_nano_usd` and `billed_nano_usd` in nano-USD, `credit_nano_usd` for platform failures that were not charged, `capped_nano_usd` above a job's hold that was not charged, `forgiven_nano_usd` when the wallet ran out, and `charged_cents` taken from the wallet.

## Budget caps {#budget-caps}

A cap limits the billed CI of a scope in one UTC period. `0` means no cap, and the wallet balance is always the last cap.

| Scope | Limit | Applies to |
|-------|-------|------------|
| Workspace daily | `max_daily_cost_cents` | The CI of every pipeline together, per UTC day |
| Workspace monthly | `max_monthly_cost_cents` | The same, per UTC month |
| Pipeline run | `max_run_cost_cents` | Each run of that pipeline. A run's `.tose/ci.yml` `budget.max_run_cost_usd` can only lower it |
| Pipeline daily | `max_daily_cost_cents` | That pipeline, per UTC day |
| Pipeline monthly | `max_monthly_cost_cents` | That pipeline, per UTC month |

Caps are USD cents from 1 to 10,000,000. The wallet balance still has to cover each job as well.

### Spent, held and remaining {#spent-held-remaining}

Reading the caps shows, for each one:

- **Spent** (`spent_nano_usd`): compute already billed in the current UTC period.
- **Held** (`held_nano_usd`): the worst case of the jobs running now.
- **Remaining** (`remaining_nano_usd`): what is left. `used_percent` is (spent + held) / limit, and can exceed 100 after a cap is lowered.
- **State**: `ok`, `near` once usage reaches the alert share, or `reached`. `period_start` and `resets_at` give the UTC period.

### Alerts {#alerts}

`alert_percent` (1 to 100, default 80) is set once for the whole workspace. When a reservation brings a cap to that share, members get one warning per cap, UTC period and limit. When a job is refused, they get one critical notice. Every cap change also notifies members and names who changed what, so a cap an agent lowered is never silent.

## The hard cap {#hard-cap}

Before a job starts, its worst case is held against every cap that applies. If it does not fit in what a cap has left, the job ends in `error` with a "budget cap reached" reason and the amounts. It is never started or charged, and its GitHub Check Run says so. A retry needs a new hold, so a reached cap stops retries as well.

A manual run whose largest job does not fit is refused up front with `402 CI_BUDGET_CAP_REACHED`.

Lowering a cap does not stop jobs already running: they keep their reservation and are billed for the seconds they run.

## Who can change a cap {#who-can-change}

- Every member can read usage and caps.
- Setting a cap needs a workspace owner or admin and, for an API key or connected app, the `ci:execute` scope.
- **Credentials can only add or tighten.** An API key, a connected app or an MCP client can set a cap where there is none, or lower one. Raising or removing a cap is refused with `403 person_required`.
- To raise or remove a cap, an owner or admin signs in to TOSE and makes the change (dashboard or session-authenticated API call). A cap a person set therefore always holds against agents.
- `If-Match` with the ETag you read makes the change fail with `412 precondition_failed` if someone changed the caps in between. Read again and retry.

Every change, allowed or refused, is in the workspace audit log.

## MCP tools {#mcp}

| Tool | Scope | Purpose |
|------|-------|---------|
| `ci_get_usage` | `ci:read` | Sum usage by day, run, pipeline, job or kind |
| `ci_get_budget` | `ci:read` | List every cap with spent, held, remaining, the alert share and the ETag |
| `ci_set_budget` | `ci:execute`, owner or admin | Add or lower a cap; pass `pipeline_id` for a pipeline, `if_match` for the ETag |

Raising or removing a cap is not an MCP action; ask a person to do it signed in to TOSE.
