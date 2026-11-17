# tose agents

`tose agents` reads and steers agents created through the agent runtime (`/api/workspaces/{slug}/agents`, today the Pi engine). It can show an agent's redacted environment, add an instruction to a run that is already executing, and list those instructions with their status.

All commands accept `--json`. See the [global options](/commands/overview#global-options).

```bash
tose agents env <agent-id> --json                                      # redacted environment
tose agents steer <agent-id> <run-id> --message "only change the API"  # queue an instruction for the running run
tose agents steer <agent-id> <run-id> --message @steer.md --idempotency-key <key>
tose agents steers <agent-id> <run-id> --json                          # each request's status, in order
```

| Command | Who may run it | What it does |
|---------|----------------|--------------|
| `env <agent_id>` | Workspace owner or admin (an API key also needs `agents:write`) | Shows the agent's environment without secret values or the install script text |
| `steer <agent_id> <run_id> --message <text\|@file> [--idempotency-key <key>]` | A member with `agents:control`, or a key with that scope | Queues an instruction for a run that is executing |
| `steers <agent_id> <run_id>` | `agents:read` | Lists the run's steering requests in order, with their status |

The agent and run ids come from the dashboard (`/w/{slug}/agents/{agent_id}/runs/{run_id}`) or MCP. The CLI cannot list agents or runs yet.

## tose agents env {#tose-agents-env}

```bash
tose agents env <agent-id>
tose agents env <agent-id> --json
```

`env` shows the agent revision, its plain variables, the names of its secret references, and the install script's line count, size and SHA-256, with `apply_status`. It never shows a secret value or the script text.

- A secret reference shows the name of the workspace agent secret it points to, never its value.
- `apply_status: not_applied` means no setup executor applies the environment to the engine process yet.
- While the server keeps agent environments off (`AGENT_ENVIRONMENT_ENABLED`), `env` fails with `409 NOT_SUPPORTED`. There is nothing to retry; ask the platform operator.
- A caller without the role or scope gets `403`, and the next step names what is missing.

## tose agents steer {#tose-agents-steer}

```bash
tose agents steer <agent-id> <run-id> --message "only change the API"
tose agents steer <agent-id> <run-id> --message @steer.md --idempotency-key <key>
```

`steer` adds an instruction to a run that is executing. The engine reads it after the current tool turn, before its next model call.

- **What it does not do.** It does not start, restart or cancel a run, and it does not interrupt a tool that is already running. It never wakes a sleeping agent.
- **The message.** `--message` is the text, or `@file` to read it from a file. It is at most 8192 bytes of UTF-8 and may not be blank. The CLI never prints it, logs it or puts it in a next step. An `@` that names no file fails with `NOT_FOUND` without printing the text back, and nothing is sent; to send text that starts with `@`, put it in a file. An inline `--message` is visible in the process list, so pass a sensitive instruction with `@file`.
- **Safe retries.** Every request sends an `Idempotency-Key`. The CLI generates one and prints it, or you pass `--idempotency-key` (8 to 128 letters, digits or `. _ : -`). Retrying with the same key returns the stored request instead of adding a second one. Reusing a key with another message is a `409`; leave the key out to send the new message with a fresh one.
- **Only engines that steer.** Only an engine that reports the steer capability accepts it (today only Pi). Others answer `409 NOT_SUPPORTED`, and nothing is queued.
- **`202` means stored.** A `202` answer with status `queued` only means the request was stored. Follow it with `tose agents steers`.

### Refusals {#steer-refusals}

Every refusal keeps its code, and nothing is queued:

| Code | Meaning | Next step |
|------|---------|-----------|
| `NOT_SUPPORTED` | The engine serving the run does not accept steering | Send a new message to the agent instead, or cancel the run |
| `STEER_NOT_READY` | The engine has not yet confirmed that it accepts steering | Retry shortly with the same `--idempotency-key` |
| `RUN_NOT_ACTIVE` | The run has not started or has already ended | `tose agents steers` shows the run's requests; a steer only reaches a running run |
| `RUN_CANCELING` | A cancel is under way; it wins over a steer | `tose agents steers` shows the run's requests |
| `AGENT_SLEEPING` | The agent is going to sleep; a steer never wakes it | `tose agents steers` shows the run's requests |
| `REVISION_CHANGED` | The agent was updated after the run started, so the run no longer takes steering | `tose agents steers` shows the run's requests |
| `429 STEER_QUEUE_FULL` | Too many requests are pending for the run (8 pending or 50 in all) | Wait for them to be delivered, then retry |

## tose agents steers {#tose-agents-steers}

```bash
tose agents steers <agent-id> <run-id>
tose agents steers <agent-id> <run-id> --json
```

`steers` lists the run's steering requests in order (`SEQ`, `ID`, `STATUS`, `CODE`, `DELIVERED`). With `--json` it is `{agent_id, run_id, steers}`. While a request is still pending, the next step is to check again shortly.

| Status | Meaning |
|--------|---------|
| `queued` | Stored, not yet handed to the engine |
| `dispatching` | Handed to the engine, awaiting its acknowledgement |
| `delivered` | Acknowledged by the engine. It does not mean the model followed the instruction |
| `rejected` | Never reached the engine. `ACCESS_REVOKED` means the sender lost access or `agents:control` before it was handed over; other codes are `RUN_ENDED`, `RUN_CANCELING`, `REVISION_CHANGED` and `ENGINE_REJECTED` |
| `uncertain` | Could not be confirmed as read or acknowledged (`NO_ACK`, `UNREAD`, `RUN_OUTCOME_UNKNOWN`). It is never sent again |

## Related

- [Commands overview](/commands/overview)
- [Agent Runtime pricing](/guide/agent-runtime-pricing)
- [Protocol, OAuth and scopes](/mcp/oauth)
- [Delegate tasks to a coding agent](/guide/agent-tasks), for curated agents installed from a template
