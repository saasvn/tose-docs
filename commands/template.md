# tose template

Create and run 1-click templates (GoClaw, Multix) from the command line.

All commands accept the [global options](/commands/overview#global-options), including `--json`.

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

List the templates you can create. Each entry shows its key, port, CPU and RAM, storage, whether it generates credentials (presence only, never the values), paid or unlocked state, and the estimated TOSE charge. Fields appear only when the API sends them.

```bash
tose template catalog
```

## tose template create

Create a template instance.

### Synopsis

```bash
tose template create <name> [--template <key>]
```

### Options

| Option | Description |
|--------|-------------|
| `--template <key>` | Template key from `tose template catalog`. Default: `goclaw` |
| `--type <key>` | Alias of `--template` |

- The key is checked against the live catalog. An unknown key exits `2` and creates nothing.
- Without `--template`, `goclaw` is used. In a terminal the CLI offers the catalog to pick from.
- The output states that AI provider usage is [BYOK](#ai-provider-usage-byok) and is not billed to your wallet.

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
| `--env-file <path>` | Reads `KEY=VALUE` lines from a file. The CLI refuses the file unless it is `chmod 600` (not readable by group or others) |
| `--env-stdin` | Reads `KEY=VALUE` lines from standard input, for example from a secret store |
| Bare key name (`<KEY>`) | Asks for the value at a masked prompt. Refused without a terminal |

An inline `KEY=VALUE` still works, but only use it for non-secret configuration. The CLI prints a warning because the value lands in shell history and process lists.

- Values you enter are masked in error messages and in `--json` output.
- `tose template env list` never prints secret values.

## tose template deploy

Deploy a template instance.

### Synopsis

```bash
tose template deploy <slug> [--wait] [--timeout <duration>]
```

### Options

| Option | Description |
|--------|-------------|
| `--wait` | Poll until the rollout finishes |
| `--timeout <duration>` | How long `--wait` may take, such as `90s` or `15m`. Default: `15m` |

### Exit codes with `--wait`

| Code | Meaning |
|------|---------|
| `0` | The rollout finished |
| `8` | The rollout failed or was terminated |
| `7` | The wait timed out. The rollout may still finish on the server |

The full list is in [Exit Codes](/commands/overview#exit-codes).

### Links and secrets

- Dashboard, MCP, API and docs links come from the API response. The CLI never builds them from the slug.
- Generated credentials and the one-time bootstrap secret are never printed. Open the dashboard link and complete the bootstrap sign-in there.
- A wallet shortage, a missing TLS domain or a failed disk provisioning is reported with the step to take next.

## AI provider usage (BYOK)

Templates that call an AI provider (Gemini, OpenAI and others) use your own provider key. The provider bills that usage. The TOSE wallet is charged only for the infrastructure, which is the estimated TOSE charge shown by `tose template catalog` and `tose template create`.

## Related

- [Environment Variables](/guide/environment)
- [Pricing](/guide/pricing)
- [Persistent Disks](/guide/persistent-disks)
