# Persistent Disks

By default every TOSE project is **stateless**: the container filesystem is recreated on each deploy, restart, stop, or wake, and anything written to it is lost. Keep durable state in a [managed database](/commands/db) or external storage, or attach a persistent disk.

A persistent disk is a block volume mounted into your project's container at a path you choose. Its data survives redeploys, restarts, stops, and sleep.

## When to use a disk

- File uploads, caches, or embedded databases (SQLite, LevelDB) that must outlive a deploy.
- Apps that expect a writable data directory, such as many self-hosted tools.

If your app can keep state in a managed database or object storage, prefer that: stateless projects can scale to multiple replicas and roll out with zero downtime.

## Enabling a disk

Disks are opt-in per project. Add one when you create the project, or later:

```bash
# When creating a project (tose up accepts the same flags)
tose init --disk-size 10 --disk-mount /data

# On an existing project
tose disk set --size 10 --mount /data
tose redeploy
```

See [`tose disk`](/commands/disk) for all options, or the [Disks API](/api/disks) to do the same over HTTP.

### Size

- Minimum **1 GiB**, maximum **1000 GiB**, whole GiB only.

### Mount path

The mount path must:

- be an absolute path (start with `/`);
- not be `/` itself;
- not contain `..`;
- not be a system directory: `/proc`, `/sys`, `/dev`, `/etc`, `/bin`, `/sbin`, `/usr`, `/lib`, `/lib64`, `/boot`, `/run`, `/var/run`.

Typical choices are `/data`, `/app/storage`, or `/var/lib/<app>`. Make sure your app writes its state to that path.

## What changes when a project has a disk

A disk can be attached to only one running container at a time. So a project with a disk:

- **runs exactly 1 replica**; and
- **redeploys with the Recreate strategy**: the old container stops before the new one starts, which causes a **brief downtime** on every deploy, redeploy, and restart.

Projects without a disk keep their normal rolling, zero-downtime deploys.

### Provisioning failures fail the deploy

If the disk cannot be provisioned or mounted, the deployment **fails** instead of starting your app without persistence. TOSE never silently falls back to an ephemeral filesystem, because an app writing to a disk that is not there would lose data. Check `tose status` and `tose logs --build` for the reason, fix it, and deploy again.

## Resizing

Disks are **grow-only**. Increase the size with:

```bash
tose disk set --size 30 --mount /data
tose redeploy
```

Changing the size or mount path takes effect on the next deploy, so redeploy afterwards. Disks of templates and databases are resized with [`tose volumes resize`](/commands/disk#tose-volumes-resize).

Shrinking is rejected. To move to a smaller disk, migrate the data: copy it out of the current disk, delete the disk, create a new smaller one, and copy the data back.

Billing follows the provisioned size; see [Pricing](/guide/pricing#storage).

## Deleting a disk

```bash
tose disk delete --confirm my-app
```

The `--confirm` value must equal the project slug.

::: danger Deleting a disk deletes its data
Deleting a disk permanently erases everything on it and stops storage billing. There is no undo and no snapshot to restore from. Back up anything you need first.
:::

## Retention

Disks are kept until you delete them, or until you delete the project, template, or database that owns them.

- **Stopping or suspending** a project (`tose down`, sleep) stops compute but **never deletes** the disk.
- **Wallet exhaustion** suspends compute only. Your disks and data are kept, and storage keeps accruing while they exist; top up and redeploy to resume.

## Templates and managed databases

- **1-click templates** get a **2 GiB** disk by default.
- **Managed databases** store their data on the same kind of disk.

Both are listed with project disks under [`tose volumes list`](/commands/disk#tose-volumes-list), resize the same way (grow-only), and are billed at the same storage rate.

## Snapshots

Snapshots and backups of disks are not offered yet.

## Related

- [Pricing](/guide/pricing) - Compute and storage rates
- [`tose disk` / `tose volumes`](/commands/disk) - CLI reference
- [Disks, Volumes & Pricing API](/api/disks) - REST reference
