#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DOCS = join(ROOT, 'docs')
const DIST = process.argv[2] ?? join(DOCS, '.vitepress/dist')
const ORIGIN = 'https://titaniachaos.com'
const BASE = '/'

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

async function sourceUrl(file) {
  const source = relative(DOCS, file).split(sep).join('/')
  if (!source.endsWith('.md') || source === '404.md' || source.split('/').some((part) => part.startsWith('['))) return null
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(await readFile(file, 'utf8'))?.[1] ?? ''
  if (/^robots:\s*.*noindex/im.test(frontmatter)) return null
  return '/' + source.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
}

function outputFile(pathname) {
  let local = pathname
  if (BASE !== '/' && local.startsWith(BASE)) local = '/' + local.slice(BASE.length)
  if (local.endsWith('/')) return join(DIST, local, 'index.html')
  return join(DIST, `${local}.html`)
}

function urlFromOutput(file) {
  const name = relative(DIST, file).split(sep).join('/').replace(/\.html$/, '')
  return name === 'index' ? '/' : `/${name.replace(/\/index$/, '/')}`
}

const expectedPaths = (await Promise.all((await walk(DOCS)).map(sourceUrl))).filter(Boolean)
const expected = new Set(expectedPaths.map((path) => `${ORIGIN}${path}`))
const sitemap = await readFile(join(DIST, 'sitemap.xml'), 'utf8')
const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replace(/&amp;/g, '&'))
const problems = []

if (listed.length !== new Set(listed).size) problems.push('the sitemap contains duplicate URLs')
for (const url of listed) if (!expected.has(url)) problems.push(`${url}: not a hand-written canonical page`)
for (const url of expected) if (!listed.includes(url)) problems.push(`${url}: indexable source is missing from the sitemap`)

for (const url of listed) {
  const target = new URL(url)
  try {
    // A generated HTML file is the static host's HTTP 200 response. Redirects
    // and misses have no such canonical output in this build.
    const html = await readFile(outputFile(target.pathname), 'utf8')
    if (/<meta[^>]+http-equiv=["']refresh["']/i.test(html)) problems.push(`${url}: is a redirect`)
    if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)) {
      problems.push(`${url}: is noindex`)
    }
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1]
    if (canonical !== url) problems.push(`${url}: canonical is ${canonical ?? 'missing'}`)
  } catch {
    problems.push(`${url}: has no generated HTTP 200 page (would be a 404)`)
  }
}

// Every rendered page that is not a hand-written source is a picture-filter
// route (apart from the 404). Preserve it for browsing, but enforce the SEO
// contract on the whole generated set rather than checking two examples.
for (const file of (await walk(DIST)).filter((name) => name.endsWith('.html'))) {
  const path = urlFromOutput(file)
  if (path === '/404' || expected.has(`${ORIGIN}${path}`)) continue
  const html = await readFile(file, 'utf8')
  if (!/<meta[^>]+name=["']robots["'][^>]+content=["']noindex, follow["']/i.test(html)) {
    problems.push(`${path}: generated filter is not noindex, follow`)
  }
  const locale = path.startsWith('/bg/') ? '/bg' : path.startsWith('/de/') ? '/de' : ''
  const wanted = `${ORIGIN}${locale}/pictures`
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1]
  if (canonical !== wanted) problems.push(`${path}: generated filter canonical is ${canonical ?? 'missing'}`)
}

if (problems.length) {
  console.error(`check-sitemap: ${problems.length} problem(s)\n${problems.map((p) => `  ${p}`).join('\n')}`)
  process.exit(1)
}

console.log(`check-sitemap: ${listed.length} URLs -- all return 200, are indexable, canonical, and hand-written; generated filters are noindex`)
