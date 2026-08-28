#!/usr/bin/env node
// Weighs the images the site ships, and checks that what the metadata claims
// about them is true.
//
// Everything in docs/public is published whether or not a page uses it, and an
// image is the only asset here big enough to matter: the home page once loaded
// a 351 KB portrait into a slot capped at 420px tall. Four failures are worth
// catching, and none of them are visible in a diff:
//
//   too heavy       a photo over the budget, whatever its dimensions
//   too large       pixel dimensions far beyond any slot on the page
//   badly encoded   a small picture in a big file -- bytes per pixel
//   a lie           seo.ts declaring dimensions the file does not have, which
//                   is what social platforms read before they fetch anything
//
// Unreferenced images are reported but do not fail: a file can be linked from
// somewhere this repository cannot see.
//
// Dimensions are read from the file headers by scripts/lib/image-size.mjs --
// no dependencies, and one copy of the parsers rather than two.
//
// Usage: node scripts/check-images.mjs [publicDir] [distDir]

import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, extname, basename } from 'node:path'
import { dimensions } from './lib/image-size.mjs'

const publicDir = process.argv[2] ?? 'docs/public'
const distDir = process.argv[3] ?? 'docs/.vitepress/dist'

const KB = 1024
const HEAVY = 300 * KB // fails: too much for one asset on a text site
const NOTABLE = 150 * KB // notes: worth a second look
const MAX_EDGE = 2400 // fails: no slot on either site is anywhere near this
const BYTES_PER_PIXEL = 1.2 // notes: a well-encoded photo is nearer 0.1–0.4

const IMAGE = /\.(png|jpe?g|webp|gif|avif|svg)$/i

// ---- gather --------------------------------------------------------------

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

const files = (await walk(publicDir)).filter((f) => IMAGE.test(f))
if (files.length === 0) {
  console.log(`check-images: no images in ${publicDir}`)
  process.exit(0)
}

// What the built site actually points at. Built output rather than sources,
// because a filename can appear in a lookup table nothing selects from.
const built = (await walk(distDir)).filter((f) => /\.(html|css|js)$/.test(f))
let rendered = ''
for (const f of built) rendered += await readFile(f, 'utf8')

// What the metadata claims. Both shapes the two repositories use.
const declared = new Map()
for (const source of (await walk('docs/.vitepress')).filter((f) => /\.m?ts$/.test(f))) {
  const text = await readFile(source, 'utf8')
  for (const m of text.matchAll(/'([\w.-]+\.(?:png|jpe?g|webp|gif|avif))':\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+)/g)) {
    declared.set(m[1], { w: Number(m[2]), h: Number(m[3]), source })
  }
  const single = text.match(/OG_IMAGE\s*=[^\n]*images\/([\w.-]+)[^\n]*\n[^\n]*OG_IMAGE_SIZE\s*=\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+)/)
  if (single) declared.set(single[1], { w: Number(single[2]), h: Number(single[3]), source })
}

// ---- weigh ---------------------------------------------------------------

const failures = []
const notes = []
let total = 0
let orphanBytes = 0
const rows = []

for (const file of files.sort()) {
  const name = basename(file)
  const bytes = (await stat(file)).size
  total += bytes
  const head = (await readFile(file)).subarray(0, 64 * KB)
  const size = extname(file).toLowerCase() === '.svg' ? null : dimensions(head)
  const used = rendered.includes(name)
  if (!used) orphanBytes += bytes

  const kb = Math.round(bytes / KB)
  rows.push({ name, kb, size, used })

  if (bytes > HEAVY) failures.push(`${name} is ${kb} KB, over the ${HEAVY / KB} KB budget`)
  else if (bytes > NOTABLE) notes.push(`${name} is ${kb} KB`)

  if (size) {
    const edge = Math.max(size.width, size.height)
    if (edge > MAX_EDGE) failures.push(`${name} is ${size.width}x${size.height}; no slot needs ${edge}px`)

    const perPixel = bytes / (size.width * size.height)
    if (perPixel > BYTES_PER_PIXEL) {
      notes.push(`${name} spends ${perPixel.toFixed(2)} bytes per pixel — re-encode it`)
    }

    const claim = declared.get(name)
    if (claim && (claim.w !== size.width || claim.h !== size.height)) {
      failures.push(
        `${name} is ${size.width}x${size.height} but ${relative(process.cwd(), claim.source)} ` +
          `declares ${claim.w}x${claim.h} — social cards read the declaration`
      )
    }
  } else if (!IMAGE.test(file) || extname(file).toLowerCase() !== '.svg') {
    notes.push(`${name}: could not read its dimensions`)
  }

  if (!used) notes.push(`${name} is not referenced by the built site (${kb} KB)`)
}

