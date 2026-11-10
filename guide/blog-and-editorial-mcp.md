# Blog publishing through MCP

Platform administrators can write and publish the public TOSE blog from an MCP client, through nine `blog_*` tools on the same MCP server as deployments. Readers see published posts through a public, unauthenticated read API.

::: warning Off until operations enables it
The blog tools and the public routes exist only on a TOSE instance where the operator set `BLOG_ENABLED=true`. It is off by default. Do not treat this guide as a statement that the blog is live in production until operations confirms it. If the tools are missing from `tools/list`, the blog is not enabled on that instance or your token lacks the scope.
:::

## Who can use it

- **Scope:** `blog:write`. It is not an API key scope, so only an OAuth connection can hold it.
- **Platform admins only.** The consent page shows the blog checkbox only to platform administrators. For anyone else the scope is dropped, and a forged request for it is refused. A workspace owner is not enough, because the blog belongs to the whole platform.
- **Checked on every call.** A regular user gets `403`, and an admin who is demoted gets `FORBIDDEN` at once. Their next token refresh removes the scope.
- **Hidden without the scope.** Blog tools do not appear in `tools/list` for a token without `blog:write`, and calling one anyway triggers the usual [`insufficient_scope` step-up](/mcp/oauth#insufficient-scope-step-up).

Every call is recorded in the MCP audit trail with its outcome.

## Tools

| Tool | What it does | Changes anything? |
|------|--------------|-------------------|
| `blog_list` | Lists posts in any state (draft or published), most recently changed first, without bodies. | No |
| `blog_get` | Reads one post with its full block body, by id or by slug and locale. | No |
| `blog_create_draft` | Creates a draft. Nothing is public until publish. | Yes |
| `blog_update_draft` | Changes fields of a draft; omitted fields stay as they are. The slug and locale cannot change. | Yes |
| `blog_validate` | Returns every error and warning with its JSON path, plus the reading time. Accepts the fields of `blog_create_draft` to check content before saving, or an id or slug for a saved post. | No |
| `blog_preview` | Creates a private preview link for a post. | Yes |
| `blog_publish` | Publishes a draft in two steps (see below). | **Yes**, goes live |
| `blog_unpublish` | Takes a post off the website and returns it to draft. Needs `confirm: true`. | **Yes**, goes live |
| `blog_upload_media` | Uploads a PNG, JPEG, GIF or WebP image (up to 5 MiB) as base64 and returns its public https URL and size. Identical files return the same URL. | Yes |

## Workflow

1. **Draft.** Call `blog_create_draft` with a slug, locale (`vi` by default, or `en`), title, category and `blocks`, a JSON array of widget blocks that each have a `type`. Upload images first with `blog_upload_media` and use the returned URL in blocks or as the cover image.
2. **Validate.** Call `blog_validate` and fix every error. Warnings do not block publishing.
3. **Preview.** `blog_preview` returns a private link that works for 24 hours. A new link replaces the earlier one. The draft is then readable at `GET /api/public/blog/posts/{slug}?preview=<token>`, served with `Cache-Control: no-store` and `X-Robots-Tag: noindex`. Share it only with people who may see the draft.
4. **Publish, in two steps.** Call `blog_publish` without a token: it validates the draft and returns `confirmation_required` with a summary and a one-time `confirm_token`. Show the summary to the human, and only after they agree call `blog_publish` again with the token. The token is bound to the exact version that was reviewed, so any edit needs a new review.
5. **Change a live post.** A published post cannot be edited. Call `blog_unpublish` with `confirm: true` to return it to draft, edit, then publish again.

Publishing and unpublishing call the website's revalidate webhook so the change shows up quickly. If the webhook is not configured, the website picks it up on its own 5-minute revalidation.

## Content rules

- **Categories are fixed:** `announcements`, `product-updates`, `guides`, `introductions` and `engineering`.
- **Slug:** lowercase letters, digits and hyphens, 3 to 100 characters, unique per locale.
- **Limits:** title up to 200 characters, excerpt up to 400, up to 10 lowercase hyphenated tags, up to 20 FAQ items.
- **URLs** must be `https` on a public host. IP addresses, `localhost` and embedded credentials are rejected.
- **Embeds** are limited to an allowlist of hosts. YouTube blocks accept only YouTube links, and social embeds accept only X/Twitter, Threads, LinkedIn, Facebook and YouTube.
- **Unknown block types** only produce a warning, because the website validates blocks again with its own schema.

## Media uploads

`blog_upload_media` needs object storage (R2) on the server. When it is not configured, the tool answers `UNAVAILABLE`.

## Public read API

The website reads the blog from unauthenticated routes under `/api/public/blog`:

| Route | Returns |
|-------|---------|
| `GET /posts` | Published posts, paged (`page`, `limit` up to 50, `locale`). Cached for 60 seconds. |
| `GET /posts/{slug}` | One published post. With `?preview=<token>`, the draft that token belongs to. |
| `GET /categories` | The categories. |
| `GET /surveys/{survey_id}/results` | Results of a survey block. |
| `POST /surveys/{survey_id}/votes` | An anonymous vote, with `optionIds` listing 1 to 10 options. |

Votes are anonymous. Each browser, identified by a cookie, gets one vote per survey, and one address can account for at most 5 browsers. Votes are also rate limited per address.

## Operator notes

These settings are for whoever runs the TOSE API. See [Self-hosting](./self-hosting) for the general setup.

| Setting | Purpose |
|---------|---------|
| `BLOG_ENABLED` | Must be `true` to register the tools and public routes. Off by default. |
| `BLOG_SITE_URL` | The website that receives the revalidate webhook. Defaults to `https://tose.sh`. |
| `BLOG_REVALIDATE_SECRET` | Sent as `x-revalidate-secret`; must equal the website's revalidate secret. With no secret, or a `BLOG_SITE_URL` that is not https, no webhook is sent so the secret never travels in clear text. |
| `TRUSTED_PROXY_CIDRS` | The viewer address for the vote limits comes from `X-Real-IP` only when the request arrives from a trusted proxy. Loopback and private ranges are always trusted, so the website must forward the visitor's address in `X-Real-IP` when it posts votes for them. |

## Three different MCP surfaces

| Surface | Status | Purpose | Documentation |
|---------|--------|---------|---------------|
| TOSE MCP server (`tose-app`) | Live | Deployments for workspace members; blog tools for platform admins with `blog:write` | [Protocol, OAuth and scopes](/mcp/oauth), [Agent access](/mcp/agent-access) |
| Browser WebMCP on the public site (`tose-web`) | Experimental, off by default | Three public tools in a supporting browser: estimate deployment cost and list pages (read-only), and open a page. No sign-in, no API calls | The site repository's `docs/webmcp.md` |

WebMCP never touches an account.

## See also

- [Protocol, OAuth and scopes](/mcp/oauth)
- [Referral program](./referral)
