# tose feedback

Report a bug or request a feature to the TOSE team without a GitHub account or token.

The CLI sends the report to the TOSE API (`POST /api/feedback`) with your API key, and TOSE routes it to the right tracker. The CLI never chooses a repository and never calls GitHub.

All commands accept `--json`. See the [global options](/commands/overview#global-options).

## Synopsis

```bash
tose feedback [--type <type>] [--component <name>] [--title <text>] [--message <text>] \
  [--reproduction <text>] [--request-id <id>] [--error-code <code>] \
  [--include-diagnostics] [--log-file <path>] [--idempotency-key <key>] [--dry-run]
tose feedback status <feedback_id>
```

## tose feedback

In a terminal, `tose feedback` asks for the type, title and message, shows a preview of exactly what will be sent, and sends it only after you confirm.

For scripts and agents, pass the fields as flags:

```bash
tose --json --non-interactive feedback --type bug --component cli \
  --title "deploy hangs" --message "tose deploy never finishes" \
  --reproduction "run tose deploy in an empty project" --request-id req_123
```

### Options

| Option | Description |
|--------|-------------|
| `--type <type>` | `bug`, `feature`, `docs`, `ux` or `billing` |
| `--component <name>` | `cli` (default), `app`, `web` or `docs` |
| `--title <text>` | Short summary, up to 120 characters |
| `--message <text>` | What happened or what you need, up to 8000 characters |
| `--reproduction <text>` | Steps to reproduce (optional) |
| `--request-id <id>` | Request ID of the failing API call (optional) |
| `--error-code <code>` | Error code you received (optional) |
| `--include-diagnostics` | Also send the Node version, CPU architecture, OS release and API host. This is your explicit consent |
| `--log-file <path>` | Attach the last 16 KiB of that file, redacted. Needs `--include-diagnostics` |
| `--idempotency-key <key>` | Make a retry record the report once. Derived from the report text when omitted |
| `--dry-run` | Print exactly what would be sent, without sending |

### What is sent

Always sent: the type, component, title and message you wrote, plus the CLI version, `node` as the runtime and the OS name. Nothing else about your machine, no workspace or project names and no paths.

With `--include-diagnostics` (or answering yes in a terminal) the report also carries the Node version, CPU architecture, OS release and API host. `--log-file <path>` additionally attaches the last 16 KiB of that file and needs `--include-diagnostics`. Dotenv files are refused. The CLI never reads source code or shell history.

### Redaction

Keys, bearer tokens, cookies, URLs with credentials and secret-looking assignments are redacted before sending, and the server redacts again. Use `--dry-run` to see the redacted report first.

### Retrying safely

The idempotency key is derived from the report text, so sending the same report again is recorded once. Set `--idempotency-key` yourself to control that.

## tose feedback status

Check a report you sent earlier.

```bash
tose feedback status <feedback_id>
```

## Result

The command prints one JSON envelope with `--json`:

| Field | Meaning |
|-------|---------|
| `feedback_id` | ID to pass to `tose feedback status` |
| `status` | State of the report, for example `pending` or `rejected` |
| `duplicate_of` | ID of an earlier report this one duplicates, when TOSE found one |
| `issue_url` | Link to the tracker issue |

A queued report has `status: "pending"` and no `issue_url`. The URL appears only once the server confirms the issue exists, so check again later with `tose feedback status`.

A report with status `rejected` exits with code `8`.

## Related

- [Commands overview](/commands/overview)
- [Authentication](/api/authentication)
