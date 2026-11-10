# Network modes for coding agents

TOSE publishes curated coding agents: **Pi**, **Codex** and **Claude Code**. Each one runs in its own container with its own network policy. You choose how much of the Internet the agent can reach when you plan the installation, and the plan you approve is the one that is enforced.

This page explains the three modes, what each one can and cannot reach, which toolchains the Development mode offers per agent, and the risk that remains. To install an agent, open **Template catalog** in the dashboard ([dashboard overview](/guide/getting-started#find-your-way-around-the-dashboard)).

::: warning Availability and verification
Development (restricted) is implemented and covered by policy and plan tests. It has not yet been proven on a live enforcing cluster, and TOSE has not finished accepting its [residual risk](#residual-risk) for general release. Which modes you can pick follows what the server reports for your workspace.
:::

## The three modes

| Mode | API value | The agent can reach | The agent cannot reach |
|------|-----------|---------------------|------------------------|
| **Provider only** (default) | `approved` | Its model provider's API and sign-in hosts, port 443 | GitHub, npm, PyPI and every other site. `git clone` and package installs fail |
| **Development (restricted)** | `development` | The provider, plus the exact hosts of the toolchains its image contains ([below](#toolchains-per-agent)), port 443 | Private networks, cloud metadata and loopback. See [Residual risk](#residual-risk) for what can still answer |
| **Unrestricted public Internet** | `internet` | Any public host | Private, link-local, cloud metadata and cluster addresses |

- **Provider only is the default.** Choose another mode only when the agent has to fetch code or packages.
- For Claude Code the provider hosts are `api.anthropic.com`, `platform.claude.com` and `claude.ai`, so its own sign-in works. For Codex with ChatGPT plan sign-in they are `auth.openai.com` and `chatgpt.com`.
- **Unrestricted public Internet carries the highest risk.** Code and data can be sent to any public host while the agent holds your API key or sign-in. Prefer Development (restricted) for coding work.
- Private, link-local and cloud metadata addresses are refused in every mode.
- **Nothing widens an existing installation.** An installation keeps the destinations of the plan you approved until a person approves a new plan.

## Toolchains per agent

Development mode offers the toolchains of the agent's image, so it does not advertise a tool the image lacks. Go modules are not offered, because no curated image has a Go toolchain.

| Toolchain | Hosts (exact names, port 443) | Pi | Codex | Claude Code |
|-----------|-------------------------------|:--:|:-----:|:-----------:|
| `git` | `github.com`, `codeload.github.com`, `raw.githubusercontent.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com` | Yes | Yes | Yes |
| `npm` | `registry.npmjs.org` | Yes | Yes | Yes |
| `python` (uv and pip) | `pypi.org`, `files.pythonhosted.org` | Yes | Yes | Yes |

Pi has Node.js with npm and uv for Python from release 1.1.0, the default Pi release. Pi 1.0.0 is immutable and does not have them: Development mode opens the same npm and PyPI hosts for it, but the tools are missing, so install a new Pi app on 1.1.0 to use them.

The host list is a reviewed, versioned policy owned by TOSE (currently `2026-11-09.1`). A request cannot add a host, a wildcard or an IP address. When TOSE changes the policy, the next plan has a new hash. An approved installation is never changed silently.

## What you see in the plan

Planning shows the mode in plain words before you approve:

- `network.mode` is `development`, with the policy version, the toolchain categories and every destination host.
- A `DEVELOPMENT_EGRESS` warning states the limits described under [Residual risk](#residual-risk).
- `network.egress` reads `approved`. A development plan is enforced as `approved` with the policy hosts listed as destinations, so the documented egress values do not change.
- `GET /curated-templates` announces the mode in a `development` object. A client adds `development` to the modes it offers when that object is present. The `inputs.network_mode.allowed` list and `network.egress_modes` still show only `approved` and `internet`.

The mode and the destinations are part of the plan hash. Changing either one means a new plan and a new approval.

## How it is enforced

Before the disk and the pod exist, each installation gets a default-deny network policy. The cluster resolves the approved names and allows TCP 443 to the addresses it returned. Private and metadata ranges stay denied over any allow. A redirect to a host that is not listed, a name that resolves into a private or metadata range, and a literal IP address all stay blocked.

If the cluster cannot enforce the policy, the plan is blocked with `NETWORK_POLICY_NOT_ENFORCED`, so the deploy fails closed: nothing is created and nothing is billed.

## Residual risk

Development (restricted) narrows the agent's reach. It does not make the agent safe to hand sensitive credentials. Read these limits before you approve a development plan:

- **The allow is by name, not by site.** The cluster allows the addresses a name resolves to and does not check the TLS server name. Other sites served from the same shared CDN addresses (for example Cloudflare or Fastly) may still answer. Provider only has the same exposure through its provider hosts.
- **Some listed hosts accept uploads.** `github.com` and `registry.npmjs.org` accept uploads. The agent holds no GitHub or npm credential of its own, but a token you paste into the session, or one planted by a prompt injection, lets it `git push` or `npm publish` data out.
- **Private repositories use repository checkout, not this mode.** GitHub repository checkout has shipped: a plan can pin one repository of the workspace, private or public, and TOSE clones it into `/workspace` without giving the agent a GitHub token. See [GitHub repository checkout](/guide/agent-repository-checkout).
- The agent does receive your model provider key or sign-in, so treat anything the agent can read as something it could send to an allowed host.

## Related

- [Dashboard overview](/guide/getting-started#find-your-way-around-the-dashboard)
- [Environment variables](/guide/environment)
