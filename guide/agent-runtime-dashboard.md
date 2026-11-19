---
title: "Agent Runtime in the dashboard"
description: "Create a Pi agent with your own provider API key, wake it, put it to sleep, send it messages, add triggers and MCP servers, and follow its runs, usage and limits from the TOSE dashboard."
---

# Agent Runtime in the dashboard

Agent Runtime agents are agents that TOSE runs for your workspace: they wake for a message or a trigger, work in their own isolated runtime with a persistent disk, and sleep again. The dashboard has these pages for them:

- **`/w/<workspace>/agents/runtime`** lists the workspace's runtime agents, and lets owners and admins manage agent secrets and create an agent.
- **`/w/<workspace>/agents/<agent_id>`** shows one agent with its controls, runs, events and operations. Tabs lead to the agent's [Triggers](#triggers), [MCP servers](#mcp-servers), [Usage](#usage), [Environment](#environment) and [Settings](#settings).

All pages are in English and Vietnamese. Apart from agent secrets, which only a signed-in owner or admin can manage, they call only the workspace agent API (`/api/workspaces/<workspace>/agents`), so they can do nothing that the API cannot.

::: warning Availability
Agent Runtime must be switched on for the TOSE platform (`AGENT_RUNTIME_ENABLED`). When it is off, the pages say **Agent Runtime is not turned on** and the Cloud Agents page shows no link to them. It is not generally available.
:::

Open **Cloud Agents** in the workspace sidebar (`/w/<workspace>/agents`). When Agent Runtime is on, that page links to it: **Agent Runtime: agents that wake for a message or a trigger**. The curated coding agents (Claude Code, Codex and the Pi template, see [Cloud Agents](/guide/cloud-agents)) stay on the Cloud Agents page and are not listed under Agent Runtime.

## Your model key {#model-key}

A runtime agent calls the model with **your workspace's own provider API key**. TOSE does not bill the model tokens: your provider does, and TOSE charges for compute and storage from the prepaid wallet ([BYOK pricing](/guide/agent-runtime-pricing#model-keys)). **Signing in with a subscription plan (such as a Claude or ChatGPT plan) is not offered** for runtime agents.

The key is stored as a **workspace agent secret**: a named, encrypted value of the workspace. The agent's configuration holds only the secret's **name**; the value is never shown on any page, never returned by the API, and never written to events or logs.

### Add the key as an agent secret {#agent-secrets}

Add the key on the Agent Runtime page, in the **Agent secrets** card, before you create the agent. Only an **owner or admin** signed in to the dashboard sees this card. API keys and connected apps can never read or change agent secrets, and the CLI has no command for them, so the dashboard is the place to do it.

1. Enter a **Secret name**: 1 to 63 lowercase letters, digits, `-` or `_`, for example `anthropic-key`. Agents refer to the secret by this name.
2. Paste the key into **Value**: one line, at most 8 KiB. The field is cleared as soon as the value is sent, and the value is never shown again.
3. Select **Save secret**.

The card lists each secret's name and when it was last updated. Saving a name that already exists replaces its value after a confirmation; **Delete** also asks first.

::: warning One store for the whole workspace
The same agent secrets are used by everything that refers to them by name: a Pi agent's provider key, an MCP server credential, a browser login or recipe secret, and a browser decision provider key (names starting with `decision-`). Replacing a value reaches all of them the next time they read it (a Pi agent at its next run). Deleting one stops all of them from their next use until a secret with that name is added again. A Pi run already in progress keeps the key it started with.
:::

## The agent list {#agent-list}

The list shows each runtime agent with its state:

