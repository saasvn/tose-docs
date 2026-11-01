# Errors

Every JSON error response from the TOSE API has the same envelope.

```json
{
  "error": "Project not found",
  "code": "not_found",
  "message": "Project not found",
  "request_id": "0f8fad5b-d9cb-469f-a165-70867728950e",
  "retryable": false,
  "details": {},
  "doc_url": "https://docs.tose.sh/api/errors#not_found"
}
```

| Field | Description |
|-------|-------------|
| `code` | Stable, machine-readable code in snake_case. Branch on this. |
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
[Authentication](/api/authentication#never-put-credentials-in-the-url).

### `unauthenticated` {#unauthenticated}

`401`. No credential, or the credential is invalid, revoked or expired. Send a valid one.

### `payment_required` {#payment_required}

`402`. The workspace wallet does not have enough balance for the action. Add funds, then retry.

### `forbidden` {#forbidden}

`403`. The credential is valid but may not do this. An API key works only for its own workspace,
and some actions need the owner or admin role.

### `insufficient_scope` {#insufficient_scope}

`403`. The key or connection lacks a required scope. The response names it in `required_scope`.
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
to retry. Retryable.

### `unavailable` {#unavailable}

`503`. A required integration, such as the GitHub App, is not configured or not reachable.
Retryable.

### `upstream_timeout` {#upstream_timeout}

`504`. An upstream service did not answer in time. Retryable.

Any other error status uses the code `http_<status>`.

## MCP tool errors

The MCP connector reports tool failures with a code in UPPER_SNAKE_CASE. These are separate from
the REST codes above. A tool that changes something first returns a plan, and the user approves
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
