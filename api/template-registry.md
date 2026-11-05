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

## Curated agent templates {#curated-agent-templates}

::: warning Hidden and blocked
The curated Pi, Claude Code and Codex templates are hidden: no reviewed image pinned by digest exists, so every plan is `blocked`. See the [guide](/guide/template-registry#curated-agent-templates) for the rules and blockers.
:::

| Operation | Workspace role | API key scope |
|-----------|----------------|---------------|
| `GET /api/workspaces/{slug}/curated-templates` | `member` or higher | `deployments:read` |
| `GET /api/workspaces/{slug}/curated-templates/{key}` | `member` or higher | `deployments:read` |
| `POST /api/workspaces/{slug}/template-deployment-plans` with `curated_template` | `member` or higher | `deployments:read` |
| `POST /api/workspaces/{slug}/template-deployment-plans/{plan_id}/approve` | `admin` or `owner`, signed in or key | `deployments:execute` |

The list returns the inputs of the guided form (provider and key name, `AGENT_MODEL`, allowed cores and GiB, `network_mode`, required `max_hourly_cost_cents`), `hidden`, `releases`, the runtime port and storage, and the blockers that do not depend on the workspace. It never holds a secret value. Hidden templates are listed only with `include_hidden=true`; a read by key returns a hidden one. An unknown key is `404 CURATED_TEMPLATE_NOT_FOUND`.

Plan request (send `curated_template` or `definition_slug`, not both):

```json
{
  "curated_template": "claude-code",
  "name": "My agent",
  "cpu_cores": 2,
  "memory_gib": 4,
  "network_mode": "approved",
  "variables": {"AGENT_MODEL": "claude-sonnet-4-5"},
  "max_hourly_cost_cents": 20
}
```

- `max_hourly_cost_cents` is required for a curated template.
- A provider key in `variables` is `422 PLAN_INPUT_INVALID` with an `errors[]` entry `SECRET_VALUE_IN_PLAN` at `variables.<KEY>`; the response does not echo it, and it is never stored in the plan.
- Unknown fields such as a startup command, a hook or `privileged` are `400`.
- The plan has an extra hashed `curated` section: provider, `auth: byok`, network mode with its destinations, setup kind and `human_control` (who may act and the stop, key removal and delete routes). The agent holds no TOSE API credential.
- Approving a plan with blockers returns `PLAN_BLOCKED` (`409`, or `402` when the wallet is empty) and creates nothing; a connected MCP app gets `403 APPROVAL_REQUIRES_PERSON`; the install call refuses curated plans too (`CURATED_INSTALL_UNAVAILABLE`).

The [OpenAPI spec](https://api.tose.sh/api/openapi.yaml) (`CuratedTemplate`, `listCuratedTemplates`) is the source of truth.

## Not covered yet

There is no idempotency key, plan, `next_actions` or plan expiry for the draft endpoints above, because they only manage drafts. The deployment planner has shipped in the backend, but only its curated-template use is documented here; the registry plan, install and expiry behavior will be documented separately. Check the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml) for the current contract.

## See also

- [`tose.yaml` manifest and availability](/guide/template-registry)
- [Templates API](/api/templates) for the curated 1-click catalog and deployments
- [Errors](/api/errors)
