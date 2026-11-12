# Registry templates: health probes, upgrade and rollback

This guide covers templates installed from the TOSE **template registry** (a `tose.yaml` manifest published as a definition and version in your workspace). It explains how a manifest declares startup, readiness and liveness probes, and how a person reviews, approves and checks an in-place upgrade or rollback of an installed app.

It does not cover the catalog templates (GoClaw, Dewee, Cloud Harness). For those, see the [Dewee runbook](/guide/dewee-template) and [`tose template`](/commands/template).

::: warning Release gates still apply
Registry templates are private to your workspace and every plan goes through the same gates as an install. With today's production configuration every plan is blocked, so you can plan and review but not yet install or upgrade. See [Release gates](#release-gates-stay-in-force).
:::

## Declare health probes in the manifest

Add an optional `health` block to the service in `tose.yaml`:

```yaml
services:
  - name: web
    port: 3000
    health:
      readiness:
        http:
          path: /healthz
      liveness:
        tcp: {}
      startupSeconds: 300
```

| Field | Meaning |
|-------|---------|
| `readiness` | Decides when the pod receives traffic. Optional |
| `liveness` | Decides when the container is restarted. Optional |
| `http` | `path` (absolute URL path, at most 200 characters, no query, fragment, whitespace or `.`/`..` segment) and optional `port` |
| `tcp` | Optional `port` |
| `startupSeconds` | How long the container may take to pass its first probe before it is restarted. `30` to `1800`, default `300` |

Rules the parser enforces, each with a message that names the path:

- A probe is exactly one of `http` or `tcp`. A port of `0`, or no port, means the service port.
- `exec`, `grpc`, and an HTTP probe's `host`, `scheme` and `httpHeaders` are refused. A template can never make the node run a command in its container.
- A manifest without `health` deploys as before.

### What TOSE does with the probes

- The probes are part of the plan, so they are covered by the plan hash you approve. A version without `health` keeps the hash it had before probes existed.
- The workload gets exactly the declared readiness and liveness probes, plus a startup probe built from the first declared check. The rollout waits at least `startupSeconds`.
- A run is recorded `running` only after the pods pass their probes.
- When readiness is an HTTP path on the service port, TOSE also calls that path on the public route. The health state is `healthy`, or `unhealthy` with a reason, and the run fails. Otherwise the pod result stands and the state is `unverified`.
- `TEMPLATE_PROBES_ENABLED=false` on the platform turns probes off for registry installations.

An installation reports `health.declared` (the probes of the version it runs) together with the latest run's `health.state`, `health.message` and `health.checked_at`.

## Upgrade or roll back in place

An installed app moves to another published version of its definition through the same three steps as an install: **plan, approve, execute**. Nothing is created beside the app, and planning changes nothing.

### 1. Review the plan

