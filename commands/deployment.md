# tose deployment

Work with one deployment by its ID: wait for it, cancel it, or roll back to it.

Deployment IDs double as task IDs. You get the ID from `tose deploy`, `tose status` or `tose deploy --json`.

| Command | What it does | Confirmation |
|---------|--------------|--------------|
| `tose deployment wait <id>` | Resume waiting for a deployment until it is live and healthy | None |
| `tose deployment cancel <id> [project]` | Cancel a deployment that is still building | `--yes` |
| `tose deployment rollback <id> [project]` | Roll back to the image of an earlier deployment | `--yes` |

## tose deployment cancel

Cancel a deployment that has not reached deploy yet.

### Synopsis

```bash
tose deployment cancel <id> [project] --yes
```

### Behavior

- Only a deployment that is still in progress (`pending`, `cloning`, `building`, `pushing`, `deploying`) can be cancelled. Any other status is refused with exit code `1` (`CONFLICT`). To stop a `running` project, use [`tose down`](/commands/down).
- It is destructive, so it follows the same confirmation rules as rollback: a prompt in a terminal (declining exits with code `5`), and `--yes` without a terminal or with `--json` (otherwise exit code `4`).
- It uses the same retry and final-status check as `tose down`. A `503` with `Retry-After` is retried up to 4 times (each wait is the `Retry-After` time, at most 60 s, or 5 s if absent); after that it fails with `OPERATION_FAILED` (exit code `8`, retryable) and says the stop did not happen. A Stop request that runs past about 100 s fails with `TIMEOUT` (exit code `7`) and an unknown outcome.
- After the stop, the deployment is re-read. If it is not `stopped` (for example it ended `running` again), the command fails with `OPERATION_FAILED` and the `error_message` instead of printing `cancelled`; if it is still `deploying` it fails with `TIMEOUT`.

```bash
$ tose deployment cancel dep_abc123 --yes
Deployment dep_abc123 cancelled.
```

See [`tose down`](/commands/down#retries-and-timeouts) for the retry details and exit codes.

## tose deployment rollback

Roll the project back to the image of an earlier deployment.

### Synopsis

```bash
tose deployment rollback <id> [project] --yes
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<id>` | Deployment to roll back to |
| `[project]` | Optional. Project slug or `workspace/project` format |

### Confirmation

Rollback replaces what is running, so it is a destructive command and never runs without an explicit confirmation:

- In an interactive terminal the CLI shows the target and impact and asks a question that defaults to No. Declining changes nothing and exits with code `5`.
- Without a terminal, or with `--json` or `--non-interactive`, it refuses before sending any mutating request and exits with code `4` (`CONFIRMATION_REQUIRED`). Re-run it with `--yes`. The CLI may still read the target deployment first to check it.

`--yes` approves only the command it is written on. The API still checks your key's permissions.

```bash
# Without a terminal (CI, scripts, agents)
$ tose deployment rollback dep_abc123 --json
$ echo $?
4

$ tose deployment rollback dep_abc123 --yes
```

A failed or in-progress target is refused with exit code `1` (`CONFLICT`), and an unknown one with exit code `6` (`NOT_FOUND`), whether or not you pass `--yes`.

### Rollback receipt

On success the CLI prints the `tose.dev/rollback-receipt/v1` receipt the API returns (`--json`: `data.rollback_receipt`) and names the layers it covers. **Only the image (`artifact`) is rolled back.** `config`, `schema` and `data` are shown as not rolled back; restore them separately from a verified backup. The new deployment's `rollback_of_deployment_id` names the deployment whose image was reapplied.

`--json` adds `data.rollback_receipt_status` (`included`, `absent` or `unreadable`). If the server returns no receipt (an older server, or it could not read the source back) or it cannot be read, the rollback still succeeded, the same scope notice is printed, and the message points to `GET .../deployments/{id}/rollback-receipt` to fetch it later. The CLI never relays a receipt that claims anything but `artifact` was restored.

::: tip Agents
Rollback is also available through the MCP connector, where it needs your approval in the browser. See [Agent access](/mcp/agent-access).
:::

## Related Commands

- [`tose deploy`](/commands/deploy) - Start a deployment
- [`tose status`](/commands/status) - Find deployment IDs
- [`tose runbook`](/commands/runbook) - Plan a rollback that a person approves in the browser
- [`tose skills install safe-rollback`](/commands/skills) - Teach an agent the safe rollback flow
