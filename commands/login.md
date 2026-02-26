# tose login / logout / whoami

Manage authentication for TOSE CLI.

## tose login

Save and verify your API key.

### Synopsis

```bash
tose login [--api-key <key>]
```

### Description

The `tose login` command authenticates you with the TOSE platform. It validates your API key, saves it to `~/.tose/config.json`, and optionally sets a default workspace.

### Usage

**Interactive login:**

```bash
$ tose login

? Enter your TOSE API key: tose_sk_xxxxxxxxxxxx
✓ API key verified
? Select default workspace:
  ❯ my-workspace
    team-workspace
Default workspace: my-workspace
Logged in! API key saved to ~/.tose/config.json
```

**Login with API key flag:**

```bash
$ tose login --api-key tose_sk_xxxxxxxxxxxx

✓ API key verified
Default workspace: my-workspace
Logged in! API key saved to ~/.tose/config.json
```

**Login via environment variable:**

```bash
$ TOSE_API_KEY=tose_sk_xxxxxxxxxxxx tose login

✓ API key verified
Logged in! API key saved to ~/.tose/config.json
```

### JSON Output

```bash
$ tose login --api-key tose_sk_xxx --json
```

```json
{
  "success": true,
  "message": "Logged in"
}
```

### Notes

- API key must start with `tose_sk_`
- Key is validated by calling the TOSE API before saving
- If you have multiple workspaces, you'll be prompted to choose a default

---

## tose logout

Remove all stored credentials.

### Synopsis

```bash
tose logout
```

### Description

Clears all data from `~/.tose/config.json`, including API key, default workspace, and active project settings.

### Usage

```bash
$ tose logout

Logged out. Credentials removed from /Users/you/.tose/config.json
```

### JSON Output

```bash
$ tose logout --json
```

```json
{
  "success": true,
  "message": "Logged out"
}
```

---

## tose whoami

Show current user, workspaces, and active project.

### Synopsis

```bash
tose whoami
```

### Description

Displays information about the currently authenticated user, including all accessible workspaces with roles, the active project (set via `tose use`), and the linked project (from `.tose.json`).

### Usage

```bash
$ tose whoami

Workspaces:
  My Workspace (my-workspace) admin
  Team Workspace (team-ws) member

Active project: my-workspace/my-app

Linked project: my-workspace/my-app (.tose.json)
```

### JSON Output

```bash
$ tose whoami --json
```

```json
{
  "success": true,
  "data": {
    "workspaces": [
      {
        "id": "ws_abc123",
        "name": "My Workspace",
        "slug": "my-workspace",
        "role": "admin"
      }
    ],
    "activeProject": {
      "workspace": "my-workspace",
      "project": "my-app"
    },
    "linkedProject": {
      "workspace": "my-workspace",
      "project": "my-app"
    }
  }
}
```

## Getting Your API Key

1. Log in to [TOSE Dashboard](https://tose.sh)
2. Navigate to **Settings** > **API Keys**
3. Click **Create New API Key**
4. Copy the key (starts with `tose_sk_`)

::: warning Keep Your API Key Safe
Never commit your API key to version control. TOSE CLI stores it in `~/.tose/config.json` with restricted permissions.
:::

## Related Commands

- [`tose init`](/commands/init) - Link directory to a project
- [`tose use`](/commands/init#tose-use) - Set active project
