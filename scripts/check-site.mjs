// Checks a finished build in .vitepress/dist: every internal nav and sidebar link in the config,
// every sitemap URL, and every canonical and hreflang URL must resolve to a built page.
// The VitePress build already fails on dead links inside Markdown; this covers what it does not.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import config from '../.vitepress/config.js'
import { SITE_URL } from '../.vitepress/seo-head.js'

const DIST = new URL('../.vitepress/dist/', import.meta.url).pathname
const errors = []

// '/' -> index.html, '/vi/' -> vi/index.html, '/guide/x' -> guide/x.html
function builtFile(path) {
  const clean = decodeURI(path.split('#')[0].split('?')[0])
  if (clean.endsWith('/')) return join(DIST, clean, 'index.html')
  return join(DIST, clean.replace(/\.html$/, '') + '.html')
}

function walkLinks(items, where) {
  for (const item of items ?? []) {
    if (item.link?.startsWith('/') && !existsSync(builtFile(item.link))) {
      errors.push(`${where}: "${item.text}" links to missing page ${item.link}`)
    }
    walkLinks(item.items, where)
  }
}

for (const [name, locale] of Object.entries(config.locales)) {
  const theme = locale.themeConfig ?? {}
  walkLinks(theme.nav, `${name} nav`)
  const sidebar = theme.sidebar
  if (Array.isArray(sidebar)) walkLinks(sidebar, `${name} sidebar`)
  else for (const [base, groups] of Object.entries(sidebar ?? {})) walkLinks(groups, `${name} sidebar ${base}`)
}

function toSitePath(url, where) {
  if (!url.startsWith(SITE_URL + '/')) {
    errors.push(`${where}: ${url} is not on ${SITE_URL}`)
    return null
  }
  return url.slice(SITE_URL.length)
}

const sitemapFile = join(DIST, 'sitemap.xml')
if (!existsSync(sitemapFile)) {
  errors.push('sitemap.xml was not built')
} else {
  const locs = [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  if (locs.length === 0) errors.push('sitemap.xml lists no URLs')
  for (const loc of locs) {
    const path = toSitePath(loc, 'sitemap')
    if (path && (!existsSync(builtFile(path)) || path === '/404')) errors.push(`sitemap: ${loc} has no page`)
  }
  console.log(`sitemap.xml: ${locs.length} URLs`)
}

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === 'assets' ? [] : htmlFiles(join(dir, e.name))) : e.name.endsWith('.html') ? [join(dir, e.name)] : []
  )
}

let pages = 0
for (const file of htmlFiles(DIST)) {
  const rel = relative(DIST, file)
  if (rel === '404.html') continue
  pages++
  const html = readFileSync(file, 'utf8')
  const ownPath = '/' + rel.replace(/\.html$/, '').replace(/(^|\/)index$/, '$1')
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
  if (!canonical) errors.push(`${rel}: no canonical link`)
  else if (canonical !== SITE_URL + ownPath) errors.push(`${rel}: canonical ${canonical} is not ${SITE_URL + ownPath}`)

  const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
  for (const [, lang, href] of alternates) {
    const path = toSitePath(href, `${rel} hreflang ${lang}`)
    if (path && !existsSync(builtFile(path))) errors.push(`${rel}: hreflang ${lang} points to missing ${href}`)
  }
  if (alternates.length && !alternates.some(([, , href]) => href === SITE_URL + ownPath)) {
    errors.push(`${rel}: hreflang alternates do not include the page itself`)
  }
}
console.log(`checked ${pages} pages`)

if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n` + errors.map((e) => `- ${e}`).join('\n'))
  process.exit(1)
}
console.log('site checks passed')
