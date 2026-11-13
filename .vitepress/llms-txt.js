// Builds /llms.txt (https://llmstxt.org): the site summary and one link per sidebar page, pointing at the
// Markdown copy that buildEnd publishes next to each HTML page, so an agent can read the docs as Markdown.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SITE_URL } from './seo-head.js'

// '/guide/x' -> 'guide/x.md', '/vi/' -> 'vi/index.md'
function sourceOf(link) {
  const path = link.replace(/^\//, '').replace(/#.*$/, '')
  return path === '' || path.endsWith('/') ? path + 'index.md' : path + '.md'
}

// Title and description from the frontmatter, falling back to the first heading and first paragraph.
function describe(file) {
  const text = readFileSync(file, 'utf8')
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/)
  const field = (name) => {
    const m = fm && fm[1].match(new RegExp('^' + name + ':\\s*(.+)$', 'm'))
    return m ? m[1].trim().replace(/^(["'])(.*)\1$/, '$2') : ''
  }
  const body = fm ? text.slice(fm[0].length) : text
  const heading = (body.match(/^#\s+(.+)$/m) || [])[1] || ''
  const paragraph = body.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !/^[#:|`<>-]/.test(p)) || ''
  const firstSentence = paragraph.replace(/\s+/g, ' ').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/(?<=\.)\s/)[0]
  return { title: field('title') || heading, description: field('description') || firstSentence }
}

function section(groups, srcDir, seen, prefix) {
  const out = []
  for (const group of groups) {
    const lines = []
    for (const item of group.items || []) {
      if (!item.link || /^https?:/.test(item.link)) continue
      const src = sourceOf(item.link)
      if (seen.has(src) || !existsSync(join(srcDir, src))) continue
      seen.add(src)
      const { description } = describe(join(srcDir, src))
      lines.push(`- [${item.text}](${SITE_URL}/${src})${description ? ': ' + description : ''}`)
    }
    if (lines.length) out.push(`## ${prefix}${group.text}`, '', ...lines, '')
  }
  return out
}

export function writeLlmsTxt(siteConfig) {
  const { srcDir, outDir, site } = siteConfig
  const seen = new Set()
  const en = site.locales.root.themeConfig.sidebar
  const vi = site.locales.vi.themeConfig.sidebar
  const lines = [
    '# TOSE Docs',
    '',
    `> ${site.description}`,
    '',
    'TOSE is a cloud platform for deploying apps from Git. Every page below is plain Markdown. ' +
      'The CLI is the npm package `@tosesh/tose`; the REST API contract is https://api.tose.sh/api/openapi.yaml; ' +
      'the MCP server is https://app.tose.sh/mcp. Vietnamese pages live under /vi/.',
    '',
    ...section(en, srcDir, seen, ''),
    ...section(vi, srcDir, seen, 'Tiếng Việt: ')
  ]
  writeFileSync(join(outDir, 'llms.txt'), lines.join('\n'))
}
