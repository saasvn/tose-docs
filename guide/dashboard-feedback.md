# Report a problem from the dashboard

You can report a bug or request a feature without leaving the dashboard. Reports go to the TOSE team through the same service as the [Feedback API](/api/feedback): secrets and personal data are removed, the report is routed, and accepted ones are published as GitHub issues.

::: warning Availability
The page is shown only when feedback is enabled on your deployment. Where it is off, the links are hidden and the page says feedback is not available.
:::

## Where to find it

Open `/w/{slug}/feedback` from the **Feedback** link in the header or from the user menu. On a failed deployment, **Report this problem to TOSE** opens the same form with the page you came from, the area `deployments` and the error code `deployment_failed` filled in.

## Send a report

1. Choose the **Type** and the **Area**. The area decides which TOSE repository receives the report. Choose **Other** if unsure; a person then routes it.
2. Write a **Title** and a **Description**, and optionally **Steps to reproduce**. Do not paste secrets, environment variables or logs.
3. Tick **Include diagnostics** only if you agree to share the values listed on the form (client, version and error codes). Never environment variables, tokens or logs. Leave it unticked to send none.
4. Click **Preview report**. The preview shows what TOSE receives, with values that look like secrets or personal data masked. TOSE redacts again on the server, so the preview is a close approximation.
5. Click **Send report**, or **Edit** to go back.

A report that needed redaction, is about billing, or cannot be routed is reviewed by a person before anything is published.

## Follow your reports

**Your reports in this workspace** lists the reports you filed, newest first, each with its status history and, once GitHub confirmed it, a link to the issue. You see only your own reports: a teammate's are never listed. The statuses are the ones in [Feedback API](/api/feedback#statuses).

The same list is available from the API:

```http
GET /api/workspaces/{slug}/feedback
```

It needs workspace membership and, for an API key, `workspace:read`. An API key sees only its own workspace. The optional `limit` is 1 to 100 (default 100). See [Feedback API](/api/feedback#list-your-reports-in-a-workspace).

Agents can file and read reports through [MCP](/mcp#feedback-tools).
