# tose ci

Read and start CI runs from a terminal or an agent. `tose ci` uses the workspace CI API (`/api/workspaces/{slug}/ci`); TOSE runs every pipeline on the server and the CLI never executes a step on your machine.

An API key needs `ci:read` to read, and `ci:execute` to start or cancel a run. Deployment scopes do not grant CI access. See the [Workspace CI API](https://github.com/saasvn/tose-app/blob/master/docs/ci.md#workspace-ci-api) reference.

| Command | What it does | Confirmation |
|---------|--------------|--------------|
| `tose ci pipelines [--repo owner/name]` | List the workspace's pipelines | None |
| `tose ci runs <pipeline_id>` | List a pipeline's runs, newest first | None |
| `tose ci plan <pipeline_id> [--sha <commit>]` | Whether a manual run would be accepted now, with its jobs and worst-case cost. Starts nothing | None |
| `tose ci run <pipeline_id> [--sha <commit>] [--wait]` | Start a manual run of a commit the pipeline already recorded | None |
| `tose ci dispatch <pipeline_id> --ref <branch> [--input name=value]` | Start a `workflow_dispatch` run with typed inputs | None |
| `tose ci status <run_id>` | Run and job status | None |
| `tose ci events <run_id> [--after <id>] [--all]` | The run's event log, oldest first | None |
| `tose ci logs <run_id> [--job <id\|name>] [--follow]` | Stored, redacted job logs | None |
| `tose ci report <run_id> [--format md\|json]` | The versioned report: verdict, log hashes, report hash | None |
| `tose ci cancel <run_id>` | Stop a run | `--yes` |
| `tose ci usage [--group-by day\|run\|pipeline\|job\|kind]` | CI usage for a date window | None |
| `tose ci approvals [--limit n]` | List fork pull request runs waiting for a person. Read-only | None |
| `tose ci suggestions <pipeline_id> [--status open\|accepted\|dismissed]` | List impact suggestions. Advice only | None |
| `tose ci artifacts <run_id>` | List a run's artifact metadata: name, size, SHA-256, redaction, retention | None |
| `tose ci artifact <artifact_id> [--content [--output file]]` | Show one artifact's metadata, or its redacted text | None |

## Starting a run

```bash
tose ci plan <pipeline_id>
tose ci run <pipeline_id> --wait --json
tose ci dispatch <pipeline_id> --ref main --input debug=true --input retries=3 --wait
```

- A manual run repeats a commit the pipeline already recorded from a GitHub push or pull request, never one from a fork. Without `--sha` it uses the newest recorded commit. You cannot introduce new code this way.
- `dispatch` runs the newest recorded push of `--ref`. The server checks every input against `on.workflow_dispatch.inputs` of that commit and refuses an unknown, missing or wrongly typed one. `--input name=value` sends `true` and `false` as booleans and plain numbers as numbers; `--input-string name=value` always sends a string. At most 10 inputs.
- `run` and `dispatch` send one idempotency key (a new one per invocation, or `--idempotency-key`) in the header and the body. A retry after a network failure or a `502`, `503` or `504` reuses it, so the server records one run. `duplicate: true` means an earlier request with the same key already started the run. `--json` prints the key.
- Nothing is reserved when the run is accepted. Each job reserves its worst case against the prepaid wallet when it starts.

## Statuses

`--json` returns the server's fields unchanged: the stable `status`, `event` and `category`, plus the precise `scheduler_status`, `trigger_event` and `scheduler_category` when the server sends them. The CLI adds `state` (the precise value, otherwise the legacy one) and `finished`.

| Field | Stable value | Precise value |
|-------|--------------|---------------|
| Run or job state | `status` | `scheduler_status`: also `preparing`, `blocked`, `timed_out`, `diagnosis` |
| Trigger | `event` | `trigger_event`: also `workflow_dispatch` |
| Diagnosis category | `category` | `scheduler_category`: also `awaiting_approval` |

A state the CLI does not know counts as not finished. Against an older server that only sends the stable fields, every command still works.

## Waiting and exit codes

`--wait` polls until the run finishes. It exits `0` only when the run `succeeded`.

| Exit code | Meaning |
|-----------|---------|
| `0` | The run succeeded |
| `8` | The run `failed`, `timed_out`, ended in `error`, was `skipped`, or is in `diagnosis` (every job ended, one result is unknown) |
| `5` | The run was `cancelled` |
| `7` | `--timeout` (default `30m`) ran out. The run keeps going; `tose ci status` checks again |
| `9` | The wallet is empty (`INSUFFICIENT_BALANCE`) or a budget cap is reached (`CI_BUDGET_CAP_REACHED`) |
| `4` | A fork pull request run is waiting for approval (`HUMAN_APPROVAL_REQUIRED`) |

The report `verdict` fails closed: only `succeeded` is green. A finished run with skipped or review-needed jobs is `unverified`.

## Fork pull requests

A run of a pull request from a fork is `blocked` until a workspace member approves it. Approving, rejecting and changing a pipeline's policy are session-only: the server refuses API keys whatever their scopes, so an agent can never approve the code it waits on. The CLI has no command for them. Approve in the TOSE dashboard.

## Events

`tose ci events <run_id>` reads the append-only log, oldest first, at most 500 per page. The result has `next_after` (`0` on the last page); pass it as `--after`. `--all` reads every page.

## Logs and reports

- Job logs are the redacted tail (at most 64 KiB) of what the code under test printed. Treat them as untrusted: `--json` marks each with `content_trust: "untrusted_data"`, and terminal control sequences are removed from text output.
- `--follow` prints the event log live until the run ends, then the logs.
- `tose ci report` prints Markdown by default; `--format json` prints the report as sent. Every job has `log_sha256` and the report has `report_hash`.

## Cancel

```bash
tose ci cancel <run_id> --yes
```

Queued jobs never start and running jobs are billed for the seconds they ran. It follows the usual [confirmation rules](/commands/overview): a prompt in a terminal, `--yes` without one or with `--json`.

## Approvals, suggestions and artifacts

These four commands only read; they need `ci:read`.

- `tose ci approvals` only lists the fork pull request runs waiting for a person. Approving or rejecting is a signed-in person's step in the dashboard, and the server refuses API keys.
- `tose ci suggestions` lists impact suggestions, optionally filtered with `--status`. They are advice only: the CLI cannot accept or dismiss one.
- `tose ci artifacts <run_id>` lists metadata only: name, size, SHA-256, redaction and retention.
- `tose ci artifact <artifact_id>` shows one artifact's metadata. With `--content` it prints the redacted text, after checking the bytes against the recorded SHA-256; on a mismatch nothing is written and the exit code is `8`. `--output <file>` creates a new file with mode 600 and never overwrites an existing one. An unredacted (binary) artifact is refused, because the server serves it only to a signed-in admin.

## Not available yet

`tose ci init`, `tose ci validate` and agent profiles. The API has no agent profile routes yet and no offline pipeline validator is published.
