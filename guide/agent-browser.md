---
title: "Agent browser"
description: "Isolated, hosted Chromium sessions that people and AI agents drive through typed actions, with takeover, approvals, an origin allow-list and a metadata-only Site API map."
---

# Agent browser {#agent-browser}

::: info On TOSE cloud
The agent browser, its dashboard pages and its MCP tools (at `https://app.tose.sh/mcp`) are live.
The [Site API map](#site-api-map) with the `fetch` action and response body capture, write Action
Maps, browserless replay and [self-heal](#guard) are **enabled on TOSE cloud; each needs
per-workspace admin setup** by a signed-in owner or admin (confirm an origin, enable a `GET`
endpoint, verify an Action Map, approve calls, turn on the workspace self-heal switch). Still **not
enabled on TOSE cloud**: System One suggestions and the [content guard](#guard) on browser actions
and recipe runs; Chrome companion pairing is not built. The [status table](#status) says which.
:::

The agent browser gives a workspace a hosted Chromium that a person or an AI agent drives through
**typed actions** (navigate, snapshot, click, fill, press, extract, and so on). There is no
arbitrary script, no shell and no raw DevTools access. Every session runs in its own isolated pod,
reaches only the sites the workspace allows, and is billed for the time it runs.

Use it when an agent needs a page, not a machine. When a person needs a full Linux desktop, use
[Cloud Desktops](/guide/cloud-desktops). When a site has an official API that covers the need,
call that API instead.

## What is available {#status}

| Capability | Status |
|---|---|
| Sessions: create, suspend, resume, terminate, audit events | Available ([REST](/api/browsers), MCP, dashboard; the [CLI](/commands/browser) opens, lists, shows events and closes) |
| Leases, takeover by a person, fencing of older leases | Available |
| Typed actions, compact snapshots, typed errors with `next_step` | Available |
| Approvals for the sensitive actions run by an agent | Available (a signed-in owner or admin approves on REST or the dashboard approve page) |
| Pending approval requests of a session | Available (REST, and the session page lists them for owners and admins) |
| Workspace origin allow-list and egress proxy | Available (proposals from REST and CLI; confirmation by a signed-in admin on REST or the dashboard) |
| Dashboard: browser list, live view, takeover, approve page, allowed sites, profiles, recipes | Available (the self-heal page is listed below) |
| [Session page](#session-page): address bar, back, forward, reload, stop, direct input, tabs, screenshots, downloads | Available (dashboard; the actions behind it on REST and MCP) |
| [Watching an agent](#watch) from the dashboard | Available (dashboard, with a view ticket from REST) |
| History, viewport, pointer, scroll, `type_text` and `download` actions | Available (REST, MCP); not in a CLI release yet ([tose-cli#153](https://github.com/saasvn/tose-cli/issues/153)) |
| MCP browser tools with approval delivery | Available |
| In-chat live view (MCP Apps) | Available; taking over opens the dashboard session page |
| Profiles: vault, grants, sharing, import, re-login | Available (REST, dashboard, CLI) |
| Local Chrome companion | Available for importing a login from the dashboard; pairing and the native helper are not built |
| Action recipes, durable replay runs, recipe receipts | Available (REST, dashboard, CLI) |
| Public recipes | Available (REST, and CLI [`recipes find`](/commands/browser#recipes); a platform admin reviews each listing) |
| Knowledge lookup and snapshot `goal` | Available (REST, MCP, CLI); System One suggestions are not enabled on TOSE cloud yet |
| Content guard | Available on Action Map writes; on browser actions and recipe runs not enabled on TOSE cloud yet |
| Site API map, the `fetch` action and response body capture | Enabled on TOSE cloud; needs per-workspace admin setup (REST, CLI; MCP through `browser_knowledge_lookup`; dashboard is a follow-up, [#810](https://github.com/saasvn/tose-app/issues/810)) |
| Write Action Maps and browserless replay | Enabled on TOSE cloud; needs per-workspace admin setup (REST, MCP, CLI) |
| Self-heal of recipes and Action Maps | Enabled on TOSE cloud; needs per-workspace admin setup and a workspace decision provider (recipes: REST, MCP, dashboard, [CLI](/commands/browser#self-heal); Action Maps: REST only, other surfaces in [#835](https://github.com/saasvn/tose-app/issues/835)) |

## Sessions {#sessions}

A session is one disposable Chromium pod. It moves through `provisioning`, `running`,
`suspending`, `suspended`, `failed`, `terminating` and `terminated`.

- **Create** with a name (1 to 40 lowercase letters, digits or dashes) and a server. Send an
  `Idempotency-Key` header to make a retried create return the same session instead of starting a
  second pod.
- **Admission** happens before anything is created: the workspace wallet must have a positive
  balance (otherwise `402`) and the workspace must be under its concurrent-session cap (otherwise
  `429`).
- **Suspend** and **terminate** both remove the pod. There is no disk and no hibernation, so a
  suspended session loses its tabs and cookies. **Resume** starts a fresh pod after the same
  wallet and concurrency checks.
- **Idle sleep:** a session with no activity is suspended after about 10 minutes.
- **Empty wallet:** every browser of the workspace is suspended.
- A workspace cannot be deleted while one of its browser sessions is not terminated (`409`).

Every lifecycle change, lease and action is recorded as a session event. Events name the action
type and target, never typed text, page content or cookies.

## Leases, live view and takeover {#leases}

A **lease** is the right to drive one session. It has scopes `observe` (watch) and/or `act`
(run actions), an expiry that activity extends up to a hard age cap, and the session's current
**epoch**.

- Creating or revoking a lease increases the epoch. Every older lease stops working at once,
  including open observation streams and actions that are still running.
- **A person always outranks an agent.** A signed-in person can take over from anyone. An agent
  can never take control from a person, and an API key or connected app can hold only an agent
  lease.
- The lease token travels in the `X-Browser-Lease` header for actions and heartbeats, and as a
  WebSocket subprotocol for the observation stream. It is never put in a URL.
- When a lease stops being current, the next action reports why:

| Code | Meaning |
|---|---|
| `HUMAN_STEP_REQUIRED` | A person took control and still holds it (for example to log in or solve a challenge). |
| `CONTROL_RETURNED` | A person took control and has let go. Request a new lease and take a fresh snapshot. |
| `LEASE_FENCED` | A newer lease or a revoke replaced this one. |

An action that loses its connection, or whose lease ends while it runs, reports `outcome_unknown`.
The page may already have changed: take a snapshot before you repeat it.

### Session page {#session-page}

The dashboard session page (`https://tose.sh/w/<workspace>/browsers/<session-id>`) works like a
browser:

- **Address bar** with **Back**, **Forward**, **Reload** and **Stop loading**, and a progress bar
  while a page loads. Type an address such as `example.com`; the page adds `https://`.
- **Direct input:** while you hold control, click, scroll and type on the live view itself. In
  control, `Esc` leaves the live view, `Shift+Esc` sends `Esc` to the page, `Ctrl+L` edits the
  address, and `Alt+Left` and `Alt+Right` go back and forward.
- **Tabs:** switch, open and close the session's tabs. A menu lists the tab's recent pages, and a
  button toggles a desktop or mobile viewport.
- **Screenshots:** save the current page as a PNG.
- **Downloads:** lists what the page tried to download. Watch or take over to see the list; take
  over to **Save** a file (see the [`download` action](#downloads)).
- **Waiting for approval:** a workspace owner or admin sees the session's pending approval requests,
  with who asked and when each expires. **Review details** opens the
  [approve page](#approvals) with every parameter; the list itself never approves anything.
- **Recent activity:** the session's events, including every grant to watch.

Errors are in plain language, each with a next step. A site that is not on the
[allowed sites](#allow-list) says so and offers **Propose this origin** or **Open Allowed sites**;
a private or blocked address, a page that will not load, a page that took too long, no page in
that direction, lost control and an action that needs an approval each say what to do next.

### Watching an agent {#watch}

When an agent is driving the session, the page opens straight into its live view. It does this with
a short-lived, single-use, watch-only **view ticket** issued to the signed-in person (who needs
`browser.read`) through `POST .../browsers/{browser_id}/watch`. The ticket is bound to the agent's
current lease, so watching never interrupts or fences the agent, and it is never a lease or session
token. Every grant is recorded as a `watch` event. Only a person can watch this way: an API key gets
`403 person_required` and uses its own lease's live view instead.

- **Nobody holds the session:** the page shows the session's state, the last frame and a **Watch
  live** button. It never takes control on its own.
- **The agent's lease does not allow watching:** the page says so and offers **Stop agent**.
- **Stop agent** and **Take over** each ask you to confirm first. Taking control ends the agent's
  lease at once; it gets `HUMAN_STEP_REQUIRED` until you **Return control**, then
  `CONTROL_RETURNED` on its next call.

### In-chat live view (MCP Apps) {#mcp-apps}

Browser MCP tools return, next to their text result, an MCP Apps view that hosts such as Claude and
ChatGPT render inside the chat. It shows the agent's browser live. When the agent reports
`HUMAN_STEP_REQUIRED` (login, MFA, CAPTCHA) or gets stuck, "Take over in TOSE" opens the dashboard
session page, where the signed-in person takes control; the view itself takes no input. The view
uses a short-lived, single-use watch-only ticket, never the session token, and watching never
fences the agent. Hosts without MCP Apps get `live_view_url`, a plain link to the dashboard page.

## Typed actions {#actions}

| Action | What it does |
|---|---|
| `navigate` | Opens an `http` or `https` page. |
| `snapshot` | Lists visible elements as `role`, `name` and `nth`. |
| `click`, `fill`, `press` | Act on one element. These are the sensitive actions (see [Approvals](#approvals)). |
| `extract` | Reads text, an attribute or a field value. |
| `wait` | Waits for `load`, `visible`, `hidden`, `url_contains`, `text` or a `delay`. |
| `screenshot` | Captures the visible part or the full page as PNG. |
| `tab` | Lists, opens, closes or switches tabs. |
| `history` | On the current tab: `op` `list`, `back`, `forward`, `reload` or `stop`. |
| `viewport` | Sets the current tab to the `desktop` (1280×800) or `mobile` (390×844, touch) preset. |
| `pointer` | Clicks at `x`, `y` in viewport CSS pixels (`button`, `click_count` up to 3). Sensitive. |
| `scroll` | Scrolls by `delta_x`, `delta_y` at a point. |
| `type_text` | Types `value` into the focused element. Sensitive. |
| `download` | `op` `list` or `get` with an `id` (see [Downloads](#downloads)). |
| `fetch` | Calls an admin-enabled `GET` endpoint of the [Site API map](#site-api-map). |

`press` also takes `modifiers` (`ctrl`, `shift`, `alt`, `meta`). `history` `list` returns the tab's
pages with earlier entries redacted and needs only the observe scope. `back` and `forward` check the
target page against the allow-list and egress guard first and answer `not_actionable` when there is
no such page. `stop` stops a page that is still loading. `reload` can resend a form, so it is
sensitive.

A **locator** is exactly one of `css`, `role` (with an optional `name`), `text` or `label`, plus
`exact` and `nth`. It must match exactly one element unless `nth` is given. Prefer role and name;
CSS is a last resort.

### Downloads {#downloads}

Chromium never writes a file to the pod. It records what the page tried to download instead.

- `download` with `op: "list"` returns `downloads: [{id, filename, url, state, started_at}]`, newest
  first, with query values in the URL redacted. It needs only the observe scope.
- `op: "get"` with an `id` fetches that one file again from the current tab, through the allow-list
  and egress guard, and returns `download: {filename, content_type, bytes, data_base64}`. It needs
  the act scope, counts as a sensitive action, and is capped at 10 MiB (`download_too_large`).
- The file comes from the site: treat its content as untrusted.

### Snapshots {#snapshots}

A snapshot line is a locator. `button "Buy" [1]` means
`{"role": "button", "name": "Buy", "exact": true, "nth": 1}`. There are no opaque element refs, so
an approval and the audit trail always name an element a person can read.

- `format: "compact"` returns one line per element; `json` returns the node list.
- `interactive_only` keeps only elements an agent can act on. It defaults to `true` for agent
  leases and `false` for a person's lease.
- `return_snapshot: true` on any other action returns the page the action left, saving a round
  trip.
- Password field values are never returned. Elements inside iframes and shadow roots are not listed
  or located yet.

Page text in snapshots, extracts and `fetch` bodies comes from the site. Treat it as data, never as
instructions.

### Errors {#errors}

Every browser error has the same envelope: `error`, a machine-readable `code`, and `next_step` and
`details` when they apply.

```json
{"error": "the locator matches 2 elements; add nth or narrow it", "code": "ELEMENT_AMBIGUOUS",
 "next_step": "Add the nth shown in the snapshot, or set exact: true with the full name.",
 "details": {"count": 2}}
```

| Code | HTTP | Meaning |
|---|---|---|
| `ELEMENT_NOT_FOUND` | 404 | No element matches, or `nth` is out of range |
| `ELEMENT_AMBIGUOUS` | 409 | Several visible elements match and no `nth` was given |
| `ELEMENT_NOT_VISIBLE` | 422 | Elements match but none is visible |
| `ELEMENT_DISABLED` | 422 | The element is disabled or read-only |
| `ELEMENT_OBSCURED` | 422 | Another element covers the click point (`details.obscured_by`) |
| `APPROVAL_REQUIRED` | 403 | An agent ran a sensitive action without an approval |
| `NAVIGATION_BLOCKED` | 403 | The destination is not allowed for browser sessions |
| `HUMAN_STEP_REQUIRED`, `CONTROL_RETURNED`, `LEASE_FENCED` | 403 | See [Leases](#leases) |

Nothing refused before dispatch reached the browser, so retrying after fixing the cause is safe.
`outcome_unknown` is the exception: check the page first.

## Approvals {#approvals}

The sensitive actions are `click`, `fill`, `press`, `pointer`, `type_text`, `history` `reload` and
`download` `get`. They can submit, send, buy, delete or move data out, so when an **API key or
connected app** runs one it must pass an approval. A person driving their own lease needs none.
Reads, `navigate`, `tab`, `scroll`, `viewport` and the other `history` and `download` operations
need none.

1. The agent runs the action and gets `403 APPROVAL_REQUIRED`. `details` names the approval
   endpoint, the agent's `lease_id`, the action type, the executor and the page origin.
2. A **signed-in workspace owner or admin** approves that exact action with
   `POST .../browsers/{id}/approvals`. API keys and connected apps get
   `403 HUMAN_APPROVAL_REQUIRED` there, so an agent can never approve its own action.
3. The agent repeats the same action with the returned `approval` token.

An approval binds the approver, the executor credential, the workspace, the session, the action
with a digest of its parameters, and the page origin. It expires after 10 minutes by default (at
most 15) and runs one action. Changing any parameter, the origin or the executor invalidates it.
Refusals are `approval_invalid`, `approval_expired`, `approval_mismatch` and `approval_used`; a
refused approval is not used up.

Over MCP the refusal carries an `approval_url` to the dashboard approve page, where the person
approves; the agent then repeats the call with the `approval` token. A per-origin owner switch for
production, payment and destructive actions is not built yet.

**Pending requests:** `GET .../browsers/{id}/approval-requests` lists a session's pending,
unexpired requests for a workspace owner or admin signed in as a person: id, action type, a summary
with the page origin, which credential asked, and the created and expiry times. It never returns the
action's parameters, typed text or a token. API keys and connected apps get
`403 HUMAN_APPROVAL_REQUIRED`. The [session page](#session-page) shows the same list, and **Review
details** opens the approve page; there is no inline approval.

## Allowed sites {#allow-list}

A workspace's browsers reach only **confirmed origins** while enforcement is on, and it is on for
every workspace until an admin turns it off. A new workspace's browsers therefore reach no
third-party site until one is confirmed.

- Anyone who may drive a browser, agents included, can **propose** an origin
  (`scheme://host[:port]`). It stays `pending`.
- Only a **signed-in owner or admin** can confirm or remove an origin, or switch enforcement. API
  keys and connected apps get `403 HUMAN_APPROVAL_REQUIRED`. Every change is audited.
- Internal, numeric and blocked hosts are refused (`400`). A workspace holds at most 100 pending
  proposals (`429 too_many_pending_origins`).
- Changes apply to pods started afterwards: suspend and resume a running session to pick them up.
- When a page does not load, the session events show `egress_denied` entries naming the origin and
  the reason.

## Site API map and Action Maps {#site-api-map}

The Site API map lets an agent call a site's own read API instead of scraping its HTML. It is
**enabled on TOSE cloud; needs per-workspace admin setup**. A self-hosted server turns it on with
`BROWSER_API_MAP_ENABLED`. It records only while the allow-list is enforced and only for confirmed
origins.

- **What is recorded:** for `XHR` and `fetch` requests that pages make, the origin, method, a path
  template (ID-like segments become `{id}`), query parameter **names**, media type and status.
  Response body capture adds a response schema and a redacted sample. Never raw bodies, header
  values, cookies, query values or post data.
- **Enabling:** a signed-in admin enables individual `GET` endpoints. Endpoints expire 30 days
  after they were last seen; one seen again after expiring starts over, disabled.
- **The `fetch` action** calls an enabled endpoint from inside the current tab, so it carries the
  page's cookies without them reaching TOSE or the agent. The tab must already be on the endpoint's
  origin, redirects are not followed, and the body is capped at 256 KiB and marked
  `untrusted: true`. The body is whatever the signed-in site returns; enabling an endpoint is the
  admin's decision to let agents read that response.
- **Lookup:** `GET .../browser-api-endpoints?url=<url>` lists the known `GET` endpoints of that
  URL's origin, with the matching template first.

The map is on REST and in the CLI (`tose browser apimap`); over MCP an agent reads it through
`browser_knowledge_lookup`. A dashboard page is a follow-up
([#810](https://github.com/saasvn/tose-app/issues/810)).

**Write Action Maps** call a site's write endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) with typed
parameters instead of clicking through a form. They exist only where the Site API map records
endpoints, and a signed-in admin verifies each map first. Each call needs a single-use approval and an
`Idempotency-Key`, and an unclear outcome ends in `needs_reconciliation` rather than a retry. Every
write first passes the [content guard](#guard). Saving, verifying and approving a map stay with a
person on REST; agents list, preview and execute maps over MCP or the CLI.

## Profiles {#profiles}

A profile is a saved login for a few sites: sign in once, then open sessions that start signed in.
Manage profiles on REST, in the dashboard (*Browsers → Profiles*) or with `tose browser profiles`;
MCP tools for profiles are not built yet. A session without a profile starts with an empty browser
and loses its state when it is suspended.

- **Vault:** a profile's auth state is a `storageState` of allowed origins only (cookies and
  localStorage, no IndexedDB, at most 256 KB), encrypted in the platform's
  credential store. No API, MCP result, log or error ever returns a cookie or token, and exporting
  auth state is not a feature.
- **Grants:** using a profile needs a grant that names the profile and the origins it may be used
  on. Having a cookie never authorizes an action by itself.
- **Who writes a profile:** only a person's lease by default. The owner may allow agent writes per
  profile.
- **Re-login:** a profile that needs login can be re-authenticated with a credential from the
  broker, filled inside the pod; the agent never sees the value. MFA, OTP or CAPTCHA stops the run
  with `HUMAN_STEP_REQUIRED` and a live-view link. TOSE does not bypass CAPTCHA or MFA.
- **Sharing:** inside a workspace through time-limited grants. Across workspaces through a share
  grant the owner issues: time-limited, audited and revocable at once. Cookies are never copied; the
  receiving workspace opens read-only sessions from the source profile, billed to itself.
- **Import:** through a secure form or the companion, never through a prompt. Importing a whole
  Chrome profile directory is refused.

### Local Chrome companion {#companion}

A Chrome extension lets a person reuse a login from their own Chrome without uploading the profile.
On *Browsers → Profiles* they choose *Import from my browser*, pick one of the profile's origins,
and confirm in the extension's own consent window; the extension reads only that origin's state and
answers only the TOSE dashboard. Pairing a device and the native helper are designed but not built.
Known limits: passkeys and security keys are never copied, device-bound cookies work only briefly,
SSO and 2FA re-challenges need the person, and sites that tie sessions to IP or device may log the
copy out.

## Recipes {#recipes}

An agent that finished a task saves the steps as a named, versioned recipe. Next time it runs the recipe without a
model: each step's locator must match exactly one element and the page must match the step's
expected state, otherwise the run stops with `RECIPE_DRIFT` and the agent continues step by step.
Recorded steps never keep typed text; fill values become named parameters.

A run's write steps are approved by a single-use **recipe receipt** for one recipe version, one set
of parameters, one origin and one executor, with a short expiry. Steps outside the recipe still need
their own approval, and origin-wide approvals are not allowed.

**Knowledge lookup:** before acting on a site, an agent asks which saved recipes, verified Action
Maps and endpoints exist for it (`browser_knowledge_lookup` over MCP, `tose browser knowledge` in the
CLI). A snapshot can carry a `goal`, and the answer then includes a `goal_assessment`. The
model-based suggestions in both (System One) are not enabled on TOSE cloud yet, so they report the
reason `off`.

**Public recipes** are read-only, on public sites that need no login, reviewed by a platform admin
before listing, and carry no data from the source workspace. Every workspace sees the same catalog
and runs a public recipe in its own session under its own allow-list.

## Guard, replay and self-heal {#guard}

- **Content guard:** a local prompt-injection classifier, a check on redacted text by the
  workspace's decision model, and detection of personal data (including Vietnamese recognizers),
  running inside the cluster. On TOSE cloud it guards Action Map writes. A write the guard cannot
  check is refused (`GUARD_UNAVAILABLE`); in a workspace without a decision model, a write with a
  clean classifier score goes ahead marked degraded, and adding a decision model restores the full
  check. A blank page or empty text is not refused for being unreadable. A suspected injection is refused with `GUARD_INJECTION`; a person can always take over the
  session. Guarding every browser action and recipe step is built but not enabled on TOSE cloud yet.
- **Browserless replay:** a verified Action Map can be replayed over HTTP through the egress proxy,
  without a browser. Enabled on TOSE cloud.
- **Self-heal:** when a recipe step or an Action Map endpoint drifts, the engine proposes a patch,
  with a workspace switch, daily limits, audit and rollback. The platform flag is on for TOSE cloud; a
  signed-in owner or admin still turns on the workspace switch, and the workspace needs a decision
  provider. Action Map heal is on REST only for now
  ([#835](https://github.com/saasvn/tose-app/issues/835)).

The other controls are listed under [Allowed sites](#allow-list), [Approvals](#approvals) and
[Security model](#security).

## Pricing and limits {#pricing}

- **Compute:** the [standard compute rate](/guide/pricing#compute) ($0.02 per vCPU-hour and $0.01
  per GB-hour), metered for the time the pod runs, from ready to removed. A session of 1 core and
  2 GiB costs about 4¢ an hour.
- **Minimum size:** 1 core per session, because every browser pod runs under gVisor.
- **Prepaid only:** a session cannot start with an empty wallet and is suspended when the wallet
  runs out. There is no compute debt.
- **Idle sleep** after about 10 minutes without activity, so idle time is not billed.
- **Limits:** a cap on concurrent sessions per workspace, a 12-hour wall-clock cap per pod, action
  timeouts up to 30 seconds, `fetch` bodies up to 256 KiB, downloads up to 10 MiB, 100 pending
  origin proposals.

See [Pricing](/guide/pricing) for how the wallet works.

## Security model {#security}

- **Isolation:** one pod per session in a per-workspace namespace, under a required gVisor runtime
  with Chromium's own sandbox on. The pod runs as non-root with all capabilities dropped, a
  read-only root filesystem and no service account token. A session refuses to start if the
  isolation is unavailable.
- **No files on the pod:** Chromium never saves a download; a file is fetched again on request, up
  to 10 MiB, as untrusted data.
- **No exposed debugging port:** Chromium's DevTools port binds to the pod loopback and is reached
  only by the TOSE API. Callers see typed actions.
- **Tenant isolation:** every lookup is scoped to the caller's workspace; another workspace's
  session answers `404`.
- **Scopes:** API keys and connected apps need an explicit `browser:read` or `browser:control`
  grant (`browsers:read` and `browsers:write` remain accepted aliases). Older unscoped keys must get
  an explicit browser grant. `browser:auth:manage` is reserved for profile credentials and cannot be
  granted.
- **People first:** an agent never takes control from a person, cannot approve its own action,
  cannot list pending approvals, cannot confirm an origin and cannot watch from the dashboard.
- **No secrets in output:** lease and approval tokens are shown once and never stored in clear;
  events and errors hold no typed text, page content or cookies.
- **Your responsibility:** confirm only sites you may automate and accounts you own or are
  authorized to use. TOSE does not bypass CAPTCHA, MFA or rate limits.

## Next steps

- [`tose browser` commands](/commands/browser)
- [Browsers API](/api/browsers)
- [API keys and scopes](/api/api-keys)
