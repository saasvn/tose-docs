# Agent instructions

## Keep related repositories in sync

After a PR in this repository ships, decide whether the other repositories among
`saasvn/tose-docs`, `saasvn/tose-cli` and `saasvn/tose-web` need a matching change. For each one
that does, open an issue in that repository with the `ai-handle` label so a cloud agent carries it
out. Describe what shipped and link the merged PR.

## Secrets and credentials

TOSE production secrets live in the platform owner's AgentKit vault (`ak secrets`, synced across
devices), stored as `TOSE_<KEY>` under project `tose`. Find them with
`ak secrets search --project tose --json`; never commit, print or paste a value. The full list of
refs and how to use them is in
[`saasvn/tose-app` AGENTS.md](https://github.com/saasvn/tose-app/blob/master/AGENTS.md#secrets-and-credentials).
