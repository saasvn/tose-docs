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

Any `APP_ENV` value other than exactly `production` (including `prod`, `Production` and `staging`, or unset) skips this check, and the API falls back to local development
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

For REST requests the API reads credentials only from the `X-API-Key` header, `Authorization: Bearer` and the
`tose_token` cookie. It rejects `api_key`, `access_token` and `tose_sk_` values in the query
string with `400 credentials_in_url`, and its access log records the path without the query
string. If your reverse proxy or load balancer logs full URLs, those logs are outside the API's
control, so disable query logging there too. See [Authentication](/api/authentication).

## Optional operator settings {#optional-operator-settings}

Both settings are off unless you set them.

| Variable | Default | Effect |
|----------|---------|--------|
| `POST_DEPLOY_HEALTH_GATE_ENABLED` | `false` | Set to `true` to check the deployed image's Kubernetes readiness for 10 seconds after each successful rollout. The result is stored on the deployment and emitted as an operations event. A failed check never rolls back or stops the deployment. See [Post-deploy health gate](/api/projects#health-gate) |
| `OPS_RETENTION_DAYS` | unset (keep forever) | A positive whole number of days of completed operations history to keep. `0` or unset deletes nothing; an invalid value stops the API at startup |

Retention deletes old sent `ops_outbox` rows, standalone `info` events and resolved incidents with their timeline. It keeps open incidents, standalone `warning` and `critical` events, and any incident with a recent entry, event or outstanding notification. It first runs ten minutes after startup and then hourly, in batches of at most 500 rows. Deleted history cannot be restored by raising the value later, so choose the window and take a database backup first. Check `[ops-retention]` in the backend log to see what ran. Deleting a workspace removes its operations history in the same transaction.

## Publish the API contract

The API serves its OpenAPI spec at `/api/openapi.yaml`, so a self-hosted instance documents
itself. Generate clients against your own base URL. See the [REST API reference](/api/reference).

## Related documentation

- [Authentication](/api/authentication)
- [Errors](/api/errors)
