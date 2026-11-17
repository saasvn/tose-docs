# Coding agents: environment variables and auto-sleep

This page explains the environment variables you can add to a curated coding agent (**Codex**, **Pi** or **Claude Code**), and auto-sleep for idle agents.

## On the deploy page

The dashboard deploys these agents from one page. Its cards, the live plan and the **Deploy** button are described in [Deploy a coding agent](/guide/deploy-coding-agent#deploy-an-agent). Two of its settings are explained here:

- **Environment variables**, in the **Advanced: release, model and environment variables** card: see [Your own environment variables](#your-own-environment-variables).
- **Auto-sleep after idle**, in the **Size** card: see [Auto-sleep for idle agents](#auto-sleep-for-idle-agents).

## Your own environment variables

In **Advanced** you can add settings of your own for the agent. Through the API they are the `environment` field of the plan request:

```json
{
  "curated_template": "pi",
  "name": "My agent",
  "environment": {
    "variables": { "LOG_LEVEL": "debug" },
    "secret_refs": ["GITHUB_PAT"]
  }
}
```

There are two kinds:

- **Variables**: a name and a non-secret value, at most **32**. The plan shows them, so approving the plan approves exactly those values.
- **Secret references**: a name only, at most **16**. The plan lists the names. The value is sent with the install request in `secrets`, like the provider key. It is encrypted at rest, given to the agent's process as an environment variable, and never returned by any read, plan, log or error. A secret reference can only name a value you type for this installation.

In the form, tick **Secret** on a row to make it a secret reference. The value field becomes a password field in the same row: the plan keeps only the name, and the value goes with the **Deploy** request.

The limits and the reserved names come from `inputs.environment` of `GET /curated-templates`, so read them there instead of hard-coding them.

### Rules

- A name is letters, digits and `_`, at most 63 characters, not starting with a digit. Names are unique without regard to case.
- **Reserved names** are refused with `ENV_NAME_RESERVED`. They include the prefixes `TOSE_`, `KUBERNETES_`, `LD_`, `DYLD_`, `BASH_FUNC_`, `NPM_CONFIG_`, `GIT_CONFIG`, `SSH_`, `AGENT_`, `PI_`, `CODEX_`, `CLAUDE_`, `ANTHROPIC_`, `OPENAI_` and `GEMINI_`, shell, runtime, proxy and TLS names such as `PATH`, `HOME`, `NODE_OPTIONS`, `HTTPS_PROXY` and `SSL_CERT_FILE`, and platform names such as `DATABASE_URL`. Provider, model and key settings go through the template's own inputs, never through the environment. The platform list is shared with [Agent Runtime agents](#agent-runtime-environment) and lives in [`internal/agentenv/names.go`](https://github.com/saasvn/tose-app/blob/master/internal/agentenv/names.go); the names a template's own inputs set are added to it.
- A name that looks like a credential (it contains `SECRET`, `TOKEN`, `PASSWORD`, `PRIVATE_KEY`, `API_KEY` or `CREDENTIAL`, or ends in `_KEY`) must be a secret reference (`ENV_NAME_NEEDS_SECRET`).
- A value is one line of at most 2048 characters, and all plain values together are at most 16 KiB.

### Changing them later

The installed app's **Environment Variables** list uses the same rules, except that a name that looks like a credential is not refused there: it is stored as a secret whatever the request says. The agent reads its environment when it is deployed. A change never restarts a running agent: it keeps the values it started with until you redeploy it. The installation reports this as `environment.status`: `applied`, `restart_required` (a change is newer than the latest run) or `pending` (the run has not read it yet). A variable removed through the API is not detected as a change, so do not rely on `restart_required` after a removal.

::: info Not available
An optional setup script that runs once for an agent is not offered. A request with a script, a startup command or a hook is refused as an unknown field.
:::

## Agent Runtime agents: environment {#agent-runtime-environment}

::: warning Stored, not applied yet
This section is about agents of the Agent Runtime (`/api/workspaces/{slug}/agents`), not the curated agents above. It works only when the operator sets `AGENT_ENVIRONMENT_ENABLED=true`, which stays off in production until the setup executor exists. Even then, TOSE only **validates and stores** the environment: no variable, secret or script reaches the engine yet, and the read view reports `apply_status: not_applied`. Running the script, delivering secrets to the engine, setup status and logs, and the CLI, MCP and dashboard surfaces are not built.
:::

An Agent Runtime agent can carry an `environment` next to its engine `settings`. It is the same for every engine and is saved with the agent revision:

- `variables`: plain names and values.
- `secret_refs`: a variable name mapped to the **name** of a workspace agent secret. The secret value is never part of the environment.
- `install_script`: an optional user-space install script, with `install_policy: on_revision_change` (the default when a script is set).

Set it in the body of `POST /agents` or `PUT /agents/{agent_id}`. Both need a workspace owner or admin, or the `agents:write` scope. On update, leaving `environment` out (or `null`) keeps it, `{}` clears it and an object replaces it. Send `expected_revision` to have the update refused with `409` when the agent changed in the meantime. While the flag is off, a request that sets an environment is refused with `409 NOT_SUPPORTED`; an invalid one answers `400` naming the field, never the value.

Rules that differ from curated agents:

- `variables` and `secret_refs` both refuse the [shared reserved names](https://github.com/saasvn/tose-app/blob/master/internal/agentenv/names.go). Agent Runtime agents also reserve `GOOGLE_*`, `GIT_SSH` and `GIT_SSH_COMMAND`.
- A plain variable whose name suggests a credential is refused; use `secret_refs` for it.
- A script whose commands call `sudo`, a system package manager, or a container or cluster client (for example `apt-get`, `docker`, `kubectl`) is refused. This check is best effort and gives an early, readable error; the sandbox (non-root, read-only root filesystem, egress allowlist) is the boundary. System packages need a reviewed base image.

The exact limits and patterns are in the `AgentEnvironment` schema of the [OpenAPI contract](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml).

`GET /agents/{agent_id}/environment` (workspace owners and admins, or `agents:write`) returns the variables, the secret reference names, the script's metadata (`sha256`, `bytes`, `lines`), the setup `hash` and `apply_status`. It never returns a secret value or the script text, and the agent itself (`GET /agents/{agent_id}`) does not include the environment. While the flag is off it answers `409 NOT_SUPPORTED`.

## Auto-sleep for idle agents

Closing the browser does not stop an agent: its session keeps running and compute keeps billing. Auto-sleep stops the compute after the agent has been idle for a time you choose.

The setting is `auto_sleep_minutes`: **Off** (`0`, the default), **15**, **30**, **60** or **120** minutes. Existing installations never sleep unless you turn it on. Choose it:

- in the **Size** card of the deploy page;
- later, in the **Auto-sleep** card in the **Settings** tab of the agent's page (its rules fold under **How auto-sleep works**; the **Auto-sleep** tile on **Overview** opens it);
- with `PUT /api/workspaces/{slug}/template-installations/{id}/auto-sleep`, body `{"minutes": 30, "expected_revision": 0}`. Use the current `auto_sleep.revision`; a stale one returns `409 REVISION_CONFLICT`.

### When an agent sleeps

An agent sleeps only after TOSE observed it idle for the whole interval: no keyboard input or terminal output, no command running, and no install or bootstrap. A closed tab never counts. If TOSE cannot tell safely, the agent stays awake and the page says why.

::: warning Which releases can sleep
Sleep needs an image that carries the activity probe (`tose-agent-console activity`). **Codex 1.0.0**, **Claude Code 1.0.0** and **Pi 1.0.0** do not have it, so their agents stay awake and the page shows the reason. **Pi 1.1.0**, the default Pi release, was built from a tose-app commit that contains the probe, so a Pi agent on 1.1.0 sleeps when auto-sleep is on. Published releases are immutable: a 1.0.0 agent is not upgraded in place, so install a new app to get a release that can sleep.
:::

### While it sleeps

- Compute billing stops. The disk keeps billing.
- Files (`/workspace`, `/home/agent`) and provider sign-in state are kept.
- A running tmux session is **not** kept. Continuing a conversation depends on the agent's own checkpoint and resume, not on TOSE.

### Waking {#waking}

Only an explicit **Wake and open** on the agent's page (`POST /api/workspaces/{slug}/template-installations/{id}/wake`) wakes the agent. Reading the app, polling and health checks never do. It needs a funded wallet (otherwise `402 INSUFFICIENT_BALANCE` and the agent stays asleep) and takes a cold start. `auto_sleep.last_wake.outcome` is `pending` until the agent answers, then `ok`, `failed` or `insufficient_balance`.

### Reclaimed agents cannot be woken

A sleeping or stopped agent is not exempt from reclaiming when its workspace is abandoned. It follows the same timeline as a suspended one:

- after **7 days** the workload is removed (Deployment, Service, Ingress and environment secret) and the disk is kept;
- after **14 days**, and only for a workspace that never completed a payment, the disk, network policies and records are deleted.

Waking a reclaimed agent returns `409 INSTALLATION_RECLAIMED`: it cannot be woken, and starts again only when you **deploy it again**. Keep the wallet funded to avoid this. For a workspace that never paid, files on the disk are kept only until the 14-day deletion.

Setting and waking are for workspace owners and admins, or an API key with `deployments:execute`.

See also [Pricing](/guide/pricing) and the [OpenAPI contract](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml).
