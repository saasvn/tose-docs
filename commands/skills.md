# tose skills

List and install agent skills from the public TOSE catalogue.

A skill is a short, versioned set of instructions that teaches an AI agent how to use TOSE safely. It is not a deployment template and it runs nothing. See [Skills: instructions for agents](/mcp/skills) for what the skills contain.

::: tip No login needed
The catalogue is public (`GET /api/skills`), so both commands work without an API key.
:::

## tose skills list

List the skills in the catalogue.

### Synopsis

```bash
tose skills list
```

### JSON Output

```bash
$ tose skills list --json
```

## tose skills install

Download a skill and write its files to your skills folder.

### Synopsis

```bash
tose skills install <name>[@version] [--dir <path>] [--global] [--force]
```

### Arguments and options

| Argument / option | Description |
|-------------------|-------------|
| `<name>` | Skill name, for example `safe-rollback` |
| `@version` | Optional. Pin a version, for example `safe-rollback@1.0.0` |
| `--dir <path>` | Install into this skills folder instead of the default |
| `--global` | Install into `~/.claude/skills` instead of `./.claude/skills` |
| `--force` | Replace a skill that is already installed |

### Usage

```bash
# Into ./.claude/skills/safe-rollback
tose skills install safe-rollback

# Pin a version and install for every project
tose skills install safe-rollback@1.0.0 --global
```

### How it stays safe

- **Verified first.** Every file is downloaded and checked against the `sha256:` digest and the size in the catalogue **before** anything is written.
- **Refused whole.** A skill is rejected, and nothing is installed, when a digest is missing or malformed, a file does not match, a path is unsafe (`..`, absolute or with a backslash), or a file URL points to another origin. Redirects are not followed.
- **Nothing is executed.** Files are written as plain text. The CLI never runs anything inside a skill.
- **No silent overwrite.** An installed skill is left alone unless you pass `--force`.

An integrity failure exits with code `1` and `error.code` `SKILL_INTEGRITY`:

```json
{
  "schema_version": "1",
  "status": "error",
  "success": false,
  "error": {
    "code": "SKILL_INTEGRITY",
    "message": "…",
    "request_id": null,
    "retryable": false,
    "details": null,
    "doc_url": null
  },
  "next_actions": []
}
```

::: warning Digests are not signatures
A digest proves the download matches the catalogue. Both come from the same server, so trust rests on reaching the official TOSE API host over HTTPS.
:::

### Versions

The catalogue serves one version of each skill. Asking for another version fails with `NOT_FOUND`, and `error.details.available_version` tells you which one exists.

## Related

- [Skills: instructions for agents](/mcp/skills)
- [`tose deployment rollback`](/commands/deployment#tose-deployment-rollback)
