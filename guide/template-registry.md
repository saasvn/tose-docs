# Template registry and `tose.yaml` manifest

The template registry stores versioned deployment templates that are described by a `tose.yaml` manifest. This page explains the manifest format, what you can do with it today, and what is not available yet.

::: warning Early access: private drafts only
Only the foundation has shipped (tose-app [#388](https://github.com/saasvn/tose-app/pull/388), issue [#143](https://github.com/saasvn/tose-app/issues/143)). You can create, edit and validate **private draft** templates in your own workspace through the [registry API](/api/template-registry). Nothing below the "Availability" table is enabled yet, and this page does not describe it as if it were. The [curated agent templates](#curated-agent-templates) are defined but hidden and blocked.
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
| Curated Pi, Claude Code and Codex templates: definitions and plan contract | Defined, hidden and blocked. No reviewed image is pinned, so every plan is blocked |
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

## Curated agent templates (hidden and blocked) {#curated-agent-templates}

TOSE defines three curated coding-agent templates itself: **Pi**, **Claude Code** and **Codex** (tose-app [#461](https://github.com/saasvn/tose-app/pull/461), issue [#405](https://github.com/saasvn/tose-app/issues/405)). They are planned through the same deployment planner as registry versions, not through the legacy [catalog](/guide/dewee-template).

::: warning Hidden and not installable today
All three definitions are **hidden**. TOSE has not yet built and reviewed an image pinned by digest for any of them, so no release is listed and every plan is stored as `blocked`. Public listing, publisher identity, enforced egress and private ingress are still pending. Nothing on this page means you can run an agent today.
:::

### What a definition fixes

| Part | Rule |
|------|------|
| Provider key | **Bring your own key (BYOK) only.** One secret variable: `ANTHROPIC_API_KEY` (Claude Code), `OPENAI_API_KEY` (Codex) or `PI_API_KEY` (Pi, with `PI_PROVIDER` set to `anthropic`, `openai` or `google`). Signing in with a provider subscription is not offered. TOSE never bills model usage: the provider bills your key. |
| Model | Optional `AGENT_MODEL`, the provider's model name. Empty uses the agent's default. |
| Size | Whole cores and GiB from the allowed list: Claude Code and Codex 1, 2 or 4 cores and 2, 4 or 8 GiB; Pi 1 or 2 cores and 1, 2 or 4 GiB. |
| Storage | A persistent disk with `/workspace` (5 GiB) and `/home/agent` (1 GiB), billed while the disk exists, also when stopped. |
| Network | Egress `approved` (only the provider's API host, the default) or `internet`. `none` is not offered, because an agent cannot reach its provider without egress. Ingress is `private`: the agent's console is never public. |
| Setup | `image_entrypoint` only: the release image's own reviewed entrypoint. No build steps, startup commands, hooks, Kubernetes objects or `privileged`; unknown fields are refused. |
| Release | Each release pins an OCI image by `sha256` digest and records the publisher, upstream version, date and an https link to its evidence. It renders to a normal `tose.dev/v1` manifest checked by the rules above. |

### Plan a curated template

`POST /api/workspaces/{slug}/template-deployment-plans` takes `curated_template` (`pi`, `claude-code` or `codex`) **instead of** `definition_slug`, plus `network_mode`. `GET /api/workspaces/{slug}/curated-templates` lists the inputs for the form. See the [API reference](/api/template-registry#curated-agent-templates).

- **`max_hourly_cost_cents` is required.** It is your prepaid cost ceiling. A plan whose highest hourly cost (compute plus storage, at the rates checked for the plan) is above it is blocked with `COST_CEILING_EXCEEDED`; an empty wallet is blocked with `INSUFFICIENT_BALANCE`. This page repeats no price: see [Pricing](/guide/pricing).
- **The provider key never goes in a plan.** Sending it in `variables` is `422 SECRET_VALUE_IN_PLAN`, and the error does not repeat the value. The key belongs only in the `secrets` of the installation request.
- Sizes must be among the offered ones. Invalid inputs are `422` with the field path.

### Blockers

Every curated plan today carries the blockers below. The workspace's own blockers (no cluster, name taken, cost ceiling, balance) also apply.

| Code | Meaning | Lifted by |
|------|---------|-----------|
| `CURATED_RELEASE_MISSING` | No reviewed release image pinned by digest. | A reviewed release in the definition. |
| `CURATED_TEMPLATE_HIDDEN` | A release exists but its rollout is held. | Removing the hold. |
| `COMMUNITY_TEMPLATES_DISABLED` (and other security gate codes) | The security gate refuses registry workloads in this configuration. | Enabling the gate. |
| `NETWORK_POLICY_NOT_ENFORCED` | `approved` egress cannot be enforced: template workloads only get the workspace policy, which allows the public internet. | A per-installation egress policy. |
| `INGRESS_MODE_NOT_ENFORCED` | The pipeline publishes every installation on a public domain, and agents need private ingress. | Private ingress for template installations. |
| `CURATED_INSTALL_UNAVAILABLE` | Installing needs a platform publisher in the registry, which does not exist yet. The install call also refuses curated plans. | A platform publisher. |

A blocked plan cannot be approved: approval returns `PLAN_BLOCKED` (`409`, or `402` when the wallet is empty) and nothing is created. While a curated template has no release, `template.version_status` is `draft`.

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
