# Configuration

TOSE CLI uses two configuration files: a global config and a per-directory context file.

## Global Configuration

Located at `~/.tose/config.json`, this file stores your credentials and global preferences.

### Structure

```json
{
  "apiKey": "tose_sk_xxxxxxxxxxxx",
  "defaultWorkspace": "my-workspace",
  "activeWorkspace": "my-workspace",
  "activeProject": "my-app"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | string | Your TOSE API key (starts with `tose_sk_`) |
| `defaultWorkspace` | string | Default workspace slug (set during `tose login`) |
| `activeWorkspace` | string | Active workspace (set via `tose use`) |
| `activeProject` | string | Active project (set via `tose use`) |

### Managing Config

**Login (creates config):**

```bash
tose login
```

**Logout (clears config):**

```bash
tose logout
```

**Set active project:**

```bash
tose use my-workspace/my-app
```

**Clear active project:**

```bash
tose use --clear
```

**View current config:**

```bash
cat ~/.tose/config.json
```

## Project Context File

Located at `.tose.json` in your project directory. Created by `tose init` or `tose up`.

### Structure

```json
{
  "workspace": "my-workspace",
  "project": "my-app"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `workspace` | string | Workspace slug |
| `project` | string | Project slug |

### Creating Context

**Via init:**

```bash
tose init
```

**Via up (auto-creates):**

```bash
tose up
```

::: tip Version Control
You can commit `.tose.json` to share the project link with your team, or add it to `.gitignore` for individual configurations.
:::

## Environment Variables

TOSE CLI respects these environment variables, which override config file values:

| Variable | Description | Example |
|----------|-------------|---------|
| `TOSE_API_KEY` | Override API key | `tose_sk_xxxxxxxxxxxx` |
| `TOSE_API_URL` | Override API base URL | `https://api-v2.tose.sh` |
| `TOSE_WORKSPACE` | Override workspace slug | `my-workspace` |
| `TOSE_PROJECT` | Override project slug | `my-app` |

### Usage in CI/CD

```yaml
# GitHub Actions
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install TOSE CLI
        run: npm install -g @tosesh/tose
      - name: Deploy
        env:
          TOSE_API_KEY: ${{ secrets.TOSE_API_KEY }}
          TOSE_WORKSPACE: my-workspace
          TOSE_PROJECT: my-app
        run: tose deploy
```

### Shell Aliases for Multiple Accounts

```bash
# ~/.bashrc or ~/.zshrc
alias tose-personal='TOSE_API_KEY=tose_sk_personal tose'
alias tose-work='TOSE_API_KEY=tose_sk_work tose'
```

## Resolution Priority

When TOSE CLI needs a value, it checks these sources in order:

### API Key
1. `--api-key` flag
2. `TOSE_API_KEY` environment variable
3. `~/.tose/config.json` → `apiKey`
4. Interactive prompt

### Workspace
1. Positional argument (`tose deploy ws/proj`)
2. `--workspace` flag
3. `TOSE_WORKSPACE` environment variable
4. `.tose.json` → `workspace`
5. `~/.tose/config.json` → `activeWorkspace`
6. `~/.tose/config.json` → `defaultWorkspace`
7. Interactive prompt

### Project
1. Positional argument (`tose deploy ws/proj`)
2. `--project` flag
3. `TOSE_PROJECT` environment variable
4. `.tose.json` → `project`
5. `~/.tose/config.json` → `activeProject`
6. Interactive prompt

## Security Best Practices

### Never Commit API Keys

```bash
# .gitignore
.tose/
```

### Use Environment Variables in CI/CD

```bash
export TOSE_API_KEY=tose_sk_xxxxxxxxxxxx
tose deploy
```

### Set Proper File Permissions

```bash
chmod 700 ~/.tose
chmod 600 ~/.tose/config.json
```

## Troubleshooting

### Config File Not Found

```bash
mkdir -p ~/.tose
tose login
```

### Invalid API Key

```bash
# Reset and re-login
tose logout
tose login
```

### Wrong Workspace/Project

```bash
# Check current context
tose whoami

# Re-link project
tose init

# Or set active project
tose use my-workspace/correct-project
```

## Related Topics

- [Installation](/guide/installation) - Initial setup
- [Getting Started](/guide/getting-started) - First deployment
- [Environment Variables](/guide/environment) - Managing env vars
- [Commands Overview](/commands/overview) - All commands
