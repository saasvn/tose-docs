# Public MCP routes of the Dewee template

A Dewee template instance runs a gateway in front of the Dewee runtime. The gateway forwards a fixed set of MCP and OAuth discovery paths to the runtime and nothing else under `/mcp/`. This page lists those paths and explains when each one answers.

This is about the MCP server **inside your Dewee instance**. It is not the TOSE platform MCP connector described in [Protocol, OAuth and scopes](./oauth).

## Routed paths

| Path | Purpose |
|------|---------|
| `/mcp/server` | The canonical public MCP endpoint (streamable HTTP). Use this URL in clients. |
| `/mcp` | Legacy MCP endpoint. A plain browser page load (`GET` or `HEAD` with `Accept: text/html`, no bearer token and no `Mcp-*` header) still opens the dashboard. |
| `/mcp/workspace` | Workspace-management MCP endpoint. |
| `/.well-known/oauth-protected-resource[/...]` | OAuth protected-resource metadata. Only the `/mcp/server` document exists; the other paths return a JSON `404`. |

## When a route answers

The gateway only routes. The Dewee runtime decides whether each route is on, and it authenticates the request:

| State | Result |
|-------|--------|
| Public MCP is off | These paths return `404`. |
| Public MCP is on, token missing or wrong | `401` with a `WWW-Authenticate` header. |
| Public MCP is on, valid token | The request is served. |

The `/mcp/server` route follows the public MCP flag. OAuth discovery depends on the OAuth setting, and `/mcp/workspace` depends on the workspace MCP setting. Rate limits and CORS also come from the runtime, so the gateway adds no CORS headers.

## Paths that are never exposed

`/mcp/bridge` is the internal bridge, protected by the gateway token. It is never proxied. Every other path under `/mcp/` returns `404` from outside the container, including paths written with `..`, `//` or percent-encoding to reach a routed path.

## Streaming

MCP routes are passed through without buffering or compression, so server-sent events (SSE) arrive as they are produced, and connections may stay open for a long time.

## Check the routes

From outside the instance, with a placeholder host and token:

```bash
# Public MCP off: 404. On, no token: 401 with WWW-Authenticate.
curl -i https://<your-instance-domain>/mcp/server

# The internal bridge is never reachable: 404.
curl -i https://<your-instance-domain>/mcp/bridge
```

See [Agent access](./agent-access) for the platform connector and [OAuth scopes](./oauth#scopes) for how tokens are issued there.
