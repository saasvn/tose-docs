# CI artifacts and reports API

Endpoints to read a run's versioned report, its artifacts and an issue draft. Concepts are in [CI artifacts, run reports and issue drafts](/guide/ci-artifacts). Full schemas (`CIRunReport`, `CIArtifact`, `CIIssueProposal`) are in the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml).

All paths are under `/api/workspaces/{slug}/ci`.

| Method and path | Who | Purpose |
|-----------------|-----|---------|
| `GET /runs/{run_id}/report` | `ci:read` | The versioned report |
| `GET /runs/{run_id}/artifacts` | `ci:read` | The run's artifacts, metadata only |
| `GET /artifacts/{artifact_id}` | `ci:read` | One artifact's metadata |
| `GET /artifacts/{artifact_id}/content` | `ci:read` | A redacted text artifact, hash-checked |
| `GET /artifacts/{artifact_id}/unredacted` | Person signed in as admin or owner | Any artifact, including a binary one |
| `GET /runs/{run_id}/issue-proposal` | `ci:diagnose` | A GitHub issue draft for a run that did not pass |

An artifact, run or pipeline of another workspace returns `404`, like one that does not exist. A runtime-bound API key cannot use any CI route.

## Get the report

```bash
curl "https://api.tose.sh/api/workspaces/$WS/ci/runs/$RUN/report" \
  -H "X-API-Key: $TOSE_API_KEY"
```

**Response:** `200` with `schema_version` (`tose.dev/ci-report/v1`), `run`, `verdict`, `jobs`, `counts`, `total_running_seconds`, `total_cost_nano_usd` and `report_hash`. `verdict` is `succeeded`, `failed`, `pending` or `unverified`; only `succeeded` is green. Each job has `log_sha256` and its artifacts. `409` means the stored rows cannot make a complete report.

## Artifact metadata

**Response:** the run list is `{"artifacts": [...]}`; one artifact is a bare `CIArtifact`. Each has `id`, `job_id`, `attempt`, `name`, `size_bytes`, `sha256`, `content_type`, `redaction` (`redacted` or `unredacted`), `redaction_changed`, `created_at`, `expires_at` and `expired`.

## Download content

```bash
curl -OJ "https://api.tose.sh/api/workspaces/$WS/ci/artifacts/$ID/content" \
  -H "X-API-Key: $TOSE_API_KEY"
```

| Status | Meaning |
|--------|---------|
| `200` | Attachment as `text/plain`, with `Repr-Digest`, `X-Tose-Artifact-SHA256` and `X-Content-Type-Options: nosniff` |
| `403` `artifact_unredacted` | The artifact is binary and unredacted; use the signed-in admin route |
| `410` | Retention ended; only the record remains |
| `500` `artifact_integrity` | The stored bytes no longer match their hash; nothing is served |

`GET /artifacts/{artifact_id}/unredacted` has the same checks and headers, serves binary content as `application/octet-stream`, and is refused for API keys and connected apps whatever their scopes (policy action `ci.artifact_unredacted`).

## Issue draft

**Response:** `200` with `kind` (`github_issue`), `repository`, `title`, `body`, `dedupe_key`, `verdict`, `evidence` and `notice`. `409` for a run that has not finished or that passed. The call files nothing on GitHub; a person reviews and files the issue.

## MCP tools

| Tool | Scope |
|------|-------|
| `ci_get_report`, `ci_list_artifacts`, `ci_get_artifact` | `ci:read` |
| `ci_propose_issue` | `ci:diagnose` |

`ci_get_artifact` returns at most 64 KiB of a redacted artifact with a notice that it is untrusted, and refuses an unredacted one (`ARTIFACT_UNREDACTED`).

Artifacts are off until the operator sets `CI_ARTIFACT_UPLOAD_URL`. The upload endpoint used by jobs is not part of the workspace API or the public OpenAPI contract.