// ---- the media pool -------------------------------------------------------
// A frame in media.data.ts is named in the JavaScript bundle whether or not
// any page renders it, so the "unreferenced" test above always calls it used.
// It is not: `<MediaFigure>` resolves to one best frame per section, and a
// frame that never wins anywhere is a file GitHub Pages serves to nobody.
//
// That is allowed -- the archive is a pool, and a frame is there for the next
// page that asks for what it is -- but it should be a decision, not a
// surprise. So it is counted, and the heaviest of them are named.

const rendered_html = built.filter((f) => f.endsWith('.html'))
let pages = ''
for (const f of rendered_html) pages += await readFile(f, 'utf8')

const frames = [...(await readFile('docs/.vitepress/media.data.ts', 'utf8').catch(() => ''))
  .matchAll(/^\s{4}id: '([a-z0-9-]+)',$/gm)].map((m) => m[1])

if (frames.length) {
  // Both derivatives count as rendered: prose and the hero use `<id>.webp`,
  // the category listings use `<id>-s.webp`. Testing only the first called
  // every frame that appears solely in a listing "unused".
  const idle = frames.filter(
    (id) => !pages.includes(`/images/media/${id}.`) && !pages.includes(`/images/media/${id}-s.`)
  )
  if (idle.length) {
    const weigh = async (id) => {
      let bytes = 0
      for (const ext of ['webp', 'mp4']) {
        bytes += await stat(join(publicDir, 'images/media', `${id}.${ext}`)).then((s) => s.size).catch(() => 0)
      }
      return bytes
    }
    const weighed = (await Promise.all(idle.map(async (id) => ({ id, bytes: await weigh(id) }))))
      .sort((a, b) => b.bytes - a.bytes)
    const idleBytes = weighed.reduce((sum, f) => sum + f.bytes, 0)
    notes.push(
      `${idle.length} of ${frames.length} frames are in the pool — shipped, but no page renders them ` +
        `(${Math.round(idleBytes / KB)} KB): ` +
        weighed.slice(0, 4).map((f) => `${f.id} ${Math.round(f.bytes / KB)} KB`).join(', ') +
        (weighed.length > 4 ? ', …' : '')
    )
  }
}

// ---- report --------------------------------------------------------------

console.log(`\n${'image'.padEnd(30)} ${'size'.padStart(6)} ${'dimensions'.padStart(12)}   used`)
for (const r of rows) {
  const dim = r.size ? `${r.size.width}x${r.size.height}` : '—'
  console.log(`${r.name.padEnd(30)} ${(r.kb + ' KB').padStart(6)} ${dim.padStart(12)}   ${r.used ? 'yes' : 'NO'}`)
}
console.log(
  `${'total'.padEnd(30)} ${(Math.round(total / KB) + ' KB').padStart(6)}` +
    (orphanBytes ? `   ${Math.round(orphanBytes / KB)} KB of it unreferenced` : '')
)

if (notes.length) {
  console.log('')
  for (const note of notes) console.log(`  note  ${note}`)
}

if (failures.length) {
  console.error(`\ncheck-images: ${failures.length} problem(s)\n`)
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log(`\ncheck-images: ${files.length} images, ${Math.round(total / KB)} KB, all within budget and correctly declared`)
