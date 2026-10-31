# tose desktop

Manage [Cloud Desktops](/guide/cloud-desktops): persistent Ubuntu desktops that sleep to save
compute and keep their disk.

::: tip Workspace-Level Command
Desktop commands operate at the workspace level. `<desktop>` accepts a desktop name or id.
All subcommands support `--json`.
:::

## tose desktop list

List desktops in the workspace.

```bash
$ tose desktop list

NAME    STATUS      CPU    RAM    DISK    ID
----------------------------------------------
dev     running     2      4      20Gi    <desktop-id>
```

## tose desktop create

```bash
tose desktop create <name> --server <id> --cpu <cpu> --ram <ram> --disk <GiB> \
  [--resolution <WxH>] [--auto-sleep <minutes>]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--server <id>` | yes | Server to run the desktop on |
| `--cpu <cpu>` | yes | CPU allocation |
| `--ram <ram>` | yes | RAM allocation |
| `--disk <GiB>` | yes | Persistent disk size in GiB |
| `--resolution <WxH>` | no | Screen resolution, e.g. `1920x1080` |
| `--auto-sleep <minutes>` | no | Sleep after this many idle minutes |

Requires the workspace admin role. The command returns as soon as provisioning starts; use
`tose desktop status` to follow it.

```bash
$ tose desktop create dev --server <server-id> --cpu 2 --ram 4 --disk 20
✓ Desktop "dev" is provisioning
  ID:        <desktop-id>
  Operation: <operation-id> (pending)
```

## tose desktop status

```bash
tose desktop status <desktop>
```

Shows status, resources, disk, resolution, auto-sleep, last activity and the last error.

## tose desktop wake / sleep

```bash
tose desktop wake <desktop> [--wait]
tose desktop sleep <desktop> [--wait]
```

`sleep` releases CPU and RAM and keeps the disk. `wake` starts the desktop again on the same
disk. Memory is not preserved across sleep.

With `--wait`, the CLI polls the operation until it succeeds or fails. A failed operation exits
with code `1`. Running the command again while an operation is in flight reuses that
operation.

## tose desktop delete

```bash
tose desktop delete <desktop> --confirm <name>
```

Deletes the desktop **and its disk permanently**. `--confirm` must match the desktop name.
Requires the workspace admin role.

## tose desktop events

```bash
tose desktop events <desktop>
```

Shows the desktop audit log.

## tose desktop screenshot

```bash
tose desktop screenshot <desktop> --out screen.png
```

Opens a short-lived agent session, captures the screen, writes the image to `--out` and closes
the session.

## tose desktop exec

```bash
tose desktop exec <desktop> -- <command...>
```

Runs a shell command on the desktop through a short-lived agent session. The remote stdout and
stderr are printed as-is, and the CLI exits with the remote exit code.

```bash
$ tose desktop exec dev -- ls -la /home/ubuntu
$ tose desktop exec dev -- 'cd ~/project && git status'
$ tose --json desktop exec dev -- uname -a
```

```json
{
  "success": true,
  "data": { "stdout": "Linux dev ...\n", "stderr": "", "exit_code": 0 }
}
```

Put `--` before the command so its flags are not read as CLI options. `exec` needs the control
lease; if a human currently controls the desktop, the command is rejected.

## Related

- [Cloud Desktops guide](/guide/cloud-desktops)
- [Desktops API reference](/api/desktops)
