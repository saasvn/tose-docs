# Tasks: durable deploys and rollbacks

A client that supports the MCP tasks extension (`io.modelcontextprotocol/tasks`) gets a **task** back when it asks to deploy or roll back, instead of a one-off plan. A task survives restarts and can be followed until the deployment finishes. Clients without the extension keep the two-step flow in [the connector guide](https://docs.tose.sh/mcp).

## Lifecycle

| Status | Meaning |
|--------|---------|
| `input_required` | The plan is waiting for you. The task carries a link to the approval page. |
| `working` | You approved, and the deployment is in progress. |
| `completed` | The deployment is live or has failed. A failure, a declined plan or an expired approval complete the task with an error result that starts with a stable code such as `DEPLOY_FAILED`, `APPROVAL_DECLINED` or `APPROVAL_EXPIRED`. |

## Approval stays in your browser

The agent cannot approve its own task. You open the approval page, signed in as yourself, and approve or decline the plan. Only then does the client tell the task to continue. If you have not approved yet, the task stays in `input_required`.

## Polling and expiry

- **Polling:** the client calls `tasks/get` about every 5 seconds. The server does not send task status notifications, so a client must poll.
- **Expiry:** a task lives for 24 hours from creation.
- **Isolation:** a task is visible only to the same user, workspace and connection that created it.

## Cancelling

| When | Result |
|------|--------|
| Before the deployment starts | The approval is voided for good. Nothing deploys. |
| After the deployment starts | A running deployment cannot be stopped. The cancel request is noted in the task's status message, and the task still reports the deployment's real outcome. |

## Where to see tasks

The **Agent tasks** panel on a project page lists the tasks your connected agents started for that project. See [Agent access](./agent-access#agent-tasks-and-copy-for-agent).
