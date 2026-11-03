# Apps: views inside your agent

Hosts that support MCP Apps (`io.modelcontextprotocol/ui`) show an interactive view next to some tool results. Hosts that do not support them ignore the view and show the plain result, which carries the same data.

## Views

| View | Shown for | Contents |
|------|-----------|----------|
| Deployment timeline | `get_deployment_status` | Deployment stages, refreshed every 5 seconds until the deployment finishes. Recent deployments, and the build log on request. |
| Deployment plan | `deploy_project`, `rollback_deployment` | The plan, its estimated cost, and a button that opens the approval page. After you approve, the deployment status. |
| Diagnostics | `inspect_deployment` | Deployment details, the redacted error, likely causes and next steps for a failed deployment. |

## Which hosts support them

Support depends on the host and its version. The [client matrix](https://github.com/saasvn/tose-app/blob/master/docs/mcp-client-matrix.md) in tose-app records what each vendor documents. None has been verified against TOSE yet, so treat Apps as a bonus, not something your workflow depends on.

## Cost in the plan is an estimate

The cost shown in a plan is the **price-list rate** for your workspace's balance band, multiplied by the configured CPU, RAM and number of replicas. It is shown in US cents per hour and US dollars per 30 days (720 hours). **It is an estimate.** Real charges are metered hourly. See [pricing](/guide/pricing).

## What a view can and cannot do

- The views are built into the server, load nothing external and render data as text only.
- A view reaches TOSE through the host, with exactly the connection's scopes, and it only calls read tools.
- Approving still happens on the TOSE approval page. The plan view only opens that link. It never sees or sends an approval token.
