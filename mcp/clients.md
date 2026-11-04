# Client compatibility

The connector works with any client that supports remote MCP over Streamable HTTP with OAuth, because it depends on none of the optional features below. The full, maintained table is [`docs/mcp-client-matrix.md`](https://github.com/saasvn/tose-app/blob/master/docs/mcp-client-matrix.md) in tose-app.

## Verified against real clients

**None.** The matrix marks a client as verified only after someone connects it and records the date and version. No real agent client runs in TOSE's automated tests, so none is listed as verified. Claude, ChatGPT, Cursor, VS Code and MCP Inspector are all expected to work from their vendors' documentation, not from a TOSE test.

A result is recorded in the matrix by a TOSE maintainer, with the date and client version.

## ChatGPT

ChatGPT connects through a Client ID Metadata Document (`https://chatgpt.com/oauth/client.json`) and authenticates at the token endpoint with `private_key_jwt` (RS256, keys from the document's `jwks_uri`). It needs no registration. TOSE lists `private_key_jwt` in `token_endpoint_auth_methods_supported`. ChatGPT is not yet marked verified: that needs a recorded connection date and client version.

## What the server offers

These are checked by TOSE's automated tests against the server, not against a client:

| Feature | Status |
|---------|--------|
| Streamable HTTP, stateless | Offered |
| Protocol revisions 2026-07-28 and the 2025 and 2024-11-05 revisions | Offered |
| Client ID Metadata Documents and dynamic registration | Offered |
| `insufficient_scope` step-up | Offered |
| [Tasks](./tasks) for deploy and rollback | Offered, with no task status notifications |
| [Apps](./apps) views | Offered |
| [Skills](./skills) | Offered |
| Prompts, resource subscriptions, task notifications | Not offered |

## What happens when a client lacks a feature

- **No Tasks:** after you approve the plan, `deploy_project` returns at once with a deployment ID, and the agent polls `get_deployment_status` until it is finished.
- **No Apps:** the plan and status come back as plain text. You approve on the approval page in your browser, and you can open that link yourself.
- **No Skills:** the server instructions and tool descriptions carry the same plan, approve, run and poll workflow.
- **Older protocol revision:** the client gets the same tools; only the refused-write signal differs (see [step-up](./oauth#insufficient-scope-step-up)).
