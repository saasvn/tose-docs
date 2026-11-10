# tose ops

Read the operations picture of your workspaces.

## tose ops summary

Show, per workspace, your role, projects grouped by the status of their latest deployment, installed apps (templates) grouped by status, and open incidents with the highest severity.

### Synopsis

```bash
tose ops summary [--json]
```

### Usage

```bash
tose ops summary          # table per workspace
tose ops summary --json   # machine-readable output
```

The command calls `GET /api/operations/summary`.

### Permissions

- An API key needs the `deployments:read` scope.
- An API key sees **only its own workspace**. A signed-in person sees every workspace they are a member of.

The response is one database snapshot taken at `observed_at`. At most 100 workspaces are returned, ordered by name; `truncated` is `true` when you belong to more. Billing is not included.

### Health

Each workspace carries a `health` value:

| Value | Meaning |
|-------|---------|
| `degraded` | At least one incident is open. |
| `unknown` | No open incident. This read has no uptime evidence. |

`health` is **never `healthy`**: an empty incident list is not proof that everything works. Use [`tose status`](/commands/status) or [`tose doctor`](/commands/deploy) for a live check of one project.

## Related Commands

- [`tose status`](/commands/status) - Check project status
- [`tose domain`](/commands/domain) - Manage custom domains
