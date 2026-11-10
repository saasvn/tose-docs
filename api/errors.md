# Errors

Every JSON error response from the TOSE API has the same envelope.

```json
{
  "error": "Project not found",
  "code": "not_found",
  "message": "Project not found",
  "request_id": "0f8fad5b-d9cb-469f-a165-70867728950e",
  "retryable": false,
  "doc_url": "https://docs.tose.sh/api/errors#not_found"
}
```

| Field | Description |
|-------|-------------|
| `code` | Stable, machine-readable code, snake_case (deploy, rollback and the redeploy balance check use UPPER_SNAKE_CASE). Branch on this. |
| `message` | Human-readable text. The wording can change, so do not parse it. |
| `request_id` | ID of the failed call. It equals the `X-Request-ID` response header. Quote it to support. |
| `retryable` | `true` when repeating the same request unchanged may succeed. |
| `details` | Optional extra context for some codes. |
| `doc_url` | Link to the entry for this code on this page. |
| `error` | Same text as `message`. It stays for older clients. |

Success responses, streams and WebSocket upgrades do not use the envelope.

```typescript
const res = await fetch(url, { headers: { 'X-API-Key': key } })
if (!res.ok) {
  const err = await res.json()
  if (err.retryable) {
    // wait, then retry with backoff
  } else if (err.code === 'credentials_in_url') {
    // fix the client: send the key in the X-API-Key header
  }
  console.error(err.code, err.request_id)
}
```

## REST API codes

Each HTTP status maps to a default code. A handler can return a more specific code for the same
status, such as `credentials_in_url` for `400`.

### `invalid_request` {#invalid_request}

`400`. The request is malformed or fails validation. Fix the request. Not retryable.

### `credentials_in_url` {#credentials_in_url}

