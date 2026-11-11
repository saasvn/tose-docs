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
tose templates info my-agent --template-version 1.0.0 --json
tose templates plan my-agent --template-version 1.0.0 --config deploy.yaml --json     # read-only: creates nothing
tose templates deploy my-agent --template-version 1.0.0 --config deploy.yaml --plan-hash sha256:<hash> --wait --yes --json
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

A curated agent can start with one GitHub repository in its persistent `/workspace`, cloned at a pinned commit (see [Repository checkout](/guide/agent-repository-checkout)). It is read-only unless you pass `--repo-push`.

```bash
tose templates plan --curated codex --repo acme/app --config deploy.yaml --json
tose templates plan --curated codex --repo acme/app --branch release --commit <40-hex-sha> --config deploy.yaml
tose templates plan --curated codex --repo acme/app --repo-push --repo-push-branches agent --workspace-disk-gib 20 --config deploy.yaml
tose templates retry-checkout <installation-id> --json     # after a failed clone
```

- `--repo owner/name` must be in the repositories your workspace's GitHub connection lists. The CLI never accepts a clone URL, token or SSH key, and refuses an unlisted name before sending anything. `--github-installation <id>` disambiguates; `--commit` pins an older commit of the branch.
- `--workspace-disk-gib 5|10|20|50` (curated agents only, default 5) sizes the agent's `/workspace` disk. The plan pins it and shows it as `Workspace:`; it cannot change after install, and storage is billed while the disk exists, also while the agent is stopped. Any other value is refused before anything is sent.
- `--repo-push` (with `--repo`) lets the agent push through the TOSE git proxy; it never holds a GitHub token. `--repo-push-branches all|agent` picks the branches: `all` (the default, including the default branch) or `agent` (only `tose/<installation slug>/...`). The plan shows the branch pattern and the proxy remote. Pushing needs the GitHub App permission `contents: write` (blocker `GITHUB_PERMISSION_MISSING`); a server without the git proxy answers `GIT_PROXY_NOT_CONFIGURED`, and the CLI suggests planning again without push.
- Only a workspace owner or admin may send a repository (`REPOSITORY_REQUIRES_ADMIN`). The repository, its push setting and the disk size are part of the plan hash, so `deploy --plan` does not repeat those flags and refuses ones that contradict the plan.
- `retry-checkout` (owner or admin, key with `deployments:execute`) sets a `failed` checkout back to `pending`; deploy again afterwards.

### Change the repository after install {#repo-set-remove}

An owner or admin (an API key with `deployments:execute`) can add a repository to an installed curated agent, turn push on or off, or remove its repositories, without a new plan. An agent can have [up to 10 repositories](/guide/agent-repository-checkout#several-repositories-per-agent): `repo set` with a repository the agent does not have yet **adds** it next to the others (the server no longer replaces the first one), and `repo remove` removes **all** of them. Removing a single repository is not in the CLI yet (saasvn/tose-cli#116); use the agent's **Repository** card. See [Attach or change an agent's repository after install](/guide/agent-repository-checkout#attach-or-change-an-agents-repository-after-install) for what happens in `/workspace`.

```bash
tose templates repo set <installation-id> --repo acme/app --yes                         # add, read-only
tose templates repo set <installation-id> --repo acme/app --push --push-branches agent --yes
tose templates repo remove <installation-id> --yes                                      # removes every repository; files stay in /workspace
```

- `repo set` picks `--repo` from the repositories your GitHub connection lists, like `plan`. `--commit` and `--github-installation` work as in `plan`.
- It replaces the settings as a whole: without `--push` the repository is read-only, so leaving `--push` out on an agent that pushes turns push off. `--push-branches all|agent` needs `--push`.
- When `--repo` names the current repository, unnamed settings keep their current values: the cloned branch, the GitHub App installation, the repository id (a different repository under the name is refused with `REPO_ID_CHANGED`) and, with `--push`, the push branches, so `--push` alone never widens an agent limited to its own branches. Another branch of a cloned repository is refused (`REPOSITORY_ALREADY_CLONED`; switch branches with git inside the agent), and so is `--commit`. For another repository, `--branch` defaults to its default branch and `--push-branches` to `all`.
- Both commands ask for confirmation, or need `--yes` in scripts. When the API answers `restart_required: true`, the command deploys the agent again in image mode, which restarts it and stops a running task. If that deploy is refused, the change stays saved and the command exits `8` with the `tose template deploy <slug> --mode image` to run.
- The output shows the new checkout (`pending` until the deployment clones or re-points it). With `--json` it is `{installation_id, repository, restart_required, deployment}`. Follow the restart with `tose templates wait <installation-id>`.
- API refusals keep their code with a next step: `REPOSITORY_CLONING`, `NOT_A_CLOUD_AGENT`, `INSTALLATION_DELETED`, `REPOSITORY_REQUIRES_PERSON`, `REPOSITORY_NOT_FOUND` (`repo remove` without a repository) and GitHub's `BRANCH_MISSING`, `PERMISSION_DENIED`, `GITHUB_PERMISSION_MISSING`, ...

## Related

- [Template registry](/guide/template-registry)
- [Template registry API](/api/template-registry)
- [Pi model providers](/guide/agent-pi-providers)
- [Deploy a coding agent](/guide/deploy-coding-agent)
