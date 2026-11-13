// Per-page canonical, hreflang and Open Graph tags. Hreflang alternates are emitted only when the
// counterpart page exists in the other locale, so no tag ever points at a 404.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const SITE_URL = 'https://docs.tose.sh'
const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

// 'guide/x.md' -> '/guide/x', 'index.md' -> '/', 'vi/index.md' -> '/vi/'
export function pageUrlPath(relativePath) {
  const path = relativePath.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1')
  return '/' + path
}

function counterpart(relativePath) {
  return relativePath.startsWith('vi/') ? relativePath.slice(3) : 'vi/' + relativePath
}

export function seoHead({ pageData, title, description }) {
  const rel = pageData.relativePath
  if (pageData.isNotFound || rel === '404.md') return [['meta', { name: 'robots', content: 'noindex' }]]

  const isVi = rel.startsWith('vi/')
  const url = SITE_URL + pageUrlPath(rel)
  const head = [
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:type', content: pageData.frontmatter.layout === 'home' ? 'website' : 'article' }],
    ['meta', { property: 'og:site_name', content: 'TOSE Docs' }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:locale', content: isVi ? 'vi_VN' : 'en_US' }],
    ['meta', { name: 'twitter:card', content: 'summary' }]
  ]

  const other = counterpart(rel)
  if (existsSync(join(SRC_DIR, other))) {
    const en = isVi ? other : rel
    const vi = isVi ? rel : other
    head.push(
      ['link', { rel: 'alternate', hreflang: 'en', href: SITE_URL + pageUrlPath(en) }],
      ['link', { rel: 'alternate', hreflang: 'vi', href: SITE_URL + pageUrlPath(vi) }],
      ['link', { rel: 'alternate', hreflang: 'x-default', href: SITE_URL + pageUrlPath(en) }]
    )
  }
  return head
}
