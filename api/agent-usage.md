# Agent usage and budgets API

REST endpoints for the metering of the Agent Runtime: usage per agent and per run, a pricing preview,
hard budgets, the budget events trail and a reconciliation. For how usage is priced, see
[Agent Runtime pricing and budgets](/guide/agent-runtime-pricing).

::: warning Rollout status
These endpoints exist only when Agent Runtime usage is switched on for the TOSE installation
(`AGENT_USAGE_ENABLED`, off by default). The orchestrator hook-up and the runtime canary are still
open, so treat this as the contract, not as generally available.
:::

All paths are relative to:

```
https://api-v2.tose.sh/api/workspaces/{slug}
```

Authenticate with an API key in the `X-API-Key` header (see [Authentication](/api/authentication)).
A workspace you cannot see answers `404`.

## Endpoints

| Method | Path | API key scope | Purpose |
|--------|------|---------------|---------|
| `GET` | `/agent-usage` | `billing:read` | Totals of the whole workspace, hard budgets, latest budget events |
| `GET` | `/agents/{agent_id}/usage` | `billing:read` | Cost drilldown of one agent |
| `GET` | `/runs/{id}/usage` | `billing:read` | Cost drilldown of one run |
| `GET` | `/agent-usage/pricing-preview` | `billing:read` | Price a workload without recording anything |
| `GET` | `/agent-usage/budgets` | `billing:read` | List hard budgets |
| `PUT` | `/agent-usage/budgets` | `billing:write` | Set a hard budget |
| `GET` | `/agent-usage/budget-events` | `billing:read` | Budget exhaustion and denial events |
| `GET` | `/agent-usage/reconciliation` | `billing:read` | Compare the ledger with lifecycle events |

Any workspace member can call them. `billing:write` includes `billing:read`; see
[API Keys and Scopes](/api/api-keys).

The OpenAPI contract is the source of truth for every field, enum and response. Read the
**Agent usage** tag in
[`internal/apispec/openapi.yaml`](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml)
in `tose-app` instead of relying on a copy here.

## Amounts

All money fields are integer **nano-USD** (1 USD = 1,000,000,000). Summaries also carry
`charged_usd`, a decimal USD string with nine fractional digits.

| Field | Meaning |
|-------|---------|
| `charged_nano_usd` | Charged to the wallet by TOSE. Negative on a correction row. |
| `forgiven_nano_usd` | Compute that a budget or an empty wallet could not cover. Not charged. |
| `provider_telemetry_nano_usd` | Model spend billed by the provider for BYOK keys. Never charged by TOSE. |

See [what is free, forgiven and owed](/guide/agent-runtime-pricing#free-forgiven-owed).

## Usage {#usage}

```bash
curl -H "X-API-Key: $TOSE_API_KEY" \
  "$TOSE_API/api/workspaces/$WS/agents/$AGENT_ID/usage?from=2026-11-01&to=2026-11-09&page=1&limit=20"
```

`/agent-usage`, `/agents/{agent_id}/usage` and `/runs/{id}/usage` return a `summary` (totals plus
`by_kind`, `by_cost_center` and `by_run` buckets). The two drilldowns also return the ledger
`entries`, with `total`, `page` and `limit`.

| Query | Meaning |
|-------|---------|
| `from`, `to` | UTC dates (`YYYY-MM-DD`). Only entries inside the period. A malformed value is ignored. |
| `page`, `limit` | Drilldowns only. `limit` is 1-100 and defaults to 20. |

Ledger rows are append-only. A correction is a new signed row, never an edit, and each row carries an
idempotency key (`source_event_id`), so one event produces one row however often it is delivered. An
agent or run with no usage returns zero totals. A run that belongs to another workspace also returns
zero totals.

## Pricing preview {#pricing-preview}

`GET /agent-usage/pricing-preview` prices a workload under the tariff your wallet currently
qualifies for. Nothing is recorded.

| Query | Meaning |
|-------|---------|
| `cpu_millicores`, `ram_mib`, `seconds` | CPU, RAM and the seconds the sandbox stays Ready |
| `storage_gib`, `storage_seconds` | Storage size and duration |
| `model_id`, `input_tokens`, `output_tokens`, `cache_tokens` | Model tokens |
| `key_source` | `byok` (default) or `tose_managed`. Tokens are priced only for `tose_managed`. |

```bash
curl -H "X-API-Key: $TOSE_API_KEY" \
  "$TOSE_API/api/workspaces/$WS/agent-usage/pricing-preview?cpu_millicores=1000&ram_mib=2048&seconds=3600"
```

The response holds `compute_nano_usd`, `storage_nano_usd`, `model_nano_usd`, `total_nano_usd`,
`total_usd`, the `pricing_version` and `models_available`. A quantity that is not a non-negative
integer or an unknown `key_source` returns `400`. A `tose_managed` model with no configured price
returns `422`.

## Budgets {#budgets}

A hard budget caps spending for the whole workspace, one agent or one run.

```bash
curl -X PUT -H "X-API-Key: $TOSE_API_KEY" -H "Content-Type: application/json" \
  -d '{"scope":"agent","scope_id":"'$AGENT_ID'","limit_nano_usd":5000000000}' \
  "$TOSE_API/api/workspaces/$WS/agent-usage/budgets"
```

| Field | Meaning |
|-------|---------|
| `scope` | `workspace`, `agent` or `run` |
| `scope_id` | The agent or run id. Ignored for `workspace`, which is always the caller's workspace. |
| `limit_nano_usd` | A non-negative integer. `0` blocks compute for the scope. |

The response is the budget with `limit_nano_usd`, `spent_nano_usd` and `fenced_at`. When spending
reaches the limit, `fenced_at` is set and the budget **fails closed**: nothing wakes or reserves funds
for that scope. Raising the limit above `spent_nano_usd` lifts the fence. The agent or run must
already exist in the workspace; otherwise the API returns `404`. A missing or negative limit, or an
unknown `scope`, returns `400`.

`GET /agent-usage/budgets` lists the budgets of the workspace.

## Budget events {#budget-events}

`GET /agent-usage/budget-events` lists events, newest first: `budget.exhausted`,
`budget.reserve_denied` and `budget.fence_cleared`. Filter by `agent_id`, and use `limit` (1-200,
default 50).

When a budget or the wallet is exhausted, a request that would start compute is refused with `402` and
the code `budget_exhausted`. See [Errors](/api/errors).

## Reconciliation {#reconciliation}

`GET /agent-usage/reconciliation` re-derives the cost of every closed Ready-to-terminated interval
from its lifecycle events and compares it with the ledger, so an invoice can be checked
independently. Pass `run_id` to check one run. The response has `consistent` (all intervals match)
and, per interval, the expected and ledger seconds and nano-USD and whether the interval is still
`open`.

## Related

- [Agent Runtime pricing and budgets](/guide/agent-runtime-pricing)
- [API Keys and Scopes](/api/api-keys)
- [Pricing](/guide/pricing)
