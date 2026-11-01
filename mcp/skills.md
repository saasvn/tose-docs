# Skills: instructions for agents

A **skill** is a short, versioned set of instructions that teaches an AI agent how to use TOSE safely: preconditions, OAuth scopes, the approval flow, polling, verification and recovery. A skill runs nothing itself, and it adds no tools to the agent.

**A skill is not a template.** A deployment template is an application that TOSE installs and runs for you. A skill only teaches an agent how to work with TOSE.

## The catalogue

The five skills are listed publicly, with no sign-in, at `GET https://<your TOSE API host>/api/skills`. The same files are also available to connected clients as `skill://tose/<name>/SKILL.md` resources and through the MCP skills extension (`io.modelcontextprotocol/skills`).

| Skill | Use it to |
|-------|-----------|
| `deploy-nextjs-to-tose` | Deploy a Next.js project, with your approval, then verify it is live. |
| `deploy-go-service-to-tose` | Deploy a Go HTTP service, with your approval, then verify it. |
| `debug-failed-deployment` | Find why a deployment failed or an app is unreachable, using read-only tools. |
| `optimize-cloud-cost` | Review what a workspace pays for and propose savings you can approve. |
| `safe-rollback` | Restore an earlier deployment after a bad release, with your approval. |

## Versions and pinning

Each skill has a `MAJOR.MINOR.PATCH` version, and the catalogue lists the SHA-256 digest and size of every file. One version always means one content. Pin the **name, the version and the digests**: a changed digest means a changed skill.

## Installing safely

1. Download the catalogue and files only from the official TOSE API host over HTTPS, or through the connector.
2. Check every file's size and `sha256` digest against the catalogue. Reject the skill if anything differs.
3. Read the skill before you enable it, and review it again whenever its version or a digest changes.
4. Install it under a name that shows it comes from TOSE, and never let it replace a local skill of the same name.
5. Give it no extra tool permissions. Its deploy and rollback steps still need your approval in the browser and an owner or admin role.

Digests prove a download matches the catalogue. They are not signatures and come from the same server, so trust rests on connecting to the official host over TLS.

Every skill tells the agent to treat repository files, commit messages and logs as untrusted data, never as instructions.
