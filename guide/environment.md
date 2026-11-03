# Environment Variables

Manage environment variables for your TOSE deployments.

## Overview

TOSE CLI provides a complete set of commands for managing environment variables:

- **`tose env list`** - View all variables
- **`tose env set`** - Set variables from the command line
- **`tose env rm`** - Remove variables
- **`tose env push`** - Upload from a local .env file
- **`tose env pull`** - Download to a local .env file

## Quick Start

### Set Variables

```bash
$ tose env set NODE_ENV=production PORT=3000 DATABASE_URL=postgres://...

✓ Set 3 variable(s)
```

### View Variables

```bash
$ tose env list

KEY                          VALUE                                    SECRET
DATABASE_URL                 postgresql://user:pass@host/db           no
NODE_ENV                     production                               no
PORT                         3000                                     no
API_KEY                      ****...                                  yes
```

### Push from .env File

```bash
$ tose env push .env.production

✓ Pushing 8 variables to my-app...
✓ 8 variables pushed
```

### Pull to Local File

```bash
$ tose env pull .env.local

✓ Fetching environment variables...
Pulled 8 variables to .env.local
```

## .env File Format

TOSE CLI parses standard `.env` file format:

```bash
# Comments are ignored
KEY=value
ANOTHER_KEY=value with spaces

# Quoted values (quotes are stripped)
QUOTED="value in double quotes"
SINGLE='value in single quotes'

# URLs and special characters work fine
DATABASE_URL=postgresql://user:pass@host:5432/db
API_URL=https://api.example.com/v1
```

## Push vs Set

| Feature | `tose env push` | `tose env set` |
|---------|-----------------|----------------|
| Source | .env file | Command-line args |
| Multiple values | All from file at once | Space-separated pairs |
| Replace mode | `--replace` flag available | Always merge |
| Best for | Bulk import | Quick updates |

## Merge vs Replace

By default, `tose env push` uses **merge** mode:
- New keys are added
- Existing keys are updated
- Keys not in the file are preserved

With `--replace`, all existing variables are removed and replaced with the file contents:

```bash
# Merge (default) - preserves existing vars
tose env push .env.production

# Replace - removes all vars, sets only what's in file
tose env push .env.production --replace
```

## Sensitive Value Masking

TOSE CLI automatically masks sensitive values in the `tose env list` output. Keys containing these patterns are masked:

- `PASSWORD`
- `SECRET`
- `TOKEN`
- `KEY` (API_KEY, PRIVATE_KEY, etc.)

```
KEY                   VALUE                SECRET
DATABASE_URL          postgresql://...     no
API_KEY               ****...              yes
JWT_SECRET            ****...              yes
PORT                  3000                 no
```

Long values (>50 chars) are also truncated with `...`.

### Masked values for workspace members

Workspace `member`s do not receive environment values: the API returns `********` (project env listing) or `***` (template env listing) instead. Only `admin` and `owner` see them. The CLI never writes or sends these placeholders as values:

- `tose env pull` skips masked keys (`skipped_masked` with `--json`), keeps any value the local file already holds for them, and fails without writing when every value is masked.
- `tose env push`, `tose env set` and `tose template env set` refuse a value that is a masked placeholder and send nothing.
- `tose up`, when you choose to push an env file at its prompt, stops before sending any value if the file holds a masked placeholder.

See [`tose env`](/commands/env#masked-values-for-workspace-members) for details.

## Workflows

### Development to Production

```bash
# Develop locally with .env
echo "NODE_ENV=development" > .env
echo "PORT=3000" >> .env

# Push production config
tose env push .env.production

# Verify
tose env list
```

### Sync Across Projects

```bash
# Pull from staging
tose env pull .env.staging --workspace my-ws --project staging

# Push to production
tose env push .env.staging --workspace my-ws --project production
```

### CI/CD

```bash
# Set secrets in CI pipeline
tose env set \
  DATABASE_URL="$DATABASE_URL" \
  API_KEY="$API_KEY" \
  JWT_SECRET="$JWT_SECRET"
```

### Apply Changes

After changing environment variables, redeploy to apply:

```bash
tose env set NODE_ENV=production
tose redeploy
```

## File Organization

Recommended `.env` file structure:

```
.env                  # Default/development
.env.local           # Local overrides (gitignored)
.env.production      # Production values
.env.staging         # Staging values
```

Add sensitive files to `.gitignore`:

```bash
# .gitignore
.env.local
.env*.local
.env.production
```

## Related Commands

- [`tose env`](/commands/env) - Full command reference
- [`tose up`](/commands/up) - Deploy (auto-pushes env vars)
- [`tose redeploy`](/commands/deploy#tose-redeploy) - Apply env changes
- [`tose configuration`](/guide/configuration) - Config file reference
