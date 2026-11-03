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
tose template resume demo --wait --json                # issue a token and resume a suspended Dewee/GoClaw instance
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

`tose template env set` refuses a value that is the masked placeholder (`***` or `********`) and sends nothing (`VALIDATION_ERROR`, exit `2`), so a copied listing cannot overwrite a real value. See [Masked values for workspace members](/commands/env#masked-values-for-workspace-members).

### Editing a secret

In the dashboard, the edit form shows a secret's value blank. Leave the field blank and save to keep the stored value. Enter a value to replace it. Through the API and the CLI there is no "keep" shortcut: a `POST .../envs` with an empty `value` stores the empty value, so only send the keys you want to change.

## tose template info

Show a template instance, its links and its image versions.

```bash
tose template info <slug>
```

The `Image:` block shows:

| Line | Meaning |
|------|---------|
| `Deployed` | The image of the last deployment, or `none yet` |
| `Configured` | The image stored on the template. This is what `--mode image` runs, and the value `--expected-image` is compared with |
| `Source` | Where the stored image came from, when the API reports it |
| `Available` | The catalog version, or `no catalog version` |

When the catalog version differs from the configured image, the CLI says an update is available and prints the `--upgrade` command. It also prints the rollback caveat the API sends. With `--json`, the same data is under `data.image`.

## tose template deploy

Deploy a template instance.

### Synopsis

```bash
tose template deploy <slug> [--mode <mode>] [--upgrade | --rollback <deployment_id>] [--expected-image <image>] [--wait] [--timeout <duration>]
```

### Options

| Option | Description |
|--------|-------------|
| `--mode <mode>` | `image` or `build`. Default: `image` |
| `--upgrade` | Move to the catalog version. Sends `image_source=catalog` and stores that image |
| `--rollback <deployment_id>` | Run the image of an earlier deployment again and store it, so later deploys keep running it until you `--upgrade` or set a new image. Asks for confirmation; without a terminal, or with `--json` or `--non-interactive`, it needs `--yes` (otherwise exit `4`) |
| `--expected-image <image>` | Fail with a conflict, and deploy nothing, if the configured image is no longer this one. Copy it from the `Configured:` line of `tose template info` |
| `--wait` | Poll until the rollout finishes |
| `--timeout <duration>` | How long `--wait` may take, such as `90s` or `15m`. Default: `15m` |

- `--upgrade`, `--rollback` and `--expected-image` need `--mode image`. Combined with `--mode build` the command exits `2` and changes nothing.
- `--upgrade` and `--rollback` cannot be combined.
- `--rollback` takes the ID of a deployment of this template that ran, for example the `Deployment ID:` line printed by an earlier `tose template deploy`, or the list in the [Templates API](/api/templates#deployments). An empty ID is refused.
- Some templates ignore these options. If the API did not apply one, the CLI reports an error naming the option and the deployment it started anyway, instead of saying the option worked.
- Warnings from the API are printed. With `--json` they are in `data.warnings`.

```bash
tose template info demo                                        # note the Configured: image
tose template deploy demo --upgrade --expected-image registry.example.com/app:1.4.0 --wait
tose template deploy demo --rollback <deployment_id> --yes --wait
```

### Which image runs

`--mode image` runs the image stored on the template. A plain deploy does not replace it with the catalog default, and every template that existed before this behavior counts as custom, so nothing is upgraded implicitly. A template created from the catalog starts with the catalog image stored. When the catalog has a different version, the API reports it in `warnings` and `tose template info` shows it as an available update. Use `--upgrade` to move to it. The same options exist in the [Templates API](/api/templates#deploy-template) as `image_source=catalog`, `rollback_to` and `expected_image`.

::: warning Rollback does not undo your data
`--rollback` runs an older image again. It does **not** roll back the database schema or data. If the newer version already migrated them, the older image may fail or misread them. Restore a backup together with the older image.
:::

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

## tose template resume

Issue a gateway token and resume a suspended Dewee/GoClaw instance. Use it when billing resumed the template but left it without a live gateway token.

### Synopsis

```bash
tose template resume <slug> [--wait] [--timeout <duration>]
```

- It needs the same workspace role as `tose template deploy`.
- Templates without a gateway answer `400`. Use [`tose template deploy`](#tose-template-deploy) for them.
- `--wait` and `--timeout` behave as they do for `deploy`, including the [exit codes](#exit-codes-with-wait).

::: warning Clients must switch to the new token
After a resume, clients must use the new gateway token, and existing sessions end. The CLI prints this warning, and with `--json` it is also in `warnings`. If an accepted resume fails while waiting, the same warning is in the error details.
:::

```bash
tose template resume demo --wait --json
```

## Suspended templates

A suspended template refuses `deploy` and `resume` while the wallet is empty. These refusals are reported with a stable code:

| Response | CLI result |
|----------|------------|
| `402 INSUFFICIENT_BALANCE` | Exit `9`. The billing link is a next action, and the template stays suspended. Top up, then run the command again |
| `409` that raced a suspension | `retryable`. Nothing was started. The retry command is a next action and keeps your flags, except credentials (`--api-key`) and `--yes` |
| `409` for a deployment already in progress | Not retryable. The next action is [`tose template info`](#tose-template-info) |
| `409` for a resume of a template that is not suspended | Not retryable. The next action is [`tose template deploy`](#tose-template-deploy) |

## AI provider usage (BYOK)

Templates that call an AI provider (Gemini, OpenAI and others) use your own provider key. The provider bills that usage. The TOSE wallet is charged only for the infrastructure, which is the estimated TOSE charge shown by `tose template catalog`.

## Related

- [Templates API](/api/templates)
- [Environment Variables](/guide/environment)
- [Pricing](/guide/pricing)
- [Persistent Disks](/guide/persistent-disks)
- [Dewee template runbook](/guide/dewee-template)
