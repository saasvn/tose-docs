# Template registry API

Endpoints to check, create, edit, validate and publish templates of your workspace from a [`tose.yaml` manifest](/guide/template-registry). They live under `/api/workspaces/{slug}` and use the same [authentication](/api/authentication) as the rest of the API.

::: info What publishing means
Every definition is **private** to its workspace. Publishing freezes a version inside the workspace; it does not list it anywhere else. Listing a published version publicly is the template directory, and deploying one goes through the deployment planner. On hosted TOSE, installs of workspace and community templates are still blocked (`COMMUNITY_TEMPLATES_DISABLED`, `IMAGE_SCANNER_NOT_CONFIGURED`). See the [availability table](/guide/template-registry#availability).
:::

The [OpenAPI spec](https://api.tose.sh/api/openapi.yaml) (tag "Template registry") is the source of truth for every field. Its `operationId` values are `dryRunTemplateManifest`, `listTemplateDefinitions`, `createTemplateDefinition`, `getTemplateDefinition`, `validateTemplateDefinition`, `listTemplateDefinitionVersions`, `createTemplateDefinitionVersion`, `getTemplateDefinitionVersion`, `updateTemplateDefinitionDraft`, `validateTemplateDefinitionVersion` and `publishTemplateDefinitionVersion`.

## Routes

All paths are relative to `/api/workspaces/{slug}`. `...` stands for `/template-definitions/{definition_slug}`.

| Route | Who | Does |
|-------|-----|------|
| `POST /template-manifests/validate` | member, `projects:read` | Checks a manifest and stores nothing. Says whether the definition and the version already exist. |
| `GET /template-definitions` | member, `projects:read` | Lists the workspace's definitions. |
| `POST /template-definitions` | owner or admin, `projects:write` | Creates a private definition and its first draft. |
| `GET ...` | member, `projects:read` | The definition, its version count, its latest version and its latest published version by semantic version precedence. |
| `POST .../validate` | owner or admin, `projects:write` | Validates the version created last. Prefer naming the version. |
| `GET .../versions` | member, `projects:read` | Lists versions, newest first. |
| `POST .../versions` | owner or admin, `projects:write` | Adds a draft version. |
| `GET .../versions/{version}` | member, `projects:read` | One version with its parsed manifest and latest validation run. |
| `PUT .../versions/{version}` | owner or admin, `projects:write` | Replaces a draft's manifest. |
| `POST .../versions/{version}/validate` | owner or admin, `projects:write` | Checks the stored manifest again and records a run. |
| `POST .../versions/{version}/publish` | owner or admin, `projects:write` | Checks the manifest again and freezes the version inside the workspace. |

A key is limited to its own workspace: a key of another workspace gets `403`, and a request without the needed scope fails with `403` and `code: "insufficient_scope"` (see [API keys](/api/api-keys)). A definition of another workspace is `404 template_definition_not_found`, the same as one that does not exist. Sessions, workspace API keys and connected apps get the same answers.

## Request body

Create, add a version, edit a draft and the dry run take the same body:

```json
{ "manifest_yaml": "apiVersion: tose.dev/v1\nmetadata:\n  name: sample\n  ..." }
```

The body is one JSON object of at most 128 KiB, and the manifest itself at most 64 KiB. `PUT` also accepts `expected_manifest_hash`; publish takes an empty body or `{"expected_manifest_hash": "sha256:..."}`. Any other field is `400 invalid_request`.

`expected_manifest_hash` refuses the call with `409 template_manifest_changed` unless the stored manifest still has that hash. Send it to edit only the draft you read, and to publish only the manifest you reviewed.

## Check a manifest without storing it

```http
POST /api/workspaces/{slug}/template-manifests/validate
```

Parses the manifest with the same rules as create and returns `200` with `valid`, `errors` (every problem by field path), the parsed `manifest`, `manifest_hash`, `definition_exists` and `version_status` (the status of `metadata.version` in that definition, or `null`). Use it to choose between creating a definition, adding a version or editing a draft. `security_gate` stays `pending`: a valid manifest is not cleared to build.

## Create a definition

```http
POST /api/workspaces/{slug}/template-definitions
```

Creates a private definition named after `metadata.name`, its first draft version `metadata.version`, and a validation run.

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

Status `201`. `manifest_hash` is the SHA-256 of the exact YAML text you sent. A name already used in the workspace, including a deleted one, is `409 template_definition_exists`.

## List and read

```http
GET /api/workspaces/{slug}/template-definitions?limit=50&sort=-updated&tag=ai&q=sample
GET /api/workspaces/{slug}/template-definitions/{definition_slug}
GET /api/workspaces/{slug}/template-definitions/{definition_slug}/versions?status=published
GET /api/workspaces/{slug}/template-definitions/{definition_slug}/versions/{version}
```

- The list returns `{ "definitions": [...], "next_cursor": "..." }`. Filters: `category`, `tag` and `q` (a case-insensitive substring of the slug or description, at most 100 characters). `sort` is `created` (default), `updated` or `slug`, with a `-` prefix for descending order.
- The versions list returns `{ "versions": [...], "next_cursor": "..." }`, newest first, with an optional `status` filter.
- Both lists page with a keyset cursor: `limit` is 1-100 (default 50, otherwise `400 invalid_request`). Pass `next_cursor` as `cursor`, with the same `sort`, for the next page. `next_cursor` is `null` on the last page.
- One version returns its parsed `manifest` and latest validation run. `manifest` is `null`, with `manifest_errors`, when the stored manifest no longer passes the current rules.

## Add a draft version

```http
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/versions
```

`metadata.name` must equal the definition slug, otherwise `422` with path `metadata.name`. Returns `201` with the version. A version number is never reused: an existing one, whatever its status, is `409 template_version_exists`.

## Edit a draft

```http
PUT /api/workspaces/{slug}/template-definitions/{definition_slug}/versions/{version}
```

`metadata.name` and `metadata.version` must stay the same (`422` otherwise). Returns `204` with no body; read the new `manifest_hash` with `GET .../versions/{version}`. A version that is not a draft is `409 template_version_not_draft`: add a new version instead. With `expected_manifest_hash`, a draft changed by someone else in the meantime is `409 template_manifest_changed`. Every edit records a validation run.

## Validate

```http
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/versions/{version}/validate
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/validate
```

Checks the stored manifest of that version (or of the version created last) with the current rules, records a validation run and returns it. The version itself does not change.

```json
{
  "id": "...",
  "version_id": "...",
  "version": "1.0.0",
  "status": "valid",
  "manifest_hash": "sha256:...",
  "errors": [],
  "security_gate": "pending",
  "created_at": "..."
}
```

`status` is `valid` or `invalid`; an invalid manifest is still a `200`. `manifest_hash` names the manifest the run checked, so a later draft edit is not covered by it. `security_gate` is always `pending`: a valid manifest is not cleared to build.

## Publish

```http
POST /api/workspaces/{slug}/template-definitions/{definition_slug}/versions/{version}/publish
```

Checks the manifest again and freezes the version: from then on its manifest cannot change and it cannot be deleted. Visibility stays private, and nothing is listed outside the workspace, built or deployed. Returns `200` with the published version. Publishing a version that is already published returns it unchanged, so a retry is safe. Send `expected_manifest_hash` to publish only the manifest you reviewed.

## Errors

Every error has a stable `code` next to `error` (see [Errors](/api/errors)):

| Status and code | When |
|-----------------|------|
| `400 invalid_request` | The body is not one JSON object with only the allowed fields, or a query parameter is out of range (`limit`, `sort`, `status`). |
| `422 manifest_invalid` | The manifest fails validation. `errors[]` lists every problem as `{path, message}`. |
| `409 template_definition_exists` | The workspace already has a definition with this name, including a deleted one. |
| `409 template_version_exists` | This version number exists already, whatever its status. |
| `409 template_version_not_draft` | Only a draft can be edited. |
| `409 template_manifest_changed` | The stored manifest no longer has `expected_manifest_hash`. |
| `404 template_definition_not_found`, `404 template_version_not_found` | No such definition or version in this workspace. |

The directory routes that build on these definitions (publisher profile, listings, reports) use the same shape and add `422 invalid_input` (a field of the request, with `errors[]`), `422 template_prereview_failed` (an automated pre-review check refused a submission) and `429` (`template_listing_limit`, `template_report_limit`).

Edits, publishes and validations of one version are serialized: of concurrent creates of a slug or version exactly one succeeds, and an edit that races a publish either lands first (and the publish is refused because the hash changed) or is refused afterwards.

## Curated agent templates {#curated-agent-templates}

The curated Pi, Claude Code and Codex templates are released: Codex 1.0.0, Claude Code 1.0.0, and Pi 1.0.0 and 1.1.0 (the default for Pi). Each release is a published, digest-pinned registry version under the platform publisher `tose-curated`. Which agents and releases your server offers is in `GET /curated-templates`. See the [guide](/guide/template-registry#curated-agent-templates) for the dashboard, the console and the blockers.

| Operation | Workspace role | API key scope |
|-----------|----------------|---------------|
| `GET /api/workspaces/{slug}/curated-templates` | `member` or higher | `deployments:read` |
| `GET /api/workspaces/{slug}/curated-templates/{key}` | `member` or higher | `deployments:read` |
| `POST /api/workspaces/{slug}/template-deployment-plans` with `curated_template` | `member` or higher | `deployments:read` |
| `POST /api/workspaces/{slug}/template-deployment-plans/{plan_id}/approve` | `admin` or `owner`, signed in or key | `deployments:execute` |
| `POST /api/workspaces/{slug}/template-installations` with an `Idempotency-Key` | `admin` or `owner`, signed in or key | `deployments:execute` and `projects:write`, plus `env:write` with `secrets` |
| `POST /api/workspaces/{slug}/template-installations/{installation_id}/console-sessions` | `admin` or `owner`, **signed in only** | none: API keys and connected apps are refused |

The list returns the inputs of the guided form (provider and key name, `AGENT_MODEL`, allowed cores and GiB, `workspace_disk_gib`, `network_mode`, the optional `max_hourly_cost_cents`), `hidden`, `releases`, the runtime port and storage, and the blockers that do not depend on the workspace. It never holds a secret value. A template held back with `hidden` is listed only with `include_hidden=true`; a read by key returns it. An unknown key is `404 CURATED_TEMPLATE_NOT_FOUND`.

Plan request (send `curated_template` or `definition_slug`, not both):

```json
{
  "curated_template": "claude-code",
  "name": "My agent",
  "cpu_cores": 2,
  "memory_gib": 4,
  "network_mode": "approved",
  "workspace_disk_gib": 10,
  "variables": {"AGENT_MODEL": "claude-sonnet-4-5"}
}
```

- `workspace_disk_gib` is the size in GiB of the agent's `/workspace` volume: one of `inputs.workspace_disk_gib.allowed` in the list (5, the default, 10, 20 or 50). `inputs.workspace_disk_gib` also has `default` and `monthly_usd`, the monthly storage price of each size in the order of `allowed`. Any other value is `422 PLAN_INPUT_INVALID` at `workspace_disk_gib`. `/home/agent` stays 1 GiB. The plan pins the size in `curated.storage.workspace_disk_gib`, which is part of the plan hash, and prices the whole disk in the cost ceiling. The size is fixed at install: an upgrade or rollback plan that sends it is refused. Storage is billed while the disk exists, also while the agent is stopped.
- `repository` pins one GitHub repository (owners and admins only); see [GitHub repository](/guide/agent-repository-checkout). Add `"push": true` to let the agent push to it through the TOSE git proxy, and `push_branches`: `all` (the default: any branch, including the default branch) or `agent` (only `tose/<installation slug>/...`). `push` defaults to `false`; `push_branches` without `push` is `422` at `repository.push_branches`. A plan with push needs the GitHub App permission `contents: write` (otherwise blocker `GITHUB_PERMISSION_MISSING`) and a server whose git proxy has a public https address (otherwise `503 GIT_PROXY_NOT_CONFIGURED`). See [Let the agent push](/guide/agent-repository-checkout#let-the-agent-push-to-your-repository).

- `max_hourly_cost_cents` is **optional** (it was required until 2026-11-09, tose-app [#571](https://github.com/saasvn/tose-app/pull/571)). The plan always shows its cost ceiling for approval; when you set the limit, a plan whose ceiling is higher is blocked with `COST_CEILING_EXCEEDED`. The dashboard does not ask for it. An empty wallet blocks the plan with `INSUFFICIENT_BALANCE`.
- `network_mode` is `approved` (the default), `development` or `internet`. The list describes `development` in its own `development` object, with the toolchain hosts of the server's reviewed policy; a client offers it when that object is present.
- A provider key in `variables` is `422 PLAN_INPUT_INVALID` with an `errors[]` entry `SECRET_VALUE_IN_PLAN` at `variables.<KEY>`; the response does not echo it, and it is never stored in the plan.
- Unknown fields such as a startup command, a hook or `privileged` are `400`.
- The plan has an extra hashed `curated` section: the release, the provider, `auth: byok`, the network mode with its destinations, the setup kind, `storage` (`workspace_disk_gib`, absent for a template whose volumes have a fixed size), `human_control` (who may act and the stop, key removal and delete routes) and, with a repository, `repository`. With push, `curated.repository` adds `push: true`, `push_branches`, `push_branch_pattern` (`*` or `tose/<installation slug>/*`) and `push_remote` (the git proxy URL, without a credential); `access` stays `contents:read`, the clone token's permission. The agent holds no TOSE API credential for the workspace and no GitHub token; with push it holds only its checkout's git proxy secret ([below](#git-proxy)).
- Approving a plan with blockers returns `PLAN_BLOCKED` (`409`, or `402` when the wallet is empty) and creates nothing; a connected MCP app gets `403 APPROVAL_REQUIRES_PERSON`.
- A curated plan resolves its release to a published registry version (`template.version_id`) and checks that the stored manifest is exactly the release's. When the release cannot be installed from the registry (not published, stored with another manifest, or the `tose-curated` publisher suspended) the plan carries `CURATED_INSTALL_UNAVAILABLE`; a revoked version carries `VERSION_REVOKED`.
- Plan sign-ins follow the server flag `CURATED_SUBSCRIPTION_LOGIN_ENABLED`, which the product owner allowed in production on 2026-11-09. Where the server enables it, the Codex provider `chatgpt` (`CODEX_PROVIDER=chatgpt`) is offered and the Claude Code installed-app page offers **Connect Claude**. Where it is off, `chatgpt` is `available: false` with the reason and a plan that picks it is blocked with `SUBSCRIPTION_LOGIN_DISABLED`, so read the listing rather than assume. `CODEX_PROVIDER=openai` or `CLAUDE_PROVIDER=anthropic` with an API key never depends on the flag. See [Provider sign-in](/guide/template-registry#provider-sign-in).
- With the flag on, the `provider-account` routes (Codex device code) and the `claude-provider-account` routes (Claude paste code) under an installation are served to signed-in owners and admins of the workspace; with it off they answer `404`. The Claude `login/code` route takes Anthropic's one-time sign-in code once and never stores or returns it. No other API accepts a provider token, cookie, login file or code, so do not build integrations that collect one. Turning the flag off needs an API restart, closes both sign-ins together and does not revoke existing provider sessions. The contract is the [OpenAPI](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/internal/apispec/openapi.yaml) and the [decision record](https://github.com/saasvn/tose-app/blob/17a6559f286d3b3c20195a8af85474d18225b490/docs/agent-provider-auth-gate.md). Native terminal sign-in (`CLAUDE_PROVIDER=claude` with `/login` in the console) is separate from the flag.
- Installing an approved plan is the normal `POST /template-installations` with an `Idempotency-Key`. The provider key goes only in `secrets`, is stored encrypted and is never returned. Upgrading a curated installation in place is `409 CURATED_UPGRADE_UNAVAILABLE`.
- The installation view reports the checkout as `repository`, with `push` and `push_branches` when the agent may push. Push cannot be changed after install; plan the agent again to change it.
- Task delegation (`task_delegation` in the installation view) starts `true` for a new installation of a release with a task runner, and `false` for an older installation or a release without one. Only a signed-in owner or admin changes it with `PUT .../template-installations/{installation_id}/task-delegation` and `{"enabled": false}` or `true`. See [Delegate tasks](/guide/agent-tasks#turn-it-on).

### Git proxy

An agent allowed to push reaches GitHub only through these routes. They are not workspace routes: no session, API key or connected app is accepted, only the agent's own git with its checkout secret (HTTP Basic, user `x-tose`, password `TOSE_GIT_TOKEN`).

| Route | What it does |
|-------|--------------|
| `GET /api/git/{checkout_id}/info/refs?service=git-upload-pack` or `git-receive-pack` | Ref advertisement. |
| `POST /api/git/{checkout_id}/git-upload-pack` | Fetch, forwarded with a `contents:read` token for the one repository. Body at most 64 MiB. |
| `POST /api/git/{checkout_id}/git-receive-pack` | Push, forwarded with a `contents:write` token for the one repository. At most 1 GiB, also after gzip decompression. Audited as `template_installation.git_push`. |

A missing or wrong secret is `401`, a request outside git's smart protocol `403 GIT_REQUEST_INVALID` (`400` for a malformed push), too large `413 GIT_REQUEST_TOO_LARGE`, too many (more than 4 at once or 60 a minute per checkout) `429 GIT_RATE_LIMITED` with `Retry-After`, and a server without a public proxy address `503 GIT_PROXY_NOT_CONFIGURED`. Other refusals reach git as `remote error` with a code; see [When git refuses](/guide/agent-repository-checkout#when-git-refuses).

### Open the console

`POST .../template-installations/{installation_id}/console-sessions` takes an empty body (or `{}`; any other field is `400`) and answers `201`:

```json
{
  "installation_id": "...",
  "console_path": "/api/template-console/<signed token>/",
  "expires_at": "2026-11-06T18:00:00Z"
}
```

- Only a signed-in workspace owner or admin. An API key or a connected app is `403` whatever its scopes; the request is audited.
- The installation must be a curated agent with a running app; otherwise `409 CONSOLE_UNAVAILABLE` (`503` when consoles are not configured or the server cannot check right now). An unknown installation is `404 INSTALLATION_NOT_FOUND`. The installation view has an optional `console` field (`available`, `reason`, `session_path`).
- Open `console_path` in a new browser tab. It serves the agent's port 8080 (HTTP and WebSocket) through a port-forward, and the token in it is valid until `expires_at` (8 hours). Do not share it. An unknown or expired token, or a signed-out session, is `404 CONSOLE_SESSION_NOT_FOUND`; a lost role is `403`, a stopped app `409 CONSOLE_UNAVAILABLE`, and a pod that cannot be reached `502 CONSOLE_UNREACHABLE`.
- Every request, and every open WebSocket every five seconds, checks again that the person is signed in, still an owner or admin, and that the app runs. Otherwise the request is refused and the socket closes. Each WebSocket start is audited.
- The page is served in a CSP sandbox; your cookies and credentials are stripped before the request reaches the agent.

The [OpenAPI spec](https://api.tose.sh/api/openapi.yaml) (`CuratedTemplate`, `listCuratedTemplates`) is the source of truth.

## Not covered here

The registry routes above take no idempotency key and return no plan, `next_actions` or expiry: they manage definitions and versions, not deployments. Deploying a registry version (plans, approval, installations, upgrades and rollbacks) is the OpenAPI tag "Template deployments"; this page documents only its curated-template use. The public directory routes are the tag "Template directory".

## See also

- [`tose.yaml` manifest and availability](/guide/template-registry)
- [Templates API](/api/templates) for the curated 1-click catalog and deployments
- [Errors](/api/errors)
