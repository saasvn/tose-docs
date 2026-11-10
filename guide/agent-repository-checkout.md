# GitHub repository for coding agents

A curated coding agent (**Pi**, **Codex** or **Claude Code**) can start with one of your GitHub repositories, private or public, already in its persistent `/workspace`. You pick the repository and the branch in the **Repository (optional)** card of the one-page deploy. You never paste a URL, a personal access token or an SSH key, and the agent never receives a GitHub credential. The checkout is read-only unless you [let the agent push](#let-the-agent-push-to-your-repository).

To install an agent, open **Template catalog** in the dashboard ([dashboard overview](/guide/getting-started#find-your-way-around-the-dashboard)).

::: warning Not yet verified on a live cluster
The checkout is implemented and covered by tests, but it has not yet been proven on a real cluster (tracked in saasvn/tose-app #588; follow-up hardening is in #621). Treat it as new: check the **Repository checkout** status after the first deploy.
:::

## What you need

- A GitHub App installation connected to the workspace (**Settings → GitHub**), with the repository allowed for it. Only repositories the workspace's own GitHub accounts allow are offered.
- A workspace **owner** or **admin** role. Anyone else who sends a repository gets `403 REPOSITORY_REQUIRES_ADMIN`.
- A curated agent plan. Registry template plans and upgrades take no repository.

## Choose a repository on the deploy page

The agent's deploy page has a **Repository (optional)** card. Choose **Add a GitHub repository** to open it. Leave it out and the agent starts with an empty workspace.

1. If no GitHub account is connected to the workspace, choose **Connect GitHub**. GitHub opens in a new tab: install the TOSE app on the account that owns the repository and allow that repository, then come back to this tab and choose **Check again**. Your answers on this page are kept.
2. If your GitHub account is connected but not to this workspace, choose **Attach** followed by the account's name. Only an owner or admin can attach an account.
3. Choose a **Repository** from the list (use the filter to search by `owner/name`; each entry shows **Private** or **Public**), then a **Branch**.
4. The card shows "`<repo>` on branch `<branch>` will be checked out." Choose **Remove repository** to go back to an empty workspace.
5. Optional: turn on **Let the agent push to this repository** and choose which branches it may push to. Push is off by default. See [Let the agent push to your repository](#let-the-agent-push-to-your-repository).

There is no free-form URL. A repository that is not in the list is refused.

## What the plan shows

When the page plans your inputs, TOSE reads the repository through the installation with a token limited to read-only access to that one repository's contents. The token is used once and revoked. The plan summary next to **Deploy** is then priced with the repository and lists any repository blocker before you deploy. The full plan, which a plan link opens (for example the link a member sends to an owner or admin), has a **Repository** section with:

| Field | Meaning |
|-------|---------|
| Repository and branch | The name you chose, and whether it is private. |
| **Commit** | The full commit SHA the branch pointed to when the plan was created. |
| **Checked out to** | `/workspace/<repo>`. |
| **TOSE access** | Read-only access to the repository contents (`contents:read`), which is what the clone uses. |
| **Push** | **On**, with the branches the agent may push to, or **Off**. |
| **On first start** | The effects of the bootstrap, in words. |

The plan's `curated.repository` section carries the same data: `installation_id`, `repo_id`, `full_name`, `private`, `branch`, `commit_sha`, `path`, `access` (`contents:read`), `effects` and, when the agent may push, `push`, `push_branches`, `push_branch_pattern` and `push_remote` ([below](#what-the-plan-shows-with-push)). It never contains a token or a URL with credentials.

**The branch moving later does not change an approved plan.** The pinned commit is what is cloned. Another commit or another repository is another plan, with another plan hash, that you approve again. The API lets a client pin an older commit of the branch with `commit_sha`, and the expected repository with `repo_id`.

## How the checkout works

```json
{
  "curated_template": "codex",
  "name": "My agent",
  "variables": {"CODEX_PROVIDER": "openai"},
  "repository": {"installation_id": 12345678, "full_name": "acme/app", "branch": "main"}
}
```

- The clone happens **before the agent starts**, in a separate one-shot bootstrap Job, not in the agent's pod. The Job uses the agent's own admitted image, has a short deadline, and has its own network policy that reaches only `github.com` on port 443.
- It uses a **short-lived, read-only** GitHub App token for that one repository. The token reaches the Job as a file that only the Job reads, is revoked when the Job ends, and never appears in a command line, an environment variable, a clone URL, a git config or a log.
- The **agent never receives a GitHub token or a reusable GitHub credential**. Without push, the `origin` URL stays `https://github.com/<owner>/<repo>.git`, and the agent can commit locally but **cannot push**. With push, `origin` points to the TOSE git proxy instead; see [Let the agent push to your repository](#let-the-agent-push-to-your-repository).
- The clone is the pinned commit with a shallow history (depth 50). Submodules and Git LFS objects are not fetched.
- A bootstrap that finishes is not run again, and a repeated run never overwrites work in an existing checkout.
- If `/workspace/<repo>` already holds a git checkout whose config has no credentials, it is left exactly as it is (dirty or not). A file, a symlink, a non-empty folder without `.git`, or a checkout whose git config holds credentials is refused with `WORKSPACE_NOT_EMPTY`.

## Let the agent push to your repository {#let-the-agent-push-to-your-repository}

An agent can push its commits back to the repository pinned at deploy. Push is **off by default**, and you choose it when you deploy (tose-app [#704](https://github.com/saasvn/tose-app/pull/704)).

### Set it up

1. **The GitHub App needs write access to contents.** The TOSE GitHub App must have the repository permission **Contents: Read and write**. The platform operator grants it in the App's settings on GitHub, and every GitHub account that installed the App must then accept the updated permission on GitHub. Until then, a plan with push is blocked with `GITHUB_PERMISSION_MISSING`, at plan, approve and install time.
2. **Turn push on.** In the **Repository (optional)** card, turn on **Let the agent push to this repository**. Like the repository itself, only a workspace owner or admin can plan it.
3. **Choose the branches.** By default the agent may push to **any branch, including the default branch**. Turn on **Only branches named tose/&lt;agent&gt;/…** to limit it to branches under `tose/<installation slug>/`, for example `tose/my-agent/fix-login`.

Through the API, send `push` and `push_branches` in `repository`:

```json
{
  "curated_template": "codex",
  "name": "My agent",
  "variables": {"CODEX_PROVIDER": "openai"},
  "repository": {"installation_id": 12345678, "full_name": "acme/app", "branch": "main", "push": true, "push_branches": "agent"}
}
```

- `push` is `false` when omitted, which keeps the read-only checkout exactly as before.
- `push_branches` is `all` (the default: any branch of that one repository, including the default branch) or `agent` (only `tose/<installation slug>/...`). Sending it without `push: true` is `422` at `repository.push_branches`.
- A server whose git proxy has no public `https` address refuses a plan with push with `503 GIT_PROXY_NOT_CONFIGURED`. Turn push off, or ask the platform operator.

### What the plan shows with push {#what-the-plan-shows-with-push}

Both choices are part of the plan hash, so a plan with push is a different plan from one without. `curated.repository` then also has:

| Field | Meaning |
|-------|---------|
| `push` | `true`. Absent when the agent may not push. |
| `push_branches` | `all` or `agent`. |
| `push_branch_pattern` | The branches the agent may push to: `*`, or `tose/<installation slug>/*`. |
| `push_remote` | The TOSE git proxy the checkout's `origin` points to, for example `https://api.tose.sh/api/git/<checkout_id>`. It carries no credential. |

`access` stays `contents:read`: it describes the token that clones the repository. The `effects` list says in words what pushing allows. With push on, the agent's network policy also allows the TOSE API host on port 443, in every network mode, and the plan lists it in `curated.network.destinations`. After install, the installation's `repository` object reports `push` and `push_branches`, and the agent's page shows **Push** **On** or **Off**.

### How it works

- The agent **never receives a GitHub token**. Its checkout's `origin` points to the TOSE git proxy, `https://<API host>/api/git/<checkout_id>`.
- The agent authenticates to the proxy with a secret of its own checkout, `TOSE_GIT_TOKEN`, which reaches the agent's pod the way its other secret variables do. A git credential helper that the trusted bootstrap writes into the repository hands it to git when git asks; no token is written to disk. It is not a GitHub credential: it opens only this checkout's repository, and only through TOSE. TOSE stores only its hash, and each deploy issues a new one.
- For each git operation the proxy mints a **short-lived GitHub App token limited to this one repository**: `contents:read` for fetch and `contents:write` for push. It forwards git's request to GitHub with that token. The agent never sees it.
- **GitHub's branch protection and rulesets still apply**, because GitHub checks every push. Protect the default branch, or choose `agent` branches, if the agent should not change it directly.
- With `push_branches: agent`, the proxy reads the branches a push updates before it forwards anything, and refuses the whole push when one is outside `tose/<installation slug>/`. Git shows `[remote rejected] main -> main (only tose/<slug>/* branches may be pushed)`.
- **Every push is audited** as `template_installation.git_push`, with the repository, the branches and the outcome (`ok`, `rejected` by GitHub, `error`, or `denied` with the refusal code). Other refused git requests are audited as `template_installation.git_refused`. No audit entry holds the secret, a GitHub token or repository content.
- The proxy works only while the agent runs, or is being redeployed. A stopped, sleeping or failed agent, a deleted or suspended installation, or a GitHub App installation that was disconnected from the workspace is refused.

### When git refuses

Git shows a refusal as `remote error: <message> (<code>)`:

| Code | Why |
|------|-----|
| `PUSH_DISABLED` | Push is off for this agent. |
| `PUSH_BRANCH_NOT_ALLOWED` | The push updates a branch outside `tose/<installation slug>/`. |
| `GITHUB_PERMISSION_MISSING` | The TOSE GitHub App lacks **Contents: Read and write**, or the account has not accepted it. |
| `INSTALLATION_NOT_RUNNING` | The agent is stopped, asleep, failed or not deployed yet. |
| `INSTALLATION_DELETED`, `INSTALLATION_SUSPENDED` | The installation is being deleted, or suspended. |
| `SCOPE_REVOKED` | The GitHub App installation is no longer connected to the workspace. |
| `NO_INSTALLATION`, `PERMISSION_DENIED`, `REPO_REMOVED` | As in [Status and failure states](#status-and-failure-states). `PERMISSION_DENIED` also means the repository was renamed or transferred on GitHub; see [Limits](#limits). |
| `GITHUB_UNAVAILABLE` | GitHub could not be reached. Try again. |

A push is at most 1 GiB. One checkout may run 4 git requests at once and send 60 a minute; past that git gets `429` (`GIT_RATE_LIMITED`) and can retry later.

### Security model

::: warning Anyone who can run commands in the agent can push
While push is on, anyone who can run commands in the agent can push to that repository: you and other owners or admins in its console, a [delegated task](/guide/agent-tasks), and a prompt injection the agent follows. Turn push on only for an agent you would let push, and protect the branches that matter on GitHub.
:::

- The agent holds no GitHub token, and its proxy secret opens only this one repository through TOSE.
- The secret stops working when the agent is stopped, when the installation is deleted and when the GitHub App installation is disconnected from the workspace.

### Limits

- **Push cannot be changed after install.** Redeploying from the agent's page keeps the choice. To turn push on or off, or to change the branches, plan and install a new agent with the new choice. It is a new installation with its own `/workspace`, so push your work first or move it over with git.
- **Renaming the repository breaks the proxy.** The proxy uses the repository name pinned at install and does not follow GitHub's redirects, so after a rename or transfer on GitHub git shows `PERMISSION_DENIED`. A redeploy does not fix it: plan and install a new agent for the repository's new name.
- **The agent does not open pull requests.** Open them yourself on GitHub from the branch the agent pushed.

## Status and failure states

Approving and installing, the two things **Deploy** does, check the repository again. If anything below is true they refuse with `409 PLAN_BLOCKED`, and a new plan with the same problem is stored as blocked:

| Code | Why |
|------|-----|
| `NO_INSTALLATION` | The GitHub App installation is gone or suspended. |
| `PERMISSION_DENIED` | The installation cannot read the repository's contents. |
| `REPO_REMOVED` | The repository was deleted or removed from the installation. |
| `BRANCH_MISSING` | The branch is gone, or the pinned commit is no longer on it (for example after a force-push). |
| `SCOPE_REVOKED` | The installation is no longer connected to the workspace. |
| `REPO_ID_CHANGED` | A different repository now has this name (deleted and recreated, or transferred). Choose it again to pin the new one. |

After install, the installation's **Status** page shows **Repository checkout**:

| State | Meaning |
|-------|---------|
| **Waiting** (`pending`) | The checkout runs at the next deploy. |
| **Checking out** (`cloning`) | The bootstrap Job is running. |
| **Ready** (`ready`) | The repository is in `/workspace/<repo>`. |
| **Failed** (`failed`) | See the code below. The deployment fails with `<CODE>: <reason>` and **the agent is not started**. |

The installation's `repository` object has `status`, `error_code` (when failed), `attempts`, `full_name`, `branch`, `commit` (7 characters), `commit_sha`, `path`, `description` and, when failed, `retry_path`.

A failed checkout has one of the codes above except `REPO_ID_CHANGED` (a planning blocker only), or:

| Code | Why |
|------|-----|
| `WORKSPACE_NOT_EMPTY` | `/workspace` already holds files where the repository would go, so nothing was written over them. |
| `BOOTSTRAP_FAILED` | The clone itself failed. Only an exit status is read back, never git's output. |

### Retry a failed checkout

Fix the cause (allow the repository again on GitHub, or reconnect the account), then choose **Retry checkout**, or call the API as an owner or admin. Retry clones the same pinned commit; another branch or commit needs a new plan:

```text
POST /api/workspaces/{slug}/template-installations/{id}/repository/retry
```

Needs `deployments:execute` for an API key. A `failed` checkout goes back to `pending` and **runs at the next deploy**, so redeploy the agent from its page afterwards. The route answers:

| Status | When |
|--------|------|
| `200` | The checkout is now `pending`. It is also `200`, unchanged, for a checkout that is already `pending` or `cloning`. |
| `409 REPOSITORY_READY` | The repository is already in the workspace. |
| `409 SCOPE_REVOKED` | The installation is not connected to the workspace. Connect it first. |
| `409 INSTALLATION_DELETED` | The installation was deleted. |
| `404 REPOSITORY_NOT_FOUND` | The installation pinned no repository. |

## Other errors when you plan

| Status and code | Why |
|-----------------|-----|
| `403 REPOSITORY_REQUIRES_ADMIN` | Only an owner or admin can plan with a repository. |
| `422 PLAN_INPUT_INVALID` at `repository.installation_id` | The installation is not connected to this workspace. An id that another workspace connected gets the same answer. |
| `503 GITHUB_APP_NOT_CONFIGURED` | This server has no GitHub App. |
| `502 GITHUB_UNAVAILABLE` | GitHub could not be reached. Try again in a moment. |
| `422` at `repository.push_branches` | `push_branches` was sent without `push: true`. |
| `503 GIT_PROXY_NOT_CONFIGURED` | The plan asks for push, and this server's git proxy has no public `https` address. |
| Blocker `GITHUB_PERMISSION_MISSING` | The plan asks for push, and the TOSE GitHub App lacks **Contents: Read and write** (or the account has not accepted it). The plan is stored blocked. |

## Related

- Source of truth: `docs/curated-agent-templates.md` ("GitHub repository" and "Pushing to the repository"), `docs/agent-runtime-security.md` ("Trusted repository bootstrap") and `internal/apispec/openapi.yaml` in `saasvn/tose-app`.
