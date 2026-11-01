# Self-hosting

This page covers the configuration the TOSE API needs when you run it yourself in production.
Source and deployment files live in [`saasvn/tose-app`](https://github.com/saasvn/tose-app).

## Required secrets in production

When `APP_ENV=production`, the API checks its configuration at startup and **refuses to start**
if any of these is unset. The startup error names every missing key.

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Signs session tokens. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `ENCRYPTION_KEY` | Encrypts stored secrets such as kubeconfigs and environment variables. The cipher key is its SHA-256. |

Outside production (`APP_ENV` unset or `development`) the API falls back to local development
values for `JWT_SECRET` and `DATABASE_URL`, and the check passes. Never rely on those fallbacks
for a real deployment. The default is `development`, so set `APP_ENV=production` explicitly.

Generate strong random values, store them in a secret manager, and never commit them.

```bash
export APP_ENV=production
export JWT_SECRET="$(openssl rand -hex 32)"
export ENCRYPTION_KEY="$(openssl rand -hex 32)"
export DATABASE_URL="postgres://user:password@db.internal:5432/tose?sslmode=require"
```

### Keep `ENCRYPTION_KEY` stable

It encrypts kubeconfigs, project and template variables and database backups. Changing it makes
existing encrypted data unreadable, and there is no re-encryption tool. Back it up with the
database, and run `cmd/seed` with the same value.

### Hosts that ran without `ENCRYPTION_KEY`

Earlier builds derived the encryption key from `JWT_SECRET` when `ENCRYPTION_KEY` was unset. Their
data is encrypted with that key. Before you deploy a build with the production check, set
`ENCRYPTION_KEY` to the exact current `JWT_SECRET` value in the same configuration source. After
that, `JWT_SECRET` can be rotated without losing data.

## Credentials stay out of URLs and logs

The API reads credentials only from the `X-API-Key` header, `Authorization: Bearer` and the
`tose_token` cookie. It rejects `api_key`, `access_token` and `tose_sk_` values in the query
string with `400 credentials_in_url`, and its access log records the path without the query
string. If your reverse proxy or load balancer logs full URLs, those logs are outside the API's
control, so disable query logging there too. See [Authentication](/api/authentication).

## Publish the API contract

The API serves its OpenAPI spec at `/api/openapi.yaml`, so a self-hosted instance documents
itself. Generate clients against your own base URL. See the [REST API reference](/api/reference).

## Related documentation

- [Authentication](/api/authentication)
- [Errors](/api/errors)
