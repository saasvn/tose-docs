# Project Sidecars

A standard project can run up to three **sidecars**: extra containers that run in every pod of the project, next to the project's own container. Typical uses are a metrics or log shipper, a local proxy, or a small agent that needs `localhost` access to your app.

::: warning Not enabled everywhere
Sidecars are **off by default** and gated per workspace. The feature existing in the platform does not mean your workspace can use it: without access, adding a sidecar is refused with `403 SIDECARS_DISABLED`. See [Availability](#availability).
:::

## A sidecar is not a separate service

| | Sidecar | Separately exposed service |
|---|---------|----------------------------|
| Where it runs | Inside every pod of the project | Its own project |
| Network | Shares the pod's network: your app reaches it at `localhost:<port>` | Its own Service, domains and ports |
| Public traffic | Never exposed through the project's Service or domains | Can have domains |
| Lifecycle | Starts, restarts and scales with the project's pods | Deployed, restarted and scaled on its own |

If something must be reachable from the internet or scaled independently, deploy it as its own project instead. A crash-looping sidecar makes the whole pod unready.

## Availability

- **Standard projects only.** Templates and hardened workloads do not support sidecars.
- **Default off, workspace gated.** Operators turn the feature on and may limit it to named workspaces. A workspace that is not allowed cannot add a sidecar.
- **Removal is always allowed.** Sending `"sidecars": []` works even where sidecars are disabled.
- **Deploys are refused, not trimmed.** In a workspace that may not use sidecars, a deploy, redeploy or image deploy is **refused** while the project still has saved sidecars, and a rollback is refused while its live pods still run sidecars. TOSE never rolls out a project silently without its sidecars. To get unblocked, save `"sidecars": []`, deploy that removal, then roll back if needed; or ask for the workspace to be enabled. A deploy or image deploy is accepted and then fails, with the refusal in the deploy log; a redeploy answers `403` and a direct rollback answers `409`, both with code `SIDECARS_DISABLED`.
- **Workspace slugs can be reserved.** Slugs on the operator's allow list cannot be taken by a new workspace, and a workspace cannot be renamed to or from one (`409`). The reservation stays in force while sidecars are disabled, so no other tenant inherits access when the feature comes back.
- **Cannot be moved between servers yet.** Remove the sidecars, move the project, then add them again. This is separate from the export refusal [below](#export).

## Configure sidecars

Sidecars are the `sidecars` list on [create](/api/projects#sidecars) and update of a project. Every project response carries `sidecars` (`[]` when there are none).

```json
{
  "sidecars": [
    {
      "name": "otel-collector",
      "image": "ghcr.io/acme/collector:1.4@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "registry_credential_id": "<workspace registry credential id, for a private image>",
      "cpu": "0.25",
      "ram": "0.25",
      "port": 4318,
      "health_path": "/healthz",
      "args": ["--config=/etc/otel/config.yaml"],
      "env": [{ "name": "OTLP_HEADERS", "from_env": "OTEL_HEADERS" }],
      "disk": { "mount_path": "/data", "read_only": true }
    }
  ]
}
```

The digest above is a placeholder with the right shape. Use the real digest of your image. The `registry_credential_id` placeholder is the id of a credential in your workspace's registry credential catalog; never put a registry password or token in the request.

| Field | Rule |
|-------|------|
| `name` | 1 to 32 lower-case letters, digits or hyphens, starting with a letter and not ending with a hyphen; unique in the project and different from the project's own container name. It is the container name. |
| `image` | Pinned by digest: `registry/repository[:tag]@sha256:<64 hex>`. Images in the platform registry's namespace are refused (`SIDECAR_IMAGE_FORBIDDEN`). The registry must serve the manifest when the sidecar is saved. |
| `registry_credential_id` | A workspace registry credential (`/api/workspaces/{slug}/registry-credentials`) for the same registry host. Omit it to pull anonymously. |
| `cpu`, `ram` | Limits: decimal cores (0.05 to 4) and GiB (0.0625 to 8). |
| `port` | Optional in-pod port, different from the project's port and from other sidecars' ports. |
| `health_path` | With `port`, adds HTTP startup, readiness and liveness probes on that path (at most 256 characters). |
| `command`, `args` | Override the image entrypoint and arguments: at most 32 entries each, 1024 bytes per entry and 8192 bytes together. |
| `run_as_user` | Non-root user id of at least 1000. Default 1000. |
| `env` | At most 64 entries: the only variables the sidecar receives (see [Environment variables](#environment-variables)). |
| `disk` | Mounts the project's persistent disk (see [Disk](#disk)). |

### Create and update semantics

| Request | Result |
|---------|--------|
| Create with `sidecars` omitted | No sidecars |
| Update with `sidecars` omitted or `null` | The saved list is kept |
| Update with `"sidecars": []` | Every sidecar is removed |
| Update with a non-empty list | The list **replaces** the saved one; send every sidecar you want to keep |

Saving a change does not touch the running workload. It takes effect on the **next deploy**. Changing the project's `port` or `slug` re-checks the saved sidecars, and can be refused with `INVALID_SIDECAR` if a sidecar's name or port now conflicts.

### Environment variables

A sidecar never receives the project's whole environment. Each `env` entry copies one project variable, by key, into a variable of your chosen name. The project variable must exist when the sidecar is saved and again when it deploys, otherwise the request or deploy is refused with `SIDECAR_ENV_MISSING`. See [Environment variables](/guide/environment).

### Disk

`disk.mount_path` mounts the project's [persistent disk](/guide/persistent-disks). The project must have one (`SIDECAR_DISK_MISSING`), and the path must be absolute, not `/tmp` and not under a system directory. Set `read_only: true` when the sidecar only reads.

### Private images and pull credentials

For a private image, pass `registry_credential_id`, a credential from your workspace with the same host as the image. TOSE seals the credential and creates a separate pull secret for each credential version.

- **Rotation** takes effect on the next rollout.
- **Retention:** every credential version stays until the project's workload is deleted, so a retained revision or a rollout that is still preparing keeps the credential it started with.
- **Deleting a catalog entry** that a sidecar uses makes the next rollout fail until you change the sidecar. It removes TOSE's copy only: **it does not revoke the token at the registry.** Revoke it there yourself.

## What TOSE enforces

Every sidecar runs with a fixed security context that no request can change: not privileged, no privilege escalation, non-root, all Linux capabilities dropped and the `RuntimeDefault` seccomp profile.

- A pod with sidecars mounts no service account token, has no host path, host network or Docker socket. Because the token setting applies to the whole pod, adding a sidecar also removes the token from your project's own container.
- Each sidecar gets a 1 GiB `/tmp` scratch volume and at most 2 GiB of local disk.
- Images are always pulled from the registry (`imagePullPolicy: Always`), with their own pull secret when a credential is set, so a pod never reuses a private image that another tenant's pod cached on the node.
- The rendered pod is checked against these rules before it is applied.
- The project's own container always stays first in the pod, so exec, rollback and image checks keep addressing it.
- CPU and RAM you set are limits. Requests are 0.1 cores and 128 MiB, or the limit when it is smaller.

## Cost and quotas

Each replica reserves your project's CPU and RAM **plus the limits of its applied sidecars**. Rates are on the [pricing page](/guide/pricing); they are not repeated here.

- **Configured estimate versus confirmed billing.** Saving a sidecar addition, change or removal does not reprice the running workload. The estimate shown for a deploy uses the saved settings; billing uses the limits that were confirmed as applied. If an allocation cannot be resolved, TOSE returns an explicit error before charging any part of that wallet's hour. An empty wallet still suspends compute.
- **Scale quotes use live limits** of the running pods, not the saved configuration.
- **Whole-pod totals.** `GET .../status` reports the project container's own limits in `resources.cpu.limit` and `resources.memory.limit`, and the per-replica sum including sidecars in `pod_total`. `pod_total` is computed from the saved configuration, so between a save and the next deploy it is the configured estimate; billing follows it once a deploy applies the change.

## Operate

- **Status and readiness.** `GET .../status` lists every container of each pod under `pods.items[].containers` with readiness, restarts and state. A pod is ready only when **all** its containers are.
- **Logs.** `GET .../logs?container=<name>` filters stored logs by container, for the project's own container or a sidecar. `.../live-logs` follows the project's container by default; `?container=<sidecar>` follows a sidecar, and an unknown name gets `400`. The project's own container is named after its deployment. Live logs check the name against the saved list, so a sidecar you removed but have not redeployed cannot be followed. The filter covers recent logs and archived lines that carry container information. Older archive lines without it are returned only when no container filter is given.
- **Rollout failures.** A crash-looping sidecar fails the rollout just like the main container, and the deploy log names it. Crashes are attributed to the ReplicaSet that matches the pod template being rolled out, so old pods that run the same main image do not fail a replacement that changes or removes their sidecar.
- **Rollback.** A runbook rollback changes only the project's own image. Sidecars and their pull secrets are kept as they are.

## Export {#export}

A portable project export (`GET /api/workspaces/{slug}/projects/{project_slug}/export`, documented in the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml)) of a project with sidecars is refused with `409 SIDECARS_NOT_PORTABLE`. The v1 bundle only describes the project's own container, and TOSE does not omit sidecars silently or claim to carry them.

## Errors

Refusals answer `{"error", "code"}`, except the slug reservation `409`, which has no `code`.

| Status | Codes |
|--------|-------|
| `400` | `INVALID_SIDECAR`, `IMAGE_DIGEST_REQUIRED`, `INVALID_IMAGE_REFERENCE` |
| `403` | `SIDECARS_DISABLED` (also `409` for a direct rollback, see [Availability](#availability)) |
| `409` | `SIDECARS_NOT_PORTABLE` (export), slug reservation conflicts |
| `422` | `SIDECAR_ENV_MISSING` and `SIDECAR_DISK_MISSING` (a redeploy answers `409` for these two), `SIDECAR_IMAGE_FORBIDDEN`, `REGISTRY_CREDENTIAL_NOT_FOUND`, `REGISTRY_CREDENTIAL_HOST_MISMATCH`, `REGISTRY_ACCESS_DENIED`, `IMAGE_NOT_FOUND` |
| `502` | `REGISTRY_UNAVAILABLE` |
| `500` | `REGISTRY_CREDENTIAL_UNREADABLE` (a stored credential cannot be decrypted) |
| `503` | `ENCRYPTION_UNAVAILABLE` |

The full schema is `ProjectSidecar` in the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml).

::: info CLI
The `tose` CLI has no sidecar flags yet. Configure sidecars through the API.
:::

## Related

- [Projects API](/api/projects#sidecars)
- [Environment Variables](/guide/environment)
- [Persistent Disks](/guide/persistent-disks)
- [Pricing](/guide/pricing)
