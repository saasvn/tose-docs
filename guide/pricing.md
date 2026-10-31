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

## Running out of balance

When your wallet runs out, TOSE suspends compute. Persistent disks and their data are **not** deleted, and their storage cost keeps accruing; it is charged after your next top-up. See [Persistent Disks](/guide/persistent-disks#retention).

## Related

- [Persistent Disks](/guide/persistent-disks)
- [`tose pricing` / `tose volumes`](/commands/disk)
- [Disks, Volumes & Pricing API](/api/disks)
