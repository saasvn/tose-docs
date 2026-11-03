# Template deploy and resume API

Endpoints that start a template instance: deploy, and "issue token and resume" for a suspended Dewee or GoClaw instance. Both live under `/api/workspaces/{slug}/templates/{template_slug}`, use the same [authentication](/api/authentication) as the rest of the API, and need the workspace **owner** or **admin** role (and the `deployments:execute` scope for an API key). The OpenAPI spec lists the full request and response fields.

## Deploy a template {#deploy}

`POST /api/workspaces/{slug}/templates/{template_slug}/deploy` queues a deployment and returns it with status `pending`. Poll the deployment or stream its logs until it is `running` or `failed`.

### Suspended templates need a balance {#suspended-needs-balance}

When the wallet runs out, billing sets templates to `suspended`. A deploy restarts compute, so a template in status `suspended` can only be deployed with a **positive wallet balance**.

| Status | Meaning |
|--------|---------|
| `402` | The template is `suspended` and the wallet balance is not positive. The body carries code `INSUFFICIENT_BALANCE`. No gateway token is issued, nothing is queued, and the template stays `suspended`. Top up, then deploy again. |
| `409` | The deploy read the template before billing suspended it, so it raced the suspension. Nothing was queued; retry the request and it is checked against the balance. |

Templates in any other status deploy as before, whatever the balance. Other errors of this endpoint (`400`, `404`, `409`) are covered in the OpenAPI spec.

## Issue token and resume {#resume}

`POST /api/workspaces/{slug}/templates/{template_slug}/resume` restarts a **suspended** Dewee or GoClaw instance that billing could not bring back (see [Dewee and GoClaw instances after a top-up](/guide/pricing#suspended-gateway-templates)).

It accepts the same body as [Deploy](#deploy), needs the same role and action (`deployment.execute`, so the request is in the API audit log), and runs the normal redeploy pipeline: the gateway token is issued or kept, and the workload Secret and Deployment are rewritten by the pipeline. The deployment history records the trigger `resume_with_token` and the user who started it.

After it, clients must send the issued token, and active sessions end when the pod restarts. Workspace admins can read the token under the template's variables.

| Status | Meaning |
|--------|---------|
| `201` | Deployment queued, returned in status `pending` like Deploy. |
| `400` | The template is not Dewee or GoClaw, so it has no gateway token. |
| `402` | The wallet balance is not positive (`INSUFFICIENT_BALANCE`). |
| `409` | The template is not `suspended` (use Deploy instead), or a concurrent resume, deploy or top-up claimed it first. |
| `422`, `409`, `500` | The stored gateway token is invalid, conflicting or could not be checked; see [Gateway token codes](#gateway-token-codes). |

## Gateway token codes {#gateway-token-codes}

Dewee and GoClaw are never started without a valid gateway token, because an instance without one would be reachable without authentication. When the check fails, the instance is not restarted, and Deploy and Resume return the code (a missing token is not an error there, because they issue one), and billing records it as a failed `system` entry in the deployment history when it declines to resume. No code, message or log line contains the token.

| Code | HTTP | Meaning | What to do |
|------|------|---------|------------|
| `GATEWAY_TOKEN_MISSING` | none (history only) | No token is stored, or the running workload does not read its `<deployment>-env` Secret, or that Secret has no valid `GOCLAW_GATEWAY_TOKEN`. A token saved in the variables but not yet deployed does not count. | Use **Issue token and resume**, or redeploy. |
| `GATEWAY_TOKEN_INVALID` | 422 | The stored token is empty, a placeholder, shorter than 32 characters, longer than 256, or malformed. | Set a new `GOCLAW_GATEWAY_TOKEN` (32 or more random characters) and redeploy. |
| `GATEWAY_TOKEN_CONFLICT` | 409 | `GOCLAW_GATEWAY_TOKEN` and `DEWEE_GATEWAY_TOKEN` are both set to different values. | Set both to the same value, or keep only one. |
| `GATEWAY_TOKEN_UNAVAILABLE` | 500 | The token could not be checked or stored. | Retry; contact support if it persists. |

`GATEWAY_TOKEN_REQUIRED` (409) is a different case: deleting the `GOCLAW_GATEWAY_TOKEN` variable of a Dewee or GoClaw instance is refused. Set a new value to rotate it.

When billing leaves an instance suspended, the workspace owner also gets an email with a link to the instance. The history entry and the email are not repeated for the same instance and reason within 24 hours.
