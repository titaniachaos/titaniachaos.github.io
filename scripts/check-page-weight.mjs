#!/usr/bin/env node
// Weighs what a browser actually downloads to render each page.
//
// check-images weighs the files; this weighs the pages, which is the number a
// visitor on a phone in a theatre foyer experiences. They come apart: an image
// well inside its own budget can still be the reason a page is the heaviest on
// the site, and a page can drift over budget with no single file at fault.
//
// Counted per page: the HTML, the stylesheets, the module scripts and their
// modulepreload chain, the preloaded fonts, and every image the page renders.
// Text is measured compressed, because that is how it is served; fonts and
// images are measured as they are, because they already are.
//
// Not counted: anything the browser fetches only on demand -- the search index
// arrives when the modal opens, and route chunks when a link is followed.
//
// Usage: node scripts/check-page-weight.mjs [distDir]

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, posix } from 'node:path'
import { gzipSync } from 'node:zlib'

const dist = process.argv[2] ?? 'docs/.vitepress/dist'

const KB = 1024
// Half a megabyte to read a page of text is the line. The heaviest page today
// is the About page at ~406 KB, nearly all of it one well-encoded photograph
// rendering at 544x680 -- that is a fair price, not a fault, and shrinking a
// good picture to flatter a number would be the wrong fix. What the budget
// catches is a second one landing on the same page.
const HEAVY = 500 * KB // fails
const NOTABLE = 300 * KB // notes: the outlier, and what makes it one
const COMPRESSIBLE = /\.(html|css|js|mjs|json|svg|xml|txt)$/i

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

/** Served size: gzip for text, as-is for anything already compressed. */
const served = new Map()
async function servedSize(file) {
  if (served.has(file)) return served.get(file)
  let size
  try {
    size = COMPRESSIBLE.test(file) ? gzipSync(await readFile(file)).length : (await stat(file)).size
  } catch {
    size = 0
  }
  served.set(file, size)
  return size
}

const pages = (await walk(dist)).filter((f) => f.endsWith('.html'))
if (pages.length === 0) {
  console.error(`check-page-weight: no HTML in ${dist} -- run the build first`)
  process.exit(1)
}

// The base path is whatever prefixes the emitted assets: '/' or '/clown/'.
const home = pages.find((f) => relative(dist, f) === 'index.html') ?? pages[0]
const baseMatch = (await readFile(home, 'utf8')).match(/href="(\/(?:[\w-]+\/)*)assets\//)
const base = baseMatch ? baseMatch[1] : '/'

const rows = []
const failures = []
const notes = []

for (const page of pages.sort()) {
  const html = await readFile(page, 'utf8')
  const refs = new Set()

  const collect = (pattern) => {
    for (const m of html.matchAll(pattern)) {
      const url = m[1]
      if (!url || !url.startsWith(base) || url.startsWith('//')) continue
      refs.add(posix.join(dist, url.slice(base.length)))
    }
  }

  // Everything the page needs before it can paint, in the order the browser
  // meets it: stylesheets, entry modules, the preload chain, fonts, images.
  collect(/<link[^>]+rel="(?:preload )?stylesheet"[^>]+href="([^"]+)"/g)
  collect(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)
  collect(/<script[^>]+type="module"[^>]+src="([^"]+)"/g)
  collect(/<link[^>]+rel="preload"[^>]+href="([^"]+)"[^>]*as="font"/g)
  collect(/<link[^>]+as="font"[^>]+href="([^"]+)"/g)
  collect(/<img[^>]+src="([^"]+)"/g)

  const parts = [{ what: 'html', bytes: gzipSync(Buffer.from(html)).length }]
  for (const ref of refs) parts.push({ what: relative(dist, ref), bytes: await servedSize(ref) })

  const total = parts.reduce((sum, part) => sum + part.bytes, 0)
  const heaviest = parts.slice(1).sort((a, b) => b.bytes - a.bytes)[0]
  const url = '/' + relative(dist, page).replace(/index\.html$/, '').replace(/\.html$/, '')

  rows.push({ url, total, parts: parts.length, heaviest })

  if (total > HEAVY) {
    failures.push(
      `${url} weighs ${Math.round(total / KB)} KB over the wire, past the ${HEAVY / KB} KB budget` +
        (heaviest ? ` — ${heaviest.what} is ${Math.round(heaviest.bytes / KB)} KB of it` : '')
    )
  } else if (total > NOTABLE) {
    notes.push(
      `${url} weighs ${Math.round(total / KB)} KB` +
        (heaviest ? ` — mostly ${heaviest.what} at ${Math.round(heaviest.bytes / KB)} KB` : '')
    )
  }
}

rows.sort((a, b) => b.total - a.total)
const worst = rows[0]
const median = rows[Math.floor(rows.length / 2)]

console.log(`\n${'page'.padEnd(34)} ${'served'.padStart(8)}   heaviest part`)
for (const r of rows.slice(0, 8)) {
  const part = r.heaviest ? `${r.heaviest.what} (${Math.round(r.heaviest.bytes / KB)} KB)` : '—'
  console.log(`${r.url.padEnd(34)} ${(Math.round(r.total / KB) + ' KB').padStart(8)}   ${part}`)
}
if (rows.length > 8) console.log(`${`… and ${rows.length - 8} lighter pages`.padEnd(34)}`)

console.log(
  `\n${rows.length} pages · heaviest ${Math.round(worst.total / KB)} KB · ` +
    `median ${Math.round(median.total / KB)} KB · budget ${HEAVY / KB} KB`
)

if (notes.length) {
  console.log('')
  for (const note of notes) console.log(`  note  ${note}`)
}

if (failures.length) {
  console.error(`\ncheck-page-weight: ${failures.length} page(s) over budget\n`)
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log(`\ncheck-page-weight: every page renders from ${Math.round(worst.total / KB)} KB or less`)
