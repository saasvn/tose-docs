# GitHub repository for coding agents

A curated coding agent (**Pi**, **Codex** or **Claude Code**) can start with one of your GitHub repositories, private or public, already in its persistent `/workspace`. You pick the repository and the branch in the install wizard. You never paste a URL, a personal access token or an SSH key, and the agent never receives a credential.

To install an agent, open **Template catalog** in the dashboard ([dashboard overview](/guide/getting-started#find-your-way-around-the-dashboard)).

::: warning Not yet verified on a live cluster
The checkout is implemented and covered by tests, but it has not yet been proven on a real cluster (tracked in saasvn/tose-app #588; follow-up hardening is in #621). Treat it as new: check the **Repository checkout** status after the first deploy.
:::

## What you need

- A GitHub App installation connected to the workspace (**Settings → GitHub**), with the repository allowed for it. Only repositories the workspace's own GitHub accounts allow are offered.
- A workspace **owner** or **admin** role. Anyone else who sends a repository gets `403 REPOSITORY_REQUIRES_ADMIN`.
- A curated agent plan. Registry template plans and upgrades take no repository.

## Choose a repository in the wizard

The **Configure** step has an optional **Repository** section. Leave it out and the agent starts with an empty workspace.

1. If no GitHub account is connected to the workspace, choose **Connect GitHub**. GitHub opens in a new tab: install the TOSE app on the account that owns the repository and allow that repository. Come back to the wizard tab and choose **Check again**. Your answers on the page are kept.
2. If your GitHub account is connected but not to this workspace, choose **Attach** next to the account. Only an owner or admin can attach an account.
3. Choose a **Repository** from the list (use the filter to search by `owner/name`; each entry shows **Private** or **Public**), then a **Branch**.
4. The wizard shows "`<repo>` on branch `<branch>` will be checked out." Choose **Remove repository** to go back to an empty workspace.

There is no free-form URL. A repository that is not in the list is refused.

## What the plan shows

When you create the plan, TOSE reads the repository through the installation with a token limited to read-only access to that one repository's contents. The token is used once and revoked. On **Review and approve**, the **Repository** section shows:

| Field | Meaning |
|-------|---------|
| Repository and branch | The name you chose, and whether it is private. |
| **Commit** | The full commit SHA the branch pointed to when the plan was created. |
| **Checked out to** | `/workspace/<repo>`. |
| **TOSE access** | Read-only access to the repository contents (`contents:read`). |
| **On first start** | The effects of the bootstrap, in words. |

The plan's `curated.repository` section carries the same data: `installation_id`, `repo_id`, `full_name`, `private`, `branch`, `commit_sha`, `path`, `access` and `effects`. It never contains a token or a URL with credentials.

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
- The **agent never receives a token or a reusable remote credential**. The `origin` URL stays `https://github.com/<owner>/<repo>.git`. The agent can commit locally but **cannot push**. This checkout gives the agent no way to write back to GitHub.
- The clone is the pinned commit with a shallow history (depth 50). Submodules and Git LFS objects are not fetched.
- A bootstrap that finishes is not run again, and a repeated run never overwrites work in an existing checkout.
- If `/workspace/<repo>` already holds a git checkout whose config has no credentials, it is left exactly as it is (dirty or not). A file, a symlink, a non-empty folder without `.git`, or a checkout whose git config holds credentials is refused with `WORKSPACE_NOT_EMPTY`.

## Status and failure states

**Approve** and **install** check the repository again. If anything below is true they refuse with `409 PLAN_BLOCKED`, and a new plan with the same problem is stored as blocked:

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

## Related

- Source of truth: `docs/curated-agent-templates.md` ("GitHub repository"), `docs/agent-runtime-security.md` ("Trusted repository bootstrap") and `internal/apispec/openapi.yaml` in `saasvn/tose-app`.
