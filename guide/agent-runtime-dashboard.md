---
title: "Agent Runtime in the dashboard"
description: "Create a Pi agent with your own provider API key, wake it, put it to sleep, send it a message and follow its runs, events and operations from the TOSE dashboard."
---

# Agent Runtime in the dashboard

Agent Runtime agents are agents that TOSE runs for your workspace: they wake for a message or a trigger, work in their own isolated runtime with a persistent disk, and sleep again. The dashboard has two pages for them:

- **`/w/<workspace>/agents/runtime`** lists the workspace's runtime agents, and lets owners and admins create one.
- **`/w/<workspace>/agents/<agent_id>`** shows one agent with its controls, runs, events and operations.

Both pages are in English and Vietnamese. They call only the [workspace agent API](#api-only), so they can do nothing that the API cannot.

::: warning Availability
Agent Runtime must be switched on for the TOSE platform (`AGENT_RUNTIME_ENABLED`). When it is off, the pages say **Agent Runtime is not turned on** and the Cloud Agents page shows no link to them. It is not generally available.
:::

Open **Cloud Agents** in the workspace sidebar (`/w/<workspace>/agents`). When Agent Runtime is on, that page links to it: **Agent Runtime: agents that wake for a message or a trigger**. The curated coding agents (Claude Code, Codex and the Pi template, see [Cloud Agents](/guide/cloud-agents)) stay on the Cloud Agents page and are not listed under Agent Runtime.

## Your model key {#model-key}

A runtime agent calls the model with **your workspace's own provider API key**. TOSE does not bill the model tokens: your provider does, and TOSE charges for compute and storage from the prepaid wallet ([BYOK pricing](/guide/agent-runtime-pricing#model-keys)). **Signing in with a subscription plan (such as a Claude or ChatGPT plan) is not offered** for runtime agents.

The key is stored as a **workspace agent secret**: a named, encrypted value of the workspace. The agent's configuration holds only the secret's **name**; the value is never shown on any page, never returned by the API, and never written to events or logs.

<!-- agent-secrets-card -->

## The agent list {#agent-list}

The list shows each runtime agent with its state:

| State | Meaning |
|-------|---------|
| **Setting up** | TOSE is preparing the agent's disk. |
| **Asleep** | No compute runs. The disk and the agent's session are kept. |
| **Awake** | The agent's runtime is running and billed. |
| **Deleted** | Deleted through the API. While it is still shown, the page offers no controls. |

While the platform is still carrying a request out, the agent also shows the state it is moving to (**Moving to: Awake**, for example). A state the dashboard does not know is shown as its raw value.

### Create a Pi agent {#create}

Only an **owner or admin** of the workspace can create an agent. Members see the list and can open an agent to wake it, put it to sleep, send it a message and cancel its runs. Pi is the engine available now. Fill in **Create a Pi agent**:

| Field | What to enter |
|-------|---------------|
| **Name** | Up to 80 characters. |
| **Model provider** | `anthropic`, `openai` or `google`. |
| **Model** | The provider's model ID, exactly as its API expects it. |
| **Provider API key** | The **name** of the agent secret that holds the key for that provider. The page never reads or shows its value. |

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

## Not in the dashboard yet {#api-only}

These are done through the workspace agent API (`/api/workspaces/<workspace>/agents`) for now:

- editing an agent's name, model or key, and deleting an agent;
- its [environment](/guide/agent-environment-and-auto-sleep#agent-runtime-environment), triggers and MCP servers;
- its [usage and budgets](/api/agent-usage).

## Related

- [Steer a running agent run](/guide/agent-steering)
- [Agent Runtime pricing and budgets](/guide/agent-runtime-pricing)
- [Agent usage and budgets API](/api/agent-usage)
- [`tose agents`](/commands/agents)
- [Cloud Agents](/guide/cloud-agents)
