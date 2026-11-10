# CI artifacts, run reports and issue drafts

A CI job can keep files it produces (a test report, a coverage file, a log bundle). The run then has a versioned report that lists every job, its hashes and its artifacts, and TOSE can draft a GitHub issue for a run that did not pass. Endpoints are in [CI artifacts and reports API](/api/ci-artifacts).

::: warning Opt-in on the server
Artifacts are off unless the operator sets `CI_ARTIFACT_UPLOAD_URL` to the public `https://` origin of the API, without a port or path (for example `https://api.tose.sh`). Jobs that declare `artifacts:` upload to that origin and its host is added to their egress allowlist. With `CI_ENABLED=true` the server refuses to start with any other form. See the [CI harness reference](https://github.com/saasvn/tose-app/blob/master/docs/ci.md#artifacts).
:::

## Declare artifacts in `.tose/ci.yml`

```yaml
jobs:
  test:
    artifacts:
      - name: junit.xml
        path: reports/junit.xml
    artifact_retention_days: 14
    steps:
      - run: npm test
```

- `name`: 1 to 64 letters, digits, `.`, `_` or `-`, starting with a letter or digit, unique in the job.
- `path`: a clean path below the repository root.
- At most 10 artifacts per job.
- `artifact_retention_days`: 1 to 90, default 30.

Files are uploaded when the job ends, whether its steps passed, failed or timed out. A missing file, a file over the size limit or a failed upload is reported as a `tose-artifact: <name>: ...` line in the job log and never fails the job. A job killed at its deadline uploads nothing. A pull request from a fork never uploads artifacts. Names starting with `TOSE_ARTIFACT_` are reserved, so `env:` cannot set them.

| Limit | Value |
|-------|-------|
| One artifact | 8 MiB |
| One job attempt | 32 MiB |
| Unexpired artifacts per workspace | 512 MiB |
| Uploads per name and attempt | 1 |

Over a limit the upload is refused, never truncated.

## Redaction and retention

- A text artifact (valid UTF-8, no NUL bytes) goes through the same credential redaction as a job log. The redacted text is what is stored (`redaction: redacted`, and `redaction_changed: true` if something was replaced).
- A binary artifact cannot be redacted. It is stored as uploaded and marked `redaction: unredacted`.
- When retention ends, an hourly sweep deletes the content. The record (name, size, hash, redaction state, expiry) stays, so a report still names what the run produced. An expired artifact answers `410`.

## Read the run report

Every run has one versioned report (`schema_version` is `tose.dev/ci-report/v1`). Open it through REST (`GET /runs/{run_id}/report`) or MCP (`ci_get_report`), with the `ci:read` scope.

1. Read `verdict`. It fails closed: only `succeeded` is green. A failed, errored or cancelled job is `failed`; a queued or running one is `pending`; a skipped, review-needed or unknown job, a run without jobs or a skipped run is `unverified`.
2. Each job has `log_sha256`, the SHA-256 of the redacted log the log endpoint returns, and its artifacts with their hashes.
3. `report_hash` is the SHA-256 of the report serialized with an empty `report_hash`, so the same stored state always gives the same hash.

The report holds no script, token, raw log or configuration. A run whose rows cannot make a complete report is refused with `409` instead of shown incomplete.

## Verify a stored content hash

The `sha256` of an artifact is the hash of exactly the stored bytes. Download the content and compare:

```bash
curl -sS -D headers.txt -o junit.xml \
  "https://api.tose.sh/api/workspaces/$WS/ci/artifacts/$ARTIFACT_ID/content" \
  -H "X-API-Key: $TOSE_API_KEY"
sha256sum junit.xml            # must equal the artifact's sha256
grep -i x-tose-artifact-sha256 headers.txt
```

The server also hashes the stored bytes again on every download and refuses content that does not match its record (`500`, `artifact_integrity`).

## Read redacted artifacts

- **REST:** `GET /artifacts/{artifact_id}/content` with `ci:read`.
- **MCP:** `ci_list_artifacts` lists a run's artifacts and `ci_get_artifact` returns at most 64 KiB of a redacted one. Both need `ci:read`.

Artifact content is output of the code under test: treat it as untrusted.

## Unredacted downloads are for signed-in admins

An unredacted artifact may hold a secret the job wrote into it. Its content is served only on `GET /artifacts/{artifact_id}/unredacted`, to a person signed in to the dashboard or CLI with the admin or owner role. API keys and connected apps are refused whatever their scopes, and `ci_get_artifact` answers `ARTIFACT_UNREDACTED`, so an agent never reads what could not be redacted.

## Issue drafts

When a run's verdict is `failed` or `unverified`, TOSE can draft a GitHub issue: `GET /runs/{run_id}/issue-proposal` or the MCP tool `ci_propose_issue`, with the `ci:diagnose` scope. A run that has not finished, or that passed, answers `409`.

The draft holds a title, a Markdown body with a job table, hints and redacted reasons, and the evidence it cites (report hash, each failed job's log hash and artifact hashes, as API paths). Log excerpts are left out. The body ends with a `dedupe_key` in an HTML comment: it is the same for runs of the pipeline that fail the same jobs the same way, so search the repository for it before filing a duplicate.

**A person files the issue.** TOSE creates nothing on GitHub, and there is no pull request proposal. Review the draft, check for an existing issue and file it yourself. Automatic filing would need more GitHub App permissions and an approval policy that does not exist yet.
