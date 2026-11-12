# Deploy a coding agent

TOSE publishes ready-made coding agents, **Claude Code**, **Codex** and **Pi**, in the **Cloud Agents** menu of your workspace (`/w/<workspace>/agents`). Each one runs in its own private pod in your workspace, with a persistent disk, and you work with it in a console that only workspace owners and admins can open.

The released versions are **Codex 1.0.0**, **Claude Code 1.0.0**, and **Pi 1.0.0** and **1.1.0**. Pi 1.1.0 is the default for new Pi agents: it adds seven providers, Node.js with npm, uv for Python, and instructions that describe the container to Pi. Each release is pinned to an image by digest, and the agent's page shows that image as its **Template Source**, under **Advanced** in the **Settings** tab.

## Before you start

- You are an **owner or admin** of the workspace. Deploying (which approves the plan) and opening the agent both need that role. A member can fill in the page and send the plan to an owner or admin.
- The wallet has a balance. TOSE bills only compute and storage from the [prepaid wallet](/guide/pricing). Model usage is paid to your provider: through your API key, or counted against your Claude or ChatGPT plan.
- The agent's card shows it is ready. A card marked **Not available yet** cannot be deployed, and **Why it cannot be deployed yet** explains the blocker.
- You have either a provider API key or a plan to sign in with (see [Choose a provider](#choose-a-provider)).

## Deploy an agent {#deploy-an-agent}

1. Open **Cloud Agents** in the workspace sidebar (`/w/<workspace>/agents`). **Your agents** lists the agents already in the workspace, with their status, release, whether they accept tasks (for releases with a task runner), and their repository and push setting. **Available agents** shows one card per agent you can deploy, with its sign-in methods, size range, release and upstream version, source and license. **Deploy an agent** at the top jumps to that list. The Templates pages (**Installed apps**, **My templates** and **Template catalog**, the deploy wizard's first step) no longer list these agents.
2. Choose an agent and select **Deploy**. The agent deploys from one page, **Deploy** followed by the agent's name, with these cards:
   - **App**: the **App name**.
   - **Sign in**: the provider (see [Choose a provider](#choose-a-provider)). When it uses an API key, enter the key right there. The key is encrypted, sent only with the deploy, never shown again and never part of the plan. A plan sign-in needs no key: you sign in after the deploy.
   - **Size**: **CPU cores** and **Memory (GiB)** from the offered list, the **Workspace disk** (the size of `/workspace`: **5 GiB** by default, or 10, 20 or 50 GiB, each with its monthly price), and **Auto-sleep after idle** (**Off** by default). You can [grow the disk](#grow-the-disk) later from the agent's page, but not shrink it.
   - **Network access**: **Restricted** (the default: the provider plus GitHub and the npm, PyPI and Go package registries, port 443) or **Unrestricted public Internet** (any public host, higher risk). See [Network modes](/guide/agent-network-modes). The card shows what the agent can reach in each mode.
   - **Repository (optional)**: one GitHub repository of the workspace, checked out into `/workspace` when the agent first starts. Leave it out to start with an empty workspace. Turn on **Let the agent push to this repository** to let the agent push its commits back ([how push works](/guide/agent-repository-checkout#let-the-agent-push-to-your-repository)); it is off by default.
   - **Advanced: release, model and environment variables**: the **Release** (the newest by default, so Pi 1.1.0 for Pi), an optional **Model** (leave it empty to use the agent's default) and your own **Environment variables**.
3. Check the plan next to the **Deploy** button. As you change the inputs, the page plans them and shows the cost ceiling (the most the agent can cost per hour), the wallet runway, and any blockers and warnings. Fix highlighted fields to see the cost.
4. Select **Deploy**. It approves exactly the plan shown, installs it and follows the progress: approving the plan, installing, starting the agent, until **The agent is running**. A member who cannot approve gets a link to the plan to send to an owner or admin instead.
5. Open the agent's page: select **Open app** when the deploy finishes, or later select the agent under **Your agents** in **Cloud Agents**. The page itself is still `/w/<workspace>/templates/<app>`, where `<app>` is the app name you chose. Select **Open agent** at the top of the page, or connect your plan as described below. The page is described in [The agent's page](#the-agents-page).

The page does not ask for a cost limit. The plan still shows the cost ceiling so you can judge it before deploying. If you create plans through the API, you can still send `max_hourly_cost_cents`; the plan is then blocked when its ceiling is higher.

## Choose a provider

| Agent | Provider | What you need |
|-------|----------|---------------|
| Claude Code | **Claude plan (Pro or Max)** | Nothing at deploy. After the app runs, select **Connect Claude** on the app page, or sign in with `/login` in the agent's console. |
| Claude Code | **Anthropic API key** | `ANTHROPIC_API_KEY`, entered on the deploy page. |
| Codex | **OpenAI API** | `OPENAI_API_KEY`, entered on the deploy page. |
| Codex | **ChatGPT plan** | Nothing at deploy. After the app runs, select **Connect ChatGPT** on the app page. |
| Pi | One of ten providers from release 1.1.0 (Anthropic, OpenAI and Google in release 1.0.0); see [Pi model providers](/guide/agent-pi-providers) | `PI_API_KEY` for the chosen provider, entered on the deploy page. Cloudflare Workers AI also needs your account ID. |

The provider is part of the approved plan. To switch an app from an API key to a ChatGPT plan (or the other way), install a new app and stop the old one.

### Sign in with a Claude plan

From the app page, where the server offers it:

1. Wait until the app is **Running**. The app page shows a **Claude plan** panel with a **Connect Claude** button.
2. Select it, open the link to Anthropic's sign-in page and sign in there in your own browser.
3. Paste the code Anthropic's page shows into the panel. TOSE passes it once to Claude Code and does not store, log or return it.

Or from the console, which always works:

1. Open the agent with **Open agent**.
2. On first start Claude Code asks how to sign in. Use `/login`. It shows a link to Anthropic's page.
3. Sign in there in your own browser and paste the code it shows back into the terminal.

Claude Code keeps its sign-in on the agent's `/home/agent` disk, so it survives a restart. Use `/status` or `/usage` to see your plan's limits, and `/logout` to sign out. With **Anthropic API key**, `/login` also still works, because Anthropic does not allow restricting either method.

The **Claude plan** panel is offered where the server enables `CURATED_SUBSCRIPTION_LOGIN_ENABLED`, which the product owner allowed in production on 2026-11-09; **Disconnect** in the panel signs the agent out. Where it is off, the panel is hidden and you sign in from the console. Any owner or admin who can open the console can use the connected Claude session, and Anthropic may restrict accounts that sign in through the panel, so connect an account you are comfortable using for this.

### Sign in with a ChatGPT plan

1. Wait until the app is **Running**. The app page shows a **ChatGPT plan** panel with a **Connect ChatGPT** button.
2. Select it. The panel shows a one-time code and a link to `https://auth.openai.com/codex/device`.
3. Open the link in your own browser, sign in to ChatGPT and enter the code.
4. The panel then shows the account, the plan and its usage. It also offers **Reconnect** and **Disconnect**.

Codex receives its tokens from OpenAI directly and keeps them on the agent's disk. TOSE receives no token, cookie or authorization code, and never asks you to send one; it only relays the one-time device code to you. Operators enable this with `CURATED_SUBSCRIPTION_LOGIN_ENABLED=true`; the product owner allowed it in production on 2026-11-09. On a server where it is off, the provider is marked "not available on this server" and cannot be chosen. Any owner or admin who can open the console can use the connected ChatGPT session, and OpenAI may restrict accounts that sign in this way, so connect an account you are comfortable using for this.

## Deploy from the CLI

`tose templates plan|deploy --curated <name>` plans and installs the same agents from a terminal. For Pi, the CLI checks the provider before it plans: a provider newer than the newest Pi release is refused with the list of offered ones, and `cloudflare-workers-ai` needs `CLOUDFLARE_ACCOUNT_ID` in `variables`. See [Curated Pi providers](/commands/templates#curated-pi-providers).

## The agent's page {#the-agents-page}

The page of a Claude Code, Codex or Pi agent is written for people who do not run servers. Other templates keep their own page.

- **Open agent**, a large button above the tabs, opens the agent (see [Open the agent](#open-the-console)).
- The status reads **Running**, **Sleeping**, **Starting…**, **Stopped**, **Needs attention** (the agent failed) or **Paused: wallet empty**. **Restart** sits at the top of the page.
- The page has five tabs: **Overview**, **Tasks**, **Repositories**, **Settings** and **Activity** (tose-app [#770](https://github.com/saasvn/tose-app/pull/770)). An agent has no **Domains** tab: its console is always private.

| Tab | What is there |
| --- | --- |
| **Overview** | Six tiles: **Tasks**, **Repositories**, **Disk**, **Auto-sleep**, **Power** and **Activity**. Each shows one number and one line of status, and selecting a tile opens the tab where that thing is managed. A tile's line turns to the warning colour when a task failed in the last 24 hours or a repository checkout failed. |
| **Tasks** | The [tasks](#delegate-tasks) and the switch **Accept tasks from connected apps and API keys**. The tab and its tile are hidden when the server does not offer tasks. |
| **Repositories** | The agent's repositories, their **Permissions**, **+ Add repository** and **Retry checkout** (see [Attach or change an agent's repositories](/guide/agent-repository-checkout#attach-or-change-an-agents-repository-after-install)). |
| **Settings** | The **Auto-sleep** card (its rules fold under **How auto-sleep works**), the **Disk** card, the sign-in panel for a plan, **Advanced** (folded: changing CPU and memory, the **Template Source** and the template version, to upgrade or roll back), **Secrets and variables**, and **Stop or delete** (**Stop agent**, **Delete agent**). |
| **Activity** | **History** (the deploys) and **Live logs**. |

What the tiles say:

- **Tasks**: how many tasks are running, otherwise how many came in today, then "None failed today" or "… failed today". It reads **Off** while the agent does not accept tasks.
- **Repositories**: how many are ready (or cloning, or failed) and their names, or **None** with a hint to add one.
- **Disk**: the size and the monthly price. It opens **Settings**, where you can [grow the disk](#grow-the-disk).
- **Auto-sleep**: "After … min" or **Off**, and whether the agent is awake, asleep or waking up.
- **Power**: CPU cores and memory. It opens **Settings**, where **Advanced** changes them.
- **Activity**: when the agent last started and whether that start succeeded. It opens **Activity**.

A link with `?tab=` still works: `?tab=variables`, `?tab=advanced` and `?tab=danger` open **Settings**, and `?tab=deployments` and `?tab=logs` open **Activity**. Any other unknown tab opens **Overview**.

## Grow the disk {#grow-the-disk}

The **Disk** card, in the **Settings** tab of the agent's page, shows the size of the agent's disk and its monthly price. The disk holds both `/workspace` and `/home/agent`, so an agent installed with the default 5 GiB `/workspace` shows **6 GB**.

1. In the size list (**New disk size**), pick a larger size. The card offers 10, 20, 50, 100 and 200 GB, only those larger than the current disk, each with its monthly price. The card appears once the agent has a disk; to go above 200 GB, use the API.
2. Select **Make it larger**, check the size and price, then select **Grow to … GB** (or **Cancel**).
3. The card shows **The disk is now … GB.** when it is done.

The disk grows in place: your files are kept and the agent keeps running. A disk can never be made smaller, and storage is billed for the new size while the disk exists, also while the agent is stopped or asleep. Only a workspace owner or admin can grow it (anyone else sees **Only a workspace owner or admin can grow the disk.**), and growing needs a positive wallet balance: with an empty wallet the card says **The wallet is empty. Top up to grow the disk.** and links to **Top up the wallet**.

Through the API, find the agent's disk in `GET /api/workspaces/{slug}/volumes` (`workload_type` `template` and `workload_id` the installation's app ID), then send `PATCH /api/workspaces/{slug}/volumes/{volume_id}` with `{"size_gib": 20}`. A smaller size returns `400`. See [Disks API](/api/disks). The agent's recorded disk size follows the volume, so its page and later plans show the disk it really has.

## Open the agent {#open-the-console}

**Open agent** opens the agent's console in a new tab (allow pop-ups if the browser blocks it). The console has no public address: only signed-in workspace owners and admins can open it, a session lasts up to 8 hours, and it closes when the app stops or you lose access. API keys and connected apps cannot open it. When the agent is asleep, the button reads **Wake and open**: waking takes a minute or two and needs money in the wallet (see [Waking](/guide/agent-environment-and-auto-sleep#waking)).

## Delegate tasks

A connected app or API key with `agents:execute` can give the agent a task and read its result. On a new agent with a task runner, **Accept tasks from connected apps and API keys** is **on by default**; an owner or admin can turn it off on the agent's page at any time. See [Delegate tasks to a coding agent](/guide/agent-tasks), including the warning about the agent's sign-in.

## Cost and control

- Compute is billed while the agent runs, and storage (the `/workspace` size you chose, 5 GiB by default, plus 1 GiB for `/home/agent`, or the size you grew the disk to) while the disk exists, also when the agent is stopped. The plan prices the whole disk in its cost ceiling.
- The disk keeps your work across restarts, sleep and redeploys. You can [grow it](#grow-the-disk) later from the agent's page without losing files, but never shrink it, so start small if you are unsure.
- Any owner or admin can stop or delete the agent at any time. The agent holds no TOSE API credential for the workspace (with push, only a git proxy secret for the repositories it may push to), so it cannot change itself.
- With an API key, set a spending limit at the provider as well.

Related: [Pricing](/guide/pricing), [Getting started](/guide/getting-started).