| State | Meaning |
|-------|---------|
| **Setting up** | TOSE is preparing the agent's disk. |
| **Asleep** | No compute runs. The disk and the agent's session are kept. |
| **Awake** | The agent's runtime is running and billed. |
| **Deleted** | Deleted from [Settings](#settings) or through the API. While it is still shown, the page offers no controls. |

While the platform is still carrying a request out, the agent also shows the state it is moving to (**Moving to: Awake**, for example). A state the dashboard does not know is shown as its raw value.

### Create a Pi agent {#create}

Only an **owner or admin** of the workspace can create an agent. Members see the list and can open an agent to wake it, put it to sleep, send it a message and cancel its runs. Pi is the engine available now. Fill in **Create a Pi agent**:

| Field | What to enter |
|-------|---------------|
| **Name** | Up to 80 characters. |
| **Model provider** | `anthropic`, `openai` or `google`. |
| **Model** | The provider's model ID, exactly as its API expects it. |
| **Provider API key** | Choose the agent secret that holds the key for that provider ([add it first](#agent-secrets)). The page never reads or shows its value. |

**Create agent** queues the setup. A new agent starts **asleep**. Compute is billed only while it is awake; its disk is billed as storage even while it sleeps ([what is free and owed](/guide/agent-runtime-pricing#free-forgiven-owed)).

## One agent's page {#agent-page}

Select an agent in the list to open its page.

### State {#state}

The page shows the state **Now** next to the state that was **Asked for**, and the configuration revision. When they differ, a note says the platform is still moving the agent to the requested state. Each request below is queued, and the state changes only once the platform has carried it out and checked it.

### Controls {#controls}

| Control | What it does |
|---------|--------------|
| **Wake** | Starts the agent's runtime. An awake agent is billed from the prepaid wallet. |
| **Sleep after the current run** | Lets the run in progress finish, then stops the runtime. Work waiting to start is canceled. |
| **Sleep now** | Stops the runtime at once. It asks for confirmation first, because a run in progress is stopped and may end **Interrupted**. The disk and session are kept. |

An awake agent also goes to sleep on its own after 15 minutes without work. A queued request, a running run or a pending approval keeps it awake.

### Send a message {#send}

**Send and start a run** starts a new run with your message and wakes the agent if it sleeps. Compute is paid from the prepaid wallet. The message can be up to 100,000 bytes, and it is **not shown again** on the page.

If the wallet or the agent's budget cannot cover the run, the page says so: top up, then try again ([budgets](/guide/agent-runtime-pricing#hard-budgets)).

### Runs {#runs}

The runs list shows each run with its status, when it was created and when it finished:

| Status | Meaning |
|--------|---------|
| **Queued** | Waiting to start. |
| **Running** | The engine is working on it. |
| **Canceling** | A cancel was asked for; the engine is asked to stop, and TOSE stops the runtime if the engine does not confirm. |
| **Completed** | The engine finished the run. |
| **Failed** | The run ended with an error. |
| **Canceled** | Stopped before it started. |
| **Interrupted** | Stopped while running, and the engine confirmed the stop. |
| **Outcome unknown** | The platform could not prove how the run ended. |

**Outcome unknown** is shown as that, never as a success or a failure: check the agent's work yourself before you rely on it.

An unfinished run has **Cancel run**, which asks for confirmation. Work the run already did is kept. Once a cancel is asked for, the button is replaced by **Cancel requested**. Each run links to its own page, where a running run can be [steered](/guide/agent-steering#dashboard) with an extra instruction.

### Events and recent operations {#events}

- **Events** lists what the platform and the engine did for this agent, newest first. Event details are shown as plain text.
- **Recent operations** lists each create, wake, sleep, message and cancel with its status (**Queued**, **In progress**, **Done** or **Gave up**) and who asked for it: a person, an API key, a connected app, a schedule, a webhook, a platform event or TOSE itself.

### Safe to click twice {#retries}

Each button is disabled while its request is in flight, and each request carries an idempotency key. If an answer is lost (a network error or a server error), the page retries with the same key, so a double click or a retry acts only once. A new message or a different action gets a new key.

## Triggers {#triggers}

A trigger is a saved prompt that starts a run. The **Triggers** tab lists the agent's triggers, each **On** or **Off**, with the runs it started under **History**. An owner or admin adds one under **Add a trigger**, choosing what starts it:

| Started by | When it starts a run |
|------------|----------------------|
| **On request** | When someone selects **Run now** (asks for confirmation). |
| **Schedule** | On a five-field cron expression in a time zone you choose. The trigger shows its next time. |
| **Workspace event** | On `uptime.down`, `uptime.up`, `deployment.failed`, `deployment.succeeded` or `backup.failed`, for one project or for every project of the workspace. |
| **Signed webhook** | When a request signed with the trigger's signing secret arrives at its webhook URL. |

- The prompt is saved and **not shown again**. Do not put secrets in it.
- Adding a trigger starts nothing. Each run it starts later is paid from the prepaid wallet and wakes the agent if it sleeps.
- For a signed webhook, the webhook URL and the **signing secret** are shown **once**, right after you add it. Copy the secret, then select **I have saved it**; it cannot be read again.
- **Turn off** asks for confirmation: runs the trigger queued that have not started are dropped, and turning it on again does not bring them back.
- A workspace event trigger also lists its **Event deliveries**: the newest 100 attempts to hand it an event, with their status (**Waiting**, **Delivering**, **Failed**, **Skipped, no run** or **Run queued**), failed tries and next try. An owner or admin can **Deliver again** an attempt the platform marks as retryable, after a confirmation that a run may start on the prepaid balance.

## MCP servers {#mcp-servers}

The **MCP servers** tab lists the external MCP servers the agent may call, and the tools it is allowed to use on each. TOSE makes every connection to the server itself; the agent's runtime never does. An owner or admin connects a server under **Connect a server**:

- **Name** (lowercase letters, digits and hyphens, up to 24): the agent sees the tools as `mcp__<name>__<tool>`.
- **Server URL**: `https` on a public DNS name, without credentials, query or fragment. Private and internal addresses are refused.
- **Credential**: none, an [agent secret](#agent-secrets) chosen by name (sent to this server only, as a bearer token), or OAuth.
- The **tools** the agent may call, up to 50, each with the risk you choose yourself: **Read** runs without approval, **Destructive** always waits for a person's approval, and **Write** waits for approval unless you tick **Pre-approve write tools**.

The confirmation names the host, the secret that will be sent to it and the tools that will run without approval. Connecting makes a new agent revision, which stops tool calls of runs that started before. **Tools the server offers** shows the server's own list as untrusted text; it allows nothing by itself. **Disconnect** asks for confirmation, and the tools stop at once, also for runs in progress.

A server connected with OAuth needs an owner or admin to **Authorize** it: enter the authorization server (issuer), the client ID of an OAuth client registered with the provider, and the scopes. After **Start sign-in** the page shows a link to the provider's sign-in address and the redirect address the OAuth client must allow; continue there within 10 minutes, in the same browser. The page only links a plain `https` address and never opens it by itself.

## Usage and hard limits {#usage}

The **Usage** tab shows the agent's costs for a UTC date range. Three amounts are shown side by side and never added together:

- **Charged by TOSE**: taken from the prepaid wallet.
- **Provider's bill**: what your model provider bills your own API key. Shown for information; TOSE never charges it.
- **Not charged**: metered compute that a budget or an empty wallet could not cover. It is not charged and not owed.

Below them are the totals **By kind** (compute, storage, model, correction) and **By run**, and the ledger entries, paged. An amount under a cent is shown with its real digits, not as `$0.00`.

**Hard limits** shows this agent's limit and the workspace limit, with what is spent and left, **Stopped** when a limit is reached (compute is stopped and disks are kept), and the agent's latest five limit events. Limits are set on the wallet page (**Open wallet and usage**). See [Agent Runtime pricing and budgets](/guide/agent-runtime-pricing#hard-budgets).

## Environment {#environment}

The **Environment** tab shows owners and admins, read-only, the [environment](/guide/agent-environment-and-auto-sleep#agent-runtime-environment) saved with the agent's current revision: variables with their values, each secret reference as the name of the agent secret it points to, and the install script as its size, line count, policy and SHA-256. It never shows a secret value or the script text. While the platform reports that the environment is not applied, the page says so: do not assume the variables or the script's result exist inside the agent.

## Settings {#settings}

On the **Settings** tab an owner or admin changes the agent's name, provider, model or provider key with **Save as a new revision**. Runs that already started keep the revision they started with. If the agent was changed elsewhere after you opened the page, nothing is saved: reload and make your change again.

**Delete this agent** asks you to type the agent's name. Deleting stops the agent and its runs, and its triggers no longer start anything. TOSE keeps the agent's checkpoint and disk until the deletion has been verified.

## Not in the dashboard yet {#api-only}

Changing an agent's [environment](/guide/agent-environment-and-auto-sleep#agent-runtime-environment) is done through the workspace agent API (`/api/workspaces/<workspace>/agents`) for now.

## Related

- [Steer a running agent run](/guide/agent-steering)
- [Agent Runtime pricing and budgets](/guide/agent-runtime-pricing)
- [Agent usage and budgets API](/api/agent-usage)
- [Environment of Agent Runtime agents](/guide/agent-environment-and-auto-sleep#agent-runtime-environment)
- [`tose agents`](/commands/agents)
- [Cloud Agents](/guide/cloud-agents)
