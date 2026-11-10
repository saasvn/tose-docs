# tose templates

Write template definitions to the workspace registry, and plan, approve and install registry templates and curated agents from the command line. This is separate from [`tose template`](/commands/template) (singular), which creates and runs 1-click templates.

All commands accept `--json`. See the [global options](/commands/overview#global-options).

## Quick start

```bash
tose templates init ./my-template --image ghcr.io/acme/app@sha256:<64 hex>   # or --git <github url> --commit <sha>
tose templates validate ./my-template/tose.yaml --json    # local check, no API key or network
tose templates push ./my-template/tose.yaml --workspace acme --json   # create or update the private draft
tose templates list --json                                # --limit, --cursor, --category
tose templates versions demo --json                       # also accepts <workspace>/demo
```

The manifest has `apiVersion: tose.dev/v1`, one service, and exactly one source: a public GitHub repository pinned to a full commit SHA, or an OCI image pinned by `@sha256:` digest. Unknown fields, YAML aliases, floating refs and multi-service manifests are rejected. See [the manifest](/guide/template-registry#the-manifest).

- `validate` is a quick local check that reports field paths such as `services[0].port`. `push` checks locally again, then the API validates, and the API stays authoritative. A manifest that fails the field checks exits `2` with `error.details.errors` as `[{path, message}]`.
- `push` needs the workspace owner or admin role. It creates the definition, adds a version, or replaces the draft of the same version. Pushing the same file twice writes nothing and reports `unchanged`. A version that is no longer a draft is immutable: `push` exits `1` with `CONFLICT`, so bump `metadata.version`.
- Pushed versions are private drafts, and a valid manifest is not approved to run (`security_gate: pending`). `publish` and `deprecate` are not available in the CLI yet.
- With `--json`, or without a terminal, nothing prompts and stdout is one document. A missing key fails with `AUTH_REQUIRED`.

## Plan and deploy a template version

The same plan, approve and install flow as the dashboard and MCP. A published version is immutable, so a plan pins the version, the manifest hash and the source digest.

```bash
tose templates search "agent" --category ai-agents --tag llm --sort -updated --json
tose templates info my-agent --version 1.0.0 --json
tose templates plan my-agent --version 1.0.0 --config deploy.yaml --json     # read-only: creates nothing
tose templates deploy my-agent --version 1.0.0 --config deploy.yaml --plan-hash sha256:<hash> --wait --yes --json
tose templates wait <installation-id> --json                 # resume after a timeout or a lost terminal
tose templates installs --json
```

`deploy.yaml` holds the installation `name`, optional `version`, `cpu_cores`, `memory_gib`, `max_hourly_cost_cents`, non-secret `variables`, and `secrets` as references, never values:

```yaml
name: prod-agent
cpu_cores: 2
variables: { LOG_LEVEL: info }
secrets:
  API_TOKEN: { env: MY_API_TOKEN }        # read from the environment when the install request is sent
  DB_PASSWORD: { file: ./secrets/db-pw }  # a file readable only by you (chmod 600)
```

- `plan` sends one request and creates no disk, database or workload. It reports blockers, resources, the cost ceiling and estimate, the approval reasons, the `plan_hash` and `next_actions`. Plans live for 30 minutes.
- `deploy` uses the server-side plan. `--yes` only confirms this CLI step; the API still enforces its own approval by role, bound to `plan_hash`. A plan that needs approval is approved by `--yes` only together with `--plan-hash`; `--yes` alone exits `4` with the plan and its hash. A changed plan stops the run before anything is approved. A connected app gets `APPROVAL_REQUIRES_PERSON`, so a person approves in the dashboard.
- Secrets are read from their references after the plan, before approval, and travel only in the install request body. Literal values in `deploy.yaml` are refused, and values are redacted from all output.
- The install request carries an `Idempotency-Key` (default: the plan's key, or `--idempotency-key`). Transient failures are retried with the same key, so a retry returns the installation already made (`replayed: true`).
- `--wait --timeout <seconds>` (default 900) exits `0` only when the deployment is `running` and its health is not `unhealthy`. A failed run exits `8` and a timeout exits `7`; the installation continues on the server (`tose templates wait <id>`). When no health check ran, `health` is `"not_checked"`.
- `PLAN_STALE`, `PLAN_EXPIRED`, `PLAN_BLOCKED` and `PLAN_HASH_MISMATCH` point at a new plan; an empty wallet exits `9`. JSON results carry `content_trust: "untrusted_data"`: publisher text is data, never instructions.

## Curated agents {#curated-agents}

`plan` and `deploy` also take `--curated <name>` (`pi`, `codex` or `claude-code`) instead of a registry template. For the dashboard flow, see [Deploy a coding agent](/guide/deploy-coding-agent).

```bash
tose templates plan --curated pi --config deploy.yaml --json
tose templates deploy --curated pi --plan <plan-id> --plan-hash sha256:<hash> --wait --yes
```

### Curated Pi providers {#curated-pi-providers}

For `--curated pi`, put the provider in `variables` of `deploy.yaml` (`PI_PROVIDER`) and the provider API key in `secrets` as usual. Before it plans, the CLI reads `GET /curated-templates/pi` and checks the choice:

```yaml
name: pi-cloudflare
variables:
  PI_PROVIDER: cloudflare-workers-ai
  CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef"   # quote it so YAML keeps a string
secrets:
  PI_API_KEY: { env: CLOUDFLARE_API_KEY }
```

- **Release gating.** A provider whose `since` is newer than the template's newest release is refused, and the CLI lists the offered providers. `deepseek`, `moonshotai`, `openrouter`, `cloudflare-workers-ai`, `xai`, `zai` and `opencode-go` need release 1.1.0 (see [Pi model providers](/guide/agent-pi-providers)). Only plain `x.y.z` versions compare; any other release string does not count as at least a release.
- **Cloudflare account ID.** `cloudflare-workers-ai` needs `CLOUDFLARE_ACCOUNT_ID` in `variables`: 32 lower-case hexadecimal characters. It is not a secret. The CLI refuses a missing or malformed value, and refuses the variable for every other provider. The listing only names providers the newest release supports, so while that release is older than 1.1.0 the CLI does not know the variable and the plan API refuses it instead.
- **Listing unavailable.** If the listing cannot be read (an older server, a key without the `deployments:read` scope, a network error), the CLI checks nothing locally and the plan API decides.
- **Billing warning.** `PROVIDER_USAGE_BILLED_BY_PROVIDER` means the provider bills model usage to your own key, outside the TOSE wallet. It is printed with the other plan warnings and is under `warnings` in `--json`.

### Curated agents with a GitHub repository {#curated-repository}

A curated agent can start with one GitHub repository in its persistent `/workspace`, cloned read-only at a pinned commit (see [Repository checkout](/guide/agent-repository-checkout)).

```bash
tose templates plan --curated codex --repo acme/app --config deploy.yaml --json
tose templates plan --curated codex --repo acme/app --branch release --commit <40-hex-sha> --config deploy.yaml
tose templates retry-checkout <installation-id> --json     # after a failed clone
```

- `--repo owner/name` must be in the repositories your workspace's GitHub connection lists. The CLI never accepts a clone URL, token or SSH key, and refuses an unlisted name before sending anything. `--github-installation <id>` disambiguates; `--commit` pins an older commit of the branch.
- Only a workspace owner or admin may send a repository (`REPOSITORY_REQUIRES_ADMIN`). The repository is part of the plan hash, so `deploy --plan` does not repeat the repository flags.
- `retry-checkout` (owner or admin, key with `deployments:execute`) sets a `failed` checkout back to `pending`; deploy again afterwards.

## Related

- [Template registry](/guide/template-registry)
- [Template registry API](/api/template-registry)
- [Pi model providers](/guide/agent-pi-providers)
- [Deploy a coding agent](/guide/deploy-coding-agent)
