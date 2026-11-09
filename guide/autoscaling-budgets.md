# Autoscaling budgets

An autoscaling budget limits how much compute a workspace or a project may be set up to spend. It caps the hourly and monthly cost, and it can keep a **floor**: a minimum allocation that stays funded for 72 hours. Any change that would raise your allocation past a cap is refused before it happens.

::: info The platform operator turns this on
Budgets are off by default. When the feature is off, the budget routes return `404`, the budget tools are not listed, and no deploy or scale is ever refused for budget reasons. On a platform that serves it, `GET /api/public/features` reports `autoscaling_budget: true` (see [Platform features](/api/reference#platform-features)).
:::

## What a budget covers

A budget counts **project compute** only: the CPU and RAM of project replicas that are running or starting. Templates, databases, disks, desktops, runtimes and CI have their own billing or their own budgets and are not counted here.

There are two scopes:

| Scope | What it limits |
|-------|----------------|
| Workspace | Hourly and monthly caps on the total cost of all projects in the workspace. |
| Project | Hourly and monthly caps on one project, and the project's floor. |

An empty budget (no caps, no floor) changes nothing: nothing is refused and nothing extra is checked.

## Caps

A cap is an amount in USD per hour or per month. Either cap, or both, may be set, and `none` clears one.

- **Hourly cap:** the configured hourly cost of the projects that are running or starting must stay at or below it. Replicas, CPU and RAM all count.
- **Monthly cap:** the cost already billed this UTC month, plus the current hourly cost for the rest of the month, must stay at or below it.

The budget page and `tose autoscaling budget get` show the numbers behind a cap: the hourly cost now, the month to date, and the month projection.

### What is refused

The check runs when you try to **raise** the allocation. These actions return `402 BUDGET_CAP` when they would go over a cap:

- changing a project's replicas, CPU or RAM,
- deploying, redeploying or rolling back,
- deploying an image, and applying environment changes that restart the project,
- an approved recovery runbook that scales a project.

The error says which cap would be exceeded (`workspace_hourly`, `workspace_monthly`, `deployment_hourly` or `deployment_monthly`), its limit, and the cost the change would have reached. See [`BUDGET_CAP`](/api/errors#BUDGET_CAP).

Two things are never refused: lowering the allocation, and resuming a project to the state it had before it was stopped. Restoring a prior state after a top-up is not a new increase.

::: tip Concurrent starts
Two requests that each fit alone but not together are handled one at a time: the second is refused. The check is conservative. A project with a deployment that has not finished counts at its configured cost, so it can briefly count twice and refuse a change that would have fit.
:::

## The floor and the 72-hour reserve

A project **floor** is the smallest allocation you want to keep running: a number of replicas with a CPU and RAM size each. The workspace **reserve** is the cost of all project floors for 72 hours.

An increase is refused with `402 INSUFFICIENT_BALANCE` and `details.reason = "floor_reserve"` when the unreserved wallet balance could not cover the floors for 72 hours plus one hour of the new allocation. While the floors are under-funded, every increase is refused until the wallet is topped up.

The budget shows whether the reserve is funded and how many hours of floor it covers, up to 72. It never shows the wallet balance itself. A floor's hourly cost cannot be higher than its project's hourly cap.

## No automatic downscale

A budget only **refuses increases**. It never stops a project, removes a replica or lowers CPU or RAM by itself. If you set a cap below what you are running now, the running workload stays as it is; only further increases are refused. To reduce spend, change the project yourself.

## Who can change a budget, and how agents are approved

| Action | Who |
|--------|-----|
| Read a budget | Any workspace member |
| Change a budget | Workspace owner or admin |
| Approve or reject an agent's change | Workspace owner or admin, signed in to the dashboard |

How a change takes effect depends on the credential:

- **Signed-in session** (the dashboard, or `tose` logged in as you): the change applies at once.
- **Workspace API key, or an agent over MCP:** the change does **not** apply. The API answers `202` with a **plan** (what changes, from and to) and a link to the dashboard, and the plan waits for a person.
- A signed-in owner or admin opens the link, checks the plan, and approves or rejects it. Approval is dashboard-only; an API key or an OAuth token that tries gets `403 HUMAN_APPROVAL_REQUIRED`.
- A plan lives 30 minutes. If the budget changed after the plan was made, approving it fails with `PLAN_STALE`, and the agent makes a new plan.

This keeps a person in charge of spending limits even when an agent is doing the work. See the [budget API](/api/autoscaling-budget) for the exact routes and shapes.

## Use it

| Where | How |
|-------|-----|
| CLI | [`tose autoscaling budget get` and `set`](/commands/autoscaling) |
| REST API | [Autoscaling budget API](/api/autoscaling-budget) |
| Dashboard | The **Autoscaling** page of a workspace, where plans are approved |
| MCP | `autoscaling_budget_get` reads a budget; `autoscaling_budget_plan` proposes a change and returns an approval link. See [MCP connector](/mcp#tools) |
| WebMCP (in the dashboard) | `get_autoscaling_budget`, read-only |

## Related

- [Pricing](/guide/pricing)
- [Errors](/api/errors)
