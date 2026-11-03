# Template registry API

Endpoints to create, edit and validate private template drafts from a [`tose.yaml` manifest](/guide/template-registry). They live under `/api/workspaces/{slug}/template-definitions` and use the same [authentication](/api/authentication) as the rest of the API.

::: warning Early access
This API only manages **private drafts**. Public publishing, the directory, deploy planning, CLI and MCP for registry templates are not available yet. See the [availability table](/guide/template-registry#availability).
:::

The [OpenAPI spec](https://api.tose.sh/api/openapi.yaml) is the source of truth for every field (`operationId` values starting with `listTemplateDefinitions`, `createTemplateDefinition`, `getTemplateDefinition`, `listTemplateDefinitionVersions`, `createTemplateDefinitionVersion`, `updateTemplateDefinitionDraft` and `validateTemplateDefinition`).

## Access

| Operation | Workspace role | API key scope |
|-----------|----------------|---------------|
| List and read definitions and versions | `member` or higher | `projects:read` |
| Create, edit and validate | `admin` or `owner` | `projects:write` |

A key is limited to its own workspace. A request without the needed scope fails with `403` and `code: "insufficient_scope"`. See [API keys](/api/api-keys). Definitions are scoped to the calling workspace: another workspace's definition returns `404`.

## Request body

Create, add a version and edit a draft all take the same body:

```json
{ "manifest_yaml": "apiVersion: tose.dev/v1\nmetadata:\n  name: sample\n  ..." }
```

The body is one JSON object with only `manifest_yaml`, at most 128 KiB, and the manifest itself at most 64 KiB. Unknown JSON keys are rejected with `400 {"error":"invalid JSON body"}`.

## Create a definition

```http
POST /api/workspaces/{slug}/template-definitions
```

Creates a private definition named after `metadata.name`, and a draft version.

```json
{
  "definition": {
    "id": "...", "publisher_id": "...", "slug": "sample", "name": "sample",
    "category": "productivity", "visibility": "private"
  },
  "version": {
    "id": "...", "definition_id": "...", "version": "1.0.0", "status": "draft",
    "manifest_yaml": "...", "manifest_hash": "sha256:..."
  }
}
```

Status `201`. `manifest_hash` is the SHA-256 of the exact YAML text you sent.

| Status | Meaning |
|--------|---------|
| `400` | Body is not one JSON object with only `manifest_yaml` |
| `403` | Not an admin, or the key lacks `projects:write` |
| `409` | A definition with this slug already exists in the workspace |
| `422` | Manifest errors: `{ "errors": [{ "path", "message" }] }` |

## List and read

```http
GET /api/workspaces/{slug}/template-definitions?limit=50&cursor=<id>&category=productivity
GET /api/workspaces/{slug}/template-definitions/{definition_slug}
GET /api/workspaces/{slug}/template-definitions/{definition_slug}/versions
```

The list returns `{ "definitions": [...], "next_cursor": "..." }`, ordered by id. `limit` is 1-100 (default 50), otherwise `400`. Pass `next_cursor` as `cursor` for the next page; an empty `next_cursor` means the last page. The versions call returns an array, newest first, up to 100.

## Add a draft version

```http
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/versions
```

`metadata.name` must equal the definition slug, otherwise `422` with path `metadata.name`. Returns `201` with the version, or `409` when that version number already exists.

## Edit a draft

```http
PUT /api/workspaces/{slug}/template-definitions/{definition_slug}/versions/{version}
```

`metadata.name` and `metadata.version` must match the existing draft (`422` with path `metadata` otherwise). Returns `204` with no body. `409 {"error":"only an existing draft version can be edited"}` when the version is not a draft. A version that has left `draft` is immutable.

## Validate

```http
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/validate
```

Re-parses the **latest** version, records a validation run and returns it:

```json
{
  "id": "...",
  "version_id": "...",
  "status": "valid",
  "errors": [],
  "security_gate": "pending"
}
```

`status` is `valid` or `invalid`. `security_gate` is always `pending` today: a valid manifest is not approved for publishing or building.

## Not covered yet

There is no idempotency key, plan, `next_actions` or plan expiry for these endpoints, because they only manage drafts. Those parts will be documented when the planner and deploy flow ship. Check the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml) for the current contract.

## See also

- [`tose.yaml` manifest and availability](/guide/template-registry)
- [Templates API](/api/templates) for the curated 1-click catalog and deployments
- [Errors](/api/errors)
