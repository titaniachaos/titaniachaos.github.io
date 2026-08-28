#!/usr/bin/env node
// Checks the built site. VitePress fails the build on a dead page link, but it
// does not check fragments -- and this site navigates almost entirely by
// hand-written section ids (`{#dramaturgy}`), across three languages. A
// mistyped id is invisible until someone clicks it.
//
// Also checks what a screen reader needs and what a duplicate id breaks.
//
// Usage: node scripts/check-build.mjs [distDir]   (default docs/.vitepress/dist)

import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const dist = process.argv[2] ?? 'docs/.vitepress/dist'

async function htmlFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)))
    else if (entry.name.endsWith('.html')) out.push(full)
  }
  return out
}

/** `/bg/index.html` -> `/bg/`, `/concept.html` -> `/concept`. */
function urlOf(file) {
  const rel = relative(dist, file).split(sep).join('/')
  const url = `/${rel.slice(0, -'.html'.length)}`
  return url.endsWith('/index') ? url.slice(0, -'index'.length) : url
}

const norm = (u) => u.replace(/\/+$/, '') || '/'

const files = await htmlFiles(dist)
if (files.length === 0) {
  console.error(`No HTML in ${dist} -- run the build first.`)
  process.exit(1)
}

// The base path is whatever prefixes the emitted assets: '/' or '/clown/'.
const home = files.find((f) => urlOf(f) === '/') ?? files[0]
const baseMatch = (await readFile(home, 'utf8')).match(/href="(\/(?:[\w-]+\/)*)assets\//)
const base = baseMatch ? baseMatch[1] : '/'

const pages = new Map() // normalised url -> Set of element ids
for (const file of files) {
  const html = await readFile(file, 'utf8')
  pages.set(norm(urlOf(file)), new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])))
}

const problems = []
const add = (file, message) => problems.push(`${relative(dist, file)}: ${message}`)

const ASSET = /\.(css|js|mjs|woff2?|png|jpe?g|webp|svg|ico|xml|txt|pdf)$/i
const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

for (const file of files) {
  const html = await readFile(file, 'utf8')
  const from = norm(urlOf(file))

  for (const raw of new Set([...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]))) {
    const href = decode(raw)
    if (href === '' || /^(https?:|mailto:|tel:|data:|\/\/)/.test(href)) continue

    if (href.startsWith('#')) {
      const id = href.slice(1)
      if (id && !pages.get(from).has(id)) add(file, `dead fragment ${href}`)
      continue
    }
    if (!href.startsWith(base)) continue

    const [path, fragment] = href.split('#')
    if (ASSET.test(path)) continue
    const target = norm(`/${path.slice(base.length)}`)

    if (!pages.has(target)) add(file, `dead link ${href}`)
    else if (fragment && !pages.get(target).has(fragment)) add(file, `dead anchor ${href}`)
  }

  for (const img of html.match(/<img[^>]*>/g) ?? []) {
    if (!/\salt=/.test(img)) add(file, `image without alt: ${img.slice(0, 80)}`)
  }

  // Frontmatter is read before any component runs, so `{{ $params.name }}` in
  // a generated page's title ships as those literal characters -- in the tab,
  // in the search result and in the sitemap. It reads correctly in the body,
  // which is why the category pages carried it in their headings for a while
  // without anybody seeing it.
  for (const [, expression] of html.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    add(file, `un-interpolated template expression in the output: {{ ${expression} }}`)
  }

  const seen = new Set()
  for (const [, id] of html.matchAll(/\sid="([^"]+)"/g)) {
    if (seen.has(id)) add(file, `duplicate id "${id}"`)
    seen.add(id)
  }
}

const label = `${files.length} pages, base ${base}`
if (problems.length) {
  console.error(`check-build: ${problems.length} problem(s) in ${label}\n`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log(`check-build: ${label} -- every link, fragment, alt and id is sound`)
