# Agent access in the dashboard

**Agent access** is a section of your workspace settings where you connect AI agents, see what each one may do, revoke connections and review what they did.

## Connect an agent

1. Open your workspace **Settings** and find **Agent access**.
2. Copy the **MCP server URL** with **Copy URL**.
3. Add it to your client, then sign in to TOSE when the client asks, pick the workspace and choose what to allow.

| Client | Steps |
|--------|-------|
| Claude | Settings, Connectors, Add custom connector, paste the URL. |
| ChatGPT | Settings, Apps & Connectors, Create (developer mode), paste the URL, then sign in with OAuth. |
| Cursor | Add `{"mcpServers":{"tose":{"url":"<MCP server URL>"}}}` to `~/.cursor/mcp.json`. |
| VS Code | Run **MCP: Add Server**, choose HTTP and paste the URL. |

If the section says the MCP connector is not enabled, that server has it switched off. Agents can still use a workspace API key with the CLI or API.

## What an agent can be allowed to do

The settings page shows the scope table: which scopes exist, which change production and who can grant them. The scopes are the same as in [OAuth scopes](./oauth#scopes). Members, billing, environment variables, databases and infrastructure are never available to agents, and write scopes need an owner or admin.

## Your connected agents

The list shows the connections you authorized: client, workspace, scopes, last used, and expiry. **Revoke** signs that agent out at once.

## Audit history

**Your recent agent activity in this workspace** lists every tool call an agent made with your connections, with time, tool, project, outcome and client. Arguments and results are not stored.

## Agent tasks and Copy for agent

On a project page:

- **Agent tasks** lists deploys and rollbacks your agents asked for, with their status and links to approve or view the deployment. Nothing runs until you approve. See [Tasks](./tasks).
- **Copy for agent** copies safe project context to paste into an agent: slugs, links and the latest deployment. It contains no secrets.
