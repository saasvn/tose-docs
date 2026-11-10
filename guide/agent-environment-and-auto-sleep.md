# Deploy a coding agent: environment variables and auto-sleep

The dashboard deploys the curated coding agents (**Codex**, **Pi** and **Claude Code**) from **one page**. This page explains that form, the environment variables you can add to an agent, and auto-sleep for idle agents.

## The one-page deploy

Open **Template catalog**, pick the agent, and fill in one form. It has these cards:

| Card | What you set |
|---|---|
| **App** | The app name. |
| **Sign in** | The provider key, or the plan sign-in you finish after deploy (see [Pi model providers](/guide/agent-pi-providers) for Pi). |
| **Size** | CPU, memory and **Auto-sleep after idle**. |
| **Network** | The network mode: provider only (default), development, or the unrestricted public Internet. |
| **GitHub repository** | Optional. |
| **Advanced: release, model and environment variables** | The release, the model and your own environment variables. Collapsed by default. |

The page prices the plan as you type and shows the cost and any blockers next to the single **Deploy** button. **Deploy** approves exactly the plan you see and installs it. Only a workspace owner or admin can approve; for anyone else the page shows the plan to send to one. Compute is charged hourly while the agent runs, and model usage is billed by the provider, not by TOSE.

This replaces the earlier multi-step wizard (create a plan, approve, install). The same plan, approval and install routes still exist in the API.

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

In the form, tick **Secret** on a row to make it a secret reference.

The limits and the reserved names come from `inputs.environment` of `GET /curated-templates`, so read them there instead of hard-coding them.

### Rules

- A name is letters, digits and `_`, at most 63 characters, not starting with a digit. Names are unique without regard to case.
- **Reserved names** are refused with `ENV_NAME_RESERVED`. They include the prefixes `TOSE_`, `KUBERNETES_`, `LD_`, `DYLD_`, `NPM_CONFIG_`, `GIT_CONFIG`, `SSH_`, `AGENT_`, `PI_`, `CODEX_`, `CLAUDE_`, `ANTHROPIC_`, `OPENAI_` and `GEMINI_`, shell, runtime, proxy and TLS names such as `PATH`, `HOME`, `NODE_OPTIONS`, `HTTPS_PROXY` and `SSL_CERT_FILE`, and platform names such as `DATABASE_URL`. Provider, model and key settings go through the template's own inputs, never through the environment.
- A name that looks like a credential (it contains `SECRET`, `TOKEN`, `PASSWORD`, `PRIVATE_KEY`, `API_KEY` or `CREDENTIAL`, or ends in `_KEY`) must be a secret reference (`ENV_NAME_NEEDS_SECRET`).
- A value is one line of at most 2048 characters, and all plain values together are at most 16 KiB.

### Changing them later

The installed app's **Environment Variables** list uses the same rules. The agent reads its environment when it is deployed. A change never restarts a running agent: it keeps the values it started with until you redeploy it. The installation reports this as `environment.status`: `applied`, `restart_required` (a change is newer than the latest run) or `pending`.

::: info Not available
An optional setup script that runs once for an agent is not offered. A request with a script, a startup command or a hook is refused as an unknown field.
:::

## Auto-sleep for idle agents

Closing the browser does not stop an agent: its session keeps running and compute keeps billing. Auto-sleep stops the compute after the agent has been idle for a time you choose.

The setting is `auto_sleep_minutes`: **Off** (the default), **15**, **30**, **60** or **120** minutes. Existing installations never sleep unless you turn it on. Choose it:

- in the **Size** card of the deploy page;
- on the installed app's page, later;
- with `PUT /api/workspaces/{slug}/template-installations/{id}/auto-sleep`, body `{"minutes": 30, "expected_revision": 0}`. Use the current `auto_sleep.revision`; a stale one returns `409 REVISION_CONFLICT`.

### When an agent sleeps

An agent sleeps only after TOSE observed it idle for the whole interval: no keyboard input or terminal output, no command running, and no install or bootstrap. A closed tab never counts. If TOSE cannot tell safely, the agent stays awake and the page says why.

::: warning Release 1.0.0 stays awake
Sleep needs an image that carries the activity probe. The **1.0.0** releases do not, so their agents never sleep and the page shows the reason. Use a newer release if you want auto-sleep.
:::

### While it sleeps

- Compute billing stops. The disk keeps billing.
- Files (`/workspace`, `/home/agent`) and provider sign-in state are kept.
- A running tmux session is **not** kept. Continuing a conversation depends on the agent's own checkpoint and resume, not on TOSE.

### Waking

Only an explicit **Wake and open console** (`POST /api/workspaces/{slug}/template-installations/{id}/wake`) wakes the agent. Reading the app, polling and health checks never do. It needs a funded wallet (otherwise `402 INSUFFICIENT_BALANCE` and the agent stays asleep) and takes a cold start. `auto_sleep.last_wake.outcome` is `pending` until the agent answers, then `ok` or `failed`.

Setting and waking are for workspace owners and admins, or an API key with `deployments:execute`.

See also [Pricing](/guide/pricing) and the [OpenAPI contract](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml).
