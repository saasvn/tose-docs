# tose analytics

Read-only analytics for one workspace: costs, resources and reliability. `tose analytics` calls the workspace analytics API (`GET /api/workspaces/{slug}/analytics/{view}`); it never writes, raises alerts or changes billing. See the [workspace analytics](https://github.com/saasvn/tose-app/blob/master/docs/analytics.md) reference for the metric definitions.

::: info Next CLI release
`tose analytics` ships in the next CLI release, after [saasvn/tose-cli#108](https://github.com/saasvn/tose-cli/pull/108). Older CLI versions do not have the command.
:::

| Command | What it shows | Key scope |
|---------|---------------|-----------|
| `tose analytics overview` | Costs, resources and reliability in one read | `workspace:read` |
| `tose analytics costs` | Metered spend, top resources, prepaid balance and forecast | `billing:read` |
| `tose analytics resources` | Allocated CPU/RAM per workload and observed memory | `projects:read` |
| `tose analytics reliability` | Incidents, uptime evidence and deployment outcomes | `deployments:read` |

```bash
tose analytics overview                 # last 24h
tose analytics costs --window 7d
tose analytics resources --window 30d
tose analytics reliability --json
```

Every view takes `--window 24h|7d|30d`, ending now (default `24h`). Any other value is refused before a request is sent, with exit code `2`. The workspace comes from the usual [context resolution](/commands/overview#context-resolution), for example `--workspace <slug>`.

## Server switch

The server keeps analytics off unless `ANALYTICS_ENABLED` is set. While it is off every view fails with `NOT_FOUND` (exit code `6`), as it does when your account is no longer a member of the workspace. A workspace other than your API key's fails with `API_KEY_WORKSPACE_SCOPED` (exit code `3`). A key that lacks the view's scope still gets `INSUFFICIENT_SCOPE`, because the permission check runs first.

## Scopes

- `overview` needs only `workspace:read`. A section the key may not read shows as `forbidden`, and a section whose source could not be read shows as `unavailable`. Neither carries numbers, so one scope never exposes another area.
- `costs`, `resources` and `reliability` fail with `INSUFFICIENT_SCOPE` (exit code `3`) when the key lacks their scope, and name the missing scope in `details.required_scope`.

## Reading the numbers

- `null` means unknown, never zero. The text view prints it as `unknown`.
- Costs are nano-USD (1 USD = 1,000,000,000).
- Allocated CPU and RAM are configuration, not usage. Observed memory comes from one pod per workload, so it describes one replica. CPU use is not collected.
- Uptime is the latest check of each project's monitor. `stale`, `unknown` and `not_monitored` never count as up, and there is no uptime percentage because check history is not stored.
- CI minutes are not here: use [`tose ci usage`](/commands/ci).

## JSON output

`--json` puts the API answer unchanged in `data`, including `meta`: `complete`, `coverage`, `granularity`, `units` and `notes`, next to the window itself (`window`, `from`, `to`). `complete` is `false` when a closed bucket has no data or uptime evidence is stale, so check it before you trust a total.

```bash
tose analytics costs --window 7d --json
```