`400`. The query string carries an `api_key`, `apikey`, `x-api-key` or `access_token` parameter,
or a value that starts with `tose_sk_`. The API rejects the request before authentication and
never uses the secret. Send the API key in the `X-API-Key` header, or a session token in
`Authorization: Bearer`. Rotate any key that was sent in a URL. See
[Authentication](/api/authentication#credentials-in-url).

### `unauthenticated` {#unauthenticated}

`401`. No credential, or the credential is invalid, revoked or expired. Send a valid one.

### `payment_required` {#payment_required}

`402`. The workspace wallet does not have enough balance for the action. Add funds, then retry.

An agent request that would exceed a hard budget, or find the wallet empty, returns `402` with the code `budget_exhausted`. Raise the budget or add funds, then retry. See [Agent usage and budgets API](/api/agent-usage#budgets).

### `forbidden` {#forbidden}

`403`. The credential is valid but may not do this. An API key works only for its own workspace,
and some actions need the owner or admin role. A signed-in user who is not a member of a
workspace gets `404 not_found` instead.

### `insufficient_scope` {#insufficient_scope}

`403`. The key or session lacks a required scope. The response names it in `required_scope`.
A key cannot create another key with scopes it does not have.

### `not_found` {#not_found}

`404`. The workspace, project or other resource does not exist, or you cannot see it.

### `method_not_allowed` {#method_not_allowed}

`405`. The route does not support this HTTP method.

### `timeout` {#timeout}

`408`. The server timed out waiting for the request. Retryable.

### `conflict` {#conflict}

`409`. The request conflicts with the current state, for example another operation on the same
project is running.

### `gone` {#gone}

`410`. The resource existed and was removed.

### `payload_too_large` {#payload_too_large}

`413`. The request body is larger than the API accepts.

### `unsupported_media_type` {#unsupported_media_type}

`415`. The route takes a JSON body, and the request sent one without `Content-Type: application/json`. The CI write routes answer this way. Send the header and repeat the request. A JSON body with unknown fields or trailing data is `400 invalid_request`. Approving or rejecting an autoscaling budget plan uses the upper-case [`UNSUPPORTED_MEDIA_TYPE`](#UNSUPPORTED_MEDIA_TYPE) instead.

### `validation_failed` {#validation_failed}

`422`. The body is well formed but a field is not acceptable. Read `message` and `details`.

### `locked` {#locked}

`423`. The resource is locked.

### `rate_limited` {#rate_limited}

`429`. Too many requests. Wait, then retry with backoff. Retryable.

### `internal_error` {#internal_error}

`500`. Unexpected server failure. Quote `request_id` if it persists.

### `not_implemented` {#not_implemented}

`501`. The operation is not available.

### `upstream_error` {#upstream_error}

`502`. The Kubernetes cluster or another upstream service rejected or failed the operation. Safe
to retry.

### `unavailable` {#unavailable}

`503`. A required integration, such as the GitHub App, is not configured or not reachable.
Retryable.

### `upstream_timeout` {#upstream_timeout}

`504`. An upstream service did not answer in time. Retryable.

Any other error status uses the code `http_<status>`.

## Deploy action codes

`POST .../deploy` and `POST .../deployments/{id}/rollback` report their own code in UPPER_SNAKE_CASE, not a code derived from the HTTP status. `POST .../redeploy` does so only for `INSUFFICIENT_BALANCE`; its other errors keep the snake_case codes above. Access errors on all three routes (`not_found`, `forbidden`) are snake_case too. The MCP tools `deploy_project` and `rollback_deployment` report the same codes. The envelope is unchanged, so the `doc_url` of each error ends in the anchor below, for example `https://docs.tose.sh/api/errors#INSUFFICIENT_BALANCE`.

Clients that compared `code` with `payment_required`, `unavailable`, `invalid_request`, `not_found` or `internal_error` on deploy and rollback must compare with the codes below instead. On redeploy only `payment_required` changed, to `INSUFFICIENT_BALANCE`. Every other route keeps the snake_case codes above.

### `INSUFFICIENT_BALANCE` {#INSUFFICIENT_BALANCE}

`402`. The workspace wallet is empty (zero or negative balance) or missing, so the deployment was refused and none was created. A workspace owner tops up the wallet in the billing page, then repeats the request. Not retryable until the balance is positive. See [Pricing](/guide/pricing).

When [autoscaling budgets](/guide/autoscaling-budgets) are on, the same code also means an increase would break the 72-hour floor reserve. The response then carries `details`:

```json
{ "project_slug": "api", "reason": "floor_reserve", "reserve_target_nano_usd": 1440000000, "coverage_hours": 40 }
```

Top up the wallet, or lower the project floors, then repeat the request.

### `UNAVAILABLE` {#UNAVAILABLE}

`503`. The GitHub App is not configured on this TOSE instance, so the head commit cannot be read. `retryable` is `true`. Nothing was created. Retry later; on a self-hosted instance, configure the GitHub App.

### `NO_GIT_CONNECTION` {#NO_GIT_CONNECTION}

`400`. The project has no Git repository connected, so there is nothing to build. Connect a repository, then deploy again.

### `NO_SERVER` {#NO_SERVER}

`400`. The project has no server (Kubernetes cluster) configured. Assign a server to the project, then deploy or roll back again. Redeploy answers `400 invalid_request` in this case.

### `INVALID_REPO` {#INVALID_REPO}

`400`. The connected repository name is not in the form `owner/name`. Disconnect and connect the repository again.

### `NO_IMAGE` {#NO_IMAGE}

`400`. Rollback only: the target deployment has no built Docker image, for example because its build failed. Pick an earlier deployment that was built.

### `NOT_FOUND` {#NOT_FOUND}

`404`. Rollback only: the deployment id does not exist in this project. A project or workspace you cannot see uses the snake_case `not_found` instead. The [autoscaling budget routes](/api/autoscaling-budget) also return `NOT_FOUND` for a project or plan that does not exist in the workspace.

### `UPSTREAM_ERROR` {#UPSTREAM_ERROR}

`500`. GitHub did not give a client or the head of the branch, for example because the installation lost access. Check that the GitHub App can still read the repository, then retry. `retryable` is `false`.

### `INTERNAL` {#INTERNAL}

`500`. Unexpected server failure while recording the deployment or the rollback. Quote `request_id` to support if it persists.

### `ROLLBACK_FAILED` {#ROLLBACK_FAILED}

MCP only. `rollback_deployment` returns it when the rollback run failed; it was not retried. The message carries the run's detail. Check `get_deployment_status` to see what is serving.

The REST route `POST .../deployments/{id}/rollback` does not return this code. A REST rollback runs as a recovery runbook (plan, approval, run):

- A failed run answers `409` with the run's code (`RUNBOOK_FAILED`, or the code of the step that failed, such as `PLAN_STALE` or `INSUFFICIENT_BALANCE`) and the plan in `runbook`.
- An API key cannot approve a rollback. Its call stores the plan and answers `409 APPROVAL_REQUIRED` with `runbook` and `approval_url`; a signed-in owner or admin approves it there.
- A signed-in person needs a recent sign-in to approve a rollback, otherwise `403 REAUTHENTICATION_REQUIRED`.

## Autoscaling budget codes

These come from the [autoscaling budget](/guide/autoscaling-budgets) routes and from the endpoints that raise an allocation. They exist only on platforms that have budgets turned on. The route shapes are in the [budget API](/api/autoscaling-budget).

### `BUDGET_CAP` {#BUDGET_CAP}

`402`. The change would take spend over a budget cap, so it was refused and nothing changed. Project update, deploy, redeploy, rollback, image deploy, environment apply and runbook scale can return it. `details` names the cap and the numbers:

```json
{
  "cap": "workspace_hourly",
  "limit_nano_usd": 50000000,
  "projected_nano_usd": 60000000,
  "project_slug": "api"
}
```

`cap` is `deployment_hourly`, `deployment_monthly`, `workspace_hourly` or `workspace_monthly`. Money is in nano-USD. Not retryable as is: lower the allocation, or ask an owner or admin to raise the cap.

### `PRECONDITION_FAILED` {#PRECONDITION_FAILED}

`412`. The `If-Match` of a budget `PUT` does not match the current revision, so someone changed the budget after you read it. Nothing was written. Read the budget again and repeat the change.

### `HUMAN_APPROVAL_REQUIRED` {#HUMAN_APPROVAL_REQUIRED}

`403`. Approving or rejecting a budget plan was tried with an API key. Approval needs a person's signed-in session, in practice the dashboard. Give the `approval_url` of the plan to an owner or admin. Anything holding a person's session token or password can approve as them, so give agents an API key or the MCP connector, never a login.

### `CROSS_SITE_REQUEST` {#CROSS_SITE_REQUEST}

`403`. A `POST`, `PUT`, `PATCH` or `DELETE` was authenticated only with the session cookie, from a browser origin other than the dashboard or the API itself, or from a page marked cross-site. Nothing changed. Every signed-in route under `/api` can return it, not only the budget routes. See [Cookie writes from other sites](/api/authentication#cross-site-cookie-writes). Make the change from the dashboard itself. Requests with an API key or an `Authorization: Bearer` token are not checked.

### `UNSUPPORTED_MEDIA_TYPE` {#UNSUPPORTED_MEDIA_TYPE}

`415`. Approving or rejecting a budget plan needs `Content-Type: application/json` and a body of exactly one object, `{"plan_hash": "..."}`. Send the header and repeat the request. Trailing data after the object is `400 INVALID_ARGUMENT`.

### `PLAN_STALE` {#PLAN_STALE}

`409`. The budget changed after the plan was made, so approving it could undo that change. `details` holds `base_revision` and `current_revision`. Make a new plan from the current budget.

### `PLAN_HASH_MISMATCH` {#PLAN_HASH_MISMATCH}

`409`. The `plan_hash` sent with an approval or a rejection does not match the plan. Nothing was applied. Read the plan again and send its own hash.

### `PLAN_EXPIRED` {#PLAN_EXPIRED}

`410`. The plan is past its 30-minute life and can no longer be approved. Make a new plan.

### `PLAN_CLOSED` {#PLAN_CLOSED}

`409`. The plan was already applied or rejected. `details.status` says which. A closed plan cannot be reopened; make a new one if the change is still needed.

### Budget codes from the MCP tools {#mcp-budget-codes}

`deploy_project` and `deploy_image` check the budget like the REST routes and return `BUDGET_CAP` or `INSUFFICIENT_BALANCE`. If the budget cannot be checked (a database error), they start nothing and return [`UNAVAILABLE`](#UNAVAILABLE) with no HTTP status. It is retryable: try again shortly. `autoscaling_budget_get` and `autoscaling_budget_plan` return `INVALID_ARGUMENT` and `NOT_FOUND`.

## MCP tool errors

The MCP connector reports tool failures with a code in UPPER_SNAKE_CASE. Deploy and rollback share
the codes of the deploy action section above; the rest are separate from the REST codes. A tool that changes something first returns a plan, and the user approves
it before it runs.

### Approval

| Code | Meaning | What to do |
|------|---------|------------|
| `APPROVAL_PENDING` | The user has not approved the plan yet. | Ask the user to approve it at the link in the message, then call again. |
| `APPROVAL_EXPIRED` | The plan was not approved in time. Nothing changed. | Call the tool again without `approval_token` for a new plan. |
| `APPROVAL_DECLINED` | The user declined the plan. Nothing changed. | Do not retry unless the user asks. |
| `APPROVAL_INVALID` | The `approval_token` is not valid or was issued for a different action. | Call without it for a new plan. |
| `APPROVAL_USED` | The approval was declined or already used without producing a deployment. | Request a new plan. |

### Access

| Code | Meaning | What to do |
|------|---------|------------|
| `INSUFFICIENT_SCOPE` | The connection lacks the scope for this tool. A read-only connection cannot deploy or roll back. | Reconnect and allow the missing scope. |
| `FORBIDDEN` | The connected user may not do this, for example is no longer a workspace member, or is not an owner or admin for a deploy. | Use a user with the right role. |
| `UNAUTHENTICATED` | The connection has no valid credential. | Reconnect. |

### Deployment

| Code | Meaning | What to do |
|------|---------|------------|
| `DEPLOY_FAILED` | The deployment ended in a failed state. The message names the status and reason. | Read the build logs with `read_logs` and `source=build`. |
| `DEPLOY_IN_PROGRESS` | Another deployment of the project is still running. | Wait with `get_deployment_status`. |
| `NO_GIT_CONNECTION` | The project has no Git repository. | Connect one in the dashboard. |
| `NO_SERVER` | The project has no server configured. | Configure one in the dashboard. |
| `NO_IMAGE` | The deployment has no built image to roll back to. | Pick one where `inspect_deployment` shows `can_rollback_to=true`. |

### General

| Code | Meaning |
|------|---------|
| `INVALID_ARGUMENT` | A tool argument is missing or wrong. |
| `NOT_FOUND` | The project or deployment does not exist. |
| `CONFLICT` | Another operation on the project is in progress. Try again shortly. |
| `UNAVAILABLE` | A dependency is not reachable. Nothing was changed. Retry. |
| `UPSTREAM_ERROR` | An upstream service, such as the Git host, failed. |
| `INTERNAL` | Unexpected server error. |
