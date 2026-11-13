---
title: "Integrate with the TOSE REST API"
description: "Call the TOSE REST API from a script or service: get the OpenAPI spec, authenticate with an API key, start a deployment and poll it until it runs."
---

# Integrate via the REST API

Use the TOSE REST API from a script or service: read the contract, authenticate, start a deployment and check its result.

## Prerequisites

- An API key for the workspace (starts with `tose_sk_`). Create it in the dashboard under **Settings → API Keys**; see [API keys and scopes](/api/api-keys).
- The workspace slug and project slug, and a project with a Git connection and a server.
- `curl`, or any HTTP client.

## Input

| Value | Value to use |
|-------|--------------|
| Base URL | `https://api.tose.sh` |
| Contract | `https://api.tose.sh/api/openapi.yaml` (OpenAPI 3.1, public) |
| Credential | Header `X-API-Key: <key>`. Never in the URL |

## Steps

1. Download the contract and use it as the reference for paths, parameters and schemas:

   ```bash
   curl -sS https://api.tose.sh/api/openapi.yaml -o tose-openapi.yaml
   ```

2. Keep the key in an environment variable and check it:

   ```bash
   export TOSE_API_KEY=tose_sk_xxxxxxxxxxxx
   curl -sS https://api.tose.sh/api/workspaces -H "X-API-Key: $TOSE_API_KEY"
   ```

3. Start a deployment of the connected branch head (`deployProject`):

   ```bash
   curl -sS -X POST \
     https://api.tose.sh/api/workspaces/my-workspace/projects/my-app/deploy \
     -H "X-API-Key: $TOSE_API_KEY"
   ```

   The answer is `201` with the new deployment in status `pending`. Note its `id`.

4. Poll the deployment (`getDeployment`) until it is final:

   ```bash
   curl -sS \
     https://api.tose.sh/api/workspaces/my-workspace/projects/my-app/deployments/DEPLOYMENT_ID \
     -H "X-API-Key: $TOSE_API_KEY"
   ```

## Expected outcome

The status moves `pending` → `building` → `deploying` and ends in `running`, or in `failed` or `stopped`. Build logs are at `GET .../deployments/{id}/logs`.

## Verify

- `GET .../projects/{project_slug}/status` shows the project and its pods.
- `GET .../projects/{project_slug}/deployments` lists deployments newest first.
- Every response has an `X-Request-ID` header; keep it for support.

## Permissions and security

- A key belongs to one workspace. Deploying needs the owner or admin role and, for a scoped key, `deployments:execute`.
- A request with the key in the query string is refused with `credentials_in_url`. Send it in the header.
- Give automation a scoped key, store it as a secret, and rotate it; see [Recommended practice](/api/api-keys#recommended-practice).
- Changes made with a key are recorded in the [audit log](/api/audit).

## Retry safely

`POST .../deploy` is **not idempotent**: every call creates a new deployment and queues another build. Before you retry a deploy whose answer you did not get, list `GET .../deployments` and look for the deployment the first call may have created. Endpoints that accept an `Idempotency-Key` header, such as `deploy-image`, are named in the contract.

## Common errors

Every error has a JSON envelope with a stable `code`. Branch on `code`, not on the message.

| Status | `code` | What to do |
|--------|--------|------------|
| 401 | `unauthenticated` | Missing or invalid key. |
| 402 | `payment_required` | Top up the workspace wallet. |
| 403 | `forbidden`, `insufficient_scope` | Role or key scope is not enough. |
| 404 | `not_found` | Check the workspace and project slugs. |
| 409 | `conflict` | For example a deployment already in progress; wait and check. |

All codes: [Errors](/api/errors).

## Next steps

- [Generate a typed client](/api/reference#generate-a-client)
- [Authentication](/api/authentication)
- Let an AI agent do this with approvals: [Connect an AI agent](/guide/connect-an-agent)
