# REST API Reference

The TOSE API is described by one versioned OpenAPI 3.1 contract. The API serves it, and the TOSE
CLI and the MCP connector validate against the same file. This page does not list
endpoints by hand, because a hand-written copy drifts from the router. Read the spec instead.

## The OpenAPI spec

```
https://api.tose.sh/api/openapi.yaml
```

The spec is public, needs no credential and is cached for 5 minutes. It covers workspaces,
projects, deployments, logs, environment variables, domains, databases and wallets. A contract
test in the API repository fails when a documented operation is not routed, so every operation in
the spec exists. The source file is
[`internal/apispec/openapi.yaml`](https://github.com/saasvn/tose-app/blob/master/internal/apispec/openapi.yaml)
in `saasvn/tose-app`.

```bash
curl -sS https://api.tose.sh/api/openapi.yaml -o tose-openapi.yaml
```

Open the file in any OpenAPI viewer (Swagger UI, Redoc, Scalar, Postman or Insomnia) to browse
operations, schemas and examples.

## Generate a client

Any OpenAPI 3.1 generator works. Point it at the spec URL or at a downloaded copy.

```bash
# TypeScript types
npx openapi-typescript https://api.tose.sh/api/openapi.yaml -o tose-api.d.ts

# A full client in another language
npx @openapitools/openapi-generator-cli generate \
  -i https://api.tose.sh/api/openapi.yaml \
  -g python -o ./tose-client
```

Pin the spec version your client was generated from (`info.version`) and regenerate when it
changes. A breaking change to the contract bumps `info.version`.

## Authentication

Send exactly one credential with every request, in a header or cookie. Credentials are never
accepted in the URL.

```http
X-API-Key: tose_sk_your_api_key_here
```

See [Authentication](/api/authentication) for API keys, session tokens and the URL rule.

## Errors

Every JSON error has the same envelope with a stable `code`. Branch on `code`, never on the
message text. See [Errors](/api/errors) for the full list, including the codes of the MCP tools.

## Platform features

`GET /api/public/features` (tag `Platform`) needs no authentication and holds no account or workspace
data. It returns `{"ci": bool, "desktops": bool, "autoscaling_budget": bool}`, which optional sections this platform serves.
Responses are cached for 60 seconds. The dashboard uses it to hide **CI**, **Cloud desktops** and the
**Autoscaling** entry (see [Autoscaling budgets](/guide/autoscaling-budgets)).

## Request IDs

Every response carries an `X-Request-ID` header. Send your own to have it echoed back. Error
bodies repeat it in `request_id`. Quote it when you contact support.

## Pagination

List endpoints that page take `page` (1-based) and `limit`, and the response repeats `page`,
`limit` and `total`. Out-of-range values fall back to the defaults. Project log queries page with
a `cursor`. The spec states which endpoints page.

## Asynchronous work

`POST .../deploy` only queues a build and returns a deployment in status `pending`. Poll the
deployment until it is `running`, `failed` or `stopped`. No endpoint accepts an idempotency key,
so retrying a deploy creates another deployment. Check the deployment list before you retry.

## Stop Deployment

```http
POST /api/workspaces/:slug/projects/:projectSlug/deployments/:id/stop
```

Requires the owner or admin role. Any status other than `pending`, `cloning`, `building`, `pushing`, `deploying` or `running` returns `400`. The response is the deployment with status `stopped`.

**Stopping a `running` deployment stops the whole project.** In one locked write, TOSE records `stopped` on:

- every deployment of the project that is `running` or `deploying`, and
- every deployment of the project that is still before deploy (`pending`, `cloning`, `building` or `pushing`).

The app is scaled to zero replicas and stays there until you deploy again. Only deployments created before the Stop began are affected. A deploy requested after the Stop builds and ships normally. A stopped build gets no deploy, no email, and no success or failure event. A later redeploy never picks the image of a cancelled rollout.

**Stopping a `deploying` deployment finishes asynchronously.** The build pipeline cancels the rollout, then puts back the version that served last, if one exists. Otherwise it scales the workload to zero. If the deployment's own image is still the one serving, the row ends `running` again with the reason in `error_message`. Re-read the deployment with `GET` after a Stop, rather than trusting the status in the response.

**Response:**

```json
{
  "id": "dep_xyz789",
  "status": "stopped"
}
```

**Errors:**

| Status | Meaning |
|--------|---------|
| `400` | The deployment is not in a stoppable status |
| `502` | The cluster did not scale the app down, so nothing was recorded `stopped`. The message is `Failed to stop deployment. See the server log for details.` and never carries the cluster error. Retry |
| `503` | Nothing was stopped: the project's workload lock could not be taken within 60 seconds because a deployment step is finishing, or the database is unreachable. The response carries a `Retry-After` header |

A Stop answers within about 100 seconds. On `503`, wait the number of seconds in `Retry-After`, then send the request again. The retry is safe because nothing was stopped.

```typescript
const res = await fetch(url, { method: 'POST', headers })
if (res.status === 503) {
  const wait = Number(res.headers.get('Retry-After') ?? 5)
  await new Promise(r => setTimeout(r, wait * 1000))
  // retry the Stop request
}
```

## Related documentation

- [Authentication](/api/authentication)
- [Errors](/api/errors)
- [Cloud Desktops API](/api/desktops)
- [Disks, Volumes & Pricing API](/api/disks)
- [Autoscaling budget API](/api/autoscaling-budget)
- [Self-hosting](/guide/self-hosting)
