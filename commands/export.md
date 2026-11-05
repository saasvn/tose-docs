# tose export

Print a read-only, secret-free inventory of a project for migration planning.

::: warning Not a backup, not a migration
The export lists what exists and what is still unproven. It does not back anything up and never reports a migration as done. Back up databases and volumes separately.
:::

## Synopsis

```bash
tose export [project] --workspace <slug>
tose export web --workspace acme --json > export.json
```

Calls `GET /api/workspaces/{slug}/projects/{project_slug}/export` and prints the `tose.dev/project-export/v1` document. The API key needs the `projects:export` scope; without it the command exits with `3` (`INSUFFICIENT_SCOPE`). A missing project exits with `6`.

## What it contains

- `resources`, `domains`, `volumes`, and the running image only if it is pinned by OCI digest.
- `env_keys` and `env_refs`: variable **names**, whether each is secret, and `value_recoverable` (whether TOSE can still decrypt the stored value). Values are never exported.
- `databases[].backup_refs` (and `volumes[].backup_refs`, always empty because TOSE takes no volume backups): backup ID, time, size, SHA-256, format, retention and the admin-only `download_path`. No storage key or credential is included. A backup without `sha256` was taken before checksums were recorded.
- `blockers`: what the export cannot prove, for example `database_backup_unavailable`, `database_restore_unverified`, `volume_backup_unavailable`, `env_values_unrecoverable`.
- `migration`: the `tose.dev/data-migration/v1` plan with five steps and the evidence each needs. The source keeps serving and is kept if a step fails. `status` is always `not_started`; the CLI refuses an export that says otherwise.
- `rollback`: what a rollback restores. See [rollback receipts](/commands/deployment#rollback-receipt).

Exports from older servers without these fields still work; the fields are simply absent.

## Checksum evidence

The API sends `X-Tose-Export-Sha256`, the SHA-256 of the response body. With `--json`, `data.export_checksum` reports the hash the CLI computed over the exact bytes:

| `status` | Meaning |
|----------|---------|
| `verified` | Matches the server's header. Safe to record as `record_export` evidence. |
| `absent` | The server sent no header. The hash is computed locally only and is **not** server-verified. |
| `malformed_header` | The header is not a SHA-256. Treat as unverified. |

`sha256` covers the exact bytes the server sent, not the filtered `data` the CLI prints. To keep a file that hashes to it, download the export from the API directly. A mismatch is an error (exit `1`) and prints no export content.

## Related

- [`tose deployment rollback`](/commands/deployment#tose-deployment-rollback)
- [`tose db`](/commands/db)
