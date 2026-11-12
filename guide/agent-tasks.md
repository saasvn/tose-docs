# Delegate tasks to a coding agent

A connected app (an MCP client such as Claude Desktop, Claude Code or Cursor) or a workspace API key can give a task to one of your curated coding agents (**Claude Code**, **Codex** or **Pi**), follow it, read its result and cancel it. For example: "fix the failing test in repo Y". The agent runs the task on its own, in the same `/workspace` its console uses. TOSE keeps the task's record: who gave it and through what, its status, the agent's final message and the files it changed.

An agent runs one task at a time. There is no queue.

## What must be true

| Requirement | What to do |
|-------------|------------|
| The server offers tasks. | An operator sets `TEMPLATE_AGENT_TASKS_ENABLED=true`. It is **off by default**. While it is off, every task route answers `404 TASKS_DISABLED` and the dashboard hides the agent page's **Tasks** tab and its tile. |
| The agent's release has a task runner. | Use Claude Code 1.1.0, Codex 1.1.0 or Pi 1.2.0 (or newer). Older installations keep running unchanged and refuse tasks with `409 TASKS_UNSUPPORTED`. Curated upgrades in place are not available yet, so [deploy](/guide/deploy-coding-agent) the new release as a new installation and move your work over with git. |
| The owner allows it. | On by default for a new agent with a task runner; see [Turn it on or off](#turn-it-on). |
| The agent is running and signed in. | A task never wakes a sleeping agent, never starts a stopped one and never uses another account or key. |
| The wallet has a balance. | The task runs on the agent's compute. There is no extra charge; your provider bills model usage to your key or plan. |

## Turn it on or off {#turn-it-on}

The switch **Accept tasks from connected apps and API keys**, under **Task settings** below the [task board](#task-board) in the **Tasks** tab of the installed agent's page, says whether the agent accepts tasks. Open that page from **Cloud Agents** in the workspace sidebar, where **Your agents** also shows which agents accept tasks.

- It starts **on** for a new installation of a release with a task runner (Claude Code 1.1.0, Codex 1.1.0, Pi 1.2.0 or newer), since tose-app [#701](https://github.com/saasvn/tose-app/pull/701). A connected app or API key with `agents:execute` can then give the agent tasks from its first start.
- It stays **off** for an installation that existed before, until an owner or admin turns it on. A release without a task runner cannot take tasks at all: turning the switch on is refused with `409 TASKS_UNSUPPORTED`.
- Only a signed-in workspace **owner or admin** can turn it off or on (`PUT .../task-delegation` with `{"enabled": false}` or `true`). An API key or connected app can never change it, whatever its scopes. While it is off, tasks are refused with `403 TASKS_NOT_ALLOWED`.

::: warning Read this before you keep it on
A task can read and send back anything the agent can, including its sign-in (for example `~/.claude` or `$CODEX_HOME/auth.json`) or its key. A connected app or API key that holds `agents:execute` is therefore trusted as much as the owner or admin who granted it. Before it writes an event or a result, the agent replaces the credential values it knows with `[redacted]`, but this is best effort: it catches accidents, not a determined prompt. Keep the switch on only while you trust the connected clients with the agent's sign-in. If you do not, turn it off right after the deploy.
:::

Tasks run in every provider mode, including Claude Code with your Claude plan and Codex with your ChatGPT plan. A task uses whatever the agent is signed in with at that moment.

## The task board {#task-board}

The **Tasks** tab shows the last 20 tasks as a board with three columns, each with its count (tose-app [#773](https://github.com/saasvn/tose-app/pull/773)):

| Column | Tasks in it |
|--------|-------------|
| **Running** | `starting`, `running` |
| **Done** | `succeeded` |
| **Failed or stopped** | `failed`, `timed_out`, `lost`, `cancelled` (shown as **Stopped**) |

A card shows the task's status, who gave it and through what (a signed-in session, an API key or a connected app), when, and the first two lines of the agent's final message; the full message is under **Result**. A running card has a **Stop** button. **Refresh** reads the list again, and while a task runs the board refreshes itself every few seconds. Cards cannot be dragged: a column is the task's real status, which only the agent and TOSE change. On a narrow screen the columns stack.

Under the board, **Task settings** holds the switch described above and its warning.

## MCP tools

When the server offers tasks, a connected client sees four tools. The person who connected it must be an owner or admin of the workspace.

| Tool | Scope | What it does |
|------|-------|--------------|
| `cloud_agent_list` | `agents:read` | Lists your curated agents with their `installation_id`, `name`, `agent`, `release`, `status`, whether delegation is on, whether tasks are supported, whether it can continue a finished task (`resume_supported`), the active task and the link to the agent's page. |
| `cloud_agent_run_task` | `agents:execute` | Gives an agent a task: `installation_id`, `prompt`, optional `timeout_minutes`, optional `continue_task_id` (continue a finished task when the release supports it) and optional `request_id` to retry safely. |
| `cloud_agent_get_task` | `agents:read` | Reads a task. Pass `after` (the cursor from the previous call) to get only new events, and `wait_seconds` (0 to 25) to wait for a change instead of polling fast. |
| `cloud_agent_cancel_task` | `agents:control` | Stops a `starting` or running task. A task that already ended is returned unchanged. |

Until tose-app [#738](https://github.com/saasvn/tose-app/pull/738) these tools were named `list_template_agents`, `run_template_agent_task`, `get_template_agent_task` and `cancel_template_agent_task`. The old names no longer exist, so update any client allowlist or script that still uses them.

The tools never turn delegation on, never open the console and never take a secret. When a refusal has a fix on the agent's page (`TASKS_NOT_ALLOWED`, `TASKS_UNSUPPORTED`, `AGENT_SLEEPING`, `PROVIDER_SIGN_IN_REQUIRED`), the message names that page. Hosts with MCP Apps show the task in a small status view. The consent screen says of `agents:execute`: "A task can read and send back anything the agent can, including its sign-in."

### Example chat

> **You:** Which coding agents do I have in TOSE?
>
> **Assistant:** *(calls `cloud_agent_list`)* You have **claude-code-main** (Claude Code 1.1.0, running, tasks on) and **codex-old** (Codex 1.0.0, no task runner).
>
> **You:** Ask claude-code-main to fix the failing test in `api/` and tell me what changed.
>
> **Assistant:** *(calls `cloud_agent_run_task`, then `cloud_agent_get_task` with `wait_seconds`)* The task finished with status `succeeded`. The agent says the test failed on a nil check; it fixed it in `api/handler.go` and added a case in `api/handler_test.go`.

## Scopes

| Scope | Needed for |
|-------|------------|
| `agents:read` | Listing agents, listing tasks and reading a task. |
| `agents:execute` | Giving an agent a task. A key created without scopes has no agent access; grant this scope explicitly. |
| `agents:control` | Cancelling a task. |

Even with the scope, the person behind the key or connection must be a workspace owner or admin. See [API keys and scopes](/api/api-keys) and [Protocol, OAuth and scopes](/mcp/oauth).

## REST API

Routes under `/api/workspaces/{slug}/template-installations/{id}`. The contract is in the [OpenAPI spec](/api/reference).

| Route | Scope | Purpose |
|-------|-------|---------|
| `PUT /task-delegation` with `{"enabled": true}` or `false` | none: a signed-in session only | The switch. Returns `{"task_delegation": <the new value>}`. |
| `POST /tasks` | `agents:execute` | Give a task: `prompt`, `timeout_minutes`, `continue_task_id` and an optional `Idempotency-Key` header. Answers `201`, or `200` when the key names an earlier task. |
| `GET /tasks` | `agents:read` | List tasks, newest first (`?limit=`, default 20, at most 100), without events. |
| `GET /tasks/{task_id}?after=&wait_seconds=` | `agents:read` | Read one task with its events. `after` is the cursor, and `wait_seconds` (0 to 25) waits for a change. |
| `POST /tasks/{task_id}/cancel` | `agents:control` | Stop a `starting` or running task. |

```bash
BASE=https://api.tose.sh/api/workspaces/my-team/template-installations/INSTALLATION_ID

# Give the task
curl -sS -X POST "$BASE/tasks" \
  -H "X-API-Key: $TOSE_API_KEY" \
  -H "Idempotency-Key: fix-test-001" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Fix the failing test in api/ and run the tests.","timeout_minutes":30}'

# Follow it: wait up to 25 seconds, then pass the returned "next" as after
curl -sS "$BASE/tasks/TASK_ID?wait_seconds=25" -H "X-API-Key: $TOSE_API_KEY"
```

A task has `status`, `final_message` (at most 32 KiB), `changed_files` (`repo`, `status`, `path`; `repo` is `.` for `/workspace` itself), `problem_code` and `problem_message`, `ended_by` (the person who stopped it, or `system`), the times and, when you read a single task, `events` with `next`, the cursor for the next call. The prompt is never returned and never written to the audit log. The installation views (`GET /template-installations` and `GET /template-installations/{id}`) show `tasks_enabled`, `task_delegation`, `tasks_supported` and `task_resume_supported`.

## Statuses

| Status | Meaning |
|--------|---------|
| `starting` | TOSE sent the task to the agent. |
| `running` | The agent is working on it. |
| `succeeded` | It finished. Read `final_message` and `changed_files`. |
| `failed` | It ended with an error. See `problem_code` and `problem_message`. |
| `cancelled` | Someone cancelled it, or the agent was stopped or put to sleep. |
| `timed_out` | It ran past its timeout. |
| `lost` | The agent restarted or its task state is gone. A lost task is never restarted. |

## Refusal codes

A refusal always has its own code, never a quiet fallback.

| Code | When |
|------|------|
| `404 TASKS_DISABLED` | The server flag is off. |
| `409 TASKS_UNSUPPORTED` | The release has no task runner. Install a newer release. |
| `403 TASKS_NOT_ALLOWED` | The switch is off: an owner or admin turned it off, or the installation is older than the default and nobody turned it on. |
| `409 AGENT_BUSY` | Another task of this agent is `starting` or `running`. |
| `409 AGENT_SLEEPING` | The agent sleeps. Wake it on its page or with the wake route; a task never does. |
| `409 AGENT_STOPPED` | The agent is stopped. A task never starts it. |
| `409 PROVIDER_SIGN_IN_REQUIRED` | The agent is not signed in to its provider, or has no key. |
| `402 INSUFFICIENT_BALANCE` | The wallet cannot pay for the agent's compute. |
| `404 TASK_NOT_FOUND`, `404 INSTALLATION_NOT_FOUND` | No such task or installation in this workspace. |
| `502 AGENT_UNREACHABLE` | TOSE could not reach the agent. A create may still have started: the task stays `starting` and, within about two minutes, becomes `running` or `failed`. Retry with the same `Idempotency-Key` to get it back. On a cancel, the cancel may not have reached the agent; the task then ends at its timeout. |

## Limits

- One task per agent at a time.
- Timeout: 30 minutes by default, at most 120.
- Prompt: at most 100000 bytes and not blank.
- A final message is at most 32 KiB.

## While a task runs

- The agent counts as busy, so auto-sleep never interrupts it. Stopping the agent or putting it to sleep cancels the running task.
- TOSE checks running tasks about every 30 seconds, so a task ends in TOSE even when nobody follows it, and it ends a task past its timeout.
- Typing in the console does not block a task. Both work in the same `/workspace`, so use **Stop** on the task's card in the [task board](#task-board) when you want control back.
- The audit log records the switch, each task created, who cancelled it and how it ended, never the prompt.

Related: [Deploy a coding agent](/guide/deploy-coding-agent), [Agent access](/mcp/agent-access), [API keys and scopes](/api/api-keys).
