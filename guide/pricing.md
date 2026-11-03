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

## Cloud desktops {#cloud-desktops}

A [cloud desktop](/guide/cloud-desktops) is billed **per second while it runs**, at the compute rates above for its CPU and RAM. A sleeping desktop has no compute charge; its disk is billed as [storage](#storage). Amounts are metered in nano-USD (1 USD = 1,000,000,000), so a short run is not rounded up to a whole hour or cent: the sub-cent remainder carries forward as described under [Sub-cent amounts](#sub-cent-amounts). Compute metered while the balance is zero is forgiven, not charged later.

Waking a desktop needs a positive wallet balance. See [Cloud desktops](/guide/cloud-desktops#retention).

## Cost reports {#cost-reports}

```http
GET /api/workspaces/{slug}/wallet/costs?days=30
```

Splits the metered cost of the last `days` days (default 30) by project, by resource and by UTC day, from the usage ledger. Amounts are in nano-USD (`compute_nano_usd`, `storage_nano_usd`, `total_nano_usd`). Each entry in `resources` has a `type`: `project`, `template`, `database`, `desktop`, `runtime`, `volume`, `ci_cache` (the CI dependency cache) or `other`. [Cloud Harness runtimes](/guide/cloud-harness) are listed as `runtime` with the runtime's name and their own compute cost, and a project's disks count towards that project. The report is metered usage: compute metered in an hour that began with a zero balance is listed but was never charged.

## When the balance is zero {#when-the-balance-is-zero}

TOSE refuses every deploy while your workspace wallet balance is zero or negative. What you see depends on where the deploy started:

| Where | What happens |
|-------|--------------|
| Dashboard and API | Deploy, redeploy and rollback return HTTP `402` with the error code `INSUFFICIENT_BALANCE`. No deployment is created. See [Common error messages](/guide/troubleshooting#insufficient-balance). |
| GitHub push and the first deploy of a project | The deployment is created, then moves to `failed` before the build starts, with the message `insufficient wallet balance`. |
| An agent over MCP | `deploy_project` and `rollback_deployment` return `INSUFFICIENT_BALANCE` at the plan step, so you are never asked to approve a change that cannot run. See [Tasks](/mcp/tasks#empty-wallet). |

When the wallet runs out, TOSE also suspends compute, as before. Running Cloud Harness instances are stopped and their docker hosts suspended. Persistent disks and their data are **not** deleted, and their storage cost keeps accruing; it is charged after your next top-up. See [Persistent Disks](/guide/persistent-disks#retention). Any compute that could not be paid for is written off, so you do not owe it after a top-up.

**To recover:** top up the wallet from the dashboard billing page, then deploy again. Deploys work normally once the balance is above zero.

A top-up resumes most suspended templates automatically. Deploying a suspended template needs a positive wallet balance too: otherwise the deploy is refused with `402 INSUFFICIENT_BALANCE` and the template stays suspended (see [Template deploy and resume API](/api/template-deploy#suspended-needs-balance)).

### Dewee and GoClaw instances after a top-up {#suspended-gateway-templates}

A Dewee or GoClaw instance only resumes after a top-up when it has a live gateway token: a valid token is stored, the running workload reads it, and the workload's variables Secret carries it. Without that, the instance stays `suspended` rather than coming back reachable without authentication. The deployment history gets a failed `system` entry with a `GATEWAY_TOKEN_*` code, and the workspace owner gets an email with a link to the instance.

To bring it back, open the instance and choose **Issue token and resume** (or redeploy it). This needs the owner or admin role and a positive balance. Afterwards:

- existing clients must send the issued token (workspace admins can read it under the template's variables);
- active sessions end, because the pod restarts.

The same action is available as `POST /api/workspaces/{slug}/templates/{template_slug}/resume`; see the [API](/api/template-deploy#resume) and the [`GATEWAY_TOKEN_*` codes](/api/template-deploy#gateway-token-codes).

## Related

- [Persistent Disks](/guide/persistent-disks)
- [Cloud Harness](/guide/cloud-harness)
- [`tose pricing` / `tose volumes`](/commands/disk)
- [Disks, Volumes & Pricing API](/api/disks)
