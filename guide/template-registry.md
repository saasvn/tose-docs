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

## Pricing

Compute and storage are billed from your wallet. This page does not repeat any price: see [Pricing](/guide/pricing). The registry does not add a charge of its own.

## Next steps

- [Registry API reference](/api/template-registry)
- [Dewee template runbook](/guide/dewee-template) for the curated 1-click path
- [API keys and scopes](/api/api-keys)
