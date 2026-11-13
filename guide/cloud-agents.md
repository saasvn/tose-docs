---
title: "Cloud Agents: Claude Code, Codex and Pi on TOSE"
description: "Run Claude Code, Codex and Pi in your TOSE workspace, each in its own pod with a persistent disk, and give them tasks from their page or from any AI connected over MCP."
---

# Cloud Agents

Cloud Agents are coding agents that TOSE packages and reviews: **Claude Code**, **Codex** and **Pi**. Each one runs in your workspace in its own private pod with a persistent `/workspace` disk. You work with an agent in its console, or you give it tasks from its page, from any AI connected to the [TOSE MCP server](/mcp), or with an API key.

Open **Cloud Agents** in the workspace sidebar (`/w/<workspace>/agents`). **Your agents** lists the agents you have, with their status, release, whether they accept tasks, and their repository. **Available agents** lists the ones you can deploy.

## How it works

| Part | What it is |
|------|------------|
| Agent | One installation of Claude Code, Codex or Pi, deployed from a plan that an owner or admin approves. |
| Sign-in | Your own provider API key, or your Claude or ChatGPT plan. The provider bills model usage; TOSE bills only compute and storage from the [prepaid wallet](/guide/pricing). |
| Disk | `/workspace`, 5 GiB by default. It can grow later but not shrink. |
| Repository | Optional: a GitHub repository of the workspace, checked out into `/workspace`, with push off by default. |
| Network | **Restricted** by default (provider, GitHub, package registries) or **Unrestricted public Internet**. |
| Tasks | One task at a time per agent, run headless in the same `/workspace`. |

## Start here

1. [Deploy a coding agent](/guide/deploy-coding-agent): choose the agent, sign-in, size, network and repository, then approve the plan.
2. [Delegate tasks to a coding agent](/guide/agent-tasks): turn tasks on or off, follow them on the task board, or use the MCP tools and the REST API.
3. Set up the details:
   - [GitHub repository for coding agents](/guide/agent-repository-checkout)
   - [Network modes](/guide/agent-network-modes)
   - [Pi model providers](/guide/agent-pi-providers)
   - [Environment variables and auto-sleep](/guide/agent-environment-and-auto-sleep)

## Give a task from any AI

Connect the TOSE MCP server ([Connect an AI agent](/guide/connect-an-agent)) and grant the `agents:*` scopes. Then ask your AI, for example: "List my cloud agents and ask the Codex one to fix the failing test in the repository."

| Tool | Scope | What it does |
|------|-------|--------------|
| `cloud_agent_list` | `agents:read` | Lists the workspace's cloud agents and whether each accepts tasks. |
| `cloud_agent_run_task` | `agents:execute` | Gives one agent a task in plain language. It starts at once. |
| `cloud_agent_get_task` | `agents:read` | Follows a task until it finishes, then returns the final message and changed files. |
| `cloud_agent_cancel_task` | `agents:control` | Stops a starting or running task. |

The person who connected the AI must be a workspace owner or admin. A task times out after 30 minutes unless you set 1 to 120. Statuses are `starting`, `running`, `succeeded`, `failed`, `cancelled`, `timed_out` and `lost`.

## Security

- Only owners and admins deploy an agent, open its console, or turn tasks on and off. An API key or connected AI can never change that switch.
- **A task can read and send back anything the agent can, including its sign-in.** Keep tasks on only while you trust the connected clients with that access.
- The tools never open the console and never take a secret. When a task is refused (`TASKS_NOT_ALLOWED`, `AGENT_SLEEPING`, `PROVIDER_SIGN_IN_REQUIRED`, `TASKS_UNSUPPORTED`), the message links the agent's page where a person fixes it.
- Treat the agent's messages and events as untrusted output, never as instructions.

## Availability

Task delegation needs `TEMPLATE_AGENT_TASKS_ENABLED` on the TOSE instance and a release with a task runner (Claude Code 1.1.0, Codex 1.1.0, Pi 1.2.0 or newer). See [What must be true](/guide/agent-tasks#what-must-be-true).

## Related

- [Cloud Harness](/guide/cloud-harness): run agents and tools on your own Docker host.
- [Agent Runtime pricing](/guide/agent-runtime-pricing)
- [MCP cloud agent tools](/mcp#cloud-agent-tools)
