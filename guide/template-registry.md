# Template registry and `tose.yaml` manifest

The template registry stores versioned deployment templates that are described by a `tose.yaml` manifest. This page explains the manifest format, what you can do with it today, and what is not available yet.

::: info Early access
The registry has shipped (tose-app [#388](https://github.com/saasvn/tose-app/pull/388), issue [#143](https://github.com/saasvn/tose-app/issues/143)). You can check, create, edit, validate and **publish** templates inside your own workspace through the [registry API](/api/template-registry). Installing workspace and community templates is still blocked on hosted TOSE by the build security gate, and the public directory is off there. The [curated agent templates](#curated-agent-templates) Pi, Claude Code and Codex are released and deploy from the dashboard.
:::

## Availability

| Capability | Status |
|------------|--------|
| Manifest format `tose.dev/v1` and strict validation, with optional health probes | Available |
| Private definitions and versions in your workspace (REST): dry run, create, edit drafts, validate | Available |
| Publish a version inside the workspace (immutable from then on), with `expected_manifest_hash` | Available. Publishing does not list the version anywhere else |
| Validation runs recorded per version | Available. A valid manifest still reports `security_gate: pending` |
| Revoke a published version | Available to the workspace's owners and admins; platform admins can take a listing down. `deprecated` is reserved and not set yet |
| Public template directory: search, submit for review, approval by TOSE (tose-app [#487](https://github.com/saasvn/tose-app/pull/487)) | Built, off in production: it needs both `TEMPLATE_DIRECTORY_ENABLED` and `COMMUNITY_TEMPLATES_ENABLED` |
| Deploy plans, approval and install of workspace and directory templates | Built. On hosted TOSE every such plan is blocked by `COMMUNITY_TEMPLATES_DISABLED` and `IMAGE_SCANNER_NOT_CONFIGURED` (Git sources also by `BUILD_SANDBOX_NOT_HARDENED` and `PUSH_CREDENTIALS_NOT_SCOPED`) |
| Registry installs (build and run) | Gated. Fail-closed [security gate](#install-security-gate-gated); off unless the operator enables community templates (default off) |
| In-place upgrade and rollback of a registry installation (tose-app [#483](https://github.com/saasvn/tose-app/pull/483)) | Built, through the same plans and the same security gate |
| Registry MCP tools: `search_templates`, `get_template`, `validate_template`, `create_template_draft`, `publish_template`, `plan_template_deployment`, `get_template_deployment`, `deploy_template` | Available. No tool approves a plan, and deploys meet the same security gate |
| Curated Pi, Claude Code and Codex templates: one-page deploy, install and private console | Released: Codex 1.0.0, Claude Code 1.0.0, Pi 1.0.0 and 1.1.0 (the default for Pi). See [below](#curated-agent-templates) |
| `tose templates ...` CLI | Not available |

The curated 1-click templates (GoClaw, Dewee) are not changed by the registry. They keep their own [catalog, deploy and billing path](/guide/dewee-template). An installation that does not come from the registry has no template version attached, and is treated as a legacy installation.

## The manifest

A manifest is one YAML document, at most 64 KiB.

```yaml
apiVersion: tose.dev/v1
metadata:
  name: sample
  version: 1.0.0
  description: Sample app
  category: productivity
  tags: [ai]
  license: MIT
source:
  git:
    url: https://github.com/example/sample
    commit: 0123456789abcdef0123456789abcdef01234567
services:
  - name: web
    port: 3000
    cpu: "1"
    memory: 1Gi
    variables:
      - name: API_TOKEN
        secret: true
        required: true
    storage:
      - mountPath: /data
        size: 1Gi
    health:
      readiness:
        http:
          path: /healthz
      liveness:
        tcp: {}
      startupSeconds: 300
```

### Fields

| Field | Rule |
|-------|------|
| `apiVersion` | Must be `tose.dev/v1`. Any other value is rejected. |
| `metadata.name` | Lowercase DNS-style slug (`a-z`, `0-9`, `-`, up to 63 characters). It becomes the definition slug and cannot change later. |
| `metadata.version` | Semantic version of at most 64 characters, for example `1.0.0` or `1.2.0-rc.1`. Build metadata (`1.0.0+build`) is refused, because it has the same precedence as `1.0.0`. |
| `metadata.description` | Required, not blank, at most 1000 bytes. |
| `metadata.category` | Lowercase slug. Used by the `category` filter when listing. |
| `metadata.tags` | Optional, at most 20, each a lowercase slug. |
| `metadata.license` | Required, not blank, at most 100 bytes. |
| `source` | Exactly one of `git` or `oci`. |
| `source.git.url` | A public `https://github.com/<owner>/<repo>` URL: no credentials, query, fragment or alternate port. |
| `source.git.commit` | A full 40-character lowercase Git SHA. Branches and tags are rejected, so a version always points to the same code. |
| `source.oci.image` | An image reference pinned with `@sha256:<64 lowercase hex>`. Tags are rejected. |
| `services` | Exactly one service. Multi-service templates are not supported. |
| `services[].name` | Lowercase slug. |
| `services[].port` | TCP port 1-65535. |
| `services[].cpu`, `services[].memory` | Positive Kubernetes quantities, for example `"1"`, `500m`, `1Gi`. Quote `cpu` so YAML reads it as a string. |
| `services[].variables[]` | `name` (uppercase letters, digits, `_`; unique in the service), `secret` and `required` booleans. A manifest declares variable **names** only, never values. |
| `services[].storage[]` | `mountPath` (absolute, not `/`, normalized, no `..`) and `size` (positive Kubernetes quantity). |
| `services[].health` | Optional. A `readiness` probe, a `liveness` probe or both, each exactly one of `http` (`path`, and `port` defaulting to the service port) or `tcp` (`port`, same default). `startupSeconds` (30-1800, default 300) is how long the container may take to pass its first probe before it is restarted. `exec` and `grpc` probes, and an HTTP probe's `host`, `scheme` or headers, are refused with a message that says why. A path is an absolute URL path of at most 200 characters, with no query, fragment, whitespace or `.`/`..` segment. |

The parser rejects unknown keys (and reports each by its path, such as `services[0].hostNetwork`), YAML aliases and more than one YAML document. Parsing never fetches your source and never deploys anything.

### Versions are immutable once published

Each `(definition, version)` pair is unique. A **draft** can be replaced while its `metadata.name` and `metadata.version` stay the same. A version that has left `draft` cannot be edited: publish a new version number instead. Because `source` is pinned to a commit or digest, every version describes exactly one build input.

Version status values are `draft`, `validating`, `review`, `published`, `deprecated` and `revoked`. The API creates a version as `draft`, and **publish** makes it `published`: frozen inside the workspace, never edited or deleted again. A published version can be revoked, which is final: it never builds, deploys or installs again. `validating`, `review` and `deprecated` are reserved and not set by the API yet. The releases of the [curated agent templates](#curated-agent-templates) are published by the TOSE server itself.

### Validation errors

Errors carry a field path so you can fix them without guessing:

```json
{
  "errors": [
    { "path": "source.git.commit", "message": "use a full 40-character lowercase Git SHA" },
    { "path": "services[0].port", "message": "use a TCP port from 1 to 65535" }
  ]
}
```

## Author workflow

1. Write `tose.yaml` locally, with a pinned commit or image digest.
2. Check it with `POST /api/workspaces/{slug}/template-manifests/validate`. Nothing is stored, and the answer says whether the definition and the version already exist.
3. `POST /api/workspaces/{slug}/template-definitions` with the manifest. This creates a **private** definition and its first **draft** version.
4. Fix any `422 manifest_invalid` errors and replace the draft with `PUT .../versions/{version}`, sending the `expected_manifest_hash` of the draft you read.
5. Record a validation run with `POST .../versions/{version}/validate`.
6. Publish with `POST .../versions/{version}/publish` and the `expected_manifest_hash` you reviewed. The version is frozen from then on.
7. Add another version with `POST .../versions` when the code changes. Version numbers are never reused.

Details, scopes, error codes and examples are in the [registry API reference](/api/template-registry).

## Security and trust

- A definition is **private** to the workspace that created it. Other workspaces cannot list or read it.
- The install-time checks (scoped push credential, digest scan with SBOM, pinned source and hardened pod) are described in [Install security gate](#install-security-gate-gated).
- Validation only checks the manifest syntax and the pin format. It does not scan or build your source. The response says `security_gate: pending` even for a valid manifest, and an untrusted manifest is never given to a builder until a separate security gate exists and passes.
- Pinning to a commit or digest protects users from a source that changes after review. It does not prove the code is safe.
- Do not put secret values in a manifest. Declare the variable name with `secret: true`; the person who deploys supplies the value.
- Publishing keeps a version private to the workspace. The public directory, with review by TOSE, trust signals, reporting and takedown, is built but off in production; it will be documented here when it is turned on.

## Install security gate (gated)

Installing a registry template is **gated**. The platform refuses to build or run a registry version unless every check below passes, and a missing setting counts as a failed check, never as a skipped one. The flag that turns community templates on (`COMMUNITY_TEMPLATES_ENABLED`) defaults to `false`, so on a platform where an operator has not enabled it, no registry install runs, whatever the manifest says. The checks shipped in tose-app [#484](https://github.com/saasvn/tose-app/pull/484). The live hardened-host and real-cluster release checks are still open in [#142](https://github.com/saasvn/tose-app/issues/142), so the feature stays gated.

What an install must pass:

- **Source builds (`source.git`).** The build runs in a hardened sandbox and pushes the image only with a short-lived credential issued for that one push. The platform's own registry credential is never used for an untrusted build. The pinned commit must be on the repository's default branch or on one of its tags, so a commit that exists only in a fork is refused.
- **Every registry install, built or pinned (`source.oci`).** The image is pinned by digest and scanned at that digest before its workload is applied. Each scan, refused or admitted, is recorded; when the scanner produces an SBOM, it is kept with a provenance statement. A finding at or above the configured severity (default `HIGH`) refuses the deploy.
- **Pod at runtime.** The pod runs as a non-root user (uid 1000) with a read-only root filesystem, all capabilities dropped, no privilege escalation, the default seccomp profile and no service account token. It can write only to the storage you declared and `/tmp`, so publish an image that writes nowhere else. A pod weaker than this is refused on create and on every redeploy.

### Fail-closed errors

When a check fails, the install is refused and nothing is deployed. The deploy plan shows the reason as a blocker with its code. When a build or deploy is refused at run time, the build log gives the reason as an `ERROR: template security gate refused the build` line in plain words.

| Code | Meaning | What to do |
|------|---------|------------|
| `COMMUNITY_TEMPLATES_DISABLED` | Registry templates are switched off on this platform. | Nothing on your side. Only the operator can enable them. |
| `IMAGE_SCANNER_NOT_CONFIGURED` | No image scanner is configured, so an image cannot be scanned. | Operator setting. Deploys stay refused until a scanner is set. |
| `BUILD_SANDBOX_NOT_HARDENED` | The build host has no hardened sandbox, so a source build is refused. | Operator setting. A pinned `source.oci` image is not built, so it does not need the sandbox. |
| `PUSH_CREDENTIALS_NOT_SCOPED` | No issuer of short-lived push credentials is configured. | Operator setting. Source builds stay refused until one is set. |
| `SOURCE_REFUSED` | The source is not acceptable: a URL that is not a plain `https://github.com/<owner>/<repo>`, a commit that is not a full SHA, or an image that is not pinned as `name@sha256:<digest>`. | Fix the manifest and create a new version. |
| `NETWORK_POLICY_NOT_ENFORCED` | An installation with a network mode needs network policies that the cluster cannot enforce. | Operator setting. |
| `INGRESS_MODE_NOT_ENFORCED` | A private installation's leftover public ingress could not be removed. | Operator setting. |

Most other refusals carry no code and read as a short sentence in the build log, for example: the image scan found a vulnerability at or above the limit, the scanner failed or produced no SBOM, the push credential could not be issued or lives longer than allowed, or the pinned commit is not on the repository's default branch or a tag. GitHub being unreachable or rate-limiting the commit check also refuses the build; try again later.

Operators configure the sandbox, the credential issuer, the scanner and its severity limit in the app's [template security runbook](https://github.com/saasvn/tose-app/blob/master/docs/template-security-gate.md). That page is the reference for the exact settings; this page does not repeat them.

## Curated agent templates {#curated-agent-templates}

TOSE defines three curated coding-agent templates itself: **Pi**, **Claude Code** and **Codex** (tose-app [#461](https://github.com/saasvn/tose-app/pull/461) and [#502](https://github.com/saasvn/tose-app/pull/502), issue [#405](https://github.com/saasvn/tose-app/issues/405)). They are planned through the same deployment planner as registry versions, not through the legacy [catalog](/guide/dewee-template).

::: info Released
Every curated agent has a reviewed release, an image pinned by `sha256` digest with its upstream version, date and validation evidence: **Codex 1.0.0**, **Claude Code 1.0.0**, and **Pi 1.0.0** and **1.1.0**. Pi 1.1.0 is the default for new Pi agents; it adds seven providers, Node.js with npm, uv for Python, and instructions that describe the container to Pi. Which agents and releases your server offers is the live list (the dashboard and `GET /curated-templates`). Still open: the per-installation network policy, private ingress and pod hardening are tested against a fake cluster and still have to be shown on the production cluster.
:::

### What a definition fixes

| Part | Rule |
|------|------|
| Provider key | **Bring your own key (BYOK).** One secret variable: `ANTHROPIC_API_KEY` (Claude Code), `OPENAI_API_KEY` (Codex, with `CODEX_PROVIDER` set to `openai`) or `PI_API_KEY` (Pi, with `PI_PROVIDER`: `anthropic`, `openai` or `google` in release 1.0.0, ten providers from release 1.1.0; see [Pi model providers](/guide/agent-pi-providers)). Codex also offers a **ChatGPT plan**, and Claude Code a **Claude plan**: see [Provider sign-in](#provider-sign-in). TOSE never bills model usage: the provider bills your key. |
| Model | Optional `AGENT_MODEL`, the provider's model name. Empty uses the agent's default. |
| Size | Whole cores and GiB from the allowed list: Claude Code and Codex 1, 2 or 4 cores and 2, 4 or 8 GiB; Pi 1 or 2 cores and 1, 2 or 4 GiB. |
| Storage | A persistent disk with `/workspace` (5 GiB) and `/home/agent` (1 GiB), billed while the disk exists, also when stopped. |
| Network | Egress `approved` (**Provider only**: the provider's API and sign-in hosts, the default), `development` (**Development (restricted)**: the provider plus the reviewed git, npm and PyPI hosts of the tools in the image) or `internet` (**Unrestricted public Internet**). `none` is not offered, because an agent cannot reach its provider without egress. Ingress is always `private`: the agent's console is never public. |
| Setup | `image_entrypoint` only: the release image's own reviewed entrypoint. No build steps, startup commands, hooks, Kubernetes objects or `privileged`; unknown fields are refused. |
| Release | Each release pins an OCI image by `sha256` digest and records the upstream version, the date and an https link to its evidence. The publisher (TOSE) is set once on the definition. It renders to a normal `tose.dev/v1` manifest checked by the rules above. |

### Provider sign-in {#provider-sign-in}

An API key (BYOK) works for every curated agent and does not depend on any server flag.

**The plan sign-ins are offered where the server enables `CURATED_SUBSCRIPTION_LOGIN_ENABLED`.** This one server flag controls both dashboard plan sign-ins: the Codex **ChatGPT plan** and the Claude Code **Claude plan** panel (**Connect Claude**). The product owner allowed both in production on 2026-11-09 (tose-app [#569](https://github.com/saasvn/tose-app/pull/569), [#587](https://github.com/saasvn/tose-app/pull/587); decisions for [Codex](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md#codex-chatgpt-sign-in-in-production-owner-decision-2026-11-09) and [Claude](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md#claude-code-dashboard-sign-in-in-production-owner-decision-2026-11-09)). It is the product owner's decision, not a provider approval: neither OpenAI nor Anthropic has approved this hosted use in writing. The dashboard list and `GET /curated-templates` show what a server offers. Where the flag is off, the Codex `chatgpt` provider is marked `available: false` with the reason, a plan that picks it is blocked with `SUBSCRIPTION_LOGIN_DISABLED` (nothing is created or billed), and the Claude plan panel is hidden; Claude Code's own `/login` in the console still works.

The Claude Code sign-in options are easy to confuse:

- **API key (BYOK).** `CLAUDE_PROVIDER=anthropic` with an `ANTHROPIC_API_KEY`. It needs no flag and is the path that does not depend on a provider decision.
- **Claude plan, signed in from the dashboard.** Where the flag is on, the installed app's page shows a **Claude plan** panel. **Connect Claude** shows a link to Anthropic's own sign-in page, you sign in there in your own browser, and you paste the one-time code the page shows into the panel. TOSE passes that code once to Claude Code's own `claude auth login`, and does not store, log, audit or return it. It is the only provider code any TOSE surface accepts. **Disconnect** signs the agent out. Where the flag is off, the panel is hidden and its routes answer `404`.
- **Claude plan, signed in from the terminal.** `CLAUDE_PROVIDER=claude` and `/login` in the agent's private console. TOSE takes no part, and the flag does not control it. It works whether or not the dashboard panel is on. Claude Code 1.0.0 is released, so this sign-in is available wherever Claude Code deploys.

The Codex **ChatGPT plan** (`CODEX_PROVIDER=chatgpt`, tose-app [#513](https://github.com/saasvn/tose-app/pull/513)) follows the same flag. Where it is on, **Connect ChatGPT** on the installed app's page shows a one-time device code, and you enter it on OpenAI's own page (`https://auth.openai.com/codex/device`) in your own browser. The provider is part of the approved plan, so switching an installed app between an API key and a ChatGPT plan means installing a new app.

**Risks you accept when you use a plan sign-in** (as recorded in the decisions):

- **Shared session.** The sign-in is not bound to the person who started it. Any owner or admin of the workspace who can open the console can use that installation's ChatGPT or Claude session. Use it only in a workspace where every owner and admin may use that account.
- **Provider terms.** OpenAI and Anthropic may refuse or restrict the accounts that sign in this way, and the loss falls on the account holder. Use an API key if that is not acceptable.
- **Still open.** A live provider canary, written approval from OpenAI and Anthropic, and the legal and security sign-offs are not recorded as complete.

**Rollback.** The operator sets `CURATED_SUBSCRIPTION_LOGIN_ENABLED` to false and restarts the API with the updated environment; changing the value alone does not apply it. Then both dashboard sign-ins disappear together: the Claude panel and the Codex ChatGPT sign-in. New Codex plans that pick the ChatGPT plan are blocked with `SUBSCRIPTION_LOGIN_DISABLED`, the pipeline refuses to deploy a Codex installation in ChatGPT mode, and the account routes answer `404`. This does **not** revoke provider sessions that already exist. To end one, **Disconnect** (or `/logout` for a terminal sign-in) while the panel is still on, stop or delete the agent, or revoke the session in your provider account. Claude Code's own `/login` in the console is unaffected.

Whatever the provider, **never send TOSE or its support a ChatGPT, Claude or other provider session, token, cookie, `auth.json` file or login code**, in a chat, a support message, an API call, a form or a variable. The only exception is the dashboard panel above, which accepts Anthropic's one-time sign-in code, and the device code is entered on OpenAI's page, never with TOSE. A provider key sent in a plan is refused; the agent's secrets are only the API key you enter on the deploy page and any secret environment variables you add there. The route contract is the machine-owned [OpenAPI](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/internal/apispec/openapi.yaml), which this page does not copy; the reasoning is in the [provider auth gate](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md).

### How releases are published

Adding a release is a reviewed change to the definition, compiled into the TOSE server. When the server starts it stores each release as a **published, immutable registry version** under the platform publisher `tose-curated` (shown as "TOSE"). That step is idempotent, never changes a stored version, and needs no admin action. A release can be held back with `hidden: true` in its definition; the dashboard then shows why the agent cannot be deployed instead of a **Deploy** link, and the API lists it only with `include_hidden=true`.

### Deploy from the dashboard {#deploy-from-the-dashboard}

Open **Template catalog** in the workspace sidebar (**Apps & agents**). Curated agents are listed first, under **Agent templates by TOSE**. Choose **Deploy** on Codex, Pi or Claude Code: the agent deploys from **one page** (tose-app [#598](https://github.com/saasvn/tose-app/pull/598)) with these cards:

- **App**: the app name.
- **Sign in**: the provider (for Pi, one of its providers) and, when it needs one, your API key right there. A plan sign-in (ChatGPT or Claude plan) needs no key and happens after the deploy.
- **Size**: CPU cores and memory from the offered sizes, and **Auto-sleep after idle** (off by default).
- **Network access**: **Provider only** (the default), **Development (restricted)** or **Unrestricted public Internet**, each with what it lets the agent reach.
- **Repository (optional)**: one GitHub repository of the workspace to check out into `/workspace` on first start.
- **Advanced: release, model and environment variables**: the release (Pi 1.1.0 by default), an optional model, and your own variables and secrets.

As you change the inputs, the page plans them and shows the live plan: the cost ceiling, the wallet runway, blockers and warnings, next to one **Deploy** button. There is no cost-limit field. **Deploy** approves exactly that plan (its plan hash), installs it with your key and an `Idempotency-Key`, and follows the installation until the agent runs. It then links to the app with the next step: open the console, **Connect** a plan, or `/login`. Your key is sent only with the install request, stored encrypted and never shown again.

Only a workspace **owner or admin** can approve a deploy. A member gets a link to the plan to send to an owner or admin.

The same flow works through the API: `POST /template-deployment-plans` with `curated_template`, a person approves the plan hash, then `POST /template-installations` with an `Idempotency-Key`. A replay of the same key and plan returns the same installation. See the [API reference](/api/template-registry#curated-agent-templates).

### The private console

An installed agent has no public address, no domain and a default-deny network policy. You open its console through TOSE:

- **Who.** Only a workspace **owner or admin who is signed in** to the dashboard or CLI. API keys and connected apps (MCP) are refused whatever their scopes: the console is an interactive shell that holds your provider key, so only a person opens it. This is a written exception to "agents are first-class users".
- **How.** On the installed app's page, choose **Open console**. It opens in a new tab (allow pop-ups if the browser blocks it). The app must be running; otherwise the button explains that the console is not available and asks you to start the app. The request is audited.
- **Session.** The console address carries a signed token, valid for 8 hours. It is the only credential in the address, so do not share the URL. TOSE proxies HTTP and WebSocket to the agent's port 8080, so the pod is never exposed.
- **Revoking access closes the console.** Every request, and every open WebSocket every five seconds, checks again that your sign-in is active, that you are still an owner or admin of the workspace and that the app is running. Signing out, losing the role, being removed from the workspace or stopping the app refuses the next request and closes the open socket. Rotating the server's signing secret ends every open console. Each WebSocket start is audited.
- **The page is untrusted.** The agent controls the console page and can run any code, so TOSE serves it in a CSP sandbox (an opaque origin that cannot use your TOSE sign-in), strips your cookies and credentials from requests to the agent, drops cookies the console sets, sends no referrer and redacts the token from access logs.

### Revoked versions and suspended publishers

Platform admins can revoke a release version or suspend the `tose-curated` publisher. The dashboard list and `GET /curated-templates` show the resulting blocker instead of a **Deploy** link, and later plans and deploys are refused:

- A **revoked version** blocks later plans with `VERSION_REVOKED`, and its later deploys.
- A **suspended publisher** blocks every curated plan (`CURATED_INSTALL_UNAVAILABLE`).
- A release that is not published yet, or is stored with a different manifest under the same version number, is also `CURATED_INSTALL_UNAVAILABLE`: TOSE never overwrites a stored version.
- Upgrading a curated installation in place is refused (`409 CURATED_UPGRADE_UNAVAILABLE`). Install the new release as a new installation and stop the old one.

### Plan a curated template

`POST /api/workspaces/{slug}/template-deployment-plans` takes `curated_template` (`pi`, `claude-code` or `codex`) **instead of** `definition_slug`, plus `network_mode` (`approved`, `development` or `internet`). `GET /api/workspaces/{slug}/curated-templates` lists the inputs for the form. See the [API reference](/api/template-registry#curated-agent-templates).

- **`max_hourly_cost_cents` is optional.** The plan always prices the highest hourly cost (compute plus storage, at the rates checked for the plan) and shows that ceiling for approval. When you set the limit, a plan whose ceiling is above it is blocked with `COST_CEILING_EXCEEDED`. The dashboard does not ask for it; set it through the API to cap a plan. An empty wallet is blocked with `INSUFFICIENT_BALANCE`. This page repeats no price: see [Pricing](/guide/pricing).
- **The provider key never goes in a plan.** Sending it in `variables` is `422 PLAN_INPUT_INVALID` with an `errors[]` entry `SECRET_VALUE_IN_PLAN` at `variables.<KEY>`, and the error does not repeat the value. The key belongs only in the `secrets` of the installation request.
- Sizes must be among the offered ones. Invalid inputs are `422` with the field path.

### Blockers

| Code | Meaning | Lifted by |
|------|---------|-----------|
| `CURATED_RELEASE_MISSING` | The definition has no release image pinned by digest. | A reviewed release in the definition. |
| `CURATED_TEMPLATE_HIDDEN` | A release exists, but its rollout is held (`hidden: true`). | Removing the hold. |
| `SUBSCRIPTION_LOGIN_DISABLED` | The plan chose the Codex **ChatGPT plan** and the server has `CURATED_SUBSCRIPTION_LOGIN_ENABLED` off. Claude Code's **Claude plan** is never blocked by it, because its terminal sign-in does not depend on the flag. See [Provider sign-in](#provider-sign-in). | Choosing the API key provider, or the operator turning the flag on. |
| `CURATED_INSTALL_UNAVAILABLE` | The release cannot be installed from the registry: not published yet, stored with another manifest, or the publisher is suspended. | TOSE publishing the release, or lifting the suspension. |
| `VERSION_REVOKED` | A platform admin revoked this version. | A newer reviewed release (a later version). |
| `COMMUNITY_TEMPLATES_DISABLED` (or `SECURITY_GATE_UNAVAILABLE`, `IMAGE_SCANNER_NOT_CONFIGURED`, depending on configuration) | The security gate refuses registry workloads in this configuration. | The operator enabling the gate and an image scanner. |
| `NETWORK_POLICY_NOT_ENFORCED`, `INGRESS_MODE_NOT_ENFORCED` | The target cluster cannot enforce the installation's own network policy, so the egress limit and the private console could not be guaranteed. Nothing is created or billed. | A cluster that enforces the policy. |

The workspace's own blockers (no cluster, name taken, cost ceiling, balance) also apply. A blocked plan cannot be approved: approval returns `PLAN_BLOCKED` (`409`, or `402` when the wallet is empty) and nothing is created. The image is scanned before it runs, and a deploy is refused when it has a high or critical vulnerability.

### People stay in control

- Approval needs a person: a workspace owner or admin signed in, or a workspace API key with `deployments:execute`. A connected MCP app cannot approve a plan.
- An owner or admin can always stop the agent (`POST /templates/{template_slug}/stop`), remove its provider key (`DELETE /templates/{template_slug}/envs/{KEY}`, which reaches the workload on its next deploy, so stop it as well) or delete it. API keys need `deployments:execute` to stop and `env:write` to remove the key. Stopping works with an empty wallet.
- The agent receives no TOSE API credential, so it cannot stop, restart or reconfigure itself, or lock a person out.
- Revoke the key at the provider too if it may have leaked.
- Today stop requires an owner or admin; member-level stop is an open product question.

## Pricing

Compute and storage are billed from your wallet. This page does not repeat any price: see [Pricing](/guide/pricing). The registry does not add a charge of its own.

## Next steps

- [Registry API reference](/api/template-registry)
- [Pi model providers](/guide/agent-pi-providers)
- [Dewee template runbook](/guide/dewee-template) for the curated 1-click path
- [API keys and scopes](/api/api-keys)
