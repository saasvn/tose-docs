# tose deployment

Work with one deployment by its ID: wait for it, cancel it, or roll back to it.

Deployment IDs double as task IDs. You get the ID from `tose deploy`, `tose status` or `tose deploy --json`.

| Command | What it does | Confirmation |
|---------|--------------|--------------|
| `tose deployment wait <id>` | Resume waiting for a deployment until it is live and healthy | None |
| `tose deployment cancel <id>` | Cancel a deployment that is still building | `--yes` |
| `tose deployment rollback <id> [project]` | Roll back to the image of an earlier deployment | `--yes` |

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
- Without a terminal, or with `--json`, it refuses before sending anything and exits with code `4` (`CONFIRMATION_REQUIRED`). Re-run it with `--yes`.

`--yes` approves only the command it is written on. The API still checks your key's permissions.

```bash
$ tose deployment rollback dep_abc123
Error: Confirmation required: … Re-run with --yes to confirm.
$ echo $?
4

$ tose deployment rollback dep_abc123 --yes
```

Failed, in-progress or unknown targets are refused.

::: tip Agents
Rollback is also available through the MCP connector, where it needs your approval in the browser. See [Agent access](/mcp/agent-access).
:::

## Related Commands

- [`tose deploy`](/commands/deploy) - Start a deployment
- [`tose status`](/commands/status) - Find deployment IDs
- [`tose skills install safe-rollback`](/commands/skills) - Teach an agent the safe rollback flow
