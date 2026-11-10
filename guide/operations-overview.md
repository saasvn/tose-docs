# Operations across workspaces

The **Operations** page (`/operations`, under **Platform** in the sidebar) shows every workspace you belong to in one table, so you see where to look first when you run several workspaces.

## What it shows

For each workspace:

- your role;
- projects that are not archived or deleted, counted by the status of each project's latest deployment: running, failed, in progress (pending, cloning, building, pushing or deploying), stopped, not deployed yet, and other (for example rolled back);
- installed apps (templates) that are not deleted, counted by status;
- open incidents, with the highest severity among them;
- `health`.

Workspaces that need attention come first (open incidents by severity, then failed deployments or apps). Each row links to the workspace's Overview, Projects and Apps and, when an incident is open, to its active incidents.

::: info Health is never "healthy" here
`health` is `degraded` when the workspace has an open incident and `unknown` otherwise. The summary reads no uptime checks, so `unknown` means no open incident and no uptime evidence in this view, not "all clear". Open the workspace Overview to see a healthy status. Billing, wallet and forecast figures are not part of the summary.
:::

All counts come from one read-only snapshot taken at `observed_at`. At most 100 workspaces are listed, ordered by name; when you belong to more, the response says `"truncated": true` and the page says so.

## API

```http
GET /api/operations/summary
```

- A signed-in person sees exactly the workspaces they belong to now.
- An API key needs the `deployments:read` scope (without it: `insufficient_scope`) and sees only its own workspace, and nothing if its user left the workspace.
- The response holds names, slugs, roles and counts only, never a secret.

See `getOperationsSummary` in the [OpenAPI contract](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml) and [API keys](/api/api-keys) for scopes.
