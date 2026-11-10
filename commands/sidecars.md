# tose sidecars

Manage the saved [sidecar containers](/guide/project-sidecars) of a project. Sidecars are **off by default and enabled per workspace**; this command does not enable them.

All commands accept the [global options](/commands/overview#global-options), including `--json`.

## tose sidecars get

Show the saved sidecar settings. These are configuration, not proof that the containers run: use [`tose status`](/commands/status) for the running containers.

```bash
tose sidecars get [project]
```

## tose sidecars set

Replace the whole saved list from a JSON file (a list, or an object with a `sidecars` list).

```bash
tose sidecars set [project] --file sidecars.json
```

| Option | Description |
|--------|-------------|
| `--file <path>` | Required. JSON file, at most 256 KiB |

```json
[
  {
    "name": "otel-collector",
    "image": "ghcr.io/acme/collector:1.4@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "registry_credential_id": "<workspace registry credential id, for a private image>",
    "cpu": "0.25",
    "ram": "0.25",
    "port": 4318,
    "health_path": "/healthz",
    "env": [{ "name": "OTLP_HEADERS", "from_env": "OTEL_HEADERS" }]
  }
]
```

- The list replaces the saved one. An empty file is refused; use `tose sidecars rm` to remove sidecars.
- At most three sidecars; `image` must be pinned by digest. A private image uses a workspace registry credential **ID**. The CLI refuses fields that look like a password, token or auth value, and never prints credential or env values.
- The CLI checks names, digest pinning, limits and unknown fields locally; the API remains the authority (registry, env keys and disk existence).
- The change is **saved, not deployed**. Running pods and billing do not change until the next deployment. `--json` reports `applied: false` and `redeploy_required: true`.

```bash
tose sidecars set --file sidecars.json
tose redeploy
```

If the workspace is not enabled, the API answers `SIDECARS_DISABLED` (exit code `3`). Validation refusals keep their API code, for example `SIDECAR_ENV_MISSING`, `SIDECAR_DISK_MISSING` or `SIDECAR_IMAGE_FORBIDDEN`.

A change that would push one replica (project plus sidecars) over the workspace quota of 16 cores and 16 GiB of limits is refused with `422 SIDECARS_EXCEED_WORKSPACE_QUOTA`. The change is refused, not saved: the saved settings stay as they were. Several replicas or other projects can still exhaust the quota together, which fails the rollout instead.

## tose sidecars rm

Remove every saved sidecar (sends an explicit empty list). Always allowed, including in workspaces where sidecars are disabled.

```bash
tose sidecars rm [project] [--yes]
```

It asks for confirmation; without a terminal (or with `--json`) pass `--yes`. Like `set`, the removal applies at the next deployment.

If the server's response does not contain the stored list (for example a server without sidecar support), `set` and `rm` fail with `SIDECARS_NOT_CONFIRMED` instead of reporting success. [`tose deploy --dry-run`](/commands/deploy) lists the saved sidecars and includes their per-replica limits in its cost estimate.

## Related

- [Project sidecars](/guide/project-sidecars)
- [`tose status`](/commands/status): per-container readiness and the per-replica total
- [`tose logs --container`](/commands/logs): follow a sidecar
- `tose export`: refused with `SIDECARS_NOT_PORTABLE` while a project has sidecars; the CLI never drops them silently
