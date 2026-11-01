# Blog, widgets and editorial MCP

::: warning Not available yet
A dynamic blog, the widget catalog and an editorial MCP server are **planned, not shipped**. No such tools or endpoints exist in the TOSE app today. This page records the plan and the boundaries so nobody confuses it with a live feature. It becomes a full guide when each phase ships.
:::

## What is planned

| Area | Plan |
|------|------|
| Blog model | Posts with revisions, assets and widget blocks, a schema version, a workflow of draft, review, publish or schedule, archive, and VI/EN content. |
| Widgets | Image, gallery, video, YouTube, social embed, quote, code, chart, workflow, diagram, survey and sandbox blocks, each with attributes, fallback, accessibility and security rules. |
| Editorial MCP | OAuth-protected tools to list, read, draft, update, publish and schedule posts, validate widgets, upload assets and read an audit trail. |

Tool names, scopes and examples will be published only after they run against the shipped implementation.

## Three different MCP surfaces

| Surface | Status | Purpose | Documentation |
|---------|--------|---------|---------------|
| TOSE deployment MCP server (`tose-app`) | Live | Plan, approve and run deployments with scoped OAuth access | [Protocol, OAuth and scopes](/mcp/oauth), [Agent access](/mcp/agent-access) |
| Browser WebMCP on the public site (`tose-web`) | Experimental, off by default | Three public tools in a supporting browser: estimate deployment cost and list pages (read-only), and open a page (client-side navigation). No sign-in, no API calls | The site repository's `docs/webmcp.md` |
| Editorial blog MCP server | Planned | Manage blog content | This page |

The deployment server does not manage blog content, and WebMCP never touches an account.

## See also

- [Referral program](./referral)
