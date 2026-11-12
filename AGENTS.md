# Agent instructions

## Keep related repositories in sync

After a PR in this repository ships, decide whether the other repositories among
`saasvn/tose-docs`, `saasvn/tose-cli` and `saasvn/tose-web` need a matching change. For each one
that does, open an issue in that repository with the `ai-handle` label so a cloud agent carries it
out. Describe what shipped and link the merged PR.

## Issue workflow

Before starting an issue, check its labels, assignees and open PRs so two people or agents do not
work on the same thing. Then assign yourself (or the person you work for) and move the issue through
these labels, keeping exactly one of them on it:

- `in progress`: someone is working on it.
- `blocked`: waiting on something outside the issue; say what in a comment.
- `in review`: the change is being reviewed.
- `done`: the PR is open.
- `shipped`: the PR is merged into `master`; close the issue.

A gap found along the way that is not part of the issue gets its own issue. A related or duplicate
issue gets a comment that links the one being worked on.

Before opening a PR, run `npm run docs:build`: it fails on dead links. Keep EN pages and their `vi/`
mirrors in step, and give a heading an explicit `{#id}` when other pages link to it.

## Secrets and credentials

TOSE production secrets live in the platform owner's AgentKit vault (`ak secrets`, synced across
devices), stored as `TOSE_<KEY>` under project `tose`. Find them with
`ak secrets search --project tose --json`; never commit, print or paste a value. The full list of
refs and how to use them is in
[`saasvn/tose-app` AGENTS.md](https://github.com/saasvn/tose-app/blob/master/AGENTS.md#secrets-and-credentials).
