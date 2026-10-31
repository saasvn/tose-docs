# tose-docs

Source for the TOSE user documentation site, built with VitePress. The site is
for TOSE users: developers who deploy with the `@tosesh/tose` CLI, and
integrators who call the TOSE REST API. Pages are in English with a Vietnamese
mirror.

This README is for the people and agents who maintain the site. It explains
why the site works the way it does and where to find things. The site's own
configuration and scripts are the authority for how it behaves.

VitePress builds every Markdown file under the project root, so this file is
kept off the site by `srcExclude` in `.vitepress/config.js`. Keep that entry
when you change the config.

## Where truth comes from

The site describes behavior it does not own. Check every claim against its
owner before you publish it. Do not copy a claim from an older page.

- **Platform behavior and the REST API** are owned by
  [saasvn/tose-app](https://github.com/saasvn/tose-app). Route groups are set
  up in `cmd/server/main.go`, and each handler's `RegisterRoutes` in
  `internal/handlers/` declares the exact paths. Authentication is handled in
  `internal/middleware/auth.go`. Admin routes are internal and do not belong in
  user docs. Some features, such as Cloud Desktops, are only registered when
  their feature flag is on, so a route existing in the code does not prove it
  is live.
- **Pricing** has one canonical page:
  [`guide/pricing.md`](guide/pricing.md), mirrored in
  [`vi/guide/pricing.md`](vi/guide/pricing.md). The rates come from tose-app.
  Compute tiers are in `internal/services/billing/billing.go`. The storage
  tariff is in `internal/services/storage/storage.go`, with its configured
  default in `internal/config/config.go`. Both are served by the public pricing
  route in `internal/handlers/volume.go`. Other pages should link to the
  pricing page instead of restating rates. The pricing copy on the
  [saasvn/tose-web](https://github.com/saasvn/tose-web) landing page must match
  the canonical page. When a price changes, update tose-app first, then this
  page and its mirror, then tose-web.
- **CLI pages** (`commands/` and `vi/commands/`)
  document the published npm package `@tosesh/tose`. Its source is not in any
  of the related repositories below, and its npm metadata has no `repository`
  field. Until the source is found, check commands and flags against the
  published package, and check the API calls behind them against tose-app.

## Pages and locales

`.vitepress/config.js` owns navigation, sidebars,
locales, and search. A page that is missing from the sidebar is still built
and can be reached by its URL.

English pages live at the root and Vietnamese pages live under `vi/`,
at the same relative path. When you add or change a page in one locale, update
its counterpart in the same change, and add the sidebar entry to both locale
blocks in the config. If a Vietnamese page does not exist yet, point the
Vietnamese sidebar at the English page and label it as English, the way the
Desktops API entry does. Do not link to a `/vi/` path that has no file behind
it. The build's dead-link check covers links inside Markdown pages, but not
sidebar or nav entries in the config.

## Preview and deploy

- **When to use:** preview edits locally, or publish the site.
- **Scope:** a static VitePress build of this repository, served by PM2.
- **Source of truth:** the `docs:*` scripts in `package.json`
  for dev, build, preview, and static serve. The PM2 app in
  `ecosystem.config.cjs` serves the built output; its
  header comment has the PM2 start sequence.
- **How to look up or run:** install dependencies from `package-lock.json`.
  Use the dev script for local editing. To publish, run the build script on
  the host and then start or restart the PM2 app from `ecosystem.config.cjs`.
  Nothing in this repository automates publishing.
- **Access and permission:** this repository does not record which host the
  PM2 `cwd` points to, who can deploy there, or whether the public docs URL is
  served by this PM2 app. That URL is the docs link in tose-app's dashboard
  (`frontend/src/components/Header.astro`). Ask the platform owners. Do not
  guess.
- **Verification and fallback:** the build fails on dead links inside pages.
  After building, preview it and check every changed page in both locales,
  including the sidebar entries. Because the site is a static build, rolling
  back means rebuilding from a known-good commit.

## Related repositories

- [saasvn/tose-app](https://github.com/saasvn/tose-app): Go API, Astro
  dashboard, and app templates (the v2 platform). The source of truth for
  behavior and billing.
- [saasvn/tose-web](https://github.com/saasvn/tose-web): the Next.js public
  marketing landing page. Its pricing copy must match the canonical pricing
  page.
- [saasvn/tose-docs](https://github.com/saasvn/tose-docs): this repository.
- [saasvn/tose-cli](https://github.com/saasvn/tose-cli): a TypeScript CLI
  scaffold. It is not the source of `@tosesh/tose`.
