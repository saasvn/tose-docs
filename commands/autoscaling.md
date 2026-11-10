# tose autoscaling

Read and change the [autoscaling budget](/guide/autoscaling-budgets): hourly and monthly caps for a workspace or a project, and a project floor.

All commands accept the [global options](/commands/overview#global-options), including `--json`. The platform operator must have turned budgets on; otherwise the commands fail with `FEATURE_DISABLED` (exit code `6`).

**Scope.** Every command works on the workspace unless you pass `--project <slug>`. The project from `TOSE_PROJECT`, `.tose.json` or `tose use` is not used here, so a workspace change is never applied to one project by accident.

## tose autoscaling budget get

Show the caps, the current usage, the floor reserve and any plans waiting for approval.

### Synopsis

```bash
tose autoscaling budget get [--project <slug>] [--json]
```

### Usage

```bash
# Workspace budget
tose autoscaling budget get

# One project
tose autoscaling budget get --project api --json
```

With `--json` the `data` field is the [WorkspaceBudget or ProjectBudget](/api/autoscaling-budget#shapes) object. Amounts are in nano-USD there; the plain output shows USD.

---

## tose autoscaling budget set

Propose new caps and, for a project, a new floor. The CLI always authenticates with an API key, so `set` never applies a change itself: it creates a plan that a signed-in workspace owner or admin approves. The key needs `projects:write`, and its owner needs the workspace owner or admin role.

### Synopsis

```bash
tose autoscaling budget set [--project <slug>]
  [--hourly <usd>|none] [--monthly <usd>|none]
  [--floor-replicas <n> --floor-cpu <cores> --floor-ram <gib> | --no-floor]
  [--if-match <etag>] [--json]
```

### Options

| Option | Description |
|--------|-------------|
| `--project <slug>` | Change one project instead of the workspace |
| `--hourly <usd>` | Hourly cap in USD, or `none` to clear it |
| `--monthly <usd>` | Monthly cap in USD, or `none` to clear it |
| `--floor-replicas <n>` | Floor replicas, 1 to 100. Needs `--project`, `--floor-cpu` and `--floor-ram` |
| `--floor-cpu <cores>` | Floor CPU per replica, 0.25 to 64 |
| `--floor-ram <gib>` | Floor RAM per replica in GiB, 0.5 to 256 |
| `--no-floor` | Remove the project floor |
| `--if-match <etag>` | Apply only if the budget is still at this ETag |

At least one of the cap or floor options is required. Flags you leave out keep their current value.

USD amounts have up to 9 decimals and are converted to nano-USD exactly, so `0.05` is sent as `50000000`.

### How it works

1. `set` reads the current budget, because the API needs every cap key on each write.
2. It merges the flags you gave and sends the result with the ETag it read as `If-Match` (or your `--if-match`). The write is always conditional. If someone changed the budget in between, the write fails with `PRECONDITION_FAILED` and nothing changes. Run `get` again and retry.
3. A network failure or gateway error is retried with the same body and the same `If-Match`. Proposing the same change again returns the plan that is already pending, so a retry never creates a second plan.

### Usage

```bash
# Hourly cap of $0.05 and a monthly cap of $30
tose autoscaling budget set --hourly 0.05 --monthly 30

# Clear the hourly cap, keep the monthly one
tose autoscaling budget set --hourly none

# Keep at least one 0.5 CPU, 1 GiB replica running in project api
tose autoscaling budget set --project api --floor-replicas 1 --floor-cpu 0.5 --floor-ram 1
```

### Approval

The API does not apply the change. It stores a plan, and `set` exits `0`. The CLI prints `Approval needed: open <url>`. With `--json` the result has `status: "pending"`, `data.plan`, `data.approval_url`, and a `next_actions` entry whose `url` is the same link. With `--project`, a second entry shows how to check the project budget after approval:

```json
{
  "schema_version": "1",
  "status": "pending",
  "success": true,
  "data": {
    "plan": { "id": "plan_01", "status": "pending", "expires_at": "2026-11-09T10:30:00Z" },
    "approval_url": "https://tose.sh/w/acme/autoscaling?plan=plan_01"
  },
  "message": "Approval needed: open https://tose.sh/w/acme/autoscaling?plan=plan_01",
  "next_actions": [
    {
      "command": "tose autoscaling budget get --json",
      "description": "Lists this plan under pending_plans until a signed-in owner or admin approves it in the dashboard",
      "url": "https://tose.sh/w/acme/autoscaling?plan=plan_01"
    }
  ]
}
```

A signed-in owner or admin opens the link and approves the plan in the dashboard. The CLI has no approve command, and `--yes` does not skip this step, because the approval happens on the server. The plan expires after 30 minutes. `tose autoscaling budget get` lists pending plans, a project's included; run it afterwards to see that the plan was applied.

### Errors

With `--json`, errors use the [standard envelope](/api/errors). The API `code` is passed through, except for three cases the CLI names itself (`FEATURE_DISABLED`, `INSUFFICIENT_SCOPE`, `API_KEY_WORKSPACE_SCOPED`):

| `error.code` | Meaning |
|--------------|---------|
| `VALIDATION_ERROR` | A flag is wrong or incomplete, for example `--floor-cpu` without `--floor-replicas`. Nothing was sent. Exit code `2`. |
| `PRECONDITION_FAILED` | The budget changed since it was read. Run `get`, then retry. Exit code `1`. |
| `FEATURE_DISABLED` | Autoscaling budgets are not enabled on this server. After a `404` from a budget route, the CLI checks `GET /api/public/features` and reports this when `autoscaling_budget` is `false`. Exit code `6`. |
| `not_found` | The API key's owner is no longer a member of the workspace, or budgets are off but the CLI could not confirm it from `GET /api/public/features`. Exit code `6`. |
| `NOT_FOUND` | The project does not exist in the workspace. Exit code `6`. |
| `forbidden` | Your workspace role is too low. Exit code `3`. |
| `INSUFFICIENT_SCOPE` | The API key lacks the scope (`projects:read`, or `projects:write` for `set`). Create a key that has it. Exit code `3`. |
| `API_KEY_WORKSPACE_SCOPED` | The workspace does not exist, or the API key belongs to another workspace. An API key cannot tell the two apart, so check the slug, then use a key created in that workspace. Exit code `3`. |
| `INVALID_ARGUMENT` | The API refused a value, for example a floor that costs more than the project's hourly cap. Exit code `2`. |
| `unavailable` | The API could not complete the request (`503`). For the write inside `set`, the CLI tries up to three times with the same body and `If-Match` before it reports the error; a `503` on a read is reported straight away. The error has `retryable: true`. Exit code `1`. |
| `BUDGET_CAP`, `INSUFFICIENT_BALANCE` | Returned by deploy, redeploy and other commands that raise an allocation. See [Errors](/api/errors#BUDGET_CAP). `INSUFFICIENT_BALANCE` exits `9` and its `next_actions` links to the top-up page. |

## Related

- [Autoscaling budgets guide](/guide/autoscaling-budgets)
- [Autoscaling budget API](/api/autoscaling-budget)
