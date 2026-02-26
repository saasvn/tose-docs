# tose init / use

Link your project directory and set active context.

## tose init

Link the current directory to a TOSE workspace and project.

### Synopsis

```bash
tose init [--workspace <slug>] [--project <slug>] [-y]
```

### Description

Creates a `.tose.json` file in the current directory that links it to a specific workspace and project. This file is used by all other commands to determine which project to operate on.

### Options

| Option | Description |
|--------|-------------|
| `--workspace <slug>` | Specify workspace |
| `--project <slug>` | Specify project |
| `-y, --yes` | Skip confirmation prompts |

### Usage

**Interactive setup:**

```bash
$ tose init

Using workspace: my-workspace
Fetching projects...
? Select project:
  ❯ Create new project
    my-app
    api-server

? Project name: my-new-app
Creating project...
✓ Project "my-new-app" created

Linked! Created .tose.json
  workspace: my-workspace
  project:   my-new-app
```

**With existing project:**

```bash
$ tose init --workspace my-workspace --project my-app

Linked! Created .tose.json
  workspace: my-workspace
  project:   my-app
```

**Re-linking (already initialized):**

```bash
$ tose init

This directory is already linked to my-workspace/my-app
? Re-link to a different project? Yes

Using workspace: my-workspace
Fetching projects...
...
```

### JSON Output

```bash
$ tose init --workspace my-ws --project my-app --json
```

```json
{
  "success": true,
  "data": {
    "workspace": "my-ws",
    "project": "my-app"
  }
}
```

### The .tose.json File

After running `tose init`, a `.tose.json` file is created:

```json
{
  "workspace": "my-workspace",
  "project": "my-app"
}
```

::: tip
Add `.tose.json` to your repository so your team shares the same project context. Or add it to `.gitignore` if each team member uses different projects.
:::

---

## tose use

Set the active project globally (across all directories).

### Synopsis

```bash
tose use [workspace/project]
tose use [project]
tose use --clear
```

### Description

Sets a global active project that applies when no `.tose.json` is present and no `--workspace`/`--project` flags are provided. Unlike `tose init` which creates a per-directory link, `tose use` sets a global default.

### Options

| Option | Description |
|--------|-------------|
| `--clear` | Clear the active project |

### Usage

**Set active project with workspace/project format:**

```bash
$ tose use my-workspace/my-app

Using workspace: my-workspace
Active project set to my-workspace/my-app
```

**Set active project (workspace from config):**

```bash
$ tose use my-app

Active project set to my-workspace/my-app
```

**Interactive selection:**

```bash
$ tose use

? Select workspace:
  ❯ my-workspace
? Select project:
  ❯ my-app
    api-server

Active project set to my-workspace/my-app
```

**Clear active project:**

```bash
$ tose use --clear

Active project cleared
```

### JSON Output

```bash
$ tose use my-workspace/my-app --json
```

```json
{
  "success": true,
  "data": {
    "workspace": "my-workspace",
    "project": "my-app"
  }
}
```

## init vs use

| Feature | `tose init` | `tose use` |
|---------|-------------|------------|
| Scope | Current directory only | Global (all directories) |
| Storage | `.tose.json` in project dir | `~/.tose/config.json` |
| Priority | Higher (checked first) | Lower (fallback) |
| Use case | Per-project linking | Quick switching between projects |

## Related Commands

- [`tose login`](/commands/login) - Authenticate first
- [`tose up`](/commands/up) - Deploy (auto-inits if needed)
- [`tose whoami`](/commands/login#tose-whoami) - Check current context
