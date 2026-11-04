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
| `deploy_project` | Builds and deploys the head commit of the project's connected branch, as shown in the plan. | **Yes**, needs approval |
| `rollback_deployment` | Puts the image of an earlier deployment live again. | **Yes**, needs approval |

There is no generic API tool. The connector cannot read or change environment variables, domains, databases, billing or members.

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
| `FORBIDDEN` | Your role cannot deploy or roll back. |
| `APPROVAL_PENDING` | You have not approved the plan yet. Open its `approval_url`, approve it, then ask the client to continue. |
| `APPROVAL_STALE` | The branch has a new commit since you approved. Nothing was deployed. Request a new plan and review the new commit. |
| `APPROVAL_INVALID`, `APPROVAL_EXPIRED`, `APPROVAL_USED` | The approval is wrong, expired, declined, withdrawn or used. Request a new plan by calling the tool without `approval_token`. |
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

- **What the connector reads:** projects, deployments, build logs and runtime logs of the workspace you picked, and nothing else.
- **What it never returns:** environment variable values, database credentials, registry or cluster credentials, and API keys. Before logs, commit messages and error messages are returned, TOSE removes the project's environment variable values and common credential patterns (URLs with passwords, bearer tokens, private keys, cloud and GitHub tokens, JWTs). Redaction is best effort. Do not print secrets in application logs.
- **What TOSE stores:**
  - The registered client: name and redirect URIs.
  - Hashes of the issued tokens. Access tokens last 1 hour and refresh tokens 30 days.
  - An audit record for every tool call: user, client, workspace, project, deployment, tool, outcome and error code. Deploys and rollbacks are recorded before they run.
  - For each deploy or rollback plan: the plan shown on the approval page and whether you approved it.
  - Tool arguments and results are not stored.
- **Logs:** runtime logs older than the live window are archived and are only available from the dashboard.

## Revoke access

Refresh tokens last 30 days, so revoke a connection you no longer trust instead of waiting for it to expire. You can revoke access in any of these ways:

- In the dashboard, open your workspace **Settings**, then **Agent access**. The page lists your connections, with this workspace's first and the others labelled with their workspace. Click **Revoke** next to one: the client is signed out at once and has to connect again. You only see and revoke your own connections.
- Remove the connector in your MCP client. Clients that support OAuth token revocation revoke its tokens right away.
- Call `DELETE /api/mcp/connections/{family_id}` from a signed-in dashboard session. `GET /api/mcp/connections` lists your connections. API keys cannot call these two routes; see [API keys and scopes](/api/api-keys#routes-that-reject-api-keys).
- Losing your membership of the workspace cuts the connection off immediately. Being demoted to member removes deploy access immediately.

## Support

For help or to report a problem with the connector, contact the operator of your TOSE instance and include the time of the call and the error code.