In the dashboard, open the installed app (`/w/<workspace>/templates/<app>`). The **Template version** card on the Overview tab (on a Claude Code, Codex or Pi agent's page, under **Advanced** in the **Settings** tab) shows the installed version, its probes and its latest health state. Choose a newer version, or use **Roll back** after an upgrade, and the plan appears as the server returned it:

1. **Blockers** first. Nothing can be approved while one is listed.
2. A before/after table: image digest, build mode, port, size, inputs added and kept, each volume, the disk, the probes and egress. Rows where data could be at risk are highlighted.
3. Warnings, the cost ceiling and wallet, the plan hash and the expiry (30 minutes).

If the new version needs an input the app has no value for, the card shows a field for it and makes the plan again.

### 2. Confirm the target version

Check that the version in the plan is the one you meant, and that the manifest hash and source digest match what you reviewed. Tick the review box and approve. The approval is bound to the plan hash: if anything hashed changes before you apply (a revoked version, another disk size, a new price) the plan is refused as stale and you plan again.

Approval needs a person. A workspace API key approves for its owner. A connected MCP app cannot approve; it sends you to the plan's approval page.

### 3. Apply and check rollout health

Applying asks for any new secret values in password fields and sends one `Idempotency-Key` per plan, so a retry or a double click replays the same change. The card then follows the run until it finishes.

To check the result:

- The installation's `health.state` should become `healthy` (or `unverified` when readiness is not an HTTP path on the service port).
- `version` shows the new version and `rollback_to` shows the version you can go back to.
- The run's `trigger_type` is `template_upgrade` or `template_rollback`, and the deployment logs are linked from the app.

If the new version fails its probes, **nothing rolls back by itself**. The run is marked failed with the reason. Plan a rollback when you want the previous version back.

### Rollback

A rollback plan goes back to the version the latest upgrade replaced, with the same approval and execution. It warns `ROLLBACK_DATA`: the previous version gets the same disk back and may not understand what the newer one wrote. A rollback is not itself rolled back; plan an upgrade instead. The upgrade history is listed newest first.

## Existing disks and data are preserved

A deploy never deletes or shrinks a disk, and stored inputs are never deleted. The plan is **refused** (a blocker) in these cases:

| Code | Why the plan is refused |
|------|-------------------------|
| `VOLUME_REMOVED` | The new version drops a storage entry. Entries are compared by position, because entry `n` is the `data-<n>` directory of the disk |
| `VOLUME_PATH_CHANGED` | The new version mounts an existing entry at another path |
| `DISK_RESIZE_REQUIRED` | The new version needs more storage than the live disk has. A deploy never resizes a disk. Grow it first (`PATCH /volumes/{volume_id}`), then plan again |
| `INSUFFICIENT_BALANCE` | The wallet holds less than one hour of the upgraded workload (`402`) |
| `DEPLOYMENT_IN_PROGRESS` | A run is building or deploying |
| `INSTALLATION_DELETING` or `INSTALLATION_DELETED` | The app is being or has been deleted |

These only warn:

| Code | Meaning |
|------|---------|
| `VOLUME_UNMOUNTED` | A rollback leaves a newer version's storage entry unmounted. Its data stays on the disk and the next upgrade mounts it again |
| `INPUT_REMOVED` | The new version no longer declares an input. Its value is kept and still passed to the app |
| `INSTALLATION_STOPPED` | The app is stopped and the upgrade starts it |
| `ROLLBACK_DATA` | See [Rollback](#rollback) |

The app keeps its definition, name, network mode and size. A plan that tries to change `name`, `definition_slug`, `cpu_cores` or `memory_gib` is refused instead of ignored; a new version can only raise the size to what its manifest needs.

::: tip Back up first
The disk is preserved, but a new version may migrate the data on it. Take a backup of anything you cannot recreate before you upgrade.
:::

## Release gates stay in force

Upgrade and rollback do not bypass any registry gate. Every plan, including an upgrade or rollback plan, is checked for:

- the version is published (not revoked or deprecated) and its manifest hash still matches;
- the build security gate. Without it configured the blocker is `SECURITY_GATE_UNAVAILABLE`. With today's production configuration every plan is blocked by `COMMUNITY_TEMPLATES_DISABLED` and `IMAGE_SCANNER_NOT_CONFIGURED`, and Git sources also by `BUILD_SANDBOX_NOT_HARDENED` and `PUSH_CREDENTIALS_NOT_SCOPED`;
- a cluster and namespace exist, and the cost ceiling is not above `max_hourly_cost_cents`;
- approval of the plan hash (always required for a registry version), expiry after 30 minutes and single use.

The end-to-end run against a live cluster (probes on a real kubelet, then upgrade and rollback) has not been done yet. Treat probes and upgrade as available through the API and dashboard but not as a verified production flow.

## REST

All routes are under `/api/workspaces/{slug}`.

| Route | Who | Does |
|-------|-----|------|
| `POST /template-deployment-plans` | member, `deployments:read` | Plans an upgrade with `{"installation_id": "...", "version": "2.0.0"}`. Omit `version` for the newest published version. Use `{"installation_id": "...", "rollback": true}` to go back. `variables` sets only inputs the installation has no value for |
| `GET /template-deployment-plans/{plan_id}` | member, `deployments:read` | The plan, its `kind` (`upgrade` or `rollback`) and its `status` |
| `POST /template-deployment-plans/{plan_id}/approve` | admin, `deployments:execute` | Approves `{plan_hash}` |
| `POST /template-installations/{installation_id}/upgrades` | admin, `deployments:execute` and `projects:write` (and `env:write` with secrets) | Applies `{plan_id, plan_hash, secrets}`. Needs an `Idempotency-Key` header |
| `GET /template-installations/{installation_id}/upgrades` | member, `deployments:read` | Upgrades and rollbacks, newest first |
| `GET /template-installations[/{installation_id}]` | member, `deployments:read` | Version, `version_status`, `health`, `rollback_to` and `next_actions` (`plan_upgrade`, `plan_rollback`). `?template_id=` finds one app |

Errors you may see when applying:

| Code | Meaning |
|------|---------|
| `409 PLAN_STALE` | Something hashed changed. The body has `changed` and `current_plan_hash` |
| `409 PLAN_BLOCKED` | A new blocker appeared (`402` for an empty wallet) |
| `409 PLAN_CONSUMED` | The plan was applied under another key |
| `409 PLAN_NOT_FOR_INSTALLATION` | The plan belongs to another installation |
| `409 PLAN_IS_UPGRADE` | An upgrade plan was sent to `POST /template-installations` |
| `409 DEPLOYMENT_IN_PROGRESS` | A run is still building or deploying |
| `403 APPROVAL_REQUIRES_PERSON` | A connected MCP app tried to approve |

Retries with the same key replay the first result (`200`, `replayed: true`). The full contract is in the OpenAPI document of the platform.

## MCP

The MCP tools call the same planner as REST and reach no more than REST does.

| Tool | Does | Scope |
|------|------|-------|
| `plan_template_deployment` | With `installation_id` and a `version` or `rollback: true` it plans an in-place upgrade or rollback. Returns the plan, `approval_required`, `approval_url` and `next_actions` | `deployments:read` |
| `get_template_deployment` | A plan, an installation with its version, health and `rollback_to`, and its latest run with a redacted log tail | `deployments:read` |
| `deploy_template` | Executes an approved install, upgrade or rollback plan. Retries return the first result | `deployments:execute` and `projects:write` |

No tool approves a plan. Open the `approval_url` (`/oauth/template-plans/{plan_id}` on the API) while signed in as a workspace owner or admin, review the same plan, and approve it. When a plan needs secrets, you enter the values on that page, which approves and applies it as you, so the values never pass through the agent. Every call, including a denied one, is recorded in the MCP audit log. For connecting a client, see [MCP clients](/mcp/clients) and [Protocol, OAuth and scopes](/mcp/oauth).

## Related

- [Configuration File](/guide/configuration)
- [Persistent Disks](/guide/persistent-disks)
- [Dewee runbook](/guide/dewee-template)
- [Pricing](/guide/pricing)
- [MCP clients](/mcp/clients)
