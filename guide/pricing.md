# Pricing

TOSE is pay-as-you-go. Usage is deducted from your workspace wallet. You are billed for two things:

- **Compute** (CPU and RAM) while a workload is running.
- **Storage** for persistent disks while they exist.

The current rates are always available from [`tose pricing`](/commands/disk#tose-pricing) or the public [`GET /api/pricing`](/api/disks#get-pricing) endpoint. Those are the source of truth if this page and the API ever disagree.

## Compute

Compute is billed per hour for the CPU and RAM allocated to running workloads. Every workspace pays the same **standard rate**, whatever its wallet balance:

| Resource | Rate |
|----------|------|
| CPU | $0.02 per vCPU-hour |
| RAM | $0.01 per GB-hour |

The price never changes as your balance goes up or down. Larger single top-ups earn [bonus credit](#top-up-bonus) instead. Disk pricing is described under [Storage](#storage).

Compute is billed **only while the workload is running**. Stopping a project (`tose down`), sleeping, or suspension stops compute billing.

## Top-up bonus {#top-up-bonus}

A single wallet top-up of $100 or more earns bonus credit, added on top of the amount you paid:

| Single top-up | Bonus credit |
|---------------|--------------|
| $100 or more | +10% |
| $250 or more | +15% |
| $500 or more (**Most popular**) | +20% |
| $1,000 or more | +25% |

Rules:

- **Per payment.** The band is chosen by the amount of one payment. Two $60 top-ups do not add up to a $120 top-up. A payment below $100 earns no bonus.
- **Separate credit that does not expire.** The bonus is a separate `topup_bonus` entry in the wallet history, written once per payment, and it never expires.
- **Wallet top-ups only.** The bonus is not granted on credit added by an administrator, on promotional credit, or on payments for a feature unlock.
- **No stacking with promo codes.** A payment that has a promo code applied earns no top-up bonus. Choose the code or the bonus band for that payment.
- **Refunds take the bonus back in proportion.** Refunding part of a payment takes back the same share of its bonus (rounded up, so a full refund takes back all of it). The debit never takes the balance below zero, so bonus you already spent is not recovered.
- **No retroactive bonus.** Existing balances keep their value. The bonus is granted when a payment completes; it is never applied to earlier payments or existing balances.

The bands are served by the public [`GET /api/billing/topup-bonus`](/api/disks#get-top-up-bonus) endpoint and by the `topup_bonus` block of [`GET /api/pricing`](/api/disks#get-pricing). Those are the source of truth if this page and the API ever disagree.

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

Prices use the standard compute rate, so the catalog lists one price per item, not one per wallet balance.

**Instance limit.** A workspace can hold a limited number of Cloud Harness instances: 5 by default,
unless your TOSE installation sets another limit. The catalog entry's `max_instances` field shows it.
An instance being deleted counts until its docker host is gone.

Creating an instance and waking its docker host need a positive wallet balance.

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
