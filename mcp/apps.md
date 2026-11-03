# Apps: views inside your agent

Hosts that support MCP Apps (`io.modelcontextprotocol/ui`) show an interactive view next to some tool results. Hosts that do not support them ignore the view and show the plain result, which carries the same data.

## Views

| View | Shown for | Contents |
|------|-----------|----------|
| Deployment timeline | `get_deployment_status` | Deployment stages, refreshed every 5 seconds until the deployment finishes. Recent deployments, and the build log on request. |
| Deployment plan | `deploy_project`, `rollback_deployment` | The plan, its estimated cost, and a button that opens the approval page. After you approve, the deployment status. |
| Diagnostics | `inspect_deployment` | Deployment details, the redacted error, likely causes with the evidence behind each, and next steps for a failed deployment. |

## Diagnosis evidence

For a failed deployment, `inspect_deployment` returns a `diagnosis`. Its likely causes are hypotheses, not proof, and each one names the evidence it rests on:

- `findings` lists each `cause` with its `evidence_ids`.
- `evidence` lists the observations: `id`, `source` (`deployment`, `deployment_error`, `runtime_log`, `ops_event` or `resource_metric`), `observed_at` and a generic `summary`.

Raw log and event text is never copied into the diagnosis. To read the source behind an id, use the pointer in its `summary`: a `runtime_log` item names the `read_logs` call to make (runtime logs from the last 24 hours only, where the cited line is marked `#<entry-id>`), and an `ops_event` item names the incident for `inspect_incident`. Pod metrics are context, not proof of a cause. A rollback is only ever suggested for you to approve.

## Which hosts support them

Support depends on the host and its version. The [client matrix](https://github.com/saasvn/tose-app/blob/master/docs/mcp-client-matrix.md) in tose-app records what each vendor documents. None has been verified against TOSE yet, so treat Apps as a bonus, not something your workflow depends on.

## Cost in the plan is an estimate

The cost shown in a plan is the **price-list rate** for your workspace's balance band, multiplied by the configured CPU, RAM and number of replicas. It is shown in US cents per hour and US dollars per 30 days (720 hours). **It is an estimate.** Real charges are metered hourly. See [pricing](/guide/pricing).

## What a view can and cannot do

- The views are built into the server, load nothing external and render data as text only.
- A view reaches TOSE through the host, with exactly the connection's scopes, and it only calls read tools.
- Approving still happens on the TOSE approval page. The plan view only opens that link. It never sees or sends an approval token.
