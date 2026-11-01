# REST API Reference

The TOSE API is described by one versioned OpenAPI 3.1 contract. The API serves it, and the TOSE
CLI, the MCP connector and this site validate against the same file. This page does not list
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

## Related documentation

- [Authentication](/api/authentication)
- [Errors](/api/errors)
- [Cloud Desktops API](/api/desktops)
- [Disks, Volumes & Pricing API](/api/disks)
- [Self-hosting](/guide/self-hosting)
