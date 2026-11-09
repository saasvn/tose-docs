# Deploy a coding agent

TOSE publishes ready-made coding agents in the **Template catalog**: **Claude Code**, **Codex** and **Pi**. Each one runs in its own private pod in your workspace, with a persistent disk, and you work with it in a console that only workspace owners and admins can open.

The three agents are released at version 1.0.0. Each release is pinned to an image by digest, and the app you install shows that image as its **Template Source**.

## Before you start

- You are an **owner or admin** of the workspace. Approving a plan and opening the console both need that role.
- The wallet has a balance. TOSE bills only compute and storage from the [prepaid wallet](/guide/pricing). Model usage is paid to your provider: through your API key, or counted against your Claude or ChatGPT plan.
- The agent's card shows it is ready. A card marked **Not available yet** cannot be deployed, and **Why it cannot be deployed yet** explains the blocker.
- You have either a provider API key or a plan to sign in with (see [Choose a provider](#choose-a-provider)).

## Deploy an agent

1. Open **Template catalog** in the workspace sidebar (**Apps & agents**). The **Agent templates by TOSE** list shows one card per agent, with its sign-in methods, size range, release and upstream version, source and license.
2. Choose an agent and select **Deploy**.
3. Enter an **App name**, then choose a **Provider** (see below). Optionally set a **Model**; leave it empty to use the agent's default. Choose a size from the offered list and a network mode: **Approved hosts only** (the default, only the provider's hosts) or **Internet**.
4. Select **Create plan**. The plan shows exactly what will be installed and the priced hourly cost ceiling.
5. Review the plan and select **Approve plan**. Approval binds the plan: any change makes it stale and needs a new approval.
6. Select **Install**. If you chose an API key, TOSE asks for it now. The key is encrypted, never shown again and never part of the plan.
7. When the app is **Running**, open its page. Use **Open console** (or **Connect ChatGPT**, for a ChatGPT plan) as described below.

The form does not ask for a cost limit. The plan still shows the cost ceiling so you can judge it before approving. If you create plans through the API, you can still send `max_hourly_cost_cents`; the plan is then blocked when its ceiling is higher.

## Choose a provider

| Agent | Provider | What you need |
|-------|----------|---------------|
| Claude Code | **Claude plan (Pro or Max)** | Nothing at install. After the app runs, sign in with `/login` in the agent's console. |
| Claude Code | **Anthropic API key** | `ANTHROPIC_API_KEY`, given at install. |
| Codex | **OpenAI API** | `OPENAI_API_KEY`, given at install. |
| Codex | **ChatGPT plan** | Nothing at install. After the app runs, select **Connect ChatGPT** on the app page. |
| Pi | Anthropic, OpenAI or Google | `PI_API_KEY` for the chosen provider, given at install. |

The provider is part of the approved plan. To switch an app from an API key to a ChatGPT plan (or the other way), install a new app and stop the old one.

### Sign in with a Claude plan

1. Open the app's console with **Open console**.
2. On first start Claude Code asks how to sign in. Use `/login`. It shows a link to Anthropic's page.
3. Sign in there in your own browser and paste the code it shows back into the terminal.

Claude Code keeps its sign-in on the agent's `/home/agent` disk, so it survives a restart. Use `/status` or `/usage` to see your plan's limits, and `/logout` to sign out. With **Anthropic API key**, `/login` also still works, because Anthropic does not allow restricting either method.

The dashboard's **Claude plan** sign-in panel stays off in production; sign in from the console.

### Sign in with a ChatGPT plan

1. Wait until the app is **Running**. The app page shows a **ChatGPT plan** panel with a **Connect ChatGPT** button.
2. Select it. The panel shows a one-time code and a link to `https://auth.openai.com/codex/device`.
3. Open the link in your own browser, sign in to ChatGPT and enter the code.
4. The panel then shows the account, the plan and its usage. It also offers **Reconnect** and **Disconnect**.

Codex receives its tokens from OpenAI directly and keeps them on the agent's disk. TOSE receives no token, cookie or authorization code, and never asks you to send one; it only relays the one-time device code to you. Operators enable this with `CURATED_SUBSCRIPTION_LOGIN_ENABLED=true`. On a server where it is off, the provider is marked "not available on this server" and cannot be chosen. Any owner or admin who can open the console can use the connected ChatGPT session, and OpenAI may restrict accounts that sign in this way, so connect an account you are comfortable using for this.

## Open the console

**Open console** opens the agent in a new tab. The console has no public address: only signed-in workspace owners and admins can open it, a session lasts up to 8 hours, and it closes when the app stops or you lose access. API keys and connected apps cannot open it.

## Cost and control

- Compute is billed while the agent runs, and storage (a 5 GiB `/workspace` and a 1 GiB `/home/agent` disk) while the disk exists, also when the agent is stopped.
- Any owner or admin can stop or delete the agent at any time. The agent holds no TOSE credential, so it cannot change itself.
- With an API key, set a spending limit at the provider as well.

Related: [Pricing](/guide/pricing), [Getting started](/guide/getting-started).
