# CI in the dashboard

The workspace dashboard has CI pages for pipelines, run plans, run status, job logs, diagnosis, usage and budget caps. They use the same workspace CI routes as an API key, signed in as you, so the server still checks your role on every action and the dashboard can do nothing the API does not allow. The routes and MCP tools are described in the [TOSE CI reference](https://github.com/saasvn/tose-app/blob/master/docs/ci.md#dashboard).

## Open CI {#open}

Choose **CI** in the workspace sidebar (`/w/{slug}/ci`). The tabs are **Pipelines**, **Usage**, **Budget caps** and **Agent profiles**. Agent profiles is marked "Soon": its page says it is not available yet.

## Pipelines {#pipelines}

The Pipelines tab lists each pipeline with its newest run and a **Run** button. A disabled pipeline cannot be run.

If the list is empty, no repository is connected yet. Connecting a repository (onboarding) is still done through the admin API by an operator; the dashboard has no onboarding step.

Open a pipeline to see:

- **The plan of the next manual run.** Whether it can run, the blockers if it cannot, each job's CPU, memory, timeout and worst-case cost, the total and your wallet balance.
- **The pipeline's caps** with their state and a link to edit them.
- **Its runs**, with a **Load more** button.

## Start a manual run {#run}

1. Open the pipeline and select **Run**. The dashboard first fetches the plan. If the run would be refused, it shows why and starts nothing.
2. Otherwise a confirmation dialog shows the commit, branch, repository, the worst-case cost of the run and its largest job, and the prepaid rule: nothing is reserved until each job starts, and a job whose worst case does not fit the wallet or a cap is refused, never run on credit.
3. Confirm to start the run. You land on the run page.

A manual run repeats a commit TOSE already recorded from a push or pull request on the pipeline; it cannot bring in new code or run a fork.

### Retries are safe {#retries}

When you confirm, the dashboard pins the commit you saw and sends the request with an `Idempotency-Key`. If the request fails with a network error or a server error (5xx), the same commit and key are sent again on your next attempt, without asking again and even if a newer commit has arrived since. The API returns the first run instead of starting a second one, and the dashboard says the run was already started. A refusal that cannot be fixed by retrying (a `402`, `409` or `422`, for example) drops the pinned request, so the next attempt fetches a fresh plan.

Refusals are explained in plain text: `402` for the wallet or a budget cap, `409` for CI turned off or a disabled pipeline, `422` for a commit that was not recorded, `429` when 10 manual runs of the workspace are already unfinished, and `403 person_required` when an action needs a signed-in owner or admin.

## Inspect a run and a job {#inspect}

Select a run to open its page (`/w/{slug}/ci/runs/{id}`). It shows:

- **Summary.** Status, commit, branch, trigger and pull request, cost and run time, and links to the GitHub checks and the pipeline.
- **Job graph.** Jobs are drawn in layers from each job's `needs`.
- **Each job.** Its steps with exit codes, the reason it ended, the attempt number, flags for a platform problem or a job that needs review, and whether it was charged.
- **Stored log.** Select the log toggle on a job to load the stored, redacted log tail. It is shown as plain text and labelled as untrusted output of the code under test.
- **Diagnosis.** For a run that did not pass, why each job failed, with a hint and the failing step.

The page refreshes every 5 seconds until the run finishes and stops when you leave it.

A run that succeeded with skipped jobs is shown as "Passed with skipped jobs" in warning colours, never as a plain pass. A job that needs review also keeps the run from showing as passed.

### Retry or cancel a run {#retry}

- **Run again** records a new manual run of the same commit. It shows the plan and asks for confirmation exactly like **Run**, and retries safely in the same way.
- **Cancel** asks for confirmation, then stops the queued and running jobs. Running jobs are billed for the seconds they ran.

A failing step is never retried inside a run; **Run again** starts a new run.

## Usage {#usage}

The Usage tab sums what CI spent by day, pipeline, run, job or kind over a UTC date window, with totals and a note when the rows were truncated. Pipeline rows show the repository name, and run and job rows link to the run.

## Budget caps {#budget-caps}

The Budget caps tab shows the workspace-wide daily and monthly caps, the alert share and each pipeline's caps, with meters for spent, held and left.

| Your role | What you can do |
|-----------|-----------------|
| Member | Read caps and usage. The page is read-only. |
| Owner or admin | Read, and edit caps in USD. |

When you edit:

- Amounts are checked to the cent and never rounded.
- Each save sends `If-Match`. If someone changed the caps since you loaded them, the page reloads the current values and tells you, instead of overwriting.
- Removing a cap asks for confirmation.
- A cap of 0 means no cap. The wallet balance is always the last cap.

The dashboard is a signed-in session, so an owner or admin can raise or remove a cap here, which an API key or an agent cannot do. Every change is in the workspace audit log. The cap model is explained in [the TOSE CI reference](https://github.com/saasvn/tose-app/blob/master/docs/ci.md#budget-caps).

## Not available yet {#limits}

- **Onboarding.** Connecting a repository, choosing the branch and configuration file and previewing the plan before enabling is still done through the admin API.
- **Agent profiles.** Marked "Soon" in the dashboard.
- **YAML editor and validator**, flakiness and matrix views, the rationale for selected and skipped tests, and a queue, setup, test and cleanup timeline.
- **Proposing fixes, opening issues or pull requests**, and outcome acceptance.
