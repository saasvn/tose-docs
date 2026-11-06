# Template registry and `tose.yaml` manifest

The template registry stores versioned deployment templates that are described by a `tose.yaml` manifest. This page explains the manifest format, what you can do with it today, and what is not available yet.

::: warning Early access: private drafts only
The registry foundation has shipped (tose-app [#388](https://github.com/saasvn/tose-app/pull/388), issue [#143](https://github.com/saasvn/tose-app/issues/143)). You can create, edit and validate **private draft** templates in your own workspace through the [registry API](/api/template-registry). Public publishing, the directory, the CLI and MCP are not enabled, and this page does not describe them as if they were. The [curated agent templates](#curated-agent-templates) stay hidden until TOSE publishes a reviewed release.
:::

## Availability

| Capability | Status |
|------------|--------|
| Manifest format `tose.dev/v1` and strict validation | Available |
| Private draft definitions and versions in your workspace (REST) | Available |
| Validation runs recorded per version | Available. A valid manifest still reports `security_gate: pending` |
| Public publishing, review for public listing, deprecate and revoke | Not available. Public visibility stays off until the security gate passes |
| Template directory (search, filter, sort) | Not available |
| Deploy plan, cost and blockers for a registry template | Shipped in the backend, not documented here yet except for the curated templates below |
| Curated Pi, Claude Code and Codex templates: plan, install and private console | Built, but hidden. TOSE has not published a reviewed, digest-pinned release, so every plan is blocked until one exists |
| `tose templates ...` CLI | Not available |
| Registry MCP tools | Not available |

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
```

### Fields

| Field | Rule |
|-------|------|
| `apiVersion` | Must be `tose.dev/v1`. Any other value is rejected. |
| `metadata.name` | Lowercase DNS-style slug (`a-z`, `0-9`, `-`, up to 63 characters). It becomes the definition slug and cannot change later. |
| `metadata.version` | Semantic version, for example `1.0.0` or `1.2.0-rc.1`. |
| `metadata.description` | Required, not blank. |
| `metadata.category` | Lowercase slug. Used by the `category` filter when listing. |
| `metadata.tags` | Optional, at most 20, each a lowercase slug. |
| `metadata.license` | Required, not blank. |
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

The parser rejects unknown keys, YAML aliases and more than one YAML document. Parsing never fetches your source and never deploys anything.

### Versions are immutable once published

Each `(definition, version)` pair is unique. A **draft** can be replaced while its `metadata.name` and `metadata.version` stay the same. A version that has left `draft` cannot be edited: publish a new version number instead. Because `source` is pinned to a commit or digest, every version describes exactly one build input.

Version status values stored by the registry are `draft`, `validating`, `review`, `published`, `deprecated` and `revoked`. Today the API creates versions only as `draft`; the other states are reserved for the publishing flow that is not available yet.

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

## Author workflow (available today)

1. Write `tose.yaml` locally, with a pinned commit or image digest.
2. `POST /api/workspaces/{slug}/template-definitions` with the manifest. This creates a **private** definition and its first **draft** version.
3. Fix any `422` errors and replace the draft with `PUT .../versions/{version}`.
4. Add another version with `POST .../versions` when the code changes.
5. Call `POST .../validate` to record a validation run for the latest version.

Details, scopes and examples are in the [registry API reference](/api/template-registry).

## Security and trust

- A definition is **private** to the workspace that created it. Other workspaces cannot list or read it.
- Validation only checks the manifest syntax and the pin format. It does not scan or build your source. The response says `security_gate: pending` even for a valid manifest, and an untrusted manifest is never given to a builder until a separate security gate exists and passes.
- Pinning to a commit or digest protects users from a source that changes after review. It does not prove the code is safe.
- Do not put secret values in a manifest. Declare the variable name with `secret: true`; the person who deploys supplies the value.
- Verified publisher, verified template version, public review policy, reporting and takedown will be documented when public publishing ships.

## Curated agent templates {#curated-agent-templates}

TOSE defines three curated coding-agent templates itself: **Pi**, **Claude Code** and **Codex** (tose-app [#461](https://github.com/saasvn/tose-app/pull/461) and [#502](https://github.com/saasvn/tose-app/pull/502), issue [#405](https://github.com/saasvn/tose-app/issues/405)). They are planned through the same deployment planner as registry versions, not through the legacy [catalog](/guide/dewee-template).

::: warning Hidden until TOSE publishes a reviewed release
A curated agent stays **hidden** and cannot be installed until TOSE publishes a reviewed release: an image pinned by `sha256` digest, with its upstream version, date and validation evidence. #502 added the install flow and the console but **did not publish a Pi, Codex or Claude Code release**, so every plan is still blocked with `CURATED_RELEASE_MISSING`. This page describes the flow you get once a release exists. Which agents you can deploy at any moment is decided by the live registry (the dashboard list and `GET /curated-templates`), not by this page.
:::

### What a definition fixes

| Part | Rule |
|------|------|
| Provider key | **Bring your own key (BYOK) only.** One secret variable: `ANTHROPIC_API_KEY` (Claude Code), `OPENAI_API_KEY` (Codex) or `PI_API_KEY` (Pi, with `PI_PROVIDER` set to `anthropic`, `openai` or `google`). Signing in with a provider subscription is not offered. TOSE never bills model usage: the provider bills your key. |
| Model | Optional `AGENT_MODEL`, the provider's model name. Empty uses the agent's default. |
| Size | Whole cores and GiB from the allowed list: Claude Code and Codex 1, 2 or 4 cores and 2, 4 or 8 GiB; Pi 1 or 2 cores and 1, 2 or 4 GiB. |
| Storage | A persistent disk with `/workspace` (5 GiB) and `/home/agent` (1 GiB), billed while the disk exists, also when stopped. |
| Network | Egress `approved` (only the provider's API host, the default) or `internet`. `none` is not offered, because an agent cannot reach its provider without egress. Ingress is always `private`: the agent's console is never public. |
| Setup | `image_entrypoint` only: the release image's own reviewed entrypoint. No build steps, startup commands, hooks, Kubernetes objects or `privileged`; unknown fields are refused. |
| Release | Each release pins an OCI image by `sha256` digest and records the upstream version, the date and an https link to its evidence. The publisher (TOSE) is set once on the definition. It renders to a normal `tose.dev/v1` manifest checked by the rules above. |

### Why an agent stays hidden

A definition without a release is hidden: the dashboard shows why it cannot be deployed instead of a **Deploy** link, and the API lists it only with `include_hidden=true`. Adding a release is a reviewed change to the definition, compiled into the TOSE server. When the server starts it stores each release as a **published, immutable registry version** under the platform publisher `tose-curated` (shown as "TOSE"). That step is idempotent, never changes a stored version, and needs no admin action. A definition without a release publishes nothing.

### Deploy from the dashboard (once a release is available)

Open **Templates** in the workspace sidebar, then **My templates**. Curated agents are listed under "Agent templates by TOSE". Choose **Deploy** on an available one; a hidden one shows its blockers instead.

1. **Configure.** Pick the **release**, and for Pi the **provider**, then optionally the **model**. Choose the CPU and memory from the offered sizes, and the network access: **Approved hosts only** (the provider's API on port 443) or **Internet**. Enter the required **cost limit per hour**: the plan is blocked if the workload could cost more. The provider API key is not asked here and is never part of the plan.
2. **Review and approve.** The review shows the pinned release, the cost, the network destinations and the "People stay in control" section. A workspace owner or admin approves the plan hash. A blocked plan cannot be approved.
3. **Install.** Enter your provider API key in the password field. It is sent only with the install request, stored encrypted and never shown again, and the field is cleared once the install succeeds. Installing creates the app and queues its first deployment of the **pinned registry version**: the exact digest that was approved.
4. **Status.** The page refreshes until the first deployment finishes. You can leave it; the app keeps deploying.

The same flow works through the API: `POST /template-deployment-plans` with `curated_template`, a person approves the plan hash, then `POST /template-installations` with an `Idempotency-Key`. A replay of the same key and plan returns the same installation. See the [API reference](/api/template-registry#curated-agent-templates).

### The private console

An installed agent has no public address, no domain and a default-deny network policy. You open its console through TOSE:

- **Who.** Only a workspace **owner or admin who is signed in** to the dashboard or CLI. API keys and connected apps (MCP) are refused whatever their scopes: the console is an interactive shell that holds your provider key, so only a person opens it. This is a written exception to "agents are first-class users".
- **How.** On the installed app's page, choose **Open console**. It opens in a new tab (allow pop-ups if the browser blocks it). The app must be running; otherwise the button explains that the console is not available and asks you to start the app. The request is audited.
- **Session.** The console address carries a signed token, valid for 8 hours. It is the only credential in the address, so do not share the URL. TOSE proxies HTTP and WebSocket to the agent's port 8080, so the pod is never exposed.
- **Revoking access closes the console.** Every request, and every open WebSocket every five seconds, checks again that your sign-in is active, that you are still an owner or admin of the workspace and that the app is running. Signing out, losing the role, being removed from the workspace or stopping the app refuses the next request and closes the open socket. Rotating the server's signing secret ends every open console. Each WebSocket start is audited.
- **The page is untrusted.** The agent controls the console page and can run any code, so TOSE serves it in a CSP sandbox (an opaque origin that cannot use your TOSE sign-in), strips your cookies and credentials from requests to the agent, drops cookies the console sets, sends no referrer and redacts the token from access logs.

### Revoked versions and suspended publishers

Platform admins can revoke a release version or suspend the `tose-curated` publisher. This affects what happens next, not what you see in the form:

- A **revoked version** blocks later plans with `VERSION_REVOKED`, and its later deploys.
- A **suspended publisher** blocks every curated plan (`CURATED_INSTALL_UNAVAILABLE`).
- A release that is not published yet, or is stored with a different manifest under the same version number, is also `CURATED_INSTALL_UNAVAILABLE`: TOSE never overwrites a stored version.
- Upgrading a curated installation in place is refused (`409 CURATED_UPGRADE_UNAVAILABLE`). Install the new release as a new installation and stop the old one.

### Plan a curated template

`POST /api/workspaces/{slug}/template-deployment-plans` takes `curated_template` (`pi`, `claude-code` or `codex`) **instead of** `definition_slug`, plus `network_mode`. `GET /api/workspaces/{slug}/curated-templates` lists the inputs for the form. See the [API reference](/api/template-registry#curated-agent-templates).

- **`max_hourly_cost_cents` is required.** It is your prepaid cost ceiling. A plan whose highest hourly cost (compute plus storage, at the rates checked for the plan) is above it is blocked with `COST_CEILING_EXCEEDED`; an empty wallet is blocked with `INSUFFICIENT_BALANCE`. This page repeats no price: see [Pricing](/guide/pricing).
- **The provider key never goes in a plan.** Sending it in `variables` is `422 PLAN_INPUT_INVALID` with an `errors[]` entry `SECRET_VALUE_IN_PLAN` at `variables.<KEY>`, and the error does not repeat the value. The key belongs only in the `secrets` of the installation request.
- Sizes must be among the offered ones. Invalid inputs are `422` with the field path.

### Blockers

| Code | Meaning | Lifted by |
|------|---------|-----------|
| `CURATED_RELEASE_MISSING` | No reviewed release image pinned by digest. | A reviewed release in the definition. |
| `CURATED_TEMPLATE_HIDDEN` | A release exists, but its rollout is held. | Removing the hold. |
| `CURATED_INSTALL_UNAVAILABLE` | The release cannot be installed from the registry: not published yet, stored with another manifest, or the publisher is suspended. | TOSE publishing the release, or lifting the suspension. |
| `VERSION_REVOKED` | A platform admin revoked this version. | A new release. |
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
- [Dewee template runbook](/guide/dewee-template) for the curated 1-click path
- [API keys and scopes](/api/api-keys)
