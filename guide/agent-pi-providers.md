# Pi model providers

**Pi** is one of the curated coding agents in the TOSE **Template catalog**. It works with your own account at a model provider: you give it a provider API key (or use your provider plan), and the provider bills you directly. This page lists the providers Pi can use, what each one needs, and the differences between providers that have similar names.

::: info Release 1.1.0
All ten providers below are available from Pi release **1.1.0**, the default release for new Pi agents. Release 1.0.0 stays listed and offers only Anthropic, OpenAI and Google. Published releases are immutable, so **existing Pi installations are not upgraded automatically**; to use a new provider, install a new app.
:::

## Providers

You choose the provider when you plan the installation. The key is one encrypted secret, `PI_API_KEY`, and TOSE hands it to Pi only as the variable that provider reads. In the default **Provider only** network mode, the agent can reach only the host in the third column.

| Provider (`PI_PROVIDER`) | Key variable Pi reads | Approved host | Available from | Notes |
|---|---|---|---|---|
| `anthropic` | `ANTHROPIC_API_KEY` | `api.anthropic.com` | 1.0.0 | |
| `openai` | `OPENAI_API_KEY` | `api.openai.com` | 1.0.0 | |
| `google` | `GEMINI_API_KEY` | `generativelanguage.googleapis.com` | 1.0.0 | |
| `opencode-go` | `OPENCODE_API_KEY` | `opencode.ai` | 1.1.0 | OpenCode **Go subscription** with your own Go key, not OpenCode Zen. |
| `deepseek` | `DEEPSEEK_API_KEY` | `api.deepseek.com` | 1.1.0 | |
| `moonshotai` | `MOONSHOT_API_KEY` | `api.moonshot.ai` | 1.1.0 | Moonshot **Open Platform** (global), not Kimi Coding. |
| `openrouter` | `OPENROUTER_API_KEY` | `openrouter.ai` | 1.1.0 | Pi reads the models your key may use from OpenRouter; the same host serves inference. |
| `cloudflare-workers-ai` | `CLOUDFLARE_API_KEY` | `api.cloudflare.com` | 1.1.0 | Also needs an account ID, see [below](#cloudflare-workers-ai-account-id). Not Cloudflare AI Gateway. |
| `xai` | `XAI_API_KEY` | `api.x.ai` | 1.1.0 | |
| `zai` | `ZAI_API_KEY` | `api.z.ai` | 1.1.0 | Z.AI **Coding Plan** (global). The China plan is not offered. |

## Providers with similar names

Pick the product that matches the key and plan you hold.

- **OpenCode Go or OpenCode Zen.** `opencode-go` is the OpenCode **Go subscription**. OpenCode Zen (pay-as-you-go) is a different product and reads the same key variable, so TOSE restricts Pi to Go models for this provider.
- **Moonshot Open Platform or Kimi Coding.** `moonshotai` is the Moonshot **Open Platform** API at `api.moonshot.ai`. The Kimi Coding subscription is a different product and is not offered.
- **Z.AI Coding Plan.** `zai` is the global **Z.AI Coding Plan**. The China plan is not offered.
- **Cloudflare Workers AI or AI Gateway.** `cloudflare-workers-ai` calls Workers AI directly. Cloudflare AI Gateway is a different product and is not offered.

## Cloudflare Workers AI account ID

`cloudflare-workers-ai` is the only provider with one more input besides the key: your **Cloudflare account ID**, passed to Pi as `CLOUDFLARE_ACCOUNT_ID`.

- It is **not a secret**. It is 32 lower-case hexadecimal characters.
- The plan requires it for this provider and refuses it for every other provider.
- It is stored in the approved plan and the installation, like the provider choice. Changing it means a new plan and a new approval.
- With `tose templates --curated pi`, set it under `variables` in `deploy.yaml`; the CLI checks the format and the release first ([details](/commands/templates#curated-pi-providers)).
- Your own variables are separate: see [environment variables and auto-sleep](/guide/agent-environment-and-auto-sleep#your-own-environment-variables).

## Developer tools and network

From release 1.1.0 the Pi image includes **Node.js with npm** and **uv for Python**, and `/AGENTS.md` describes the container to Pi.

The **Development (restricted)** network mode (`development`) for Pi opens the hosts of git, npm and PyPI as well as the provider, the same as for Codex and Claude Code, so `git clone`, `npm install` and `uv pip install` work. **Provider only** (the default) still reaches the provider's host alone. Release 1.0.0 has no developer tools, so the mode opens those hosts for it without the tools.

## Billing and models

- **Usage is billed by the provider**, to your own key or plan, **outside the TOSE wallet**. TOSE bills only compute and storage from the [prepaid wallet](/guide/pricing). The plan states this, and so does the form. Set a spending limit with your provider.
- **TOSE keeps no model list.** Your provider decides which models your key may use and which of them support tools. Leave **Model** empty to use Pi's default for the provider you chose.
- Providers add and retire models often, so check a model with your provider before you rely on it for coding work.

To install an agent, open **Template catalog** in the dashboard ([dashboard overview](/guide/getting-started#find-your-way-around-the-dashboard)).
