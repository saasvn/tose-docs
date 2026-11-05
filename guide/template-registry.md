# Template registry and `tose.yaml` manifest

The template registry stores versioned deployment templates that are described by a `tose.yaml` manifest. This page explains the manifest format, what you can do with it today, and what is not available yet.

::: warning Early access: private drafts only
Only the foundation has shipped (tose-app [#388](https://github.com/saasvn/tose-app/pull/388), issue [#143](https://github.com/saasvn/tose-app/issues/143)). You can create, edit and validate **private draft** templates in your own workspace through the [registry API](/api/template-registry). Nothing below the "Availability" table is enabled yet, and this page does not describe it as if it were.
:::

## Availability

| Capability | Status |
|------------|--------|
| Manifest format `tose.dev/v1` and strict validation | Available |
| Private draft definitions and versions in your workspace (REST) | Available |
| Validation runs recorded per version | Available. A valid manifest still reports `security_gate: pending` |
| Public publishing, review for public listing, deprecate and revoke | Not available. Public visibility stays off until the security gate passes |
| Template directory (search, filter, sort) | Not available |
| Deploy plan, cost and blockers for a registry template | Not available |
| Registry installs (build and run) | Gated. Fail-closed [security gate](#install-security-gate-gated); off unless the operator enables community templates (default off) |
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
- The install-time checks (scoped push credential, digest scan with SBOM, pinned source and hardened pod) are described in [Install security gate](#install-security-gate-gated).
- Validation only checks the manifest syntax and the pin format. It does not scan or build your source. The response says `security_gate: pending` even for a valid manifest, and an untrusted manifest is never given to a builder until a separate security gate exists and passes.
- Pinning to a commit or digest protects users from a source that changes after review. It does not prove the code is safe.
- Do not put secret values in a manifest. Declare the variable name with `secret: true`; the person who deploys supplies the value.
- Verified publisher, verified template version, public review policy, reporting and takedown will be documented when public publishing ships.

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

## Pricing

Compute and storage are billed from your wallet. This page does not repeat any price: see [Pricing](/guide/pricing). The registry does not add a charge of its own.

## Next steps

- [Registry API reference](/api/template-registry)
- [Dewee template runbook](/guide/dewee-template) for the curated 1-click path
- [API keys and scopes](/api/api-keys)
