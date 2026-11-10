# Agent Runtime pricing and budgets

::: warning Rollout status
Agent Runtime usage metering is **not generally available yet**. It is switched off by default
(`AGENT_USAGE_ENABLED`), and the hook-up to the agent orchestrator, the funding cutover and the
runtime canary are still being finished. This page describes how metering behaves as a contract.
Until it is switched on for your TOSE installation, the usage API is not registered and the wallet
page shows no Agent runtime usage card.
:::

Agent Runtime usage is deducted from your workspace [wallet](/guide/pricing), like other compute.
TOSE meters every agent and every run, in integer nano-USD (1 USD = 1,000,000,000), and keeps an
append-only ledger you can check independently.

## How an interval is priced

CPU and RAM are metered for the time a sandbox is **Ready**:

- The interval starts when TOSE has **confirmed the sandbox Ready** and ends when it has **confirmed
  the sandbox terminated**. A pod that fails before it is Ready is not billed.
- The price is `CPU cores × hours × CPU rate + GiB of RAM × hours × RAM rate`, from the CPU and RAM
  **requested** for the sandbox pod. A Ready sandbox is charged for its full request, whether or not
  it uses all of it.
- Each amount is rounded half-up to a whole nano-USD. When an interval is split between a run and
  idle time, the parts add up to exactly the same total, so the split never adds a charge.
- **The price is frozen when an interval opens.** A falling balance never raises the price of an
  interval that is already running, and a later price change applies only to new intervals. Every
  ledger row records the `pricing_version` that priced it.

| Usage | Price |
|-------|-------|
| Shared CPU | $0.02 per core-hour, at any wallet balance |
| Shared RAM | $0.01 per GiB-hour, at any wallet balance |
| Storage | The [wallet storage price](/guide/pricing#storage) ($0.15 per GiB-month) |
| Managed-model tokens | See [Model keys](#model-keys) |

Agent CPU and RAM use the base rate and **get no wallet-balance discount**. A workload that holds one
core and 2 GiB of RAM for one hour costs $0.02 + 2 × $0.01 = **$0.04**. You can price a workload
before you run it with the [pricing preview](/api/agent-usage#pricing-preview).


## What is free, forgiven and owed {#free-forgiven-owed}

| Case | What happens |
|------|--------------|
| A **cold** agent (no sandbox running) | Costs **$0** compute. |
| A pod that **fails before Ready** | Not billed. |
| Compute the wallet or a budget **cannot cover** | **Forgiven.** It is recorded as `forgiven_nano_usd` and never charged or owed. |
| **Storage** (the agent's disk) | **Billed separately.** It is the only amount that can be owed. |

- Compute is prepaid. Before a sandbox runs, TOSE holds the funds for it and settles the hold against
  the confirmed Ready time. You are never charged for compute beyond what you have paid in.
- Storage is billed from the disk's confirmed allocated capacity, including while the agent is cold,
  stopped or deleted but its disk still exists. Stopping compute never deletes the data. Storage cannot
  use money that is held for a run.
- Forgiven compute is not refunded and not charged later. A confirmed termination that arrives late
  corrects the affected run and idle usage, but does not refund compute that was already forgiven.

See also [When the balance is zero](/guide/pricing#when-the-balance-is-zero).

## Hard budgets

A hard budget caps the spend of the whole workspace, one agent or one run:

1. Open **Wallet & billing** in the dashboard, then **Usage**, and find **Agent runtime usage**.
2. Choose the scope (workspace, agent or run), pick an existing agent or run of the workspace, and
   enter a limit in USD (up to nine decimal places).

A limit of `0` blocks compute for that scope. When spending reaches the limit, the budget is
**fenced** and **fails closed**: the run stops, and nothing wakes or reserves funds for that scope
until you raise the limit above the amount spent, which lifts the fence. Compute beyond the limit is
recorded as forgiven. A stopped sandbox keeps its disk. A request that would exceed a budget is
refused with `402` and the code `budget_exhausted`.

The workspace's monthly wallet budget is only a forecast alert. It does not limit Agent Runtime
spend; hard budgets do. You can also manage budgets with the [budgets API](/api/agent-usage#budgets).

## Model keys {#model-keys}

How a model call is billed depends on whose API key the agent uses:

| | BYOK (bring your own key) | TOSE-managed key |
|---|---|---|
| Who bills the model | Your model provider | TOSE |
| TOSE charges for tokens | **No.** Telemetry only | **Yes**, by token |
| In a ledger row | `provider_cost_nano_usd`, with a zero `cost_nano_usd` | `cost_nano_usd` |
| TOSE still charges | The infrastructure (CPU, RAM, storage) | Infrastructure and tokens |

- With **BYOK**, TOSE charges only for infrastructure. Token counts and the provider's cost are
  recorded so you can see them next to your TOSE usage, but the provider bills you for the model.
- With a **TOSE-managed key**, tokens are priced per model, in nano-USD per million tokens. Before a
  managed call, the run reserves the call's **maximum** cost; the verified provider receipt then
  settles the call once and releases what was not used. A model **without a price is refused**
  instead of being guessed, and the [pricing preview](/api/agent-usage#pricing-preview) answers `422`
  for it. Cache tokens have no price yet and are not charged.

## See your usage

- **Dashboard:** the **Agent runtime usage** card on the wallet billing page shows what TOSE charged,
  the BYOK provider telemetry, what was not charged because a budget or the wallet ran out, usage by
  run, the hard budgets and recent budget events.
- **API:** [Agent usage and budgets API](/api/agent-usage) for per-agent and per-run drilldowns, the
  budget events trail and a reconciliation that recomputes every closed interval from its lifecycle
  events, so an invoice can be checked independently of the ledger.

## Related

- [Pricing](/guide/pricing)
- [Persistent Disks](/guide/persistent-disks)
- [Agent usage and budgets API](/api/agent-usage)
