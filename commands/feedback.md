# tose feedback

Report a bug or request a feature to the TOSE team without a GitHub account or token.

The CLI sends the report to the TOSE API (`POST /api/feedback`) with your API key, and TOSE routes it to the right tracker. The CLI never chooses a repository and never calls GitHub.

All commands accept `--json`. See the [global options](/commands/overview#global-options).

## Synopsis

```bash
tose feedback [submit] [--type <type>] [--component <name>] [--title <text>] [--message <text>] \
  [--reproduction <text>] [--request-id <id>] [--error-code <code>] \
  [--include-diagnostics] [--idempotency-key <key>] [--dry-run]
tose feedback status <feedback_id>
```

## tose feedback submit

`submit` is the default subcommand, so `tose feedback` and `tose feedback submit` do the same thing.

In a terminal, the command asks for the type, component, title and message, shows a preview of exactly what will be sent, and sends it only after you confirm.

For scripts and agents, pass the fields as flags:

```bash
tose --json --non-interactive feedback submit --type bug --component cli \
  --title "deploy hangs" --message "tose deploy never finishes" \
  --reproduction "run tose deploy in an empty project" --request-id req_123
```

Without a terminal, `--type`, `--title` and `--message` are required.

### Options

| Option | Description |
|--------|-------------|
| `--type <type>` | `bug`, `feature`, `docs`, `ux` or `billing` |
| `--component <name>` | `cli` (default), `api` (platform and dashboard), `web` or `docs`. `app` is a deprecated alias of `api` and prints a warning |
| `--title <text>` | Short summary, up to 120 characters |
| `--message <text>` | What happened or what you need, up to 8000 characters |
| `--reproduction <text>` | Steps to reproduce, up to 4000 characters (optional) |
| `--request-id <id>` | Request ID of the failing API call, up to 128 characters (optional) |
| `--error-code <code>` | Error code you received, up to 64 characters (optional). Requires `--include-diagnostics` |
| `--include-diagnostics` | Also send the CLI version, OS and CPU architecture. This is your explicit consent |
| `--idempotency-key <key>` | Make a retry record the report once, up to 128 characters. Derived from the report when omitted |
| `--dry-run` | Print exactly what would be sent, without sending |

`--request-id`, `--error-code` and `--idempotency-key` accept only letters, digits and `_ . : -`. The CLI checks them before it sends anything.

### What is sent

The report carries the type, component, title and message you wrote, plus the steps and request ID if you gave them. Without your consent no environment details are sent: no workspace or project names, no paths.

With `--include-diagnostics` (or answering yes in a terminal) the report also carries these diagnostics, and nothing more:

| Field | Value |
|-------|-------|
| `client` | `tose-cli` |
| `client_version` | CLI version |
| `os` | OS name, for example `darwin` or `linux` |
| `arch` | CPU architecture, for example `arm64` or `x64` |

`--error-code` is sent only together with diagnostics, so the CLI refuses it without `--include-diagnostics`. The CLI never reads `.env` files, source code or shell history.

### Redaction

Keys, bearer tokens, cookies, URLs with credentials and secret-looking assignments are redacted before sending, and the server redacts again. Use `--dry-run` to see the redacted report first.

### Retrying safely

The idempotency key is derived from everything in the report, so sending the same report again is recorded once. Set `--idempotency-key` yourself to control that.

## tose feedback status

Check a report you sent earlier.

```bash
tose feedback status <feedback_id>
```

## Result

The command prints one JSON envelope with `--json`. Its `data` has these fields:

| Field | Meaning |
|-------|---------|
| `feedback_id` | ID to pass to `tose feedback status` |
| `status` | State of the report (see below) |
| `issue_url` | Link to the tracker issue, or `null` |
| `idempotency_key` | Key the report was sent with (`submit` only) |

| Status | Meaning |
|--------|---------|
| `received` | Saved and queued |
| `triaged` | Triaged, waiting to be published |
| `published` | Published as an issue |
| `duplicate` | Matches an existing report; yours is linked to it |
| `publication_failed` | Saved, but publishing failed. TOSE retries |
| `rejected` | Rejected by moderation and not published |

The envelope `status` is `ok` for `published` and `duplicate`, and `pending` while the report waits. `issue_url` appears only once the server confirms the issue exists, so check again later with `tose feedback status`.

A report with status `rejected` exits with code `8`.

## Related

- [Commands overview](/commands/overview)
- [Authentication](/api/authentication)
