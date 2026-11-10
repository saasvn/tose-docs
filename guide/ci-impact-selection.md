# CI impact selection

Impact selection lets a pull request run only the CI jobs its diff can affect. When selection cannot show that a job is unaffected, the job runs. Every uncertain case runs the full suite and records why.

::: warning Off by default
Selection is off unless the TOSE server sets `CI_IMPACT_SELECTION=true` **and** the repository's `.tose/ci.yml` has an `impact:` section. With the flag off nothing is recorded and every run plans every job. TOSE CI itself is also opt-in (`CI_ENABLED`). On a hosted workspace, ask your workspace owner or TOSE support whether selection is enabled.
:::

This page explains the behavior. For every option, limit and the exact schema, read the source of truth in the app repository: [`docs/ci-impact-selection.md`](https://github.com/saasvn/tose-app/blob/master/docs/ci-impact-selection.md) and the [OpenAPI spec](https://api.tose.sh/api/openapi.yaml) (`GET /api/openapi.yaml`).

## Server settings

| Variable | Default | Meaning |
|----------|---------|---------|
| `CI_IMPACT_SELECTION` | `false` | `true` lets pull request runs skip unaffected jobs |
| `CI_IMPACT_REPLAY_PERCENT` | `10` | Share of green selective runs replayed in full, 1 to 100 |

## The `impact:` section

```yaml
impact:
  graph_version: "2026-11-04"   # required; change it after fixing the graph
  targets:
    shared: { paths: [pkg/shared] }
    api:    { paths: [internal/, cmd/], depends_on: [shared] }
    web:    { paths: [frontend/], depends_on: [shared] }
  jobs:                          # job -> the targets it tests
    test-api: [api]
    test-web: [web]
  full_suite_paths: [scripts/]  # optional: these paths run every job
  extract:                      # optional: see "Extracted graphs"
    job: impact-graph
    formats: [go]
  coverage: [test-api]          # optional: see "Coverage"
```

- A **target** owns repository paths and may `depends_on` other targets. A change to a target selects it and every target that depends on it.
- A job listed under `jobs` runs when one of its targets is selected. **A job that is not listed always runs.** Keep lint, security scans, smoke tests and every check that branch protection requires out of `jobs`.
- A job that a running job `needs` always runs too.
- Unknown fields, unknown jobs or targets, a dependency cycle and a missing `graph_version` are configuration errors.

## When the full suite runs

Selection only applies to `pull_request` runs. The planner compares the pull request's base and head commits and runs every job (recording the reason) when, for example:

- the event is a push, a manual run or a replay, so every commit on `master` still runs everything;
- the configuration has no `impact:` section, or the CI configuration file itself changed;
- a changed file has no target, or a global path changed (`.github/`, `.tose/`, migrations, auth, billing or security code, dependency manifests and lockfiles, `Dockerfile`, `Makefile`, `nx.json`, `turbo.json`, or a `full_suite_paths` entry);
- the diff is empty or too large for GitHub to list (300 files), or GitHub fails;
- selection would run no job at all;
- a replay previously found a miss for this `graph_version` (see [Replay and misses](#replay-and-misses));
- an extracted graph is configured but not available for the base commit (see below);
- the job history or coverage could not be read.

Jobs that are not selected finish as **skipped**, and their Check Run is titled **Not affected**. Each run records its mode (`selected`, `selection_fallback_full` or `full`), the plan hash, the graph version and the reason.

## Extracted graphs

Writing `depends_on` by hand is what a replay miss usually catches. With `impact.extract`, a job writes the workspace graph of each commit on every push, and TOSE uses it for pull requests **based on that commit**:

```yaml
jobs:
  impact-graph:
    cache: [go]
    egress: [goproxy]
    steps:
      - run: go list -deps -test -json ./... > "$TOSE_CI_IMPACT_GO"
impact:
  graph_version: "2026-11-06"
  extract: { job: impact-graph, formats: [go] }
  targets:
    api:    { paths: [internal/, cmd/] }   # no depends_on needed for Go imports
    shared: { paths: [pkg/shared] }
  jobs:
    test-api: [api]
```

| Format | The step writes to | Command |
|--------|--------------------|---------|
| `go` | `$TOSE_CI_IMPACT_GO` | `go list -deps -test -json ./...` |
| `nx` | `$TOSE_CI_IMPACT_NX` | `npx nx graph --file="$TOSE_CI_IMPACT_NX"` |
| `turbo` | `$TOSE_CI_IMPACT_TURBO` | `npx turbo run build --dry=json > "$TOSE_CI_IMPACT_TURBO"` (a task whose `dependsOn` includes `^build`) |
| `tose` | `$TOSE_CI_IMPACT_TOSE` | any tool that writes `{"schema":"tose.impact-graph/v1","nodes":[{"name":"a","dir":"libs/a","deps":["b"]}]}` |

`extract.formats` lists one to four of `go`, `nx`, `turbo` and `tose`, each once. Other workspace tools (Bazel, Gradle, pnpm workspaces without Nx or Turborepo) have no adapter yet; they can write the `tose` format.

How it works:

- **Only push runs upload a graph.** A pull request, a fork, a manual run or a replay uploads nothing, and an upload never fails the job.
- TOSE treats the upload as untrusted: it parses it, stores the normalized graph and refuses the whole file if it is too large, malformed, points outside the checkout, names a dependency the graph does not list, or contains a Go package with errors. Stored graphs are pruned after 30 days.
- A pull request uses the newest graph of each format uploaded by a push run of **its base commit**. The graph that decides therefore comes from code already on a branch, never from the pull request itself.
- **Full-suite fallback:** if a configured format has no valid graph for the base commit (none uploaded yet, or the upload was refused), the pull request runs the full suite and the reason names the format and commit.
- The graph only **adds** targets. Everything the `impact:` section selects is still selected, every changed file still needs a target, and every full-suite rule still applies.
- Uploads need `CI_IMPACT_SELECTION=true` and the CI cache bucket on the server. Uploads are not billed.

## Coverage and flaky history

Two more signals can add jobs to a selection. Neither can ever skip a job.

**Coverage.** A job listed under `impact.coverage` receives `$TOSE_CI_COVERAGE`. A step writes a Go cover profile (`go test -coverprofile="$TOSE_CI_COVERAGE" -coverpkg=./... ./...`) or an lcov tracefile there, and push runs upload it. When a pull request changes a file that the job's tests cover, that job runs even if its targets were not selected, with the reason `coverage: its tests cover changed <file>`. A file that coverage does not list proves nothing, because tests read data files and start subprocesses. Go coverage names files by import path, so it needs the `go` graph to map them; without it, Go coverage adds nothing.

**Flaky jobs.** A job that both passed and failed on the same commit (same event and base commit) in the last 30 days is **flaky**. A flaky job's passes prove nothing, so selection never skips it: it runs with the reason `flaky: passed and failed on <commit>, so it is never skipped`. History is kept per job; test results inside a job are not read.

## Replay and misses

To catch a wrong selection, TOSE replays a sample of green selective runs in full, plus any pipeline that skipped jobs and had no replay for 24 hours. A replay is a normal run: it is billed to the workspace wallet and posts Check Runs on the same commit.

If a job that selection skipped fails in the replay, the result is a **miss**. A miss turns selection off for that pipeline and `graph_version`: every later pull request runs the full suite and says why, until you fix the graph and change `graph_version`.

## Optimisation suggestions

Every hour TOSE derives suggestions from each pipeline's last 30 days of runs:

| Kind | When |
|------|------|
| `add_impact_section` | 5 or more pull request runs ran the full suite because there is no `impact:` section |
| `add_target_paths` | 3 or more runs ran the full suite because a changed file under the same directory had no target |
| `fix_graph_miss` | a replay found a skipped job failing; proposes the missing dependency and, without `extract`, extracting the graph |
| `harden_flaky_job` | a job passed and failed on the same commit; asks to make its tests deterministic, never to delete them |
| `map_job` | an unmapped job ran 5 or more times, 5 minutes or more on average |
| `split_job` | a mapped job with 2 or more targets ran in 80% or more of at least 5 selective runs, 10 minutes or more on average |

A suggestion has a title, a detail, a proposed `.tose/ci.yml` snippet and its evidence. **A suggestion never changes your pipeline.** TOSE has read-only access to your repository, so a person applies the change there. A workspace owner or admin then **accepts** the suggestion (recording that they will make the change) or **dismisses** it. A decided suggestion is not raised again.

Accepting and dismissing require a signed-in owner or admin: API keys and connected apps can read suggestions but can never decide them. See the [CI suggestions API](/api/ci-suggestions).

## Not available yet

- Co-change history (files that usually change together) is not used.
- Suggestions have no dashboard page or MCP tool yet; they are available through the API.
- The dependency cache is unchanged by selection: it stays keyed by workspace and pipeline, and forks never run.
