# tose template

Create and run 1-click templates (GoClaw, Multix) from the command line.

All commands accept `--json`. See the [global options](/commands/overview#global-options).

## Quick start

```bash
tose template catalog                                  # keys, resources, storage, estimated TOSE charge
tose template create demo --template multix --json     # --type is an alias; default is goclaw
tose template env set demo --env-file provider.env     # file must be chmod 600
printf 'GEMINI_API_KEY=%s\n' "$KEY" | tose template env set demo --env-stdin
tose template env set demo GEMINI_API_KEY              # bare key name: masked prompt in a terminal
tose template deploy demo --wait --json                # waits, then returns the links the API reports
```

## tose template catalog

List the templates you can create. Each entry shows its key, port, CPU and RAM. Storage, the names of generated credentials (never their values), paid or unlocked state and the estimated TOSE charge appear when the API sends them.

```bash
tose template catalog
```

## tose template create

Create a template instance.

### Synopsis

```bash
tose template create [name] [--template <key>]
```

### Options

| Option | Description |
|--------|-------------|
| `--template <key>` | Template key from `tose template catalog`. Default: `goclaw` |
| `--type <key>` | Alias of `--template` |

- The key is checked against the live catalog. An unknown key exits `2` and creates nothing.
- Without `--template`, `goclaw` is used. In a terminal the CLI offers the catalog to pick from.
- In terminal output, when the catalog provides it, the CLI states that AI provider usage is [BYOK](#ai-provider-usage-byok) and not billed to your wallet, and shows the estimated TOSE charge. The name is asked for in a terminal if you omit it.

## tose template env

Manage the environment variables of a template instance.

### Synopsis

```bash
tose template env set <slug> --env-file <path>
tose template env set <slug> --env-stdin
tose template env set <slug> <KEY>
tose template env set <slug> <KEY=VALUE>
tose template env list <slug>
tose template env rm <slug> <keys...> --yes
```

### Entering secrets safely

Use one of these for API keys and other secrets:

| Method | Behavior |
|--------|----------|
| `--env-file <path>` | Reads `KEY=VALUE` lines from a file. The CLI refuses a file that group or others can access, so use `chmod 600`. The check is skipped on Windows |
| `--env-stdin` | Reads `KEY=VALUE` lines from standard input, for example from a secret store |
| Bare key name (`<KEY>`) | Asks for the value at a masked prompt. Refused without a terminal, and with `--json` or `--non-interactive` (exit `2`, `INPUT_REQUIRED`) |

An inline `KEY=VALUE` still works, but only use it for non-secret configuration. The CLI prints a warning because the value lands in shell history and process lists.

- Values you enter are masked in error messages and in `--json` output.
- `tose template env list` never prints secret values.

### Which variables are secret

The `is_secret` flag you send is a request, not a guarantee. The server decides, and it can force the flag to `true`:

- A key that contains `dsn`, `encryption_key` or `connection_string` is always stored as a secret, even if the client sends `is_secret: false`. Matching ignores case and treats `-`, `.` and spaces like `_`, so `DATABASE_DSN` and `app-encryption-key` both match.
- A key listed in the template's `required_envs` in the catalog is always stored as a secret.
- The server masks these values (`***`) when it lists variables. When the server started with this behavior, a migration also flagged the rows that were already stored as non-secret.

The response of `env list` always reports the effective `is_secret`, so read it back instead of assuming the flag you sent.

### Who can read values

| Workspace role | Listing (`env list`, `GET .../envs`) | Reveal one value (`GET .../envs/{key}/reveal`) |
|----------------|--------------------------------------|------------------------------------------------|
| `member` | Keys only. Every value shows as `***` | Not allowed |
| `admin`, `owner` | Non-secret values in clear text. Secret values show as `***` | Allowed |

Changing variables (`set`, `rm`) also needs `admin` or `owner`.

### Editing a secret

In the dashboard, the edit form shows a secret's value blank. Leave the field blank and save to keep the stored value. Enter a value to replace it. Through the API and the CLI there is no "keep" shortcut: a `POST .../envs` with an empty `value` stores the empty value, so only send the keys you want to change.

## tose template deploy

Deploy a template instance.

### Synopsis

```bash
tose template deploy <slug> [--mode <mode>] [--wait] [--timeout <duration>]
```

### Options

| Option | Description |
|--------|-------------|
| `--mode <mode>` | `image` or `build`. Default: `image` |
| `--wait` | Poll until the rollout finishes |
| `--timeout <duration>` | How long `--wait` may take, such as `90s` or `15m`. Default: `15m` |

### Which image runs

`--mode image` runs the image stored on the template. It does not replace a custom image with the catalog default, and every template that existed before this behavior counts as custom, so nothing is upgraded implicitly. A template created from the catalog starts with the catalog image stored. When the catalog has a different version, the API reports it in a `warnings` array. Upgrading and rolling back are explicit options of the [Templates API](/api/templates#deploy-template) (`image_source=catalog`, `rollback_to`, `expected_image`); the CLI does not expose them yet.

Rolling back an image does not roll back the database schema or data.

### Exit codes with `--wait`

| Code | Meaning |
|------|---------|
| `0` | The rollout finished |
| `8` | The rollout failed, was cancelled or was terminated |
| `7` | The wait timed out. The rollout may still finish on the server |

### Links and secrets

- Dashboard, MCP, API and docs links come from the API response. The CLI never builds them from the slug.
- Generated credentials and the one-time bootstrap secret are never printed. Open the dashboard link and complete the bootstrap sign-in there.
- A wallet shortage, a missing TLS domain or a failed disk provisioning is reported with the step to take next.

## AI provider usage (BYOK)

Templates that call an AI provider (Gemini, OpenAI and others) use your own provider key. The provider bills that usage. The TOSE wallet is charged only for the infrastructure, which is the estimated TOSE charge shown by `tose template catalog`.

## Related

- [Templates API](/api/templates)
- [Environment Variables](/guide/environment)
- [Pricing](/guide/pricing)
- [Persistent Disks](/guide/persistent-disks)
- [Dewee template runbook](/guide/dewee-template)
