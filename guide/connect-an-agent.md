---
title: "Connect an AI agent to TOSE over MCP"
description: "Connect an MCP client such as Claude to a TOSE workspace, choose read-only or deploy access, approve production changes in your browser, and revoke access."
---

# Connect an AI agent (MCP)

Give an MCP client such as Claude controlled access to one TOSE workspace. Reads work right away; every deploy, rollback or variable change waits for your approval in TOSE.

## Prerequisites

- A TOSE account that is a member of the workspace. Deploy access needs the owner or admin role.
- An MCP client that supports remote servers with OAuth; see [Client compatibility](/mcp/clients).
- The connector enabled on the TOSE instance. If `/mcp` answers 404, it is off.

## Input

| Value | Value to use |
|-------|--------------|
| Server URL | `https://app.tose.sh/mcp` (Streamable HTTP). Self-hosted: your own origin, see [Self-hosted instances](/mcp/oauth#self-hosted-instances) |
| Credentials | None to paste. The client signs you in with OAuth 2.1 |
| Workspace | Picked on the consent screen; one per connection |

## Steps

1. In the MCP client, add a custom connector with the server URL.
2. Sign in to TOSE in the browser page the client opens.
3. On the consent screen pick **one workspace**.
4. Choose the access. Leave **deploying and rolling back** unticked for a read-only connection. Variable metadata (`env:read`) and variable changes (`env:write`) have their own boxes.
5. Click **Approve** and return to the client.

## Expected outcome

The client lists the TOSE tools, such as `list_projects`, `get_deployment_status`, `read_logs`, `deploy_project` and `rollback_deployment`. Tools whose scope you did not grant are not listed. The full list is in [the connector reference](/mcp#tools).

## Verify

Ask the client: "List my TOSE projects and the status of their latest deployment." It should call `list_projects` and show only projects of the workspace you picked.

## Approving production changes

`deploy_project`, `rollback_deployment`, `apply_project_env_update` and `execute_runbook` never act on the first call:

1. The agent's first call changes nothing. It returns a plan and an `approval_url`.
2. You open the `approval_url`, review the plan signed in as yourself, and click **Approve** or **Decline**.
3. You tell the agent to continue. Only then does TOSE act.

**Typing "ok" or "yes" in the chat approves nothing.** An agent cannot approve its own plan, and there is no way to skip the approval. Environment variable values are typed on the TOSE page, never in the chat. Details: [How approval works](/mcp#how-approval-works).

## Permissions and security

- A connection sees one workspace and only the scopes you ticked.
- Write calls also require that you are still an owner or admin when the call runs.
- The connector never returns secret values, and it redacts common credential patterns from logs (best effort).
- Every tool call is recorded in the audit log.

## Retry safely

- An approval token works once and expires after 10 minutes. A retry with a used token returns the original deployment and does not deploy again.
- `APPROVAL_STALE` means the branch or variables changed after you approved. Nothing ran; ask for a new plan and review it.
- `DEPLOY_IN_PROGRESS`: wait with `get_deployment_status`, then try again.
- `UNAVAILABLE`, `UPSTREAM_ERROR`, `INTERNAL`: temporary; try again later.

## Common errors

| Code | Meaning |
|------|---------|
| `INSUFFICIENT_SCOPE` | The connection lacks the scope. Reconnect and tick the needed access. |
| `FORBIDDEN` | Your role cannot do this; ask a workspace owner or admin. |
| `APPROVAL_PENDING` | Open the `approval_url` and approve, then continue. |
| `APPROVAL_EXPIRED`, `APPROVAL_USED` | Request a new plan. |

All codes: [MCP error codes](/mcp#error-codes).

## Revoke access

In the dashboard open **Settings → Agent access** and click **Revoke**, or remove the connector in the client. See [Revoke access](/mcp#revoke-access).

## Next steps

- [Protocol, OAuth and scopes](/mcp/oauth)
- [Agent access](/mcp/agent-access)
- Automate without an agent: [Integrate with the REST API](/guide/integrate-the-api)
