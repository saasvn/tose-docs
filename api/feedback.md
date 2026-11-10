# Feedback API

Send a bug report or a feature request to the TOSE team from a script, an agent or your own tool, without a GitHub account or token. A report is checked, redacted and routed to the right TOSE repository, then published as a GitHub issue.

::: warning Availability
Feedback intake is not enabled on every deployment. Where it is off, `/api/feedback` does not exist and returns `404`.
:::

## Send a report

```http
POST /api/feedback
```

| Header | Meaning |
|--------|---------|
| `X-API-Key` or `Authorization: Bearer` | A [workspace API key](/api/api-keys) or a session token. It needs the `feedback:write` scope, which `workspace:write` implies, because a report can become a public issue. |
| `Idempotency-Key` | Optional. Same as the `idempotency_key` field. |

```bash
curl -X POST https://api.tose.sh/api/feedback \
  -H "X-API-Key: $TOSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bug",
    "component": "deployments",
    "title": "Deploy stays in building",
    "description": "The build finishes but the deployment never leaves building.",
    "reproduction_steps": "1. tose deploy\n2. Wait 10 minutes",
    "correlation_id": "req_123",
    "include_diagnostics": true,
    "environment": { "client": "tose-cli", "client_version": "1.4.0", "os": "linux" },
    "error_codes": ["deployment_failed"],
    "idempotency_key": "build-stuck-2026-11-04"
  }'
```

### Body

| Field | Required | Meaning |
|-------|----------|---------|
| `type` | Yes | `bug`, `feature`, `ux`, `docs` or `billing`. |
| `component` | Yes | The part of TOSE the report is about. It decides which repository receives it: `api`, `dashboard`, `mcp`, `auth`, `deployments`, `builds`, `domains`, `databases`, `logs`, `billing`, `desktop`, `github`, `cli`, `web`, `docs` or `other`. |
| `title` | Yes | Up to 200 characters. |
| `description` | Yes | Up to 8000 characters. |
| `reproduction_steps` | No | Up to 4000 characters. |
| `correlation_id` | No | The `request_id` of a failing call (up to 128 characters), so maintainers can find it. |
| `include_diagnostics` | No | Set `true` to publish `environment` and `error_codes` in the issue. Without it, both are ignored. |
| `environment` | No | Only with `include_diagnostics`. Plain strings of up to 64 characters: `client`, `client_version`, `os`, `arch`, `api_version`. |
| `error_codes` | No | Only with `include_diagnostics`. Up to 10 machine codes, such as `deployment_failed`. |
| `idempotency_key` | No | Up to 128 characters. See [Retries](#retries). |
| `workspace` | No | Sessions only: a workspace slug you belong to. An API key is always pinned to its own workspace. |

You cannot choose the repository, the user or the workspace ID. They come from `component` and from your credential. A field that is not in the table is rejected with `400`, and attachments are not accepted. The request body is limited to 64 KiB (`413` above that). A field that is present but invalid returns `422`, with `details.field` naming it.

### Response

The report is stored first and published later, so a new report returns `202`.

```json
{
  "id": "fb_01HXEXAMPLE",
  "status": "triaged",
  "type": "bug",
  "component": "deployments",
  "title": "Deploy stays in building",
  "correlation_id": "req_123",
  "held_for_review": false,
  "created_at": "2026-11-04T04:40:00Z",
  "updated_at": "2026-11-04T04:40:00Z"
}
```

`issue_url` is added only after GitHub confirmed the issue. It is never a guess, so read the report again until it appears.

## Read a report

```http
GET /api/feedback/{id}
```

Needs `workspace:read`. Only the user who filed the report can read it. Anyone else, including an API key of another workspace, gets `404`. The response has the same shape as above.

## List your reports in a workspace

```http
GET /api/workspaces/{slug}/feedback
```

Returns the reports you filed in the workspace, newest first, each with its status history. It needs workspace membership and, for an API key, `workspace:read`; an API key sees only its own workspace. Reports are private to their reporter: a teammate's are never listed, and a non-member gets `404`. The optional `limit` is 1 to 100 (default 100). The route exists only where feedback is enabled. The dashboard page behind it is described in [Report a problem from the dashboard](/guide/dashboard-feedback).

## Statuses

| `status` | Meaning |
|----------|---------|
| `received` | Stored and held for review (`held_for_review: true`). It is published only after a TOSE administrator approves it. |
| `triaged` | Routed to a repository and waiting for publication. |
| `duplicate` | Merged with an existing report or issue about the same problem. |
| `published` | The GitHub issue exists. `issue_url` is present. |
| `publication_failed` | GitHub refused or could not be reached. TOSE keeps retrying, and no `issue_url` is shown. |
| `rejected` | A TOSE administrator rejected the report. It is never published. |

## How a report is handled

1. **Redaction.** API keys, bearer tokens, dotenv lines, URLs with credentials, cookies, email addresses, phone numbers and card numbers are removed before anything is stored or sent to GitHub. This applies to the title, the description, the steps, the diagnostics and the correlation ID.
2. **Routing.** `component` selects one TOSE repository. The same text can never name a different repository.
3. **Review.** A report is held for a TOSE administrator, who approves or rejects it, when it needed redaction, when its `type` is `billing` or when its `component` is `other`.
4. **Deduplication.** Reports of the same problem in the same repository share one GitHub issue, and each report keeps its own `id`. A report about a problem whose issue was already closed is linked to that earlier thread and does not open a new issue.
5. **Publication.** A background worker creates the issue. Your text appears in a quoted block marked as unverified user text, so links and mentions in it do nothing. Issues are labelled by type and are never handed to an automated agent.

## Retries

Send an `idempotency_key` (in the body or in the `Idempotency-Key` header) so a retry never files the same report twice. A retry by the same user returns the first report with status `200` and the header `Idempotent-Replay: true`. A key is scoped to the credential's workspace.

## Limits

| Limit | Value |
|-------|-------|
| Reports per user | 20 per hour |
| Reports per workspace | 60 per hour |
| Request size | 64 KiB |

Past a limit the API returns `429`. See [Errors](/api/errors) for the shared error format.

## Errors

| Status | Meaning |
|--------|---------|
| `400` | The body is not valid JSON, or has a field that is not accepted. |
| `401` | Missing or invalid credential. |
| `403` | The credential lacks `feedback:write` (or `workspace:write`, which implies it; or `workspace:read` to read), or the role is too low. |
| `404` | Feedback is not enabled on this deployment, or the report is not yours. |
| `413` | The body is larger than 64 KiB. |
| `422` | A field is invalid. `details.field` names it. |
| `429` | A rate limit was reached. |
| `503` | The service is temporarily unavailable. Retry with the same `idempotency_key`. |
