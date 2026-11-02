# Pricing

TOSE is pay-as-you-go. Usage is deducted from your workspace wallet. You are billed for two things:

- **Compute** (CPU and RAM) while a workload is running.
- **Storage** for persistent disks while they exist.

The current rates are always available from [`tose pricing`](/commands/disk#tose-pricing) or the public [`GET /api/pricing`](/api/disks#get-pricing) endpoint. Those are the source of truth if this page and the API ever disagree.

## Compute

Compute is billed per hour for the CPU and RAM allocated to running workloads. The rate depends on your wallet balance:

| Wallet balance | CPU (per vCPU-hour) | RAM (per GB-hour) |
|----------------|---------------------|-------------------|
| Below $100 | $0.02 | $0.01 |
| $100 or more | $0.014 | $0.007 |
| $200 or more | $0.012 | $0.006 |

Compute is billed **only while the workload is running**. Stopping a project (`tose down`), sleeping, or suspension stops compute billing.

## Storage

Persistent disks (project disks, template disks, and managed database storage) are billed on **provisioned capacity**, not on the space you actually use:

- **$0.15 per GiB-month.**
- A month is 730 hours, so the hourly rate is $0.15 / 730 ≈ **$0.00020548 per GiB-hour**.
- Usage is metered every hour, to the second, from when the disk is created until it is deleted.
- Storage keeps accruing **while the disk exists, even when the app is stopped or sleeping**. Delete the disk to stop storage charges.

| Disk size | Per month (730 h) |
|-----------|-------------------|
| 10 GiB | $1.50 |
| 30 GiB | $4.50 |
| 100 GiB | $15.00 |

A partial month is charged proportionally. For example, a 30 GiB disk kept for 360 hours costs 30 × 360 × $0.15 / 730 ≈ $2.22.

### Sub-cent amounts

Hourly storage cost for a small disk is a fraction of a cent. TOSE does not round each hour up or down: the exact amount is carried forward and deducted from your wallet once it adds up to a whole cent. Over a month you pay the exact rate above.

### Snapshots

There is no snapshot fee. Disk snapshots are not offered yet.

## Cloud Harness

A [Cloud Harness](/guide/cloud-harness) instance has no unlock fee. It is billed in three parts, at
the compute rates and the storage rate above:

| Part | Billed | Size |
|------|--------|------|
| Instance | Every hour while the instance runs, like other templates | The size you chose, plus a fixed budget for the containers beside the runner |
| Docker host | **Per second while awake**; **$0 while cold** | The installation's docker host size |
| Disks | For as long as the instance exists, even when stopped | The instance's state disk plus the docker host's disk |

- **Instance:** (vCPU + reserved vCPU) × the CPU rate + (GB + reserved GB) × the RAM rate, rounded to
  whole cents per hour. A stopped instance has no compute charge.
- **Docker host:** its vCPU × the CPU rate + its GB × the RAM rate, per hour, charged for each second
  from a confirmed start until a confirmed stop. It wakes when a job needs Docker and suspends when
  idle. Amounts below one cent carry forward, as described under [Sub-cent amounts](#sub-cent-amounts).
- **Disks:** both disks' provisioned GiB at the storage rate.

The current prices are computed by the server and returned in the `pricing` block of the
`cloudharness` entry in the template catalog (`GET /api/workspaces/available-templates`), which the
dashboard shows on the Cloud Harness card:

| Field | Meaning |
|-------|---------|
| `instance.cpu`, `instance.ram` | Default instance size |
| `instance.reserved_cpu`, `instance.reserved_ram` | Fixed budget of the containers beside the runner |
| `instance.usd_per_hour` | Instance price per hour while running |
| `docker_host.cpu`, `docker_host.ram` | Docker host size |
| `docker_host.usd_per_hour_running` | Docker host price per hour while awake |
| `docker_host.usd_per_hour_cold` | Always `0` |
| `storage.state_disk_gib`, `storage.runtime_disk_gib` | Disk sizes |
| `storage.usd_per_month` | Both disks per month |
| `compute_tiers` | Instance and docker host prices for each wallet balance tier |

The hourly prices outside `compute_tiers` are for the lowest balance tier.

**Instance limit.** A workspace can hold a limited number of Cloud Harness instances: 5 by default,
unless your TOSE installation sets another limit. The catalog entry's `max_instances` field shows it.
An instance being deleted counts until its docker host is gone.

Creating an instance and waking its docker host need a positive wallet balance.

## Running out of balance

When your wallet runs out, TOSE suspends compute. Running Cloud Harness instances are stopped and
their docker hosts suspended. Persistent disks and their data are **not** deleted, and their storage cost keeps accruing; it is charged after your next top-up. See [Persistent Disks](/guide/persistent-disks#retention).

## Related

- [Persistent Disks](/guide/persistent-disks)
- [Cloud Harness](/guide/cloud-harness)
- [`tose pricing` / `tose volumes`](/commands/disk)
- [Disks, Volumes & Pricing API](/api/disks)
