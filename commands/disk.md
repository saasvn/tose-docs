# tose disk / volumes / pricing

Manage [persistent disks](/guide/persistent-disks) and check [pricing](/guide/pricing).

All commands accept the [global options](/commands/overview#global-options), including `--json`.

## tose disk get

Show the project's disk, or that the project is stateless.

### Synopsis

```bash
tose disk get [project]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `[project]` | Project slug or `workspace/project`. Defaults to the [resolved project](/commands/overview#context-resolution) |

---

## tose disk set

Add a disk to a project, grow it, or change its mount path. Requires workspace admin.

### Synopsis

```bash
tose disk set [project] --size <gib> --mount <path>
```

### Options

| Option | Description |
|--------|-------------|
| `--size <gib>` | Disk size in GiB, 1–1000. Can only grow |
| `--mount <path>` | Absolute mount path inside the container, e.g. `/data` |

See [Persistent Disks](/guide/persistent-disks#mount-path) for the mount path rules.

### Usage

```bash
# Opt in to a 10 GiB disk at /data
tose disk set --size 10 --mount /data

# Grow it later
tose disk set --size 30 --mount /data

# Apply the change
tose redeploy
```

The change takes effect on the next deploy. Once a project has a disk it runs a single replica and redeploys with brief downtime.

---

## tose disk delete

Delete the project's disk and **all data on it**, and stop storage billing. Requires workspace admin.

### Synopsis

```bash
tose disk delete [project] --confirm <project_slug>
```

### Options

| Option | Description |
|--------|-------------|
| `--confirm <project_slug>` | Required. Must equal the project slug |

`--yes` does not skip this confirmation.

```bash
tose disk delete --confirm my-app
```

---

## tose volumes list

List every disk in the workspace: project disks, template disks, and managed database storage, with size, status, and monthly cost.

### Synopsis

```bash
tose volumes list
```

---

## tose volumes resize

Grow any disk in the workspace by volume ID (from `tose volumes list`). Requires workspace admin.

### Synopsis

```bash
tose volumes resize <volume_id> --size <gib>
```

### Options

| Option | Description |
|--------|-------------|
| `--size <gib>` | New size in GiB. Must be larger than the current size |

Shrinking is rejected; see [Resizing](/guide/persistent-disks#resizing).

---

## tose pricing

Show current compute tiers and the storage rate, as served by [`GET /api/pricing`](/api/disks#get-pricing).

### Synopsis

```bash
tose pricing
```

## Related

- [Persistent Disks](/guide/persistent-disks)
- [Pricing](/guide/pricing)
- [Disks, Volumes & Pricing API](/api/disks)
