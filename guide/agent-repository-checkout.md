# GitHub repository for coding agents

A curated coding agent (**Pi**, **Codex** or **Claude Code**) can start with one of your GitHub repositories, private or public, already in its persistent `/workspace`. You pick the repository and the branch in the **Repository (optional)** card of the one-page deploy. After install, an agent can have [up to 10 repositories](#several-repositories-per-agent), each in its own folder `/workspace/<name>`. You never paste a URL, a personal access token or an SSH key, and the agent never receives a GitHub credential. The checkout is read-only unless you [let the agent push](#let-the-agent-push-to-your-repository). After install, you can also [let it manage the repository's issues and pull requests](#let-the-agent-manage-issues-and-pull-requests). You can also [add, reconfigure or remove repositories after install](#attach-or-change-an-agents-repository-after-install).

To install an agent, open **Cloud Agents** in the dashboard ([dashboard overview](/guide/getting-started#find-your-way-around-the-dashboard)).

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

An agent can push its commits back to the repository pinned at deploy, and to each repository you [add later](#attach-or-change-an-agents-repository-after-install) with push on. Push is set per repository. On the deploy page it is **off by default**, and you choose it for the first repository when you deploy (tose-app [#704](https://github.com/saasvn/tose-app/pull/704)). **+ Add repository** on the agent's page starts with push **on**, to any branch, since tose-app [#770](https://github.com/saasvn/tose-app/pull/770); turn it off before saving if the agent should only read that repository.

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
| `push_remote` | The TOSE git proxy the checkout's `origin` points to, for example `https://api.tose.sh/api/git/<checkout_id>`. It carries no credential. A checkout created since tose-app [#741](https://github.com/saasvn/tose-app/pull/741) names its repository in the checkout id: `<template id>r<repository id>`. |

`access` stays `contents:read`: it describes the token that clones the repository. The `effects` list says in words what pushing allows. With push on, the agent's network policy also allows the TOSE API host on port 443, in every network mode, and the plan lists it in `curated.network.destinations`. After install, each entry of the installation's `repositories` (and `repository`, the first one) reports `push` and `push_branches`, and the agent's page shows a **Push** badge on each repository the agent may push to. You can change both later; see [Attach or change an agent's repository after install](#attach-or-change-an-agents-repository-after-install).

### How it works

- The agent **never receives a GitHub token**. Its checkout's `origin` points to the TOSE git proxy, `https://<API host>/api/git/<checkout_id>`.
- The agent authenticates to the proxy with a secret of its own checkout, `TOSE_GIT_TOKEN`, which reaches the agent's pod the way its other secret variables do. A git credential helper that the trusted bootstrap writes into the repository hands it to git when git asks; no token is written to disk. It is not a GitHub credential: it opens, only through TOSE, only the repositories the agent may push to. An agent with [several repositories](#several-repositories-per-agent) holds one such secret for all of them. TOSE stores only its hash, and each deploy issues a new one.
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
While push is on, anyone who can run commands in the agent can push to the repositories that allow it: you and other owners or admins in its console, a [delegated task](/guide/agent-tasks), and a prompt injection the agent follows. Turn push on only for an agent you would let push, and protect the branches that matter on GitHub.
:::

- The agent holds no GitHub token, and its proxy secret opens, through TOSE, only the repositories it may push to.
- The secret stops working when the agent is stopped, when the installation is deleted, when the GitHub App installation is disconnected from the workspace, and at once when you turn push off for a repository or remove one [after install](#attach-or-change-an-agents-repository-after-install). The next deploy issues a new secret for the repositories that still allow push.

### Limits

- **Push is changed on the agent's page, not by a plain redeploy.** Redeploying from the agent's page keeps the choice. To turn push on or off, or to change the branches, use **Permissions** on that repository in the **Repositories** tab; see [Attach or change an agent's repository after install](#attach-or-change-an-agents-repository-after-install).
- **Renaming the repository breaks the proxy.** The proxy uses the repository name pinned at install (or at the last repository change) and does not follow GitHub's redirects, so after a rename or transfer on GitHub git shows `PERMISSION_DENIED`. A redeploy does not fix it: in the agent's **Repositories** tab, [remove the old entry and add the repository](#attach-or-change-an-agents-repository-after-install) under its new name. If `/workspace/<name>` still holds the old clone and TOSE cannot tell it is the same repository, the checkout fails with `WORKSPACE_NOT_EMPTY`; move that folder aside inside the agent first.
- **Push alone does not open pull requests.** Open them yourself on GitHub from the branch the agent pushed, or [let the agent manage issues and pull requests](#let-the-agent-manage-issues-and-pull-requests) so it opens them itself.

## Let the agent manage issues and pull requests {#let-the-agent-manage-issues-and-pull-requests}

An installed agent can create and update the issues and pull requests of its repositories through TOSE, still without holding a GitHub token (tose-app [#753](https://github.com/saasvn/tose-app/pull/753)). It is set **per repository**, and only for an agent that is already installed: a plan cannot ask for it, so every repository chosen at deploy starts with it off. A repository added later with **+ Add repository** starts with it **on** (tose-app [#770](https://github.com/saasvn/tose-app/pull/770)); clear the box before saving to keep it off.

### Turn it on

1. **The GitHub App needs Issues and Pull requests.** The TOSE GitHub App must have the repository permissions **Issues: Read and write** and **Pull requests: Read and write**. The platform operator grants them in the App's settings on GitHub, and every GitHub account that installed the App must then accept them on its installation. Until then, any save with the option on is refused with `409 GITHUB_PERMISSION_MISSING`.
2. **Turn it on for one repository.** On the agent's page, choose **Permissions** on the repository's row in the **Repositories** tab and turn on **Let the agent manage issues and pull requests**. Only a workspace owner or admin can change it. Choose **Save and restart**: the change reaches the agent on its next deploy.
3. The row then shows an **Issues/PR** badge, and the **?** next to it says "Issues and pull requests through TOSE".

Through the API, send `github_api: true` in the body of [`PUT .../repository`](#through-the-api):

```json
{"installation_id": 12345678, "full_name": "acme/app", "branch": "main", "push": true, "github_api": true}
```

- `github_api` is `false` when omitted. The body replaces the repository's settings, so leaving it out turns the option off.
- It does not need `push`: an agent can manage issues and pull requests of a repository it may not push to, and a secret issued only for this never opens `git push`.
- Sending `repository.github_api` in a plan is `422`. Install the agent first, then turn it on.
- Each entry of the installation's `repositories` reports `github_api` and, when it is on, `api_path` (`/api/gh/<checkout_id>`), the proxy path of that repository on the TOSE API.

### How the agent uses it

On its next deploy the agent's pod receives two variables:

| Variable | Value |
|----------|-------|
| `TOSE_GIT_TOKEN` | The agent's proxy secret, the same one git push uses. Send it as a bearer token. |
| `TOSE_GITHUB_API` | One `owner/name=URL` entry per repository with the option on, separated by spaces. Each URL is `https://<API host>/api/gh/<checkout_id>`. |

A path after the URL is relative to the repository, so `POST $URL/issues` is GitHub's `POST /repos/<owner>/<name>/issues`. Requests and answers are GitHub's own REST API:

```bash
# The proxy URL of acme/app
URL=$(printf '%s\n' $TOSE_GITHUB_API | sed -n 's#^acme/app=##p')

# Open an issue
curl -sS -H "Authorization: Bearer $TOSE_GIT_TOKEN" \
  -d '{"title":"Login fails on Safari","body":"Steps to reproduce…","labels":["bug"]}' \
  "$URL/issues"

# Open a pull request from a branch the agent pushed
curl -sS -H "Authorization: Bearer $TOSE_GIT_TOKEN" \
  -d '{"title":"Fix login on Safari","head":"tose/my-agent/fix-login","base":"main"}' \
  "$URL/pulls"
```

Bodies must be JSON, up to 1 MiB. GitHub's pagination links (`Link`) are rewritten to point at the proxy, so a client can follow them.

### What the agent can and cannot do

| Allowed | Requests |
|---------|----------|
| Issues | Create, read, edit and close (`issues`, `issues/{n}`); comments (`issues/{n}/comments`, `issues/comments/{id}`); labels (`issues/{n}/labels`); assignees (`issues/{n}/assignees`); events (`issues/{n}/events`). |
| The repository | Read it, its labels, its assignable users and its milestones (`labels`, `assignees`, `milestones`). |
| Pull requests | Create, read and edit (`pulls`, `pulls/{n}`); files and commits; review comments (`pulls/{n}/comments`); reviews (`pulls/{n}/reviews`); requested reviewers. |

**Everything else is refused** with `403 GITHUB_API_ENDPOINT_NOT_ALLOWED`: merging a pull request, repository contents, settings, webhooks, Actions, deployments and any other repository. To change files, the agent [pushes](#let-the-agent-push-to-your-repository) a branch; a person merges the pull request on GitHub.

GitHub assigns issues to the **GitHub usernames** of the repository's collaborators, not to email addresses.

### How it works and security

- The agent **never holds a GitHub token**. For each request the proxy uses a **short-lived GitHub App token for that one repository**, with only `issues: write`, `pull_requests: write` and `metadata: read` (no contents), and reuses it until five minutes before it expires.
- The proxy does not follow redirects and passes only a fixed set of response headers.
- **Every write and every refused request is audited** as `template_installation.github_api`, with the repository, the method, the path and the outcome; a wrong secret is audited at most once a minute per repository. No audit entry holds the secret or a GitHub token.
- It answers only while the agent runs, its GitHub App installation is connected to the workspace and the repository still allows it. Turning the option off, or removing the repository, ends the agent's secret at once; the next deploy issues a new one for the repositories that still allow push or the API.
- While any repository allows push or the API, the agent's network allows the TOSE API host on port 443, in every network mode.
- It has the same limits as the git proxy, counted separately from git: 4 requests at once and 60 a minute for each repository, then `429 GIT_RATE_LIMITED`.

::: warning Anyone who can run commands in the agent can write issues and pull requests
That includes you and other owners or admins in its console, a [delegated task](/guide/agent-tasks), and a prompt injection the agent follows. It cannot merge or change files this way, but it can open, edit, close and comment. Turn it on only for an agent you trust with those, and keep branch protection on the branches that matter.
:::

### When the proxy refuses

The proxy answers with JSON `{"code": "…", "message": "…"}`:

| Status and code | Why |
|-----------------|-----|
| `401 GIT_TOKEN_INVALID` | No bearer token, or not the agent's current `TOSE_GIT_TOKEN`. Each deploy issues a new secret, and the previous one stops working shortly after. |
| `403 GITHUB_API_DISABLED` | The option is off for this repository. An owner or admin turns it on under **Permissions** in the **Repositories** tab. |
| `403 GITHUB_API_ENDPOINT_NOT_ALLOWED` | The request is not in the [allowed list](#what-the-agent-can-and-cannot-do). |
| `403 INSTALLATION_NOT_RUNNING`, `INSTALLATION_DELETED`, `INSTALLATION_SUSPENDED`, `SCOPE_REVOKED` | As in [When git refuses](#when-git-refuses). |
| `400 GIT_REQUEST_INVALID` | The body is not JSON. |
| `413`/`414 GIT_REQUEST_TOO_LARGE` | The body is over 1 MiB, or the query is too long. |
| `429 GIT_RATE_LIMITED` | More than 4 requests at once or 60 a minute for this repository. Retry later. |
| `502 GITHUB_PERMISSION_MISSING` | The TOSE GitHub App lacks **Issues** or **Pull requests: Read and write**, or this installation has not accepted it. |
| `502 NO_INSTALLATION`, `PERMISSION_DENIED`, `REPO_REMOVED` | GitHub refused a token for the repository, as in [Status and failure states](#status-and-failure-states). |
| `502 GITHUB_UNAVAILABLE` | GitHub could not be reached. Retry. |
| `503 GITHUB_UNAVAILABLE` | TOSE could not read the agent's repository record. Retry. |
| `503 GIT_PROXY_NOT_CONFIGURED` | This server has no GitHub API proxy. |

Any other status is GitHub's own answer, passed through: for example `422` when an assignee or a label is invalid, or `404` when an issue does not exist.

## Attach or change an agent's repositories after install {#attach-or-change-an-agents-repository-after-install}

You do not have to reinstall an agent to give it repositories or to change them (tose-app [#741](https://github.com/saasvn/tose-app/pull/741), [#746](https://github.com/saasvn/tose-app/pull/746)). On the agent's page (**Cloud Agents**, then the agent, at `/w/<workspace>/templates/<agent>`), the **Repositories** tab lists every repository of the agent and lets a workspace **owner** or **admin**:

- **add** a repository, up to 10;
- turn **push** on or off for one repository, and choose its branches (any branch, or only `tose/<installation slug>/…`);
- let the agent [manage the issues and pull requests](#let-the-agent-manage-issues-and-pull-requests) of one repository;
- **retry** a failed checkout;
- **remove** one repository.

### Several repositories per agent {#several-repositories-per-agent}

- An agent has **up to 10 repositories**. Each is cloned into its own folder, `/workspace/<name>`, where `<name>` is the repository's name without its owner.
- Two repositories with the same name (ignoring case) cannot share a folder: adding `other-org/app` to an agent that has `acme/app` is refused with `REPOSITORY_FOLDER_TAKEN`. Remove the first one, then add the other.
- The repositories are cloned **one after the other, oldest first**, before the agent starts. **The first clone that fails stops the deploy**: the repositories after it are not cloned. An agent that was running is started again as it was, with the repositories cloned so far; one that was not running stays stopped. Fix the cause and [retry](#retry-a-failed-checkout).
- **Push and issues/pull requests are set per repository.** The agent holds **one** secret, `TOSE_GIT_TOKEN`, for every repository it may push to or manage issues and pull requests of. Turning either off for one repository, or removing one, ends that secret at once; the next deploy issues a new one for the repositories that still allow them. When none allows either any more, the next deploy also takes the TOSE API host out of the agent's network.
- The repository chosen at deploy is the first one. The installation still has `repository`, which is the first entry of `repositories`, so clients that know one repository keep working.

### Use the Repositories tab {#use-the-repositories-tab}

1. Open the agent's page and select the **Repositories** tab (or the **Repositories** tile on **Overview**). An agent without a repository shows "No repository yet." Each repository is a row with its name, branch, checkout state and, when the agent may push, a **Push** badge, and an **Issues/PR** badge when it may manage issues and pull requests. The **?** next to a row shows its folder, branch, commit, push setting and whether issues and pull requests go through TOSE.
2. To add one, choose **+ Add repository**. The same picker as on the deploy page opens: the GitHub account, the **Repository**, the **Branch**, and **Let the agent push to this repository** with its branch choice ([Choose a repository on the deploy page](#choose-a-repository-on-the-deploy-page) explains each step), followed by **Let the agent manage issues and pull requests**. Here every permission starts **on**: push is allowed to any branch, including the default branch, and the issues and pull requests box is checked, so the agent can work on the repository at once. Turn either off before saving if you want less. The deploy page still starts with push off. If saving is refused with `409 GITHUB_PERMISSION_MISSING`, the GitHub App lacks **Contents: Read and write** (needed for push) or **Issues** and **Pull requests** (needed for the box): turn off the one the operator has not granted and save again. On a server without a git proxy, saving with either on is refused with `503 GIT_PROXY_NOT_CONFIGURED`; turn both off to add the repository read-only. The button is disabled once the agent has 10 repositories.
3. To change push, or issues and pull requests, for one repository, choose **Permissions** on its row. A repository that is waiting or being cloned has no **Permissions** until its checkout ends.
4. Choose **Save and restart**. The card shows "Saved. Restarting the agent…", then "Saved. The agent is restarting; the repository is in /workspace once it is back." If you saved without changing anything, it shows "Nothing changed." and the agent is not restarted.
5. To take one repository away, choose **Remove** on its row and confirm. The agent restarts. A failed checkout also has **Retry checkout** on its row.

**Saving restarts the agent**, because the change reaches the agent only on a deploy. **Files already in `/workspace` are never deleted.** If the restart itself fails, the change is saved anyway and the card says "Saved, but the agent could not be restarted (…). Deploy it to apply the change." Deploy the agent from its page to apply it.

### What happens when you save

| You change | What happens in `/workspace` |
|------------|-------------------------------|
| Add a repository | It is cloned into `/workspace/<name>` before the agent starts, like at install. A folder of that name that already holds other files or a clone of another GitHub repository is never overwritten: the checkout fails with `WORKSPACE_NOT_EMPTY` (see [Status and failure states](#status-and-failure-states)). The other repositories' folders are not touched. |
| Turn push on or off for a repository already cloned | Its clone keeps its files. Only its `origin` is switched: to the TOSE git proxy with push, back to `https://github.com/<owner>/<repo>.git` without. An `origin` you set yourself is left alone. |
| Change the push branches of a repository | The branch rule (`all` or `agent`) takes effect at once; nothing in `/workspace` changes. |
| Choose another branch of a repository already cloned | Refused with `REPOSITORY_ALREADY_CLONED`. Switch branches with git inside the agent (`git fetch`, `git switch`). A clone that has not succeeded yet (waiting or failed) can still change its branch. |
| Remove a repository | Its files stay in `/workspace`, but the agent can no longer fetch or push it through TOSE. |

**A leftover clone cannot push into another repository.** Every checkout created since tose-app #741 has a proxy remote that names its repository, `https://<API host>/api/git/<template id>r<repository id>`. The proxy refuses a remote of another repository, and the bare `/api/git/<template id>` remote for such a checkout. So a folder left in `/workspace` by a removed repository can neither fetch from nor push to the agent's current ones. An older checkout whose repository never changed keeps its bare remote and keeps working.

### The clone and a running agent

The clone runs in its own one-shot Job. **If the agent is running, the deploy stops it first**, so the Job can mount the agent's disk on any node with room, then the deploy starts the agent again. If a clone fails, the agent is started again as it was. This fixes deploys that stayed in "deploying" until `DeadlineExceeded` when the agent's node was full (tose-app [#745](https://github.com/saasvn/tose-app/pull/745)). The Job prefers the node the agent just ran on, where its disk is still attached, so the disk does not have to move; it is a preference, not a requirement, so a full or missing node does not strand the checkout. This fixes `BOOTSTRAP_FAILED` (the Job's `DeadlineExceeded` while the disk moved to another node) when adding a repository to a running agent (tose-app [#764](https://github.com/saasvn/tose-app/pull/764)).

### Through the API

The routes need a workspace **owner** or **admin**, signed in or with an API key that has `deployments:execute`. A connected MCP app is refused with `403 REPOSITORY_REQUIRES_PERSON`; change the repositories from the dashboard instead.

```text
PUT    /api/workspaces/{slug}/template-installations/{id}/repository
DELETE /api/workspaces/{slug}/template-installations/{id}/repositories/{repo_id}
DELETE /api/workspaces/{slug}/template-installations/{id}/repository
```

`PUT` adds a repository the agent does not have yet, or changes push or issues and pull requests for one it has. The repository is matched by `repo_id` when you send it, otherwise by `full_name`. The body is the plan's `repository`: `installation_id`, `full_name` and `branch` are required; `commit_sha`, `repo_id`, `push` (default `false`), `push_branches` (`all`, the default, or `agent`, with `push` only) and `github_api` (default `false`, see [Let the agent manage issues and pull requests](#let-the-agent-manage-issues-and-pull-requests)) are optional. No new plan is needed. The body replaces that repository's settings, so leaving `push` or `github_api` out turns it off for that repository.

```json
{"installation_id": 12345678, "full_name": "acme/app", "branch": "main", "push": true, "push_branches": "agent"}
```

`DELETE .../repositories/{repo_id}` removes one repository, named by its GitHub id (`repo_id` in `repositories`). `DELETE .../repository` removes **all** of them. Neither takes a body. Both remove the checkout records and end the git secret; the files stay.

All three answer `200` with:

```json
{
  "installation": {
    "id": "…",
    "repository": {"full_name": "acme/app", "repo_id": 1296269, "branch": "main", "status": "ready", "push": true, "push_branches": "agent"},
    "repositories": [
      {"full_name": "acme/app", "repo_id": 1296269, "branch": "main", "status": "ready", "push": true, "push_branches": "agent"},
      {"full_name": "acme/docs", "repo_id": 1296270, "branch": "main", "status": "pending", "push": false, "github_api": true, "api_path": "/api/gh/<checkout_id>"}
    ]
  },
  "restart_required": true,
  "deploy_path": "/api/workspaces/acme/templates/claude-code-1/deploy"
}
```

When `restart_required` is `true`, apply the change by deploying the agent again:

```text
POST {deploy_path}
{"mode": "image"}
```

`restart_required` is `false` when the `PUT` changed nothing. Both `DELETE` routes always return `true`.

| Status and code | Why |
|-----------------|-----|
| `403` | You are not a workspace owner or admin, or the API key lacks `deployments:execute`. |
| `403 REPOSITORY_REQUIRES_PERSON` | A connected app sent the request. Use the dashboard. |
| `404 INSTALLATION_NOT_FOUND` | No installation with this id in the workspace. |
| `404 REPOSITORY_NOT_FOUND` | `DELETE` on an agent that has no repository, or not the one named. |
| `409 REPOSITORY_LIMIT` | The agent already has 10 repositories. Remove one first. |
| `409 REPOSITORY_FOLDER_TAKEN` | Another repository of the agent has the same name, so it would use the same `/workspace/<name>` folder. Remove it first. |
| `409 REPOSITORY_ALREADY_CLONED` | Another branch of a repository already cloned. Switch branches with git inside the agent. |
| `409 REPOSITORY_CLONING` | A clone is running. Wait for the deploy to finish and try again. |
| `409 REPOSITORY_CHANGED` | Someone else changed the agent's repositories meanwhile. Reload and try again. |
| `409 NOT_A_CLOUD_AGENT` | Only Claude Code, Codex and Pi agents have repositories. |
| `409 INSTALLATION_DELETED` | The installation was deleted or is being deleted. |
| `409` `BRANCH_MISSING`, `PERMISSION_DENIED`, `REPO_REMOVED`, `NO_INSTALLATION`, `REPO_ID_CHANGED`, `GITHUB_PERMISSION_MISSING` | GitHub's answer for the repository, as in [Status and failure states](#status-and-failure-states) and [Set it up](#set-it-up). `GITHUB_PERMISSION_MISSING` with `github_api` means the App lacks **Issues** or **Pull requests: Read and write** ([Turn it on](#turn-it-on)). |
| `422` at `repository.installation_id` | The GitHub App installation is not connected to this workspace. |
| `503 GITHUB_APP_NOT_CONFIGURED`, `503 GIT_PROXY_NOT_CONFIGURED` | This server has no GitHub App, or no public git proxy address for push or issues and pull requests. |
| `502 GITHUB_UNAVAILABLE` | GitHub could not be reached. Try again. |

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

After install, the installation's **Status** page shows **Repository checkout**, and the agent's **Repositories** tab shows the same state on each repository's row:

| State | Meaning |
|-------|---------|
| **Waiting** (`pending`) | The checkout runs at the next deploy. |
| **Checking out** (`cloning`) | The bootstrap Job is running. |
| **Ready** (`ready`) | The repository is in `/workspace/<repo>`. |
| **Failed** (`failed`) | See the code below. The deployment fails with `<CODE>: <reason>`. An agent that was not running is **not started**; one that was running is started again as it was. |

The installation's `repositories` array lists every repository of the agent, oldest first (at most 10; absent without one). `repository` is its first entry, kept for clients that know one repository. Each entry has `status`, `error_code` (when failed), `attempts`, `full_name`, `branch`, `commit` (7 characters), `commit_sha`, `path`, `description`, `push` (and `push_branches` with push), `installation_id`, `repo_id` and, when failed, `retry_path`.

A failed checkout has one of the codes above except `REPO_ID_CHANGED` (a planning blocker only), or:

| Code | Why |
|------|-----|
| `WORKSPACE_NOT_EMPTY` | `/workspace` already holds files where the repository would go, so nothing was written over them. |
| `BOOTSTRAP_FAILED` | The clone itself failed. Only an exit status is read back, never git's output. |

### Retry a failed checkout

Fix the cause (allow the repository again on GitHub, or reconnect the account), then choose **Retry checkout**, or call the API as an owner or admin. Retry clones the same pinned commits; for another branch or commit of a repository that has not been cloned, [save it again with that branch](#attach-or-change-an-agents-repository-after-install) instead:

```text
POST /api/workspaces/{slug}/template-installations/{id}/repository/retry
```

Needs `deployments:execute` for an API key. **Every** `failed` checkout of the agent goes back to `pending` and **runs at the next deploy**; repositories already `ready` are not cloned again. **Retry checkout** in the agent's **Repositories** tab restarts the agent for you; after a retry through the API (or from the deploy status page), deploy the agent again yourself (`POST .../templates/{agent}/deploy` with `{"mode":"image"}`, or from its page). The route answers:

| Status | When |
|--------|------|
| `200` | The failed checkouts are now `pending`. It is also `200`, unchanged, when the checkouts that are not ready are already `pending` or `cloning`. |
| `409 REPOSITORY_READY` | Every repository of the agent is already in the workspace. |
| `409 SCOPE_REVOKED` | The GitHub App installation of a failed repository is not connected to the workspace. Connect it first. |
| `409 INSTALLATION_DELETED` | The installation was deleted. |
| `404 REPOSITORY_NOT_FOUND` | The agent has no repository. |

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

- Source of truth: `docs/curated-agent-templates.md` ("GitHub repository", "Pushing to the repository" and "After install: several repositories, each in its own folder"), `docs/agent-runtime-security.md` ("Trusted repository bootstrap") and `internal/apispec/openapi.yaml` in `saasvn/tose-app`.
