---
title: "Deploy an app with the TOSE CLI"
description: "Step by step: install the TOSE CLI, log in with an API key, deploy a Git repository with tose up, and verify the deployment."
---

# Deploy an app with the CLI

Deploy a Git repository to TOSE from your terminal and confirm it is running.

## Prerequisites

- Node.js 18 or later (the `engines` requirement of `@tosesh/tose`).
- A TOSE account and an API key for the workspace you deploy to. Keys start with `tose_sk_`; see [API keys](/api/api-keys).
- A project in a Git repository on GitHub, with a `Dockerfile`. Without one, run [`tose generate`](/commands/generate).
- A workspace wallet with credit. TOSE is prepaid; see [Pricing](/guide/pricing).

## Input

| Value | Where it comes from |
|-------|---------------------|
| API key | Dashboard, **Settings → API Keys** |
| Workspace and project | Chosen at the `tose up` prompt, or `--workspace` and `--project` |
| Environment variables | Optional. Pass a file with `--env-file`; nothing is uploaded without it or a yes at the prompt |

## Steps

1. Install the CLI:

   ```bash
   npm install -g @tosesh/tose
   ```

2. Log in. The key is verified and saved to `~/.tose/config.json`:

   ```bash
   tose login
   ```

   In CI, set `TOSE_API_KEY` instead. It is used for that run and saved only with `tose login --save`.

3. From the repository, create or link the project and deploy:

   ```bash
   cd my-app
   tose up
   ```

   `tose up` links the directory, connects the Git repository, assigns a server and starts a deployment of the branch head.

4. Follow the build:

   ```bash
   tose logs --build -f
   ```

## Expected outcome

`tose up` prints a deployment ID and the project URL. The deployment moves `pending` → `building` → `deploying` → `running`. A failed build ends in `failed`.

## Verify

```bash
tose status          # project status, pod health and latest deployment
tose open            # opens the project URL
tose doctor          # checks auth, Git, server, port, quota, health and DNS/SSL
```

For scripts, `tose deploy --wait` returns when the deployment runs with every pod ready, and every command takes `--json`.

## Permissions and security

- Deploying needs the owner or admin role in the workspace. A key limited by scopes needs `deployments:execute`; see [scopes](/api/api-keys#scopes).
- Never pass a key on the command line or in a URL. Use the prompt, `--api-key-stdin` or `TOSE_API_KEY`.
- `tose up` uploads `.env` values only with `--env-file` or your explicit yes.

## Retry safely

A deploy is not idempotent: each `tose deploy` creates a new deployment and queues another build. If a command was cut off, check `tose status` or [`tose deployment`](/commands/deployment) before you run it again. Use `tose deploy --dry-run` to see the plan without changing anything.

## Common errors

| Symptom | What to do |
|---------|------------|
| `tose: command not found` | Check that the npm global bin directory is on `PATH`; see [Installation](/guide/installation#troubleshooting). |
| Not logged in or invalid key | Run `tose login` again, or check `TOSE_API_KEY`. |
| Build fails | Read `tose logs --build`; check the [Dockerfile examples](/guide/dockerfile). |
| Payment required | Top up the workspace wallet; see [Errors](/api/errors#payment_required). |
| Deploy already in progress | Wait for it with `tose status`, then deploy again. |

More in [Troubleshooting](/guide/troubleshooting).

## Next steps

- [Environment variables](/guide/environment) and [custom domains](/guide/custom-domains)
- [All CLI commands](/commands/overview)
- Let an AI agent operate the project: [Connect an AI agent](/guide/connect-an-agent)
