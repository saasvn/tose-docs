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
- **Deploys are refused, not trimmed.** If a project still has saved sidecars, or live pods that run them, in a workspace that may not use them, a deploy, redeploy, image deploy or rollback is **refused**. TOSE never rolls out a project silently without its sidecars. Remove the sidecars first, or ask for the workspace to be enabled.
- **Workspace slugs can be reserved.** Slugs on the operator's allow list cannot be taken by a new workspace, and a workspace cannot be renamed to or from one (`409`). The reservation stays in force while sidecars are disabled, so no other tenant inherits access when the feature comes back.
- **Not portable yet.** A project with sidecars cannot be moved between servers: remove the sidecars, move, then add them again.

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
| `name` | 1 to 32 lower-case letters, digits or hyphens, starting with a letter; unique in the project. It is the container name. |
| `image` | Pinned by digest: `registry/repository[:tag]@sha256:<64 hex>`. Images in the platform registry's namespace are refused (`SIDECAR_IMAGE_FORBIDDEN`). The registry must serve the manifest when the sidecar is saved. |
| `registry_credential_id` | A workspace registry credential (`/api/workspaces/{slug}/registry-credentials`) for the same registry host. Omit it to pull anonymously. |
| `cpu`, `ram` | Limits: decimal cores (0.05 to 4) and GiB (0.0625 to 8). |
| `port` | Optional in-pod port, different from the project's port and from other sidecars' ports. |
| `health_path` | With `port`, adds HTTP startup, readiness and liveness probes on that path. |
| `command`, `args` | Override the image entrypoint and arguments: at most 32 entries each, 8192 bytes together. |
| `run_as_user` | Non-root user id of at least 1000. Default 1000. |
| `env` | The only variables the sidecar receives (see [Environment variables](#environment-variables)). |
| `disk` | Mounts the project's persistent disk (see [Disk](#disk)). |

### Create and update semantics

| Request | Result |
|---------|--------|
| Create with `sidecars` omitted | No sidecars |
| Update with `sidecars` omitted or `null` | The saved list is kept |
| Update with `"sidecars": []` | Every sidecar is removed |
| Update with a non-empty list | The list **replaces** the saved one; send every sidecar you want to keep |

Saving a change does not touch the running workload. It takes effect on the **next deploy**.

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
- Images are always pulled from the registry with their own pull secret, so a pod never reuses a private image that another tenant's pod cached on the node.
- The rendered pod is checked against these rules before it is applied.
- The project's own container always stays first in the pod, so exec, rollback and image checks keep addressing it.
- CPU and RAM you set are limits. Requests are 0.1 cores and 128 MiB, or the limit when it is smaller.

## Cost and quotas

Each replica reserves your project's CPU and RAM **plus the limits of its applied sidecars**. Rates are on the [pricing page](/guide/pricing); they are not repeated here.

- **Configured estimate versus confirmed billing.** Saving a sidecar addition, change or removal does not reprice the running workload. The estimate shown for a deploy uses the saved settings; billing uses the limits that were confirmed as applied. If an allocation cannot be resolved, TOSE returns an explicit error before charging any part of that wallet's hour. An empty wallet still suspends compute.
- **Scale quotes use live limits** of the running pods, not the saved configuration.
- **Whole-pod totals.** `GET .../status` reports the project container's own limits in `resources.cpu.limit` and `resources.memory.limit`, and the per-replica sum including sidecars in `pod_total`. That sum is what is billed per replica.

## Operate

- **Status and readiness.** `GET .../status` lists every container of each pod under `pods.items[].containers` with readiness, restarts and state. A pod is ready only when **all** its containers are.
- **Logs.** `GET .../logs?container=<name>` filters stored logs by container, for the project's own container or a sidecar. `.../live-logs` follows the project's container by default; `?container=<sidecar>` follows a sidecar, and an unknown name gets `400`. The filter covers recent logs and archived lines that carry container information. Older archive lines without it are returned only when no container filter is given.
- **Rollout failures.** A crash-looping sidecar fails the rollout just like the main container, and the deploy log names it. Crashes are attributed to the ReplicaSet that matches the pod template being rolled out, so old pods that run the same main image do not fail a replacement that changes or removes their sidecar.
- **Rollback.** A runbook rollback changes only the project's own image. Sidecars and their pull secrets are kept as they are.

## Export

A portable project export (`GET /api/workspaces/{slug}/projects/{project_slug}/export`, documented in the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml)) of a project with sidecars is refused with `409 SIDECARS_NOT_PORTABLE`. The v1 bundle only describes the project's own container, and TOSE does not omit sidecars silently or claim to carry them.

## Errors

Refusals answer `{"error", "code"}`.

| Status | Codes |
|--------|-------|
| `400` | `INVALID_SIDECAR`, `IMAGE_DIGEST_REQUIRED`, `INVALID_IMAGE_REFERENCE` |
| `403` | `SIDECARS_DISABLED` |
| `409` | `SIDECARS_NOT_PORTABLE` (export), slug reservation conflicts |
| `422` | `SIDECAR_ENV_MISSING`, `SIDECAR_DISK_MISSING`, `SIDECAR_IMAGE_FORBIDDEN`, `REGISTRY_CREDENTIAL_NOT_FOUND`, `REGISTRY_CREDENTIAL_HOST_MISMATCH`, `REGISTRY_ACCESS_DENIED`, `IMAGE_NOT_FOUND` |
| `502` | `REGISTRY_UNAVAILABLE` |
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
