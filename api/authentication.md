# Authentication

Every request to the TOSE API carries exactly one credential. The API checks them in this order:

| Order | Credential | How to send it | Used by |
|-------|------------|----------------|---------|
| 1 | API key | `X-API-Key: tose_sk_...` header | Scripts, CI, the CLI |
| 2 | Session token | `Authorization: Bearer <token>` header | Apps acting for a signed-in user |
| 3 | Session token | `tose_token` cookie | Browser sessions |

::: tip Limit what a key can do
A key can be limited with scopes, and always belongs to one workspace. See [API Keys and Scopes](/api/api-keys). Every change made with a key is recorded in the [audit log](/api/audit).
:::

## API keys

```bash
curl -sS https://api.tose.sh/api/workspaces \
  -H "X-API-Key: $TOSE_API_KEY"
```

An API key belongs to one workspace. On any route that contains `{slug}` the key only works for
its own workspace, and any other slug returns `403 forbidden`. Revoked or expired keys return
`401 unauthenticated`.

### Create a key

1. Sign in to the [TOSE dashboard](https://tose.sh).
2. Open **Settings** > **API Keys**.
3. Choose **Create New API Key** and copy the key. It starts with `tose_sk_`.
4. Store it in a secret manager or an environment variable.

```bash
export TOSE_API_KEY=tose_sk_xxxxxxxxxxxx
```

::: warning
Never commit an API key. Never put it in a URL, a query string, a log line or client-side code.
:::

## Session tokens

An app that acts for a signed-in user sends the session token as `Authorization: Bearer <token>`.
Browsers use the `tose_token` cookie, which holds the same token.

## Never put credentials in the URL {#credentials-in-url}

URLs end up in proxy logs, browser history and analytics, so the API refuses credentials there. A
request is rejected with `400` and code `credentials_in_url`, before authentication runs, when its
query string has either of these:

- an `api_key` or `access_token` parameter (the check also covers `apikey` and `x-api-key`, in any case);
- any value that starts with `tose_sk_`.

```bash
# Rejected: 400 credentials_in_url
curl "https://api.tose.sh/api/workspaces?api_key=..."

# Correct
curl https://api.tose.sh/api/workspaces -H "X-API-Key: $TOSE_API_KEY"
```

```json
{
  "error": "Credentials must not be sent in the URL. Send the API key in the X-API-Key header.",
  "code": "credentials_in_url",
  "message": "Credentials must not be sent in the URL. Send the API key in the X-API-Key header.",
  "request_id": "0f8fad5b-d9cb-469f-a165-70867728950e",
  "retryable": false,
  "doc_url": "https://docs.tose.sh/api/errors#credentials_in_url"
}
```

The secret in a rejected request is never used, but it already travelled in a URL. Rotate any key
that was sent that way.

The API's access log records the request path and not the query string, so short-lived tokens
that some flows still carry in a URL do not reach the logs.

## WebSockets

WebSocket endpoints authenticate on the HTTP upgrade request with the same header or cookie.

The desktop gateway reads its session token from the `Sec-WebSocket-Protocol` list
(`tose.desktop.token.{token}`). The `?token=` query parameter is a legacy path that the API still
accepts for older clients. Do not use it in new code. See the
[Cloud Desktops API](/api/desktops#gateway).

## Authentication errors

| Status | Code | Cause | Fix |
|--------|------|-------|-----|
| 400 | `credentials_in_url` | Credential in the query string | Move it to a header |
| 401 | `unauthenticated` | No credential, or it is invalid, revoked or expired | Send a valid key or token |
| 403 | `forbidden` | The credential cannot access this workspace or action | Use a key for that workspace |
| 403 | `insufficient_scope` | The key lacks a required scope | Create a key with the scope |

See [Errors](/api/errors) for the envelope.

## CI/CD

```yaml
- name: Deploy
  env:
    TOSE_API_KEY: ${{ secrets.TOSE_API_KEY }}
  run: tose up
```

The CLI reads `TOSE_API_KEY` from the environment. See [Configuration](/guide/configuration).
