# TOSE MCP Connector

The TOSE MCP connector lets an MCP client such as Claude check deployments, read logs, and, with your explicit approval, deploy or roll back projects in one TOSE workspace.

- **Server URL:** `https://app.tose.sh/mcp` (Streamable HTTP). The OAuth issuer is `https://app.tose.sh`. If you run your own TOSE instance, use your own origin instead, as described in [Self-hosted instances](/mcp/oauth#self-hosted-instances).
- **Authentication:** OAuth 2.1 with your TOSE account. The client discovers everything from the server URL, so there is no API key to paste.
- **Availability:** the server operator enables it with `MCP_ENABLED=true`. If `/mcp` returns 404, the connector is not enabled on that TOSE instance.

## Connect

1. In your MCP client, add a custom connector with the server URL above.
2. The client opens a TOSE page in your browser. Sign in if asked.
3. On the consent screen, pick **one workspace**. The connection can only see that workspace.
4. If the client asked for deploy access, a checkbox offers **deploying and rolling back**. Leave it unticked for a read-only connection. Only workspace owners and admins can tick it.
5. Click **Approve**. You return to the client, which is now connected.

To connect another workspace, add the connector again and pick the other workspace.

## Tools

| Tool | What it does | Changes anything? |
|------|--------------|-------------------|
| `list_projects` | Lists projects in the workspace with their latest deployment. Optional `query` and `limit` (up to 100). | No |
| `get_deployment_status` | Status of one deployment, or the latest one, plus the 5 most recent deployments. | No |
| `inspect_deployment` | Commit, branch, author, image, trigger, timings, URL and error of one deployment. | No |
| `read_logs` | `source=build` reads a deployment's build log. `source=runtime` reads recent application logs (up to 24 hours back, optional `level`). Returns at most 500 lines and 64 KB. | No |
| `list_project_env_keys` | Lists the names of a project's environment variables and whether each is set. Needs the `env:read` scope. Never returns a value. | No |
| `inspect_project_env` | The same metadata for one variable name. Needs the `env:read` scope. Never returns a value. | No |
| `plan_project_env_update` | Plans a `set`, `rotate` or `delete` for up to 20 variables. Takes names and operations only. Needs the `env:write` scope. | No, returns a plan and an approval link |
| `apply_project_env_update` | Saves the changes you approved in TOSE. Takes the project and the approval token only. Needs the `env:write` scope. | **Yes**, needs approval |
| `deploy_project` | Builds and deploys the head commit of the project's connected branch, as shown in the plan. | **Yes**, needs approval |
| `rollback_deployment` | Puts the image of an earlier deployment live again. | **Yes**, needs approval |
| `plan_runbook` | Makes a read-only restart or rollback plan and returns an `approval_url`. | No |
| `execute_runbook` | Runs a plan you approved, once per `idempotency_key`. | **Yes**, needs a signed-in approval |
| `get_runbook` | Reads a plan, its approval and its verified result. | No |

### Autoscaling budget tools

When the platform has [autoscaling budgets](/guide/autoscaling-budgets) turned on, two more tools are listed:

| Tool | What it does | Changes anything? |
|------|--------------|-------------------|
| `autoscaling_budget_get` | Reads the caps, usage and floor reserve of the workspace, or of one project. Optional `project_slug`; without it you get the workspace budget. Needs `projects:read`. | No |
| `autoscaling_budget_plan` | Proposes new caps or a floor. It returns a plan and an approval link; the budget is not changed until an owner or admin approves the plan in the dashboard. Needs `projects:write` and an owner or admin. | No, until a person approves |

`autoscaling_budget_plan` takes these arguments:

| Argument | Meaning |
|----------|---------|
| `project_slug` | Optional. A project of the connected workspace; omit it for the workspace budget. |
| `caps` | Required. `{"hourly_nano_usd": n or null, "monthly_nano_usd": n or null}`. Both keys are required; `null` means no cap. |
| `floor` | Project only. `{"replicas": 1-100, "cpu": "0.25"-"64", "ram": "0.5"-"256"}`. Leave it out to keep the floor the project has. |
| `remove_floor` | Project only. `true` proposes removing the floor. Do not send it together with `floor`. |

A project plan without `floor` keeps the floor of the budget revision the plan is made against, so a floor a person changed in the meantime is not reverted. A floor on the workspace budget is `INVALID_ARGUMENT`.

An agent can never approve its own budget plan: no MCP tool approves, and approval needs a person's signed-in session, in practice the dashboard. A plan expires after 30 minutes. Proposing the same change again returns the same pending plan.

With budgets on, `deploy_project` refuses a start that would break a cap (`BUDGET_CAP`) or the floor reserve (`INSUFFICIENT_BALANCE`). If the budget cannot be checked, nothing is started and the tool returns the retryable `UNAVAILABLE`; try again shortly. See [Errors](/api/errors#mcp-budget-codes).

There is no generic API tool. The connector cannot read the value of an environment variable, and it cannot reach domains, databases, billing or members. It can change variables only through the approval-gated [env update tools](#env-update-tools), where you type every value in TOSE, never in the chat.

### Env metadata tools

`list_project_env_keys` and `inspect_project_env` answer "is this variable configured?" without a value ever leaving TOSE. Use them to tell a missing setting such as `S3_ENDPOINT` from a wrong one instead of guessing from logs.

- **Scope:** both tools need `env:read`. It is off by default and granted only when you tick its own box on the consent page. Without it, `tools/list` does not show the tools. See [Scopes](/mcp/oauth#env-metadata-env-read).
- **What you get for each variable:** the name, a `state`, whether it is a secret (`is_secret`), when it last changed, and `changed_since_deploy` when the project has a running deployment. There is never a value, a length or a prefix.
- **`state` values:**
  - `set`: a non-empty value is stored.
  - `empty`: the variable is stored with an empty value.
  - `undecryptable`: TOSE could not decrypt the stored value.
  - `unknown`: TOSE does not tell this caller. Members always see `unknown`; only owners and admins get the real `set` or `empty`.
  - `unset`: no variable has that name (`inspect_project_env` only).
- **Listings:** `list_project_env_keys` returns at most 100 names per page, with `total`, `redeploy_required` and an opaque `next_cursor`. Pass the cursor back to get the next page. A cursor works only for the project that issued it.
- **Names that look like values:** if a stored name looks like a pasted value, for example it contains `=` or `://`, the list shows `[withheld]` instead of the name. `inspect_project_env` refuses such a name, an empty one and an over-long one with `INVALID_ARGUMENT`.
- **Other workspaces:** a project in another workspace answers `NOT_FOUND`, the same as a missing project.
- **Redeploy:** changing a variable never deploys by itself. A variable changed after the running deployment needs a redeploy.

### Env update tools

`plan_project_env_update` and `apply_project_env_update` let an agent change environment variables without ever handling a value. The agent says which variables to change, you enter the values in TOSE and approve, and the agent then applies the approved plan.

- **Scope:** both tools need `env:write`. An owner or admin opts in with its own checkbox on the consent page. It does not grant `env:read`, so a connection that should also list variables needs both. Without the scope, `tools/list` does not show the tools. See [Scopes](/mcp/oauth#env-updates-env-write).
- **Operations:** `set` creates or replaces a variable, `rotate` replaces an existing variable with a new, non-empty value, and `delete` removes one. `rotate` and `delete` name a variable that already exists, otherwise the plan answers `NOT_FOUND`. One plan holds 1 to 20 entries, each with an `op` and a `key` (letters, digits and underscores, not starting with a digit), and one entry per name. Each value is at most 8 KiB.

1. **Plan.** Call `plan_project_env_update` with the project slug and the `{op, key}` entries. Send names and operations only: a request that includes a value is rejected and nothing is planned. The call changes nothing. It returns the plan, an `approval_url` and a one-time `approval_token`. An optional `idempotency_key` (1 to 255 printable ASCII characters) lets the client recover, for 24 hours, the result of a plan that was already applied. The same key with other changes answers `IDEMPOTENCY_CONFLICT`.
2. **Approve in TOSE.** Open the `approval_url` while signed in as the owner or admin who requested the plan. Enter the new value for each `set` and `rotate` on that page, then approve. The values go from your browser to TOSE and never pass through the client. Existing variables keep their secret flag, and new variables are saved as secrets. TOSE encrypts the values it receives and deletes the pending values when the plan is applied, withdrawn or expires.
3. **Apply.** Tell the client to continue. It calls `apply_project_env_update` with the project and the `approval_token`, and only then does TOSE save the change. It reports what was applied and, when a deployment receipt is available, whether the running deployment differs (`redeploy_required`).

- **A stale plan needs a new approval.** If the saved variables changed after the plan was made, the apply answers `APPROVAL_STALE`. Ask the agent to plan again with `plan_project_env_update` and approve the new plan. An approval that is still pending, expired, or declined or withdrawn answers `APPROVAL_PENDING`, `APPROVAL_EXPIRED` or `APPROVAL_USED`. Calling apply again with a token that was already applied returns the earlier result with `replayed: true`.
- **The change takes effect after a separate redeploy.** Applying saves the configuration only. The running app keeps its current environment until you redeploy, for example with `deploy_project`.
- **Values never travel over MCP.** No tool accepts or returns a value, and there is no tool that reveals or pulls one. The audit history records operation names and variable names only.
- **Typing "ok" in the chat does not approve anything.** Approval happens only on the TOSE page, as described in [How approval works](#how-approval-works).

### Feedback tools

Two tools let an agent report a defect in TOSE itself or request a feature, through the same service as the [Feedback API](/api/feedback). They exist only where feedback is enabled.

| Tool | What it does | Scope |
|------|--------------|-------|
| `submit_feedback` | Files a report: `type`, `component`, `title`, `description`, and optionally `reproduction_steps`, `correlation_id`, `idempotency_key`, and `environment` and `error_codes` with `include_diagnostics: true`. It cannot name a workspace, user or repository: the reporter is you and the workspace is the connection's own. | `feedback:write` |
| `get_feedback` | Returns the status of a report you filed from the same workspace. Anyone else gets `NOT_FOUND`. | `workspace:read` |

`feedback:write` has its own consent checkbox on the connect screen, and any member may grant it for their own connection. For an MCP connection it is never part of a default request or of another MCP scope, and it grants nothing else. For API keys, `workspace:write` implies it, so existing keys keep filing reports. Publishing is asynchronous: a new report is never shown as published, and `issue_url` appears only once GitHub confirmed the issue. Secrets and personal data are redacted first, diagnostics are opt-in, and the limits are 20 reports per user and 60 per workspace each hour (`RATE_LIMITED`). A retry with the same `idempotency_key` returns the first report. See [Scopes](/mcp/oauth#scopes).

### How approval works

`deploy_project` and `rollback_deployment` always run in two steps:

1. The first call changes nothing. It returns a **plan**, an `approval_url` and a one-time `approval_token`. The plan shows the project, what is live now and the effect. A deploy plan also shows the repository, branch and the commit it will build. A rollback plan shows the target deployment.
2. Open the `approval_url` in your browser. TOSE shows the plan, signed in as you. Click **Approve** or **Decline**.
3. Tell the client to continue. It calls the tool again with the token, and only then does TOSE deploy or roll back.

**Approval happens in your browser, at the `approval_url`. Typing "ok" or "yes" in the chat does not approve anything.** The client cannot approve for you: the token does nothing until you approve the plan on the TOSE page. A declined plan can never run. You can also open the link again and withdraw an approval until the client uses it.

A deploy approval covers the commit shown in the plan. If someone pushes to the branch before the deploy starts, TOSE refuses with `APPROVAL_STALE` and builds nothing. Ask for a new plan to review the new commit.

An approval token is tied to your user, this connection, the project, the action and the rollback target. It expires after 10 minutes and works once. If the client retries with a token that was already used, TOSE returns the original deployment and does not deploy again.

Every write call also requires all of the following:

- The connection was granted deploy access on the consent screen (the `deployments:write` scope, or the narrower `deployments:execute` for deploys and `deployments:rollback` for rollbacks).
- You are still an owner or admin of the workspace at the time of the call.
- No other deployment of the project is in progress.

### Error codes

Failed tool calls return text that starts with a stable code:

| Code | Meaning |
|------|---------|
| `NOT_FOUND` | The project or deployment is not in the connected workspace. |
| `INVALID_ARGUMENT` | A parameter is missing or out of range. |
| `INSUFFICIENT_SCOPE` | The connection lacks the scope this tool needs, for example a read-only connection calling a write tool. Reconnect and allow deploying. |
| `FORBIDDEN` | Your role cannot deploy or roll back, or, for the env update tools, you are not an owner or admin. |
| `APPROVAL_PENDING` | You have not approved the plan yet. Open its `approval_url`, approve it, then ask the client to continue. |
| `APPROVAL_STALE` | The branch has a new commit since you approved. Nothing was deployed. Request a new plan and review the new commit. For an env update, the project's variables changed after the plan was made and nothing was saved. Plan again. |
| `APPROVAL_INVALID`, `APPROVAL_EXPIRED`, `APPROVAL_USED` | The approval is wrong, expired, declined, withdrawn or used. Request a new plan by calling the tool without `approval_token`; for an env update, call `plan_project_env_update` again. |
| `INVALID_IDEMPOTENCY_KEY`, `IDEMPOTENCY_CONFLICT` | An env update `idempotency_key` is not 1 to 255 printable ASCII characters, or was already used for different changes. |
| `DEPLOY_IN_PROGRESS` | Wait for the running deployment with `get_deployment_status`. |
| `NO_GIT_CONNECTION`, `NO_SERVER`, `NO_IMAGE` | The project is not ready for this action. Fix it in the dashboard. |
| `CONFLICT` | The project is locked, for example during an environment move. |
| `UNAVAILABLE`, `UPSTREAM_ERROR`, `INTERNAL` | Temporary failure. Try again later. |

## Example prompts

- "Which of my TOSE projects failed their last deployment?"
- "Why did the latest deploy of `shop-api` fail? Show me the relevant build log lines."
- "Show the error logs of `shop-api` from the last 30 minutes."
- "Deploy `marketing-site`." The client shows the plan and a link where you approve it.
- "Roll `shop-api` back to the deployment before the current one."

## Data and privacy

- **What the connector reads:** projects, deployments, build logs and runtime logs of the workspace you picked. With `env:read`, also the names and set state of a project's environment variables, never a value. With `env:write`, it can plan and apply a variable change that you approve in TOSE, but it still never receives a value.
- **What it never returns:** environment variable values, database credentials, registry or cluster credentials, and API keys. Before logs, commit messages and error messages are returned, TOSE removes the project's environment variable values and common credential patterns (URLs with passwords, bearer tokens, private keys, cloud and GitHub tokens, JWTs). Redaction is best effort. Do not print secrets in application logs.
- **What TOSE stores:**
  - The registered client: name and redirect URIs.
  - Hashes of the issued tokens. Access tokens last 1 hour and refresh tokens 30 days.
  - An audit record for every tool call: user, client, workspace, project, deployment, tool, outcome and error code. Deploys and rollbacks are recorded before they run.
  - For each deploy or rollback plan: the plan shown on the approval page and whether you approved it.
  - For each env update plan: the operations and variable names, encrypted, and the values you enter, encrypted, until the plan is applied, withdrawn or expires. The audit record holds operation names and variable names only.
  - Other tool arguments and results are not stored.
- **Logs:** runtime logs older than the live window are archived and are only available from the dashboard.

## Revoke access

Refresh tokens last 30 days, so revoke a connection you no longer trust instead of waiting for it to expire. You can revoke access in any of these ways:

- In the dashboard, open your workspace **Settings**, then **Agent access**. The page lists your connections, with this workspace's first and the others labelled with their workspace. Click **Revoke** next to one: the client is signed out at once and has to connect again. You only see and revoke your own connections.
- Remove the connector in your MCP client. Clients that support OAuth token revocation revoke its tokens right away.
- Call `DELETE /api/mcp/connections/{family_id}` from a signed-in dashboard session. `GET /api/mcp/connections` lists your connections. API keys cannot call these two routes; see [API keys and scopes](/api/api-keys#routes-that-reject-api-keys).
- Losing your membership of the workspace cuts the connection off immediately. Being demoted to member removes deploy and env update access immediately.

## Support

For help or to report a problem with the connector, contact the operator of your TOSE instance and include the time of the call and the error code.
