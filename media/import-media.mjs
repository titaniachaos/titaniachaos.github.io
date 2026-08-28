#!/usr/bin/env node
// Reads a photograph or a film and writes out the record for it, filled in as
// far as the file itself can fill it in.
//
// Adding a frame by hand means knowing five things and typing four of them
// twice. The file already knows its dimensions, whether it is a photograph or
// a film, how long it runs, when it was taken and on what. This reads that
// much, derives the rest it safely can, and prints a `FRAMES` record with the
// gaps marked -- alt text and caption in three languages, which are the only
// parts a machine has no business inventing.
//
// The source may be a **local path or a URL**. A URL is fetched to a temporary
// file first, so `https://…/photo.jpg` and `~/Pictures/photo.jpg` behave the
// same and neither is treated as more trustworthy than the other.
//
// ---- what it deliberately does not do ------------------------------------
//
// It does not write anything into docs/. Importing tells you what a file is;
// deciding to publish it is a separate act, and media/README.md says who has
// to agree first. Nothing here checks consent, because nothing can: it prints
// what the frame contains so a person can look at it.
//
// It reports geotagging rather than keeping it. A phone photograph of a
// children's party carries the coordinates of the party, and the person
// deciding whether to publish should be told rather than have to know to ask.
// media/export-media.mjs starts from empty metadata and writes only chosen
// fields, so no coordinate ever reaches a published file.
//
// Usage:
//   node media/import-media.mjs <path-or-url> [--id my-frame] [--tags "street performance"]

import { readFile, writeFile, unlink, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join, basename, extname } from 'node:path'
import sharp from 'sharp'
import { readExif, exifDate } from '../scripts/lib/exif.mjs'
import { dimensions } from '../scripts/lib/image-size.mjs'

const run = promisify(execFile)

const args = process.argv.slice(2)
const source = args.find((a) => !a.startsWith('--'))
const flag = (name) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? undefined : args[i + 1]
}

if (!source) {
  console.error('usage: node media/import-media.mjs <path-or-url> [--id my-frame] [--tags "street performance"]')
  process.exit(1)
}

const VIDEO = /\.(mp4|mov|m4v|webm|mkv|avi)$/i

/** A local path stays put; a URL is fetched to a temporary file. */
async function localise(ref) {
  if (!/^https?:\/\//i.test(ref)) {
    try { await stat(ref) } catch { console.error(`import: no such file: ${ref}`); process.exit(1) }
    return { path: ref, temporary: false, name: basename(ref) }
  }
  const res = await fetch(ref).catch((err) => { console.error(`import: ${ref}\n  ${err.message}`); process.exit(1) })
  if (!res.ok) { console.error(`import: ${ref} returned ${res.status}`); process.exit(1) }

  const type = res.headers.get('content-type') ?? ''
  const url = new URL(ref)
  // A name from the URL where there is one, and from the content type where
  // there is not: plenty of media URLs end in an id with no extension.
  const fromPath = basename(url.pathname)
  const ext = extname(fromPath) || '.' + (type.split('/')[1]?.split(';')[0] ?? 'bin')
  const name = extname(fromPath) ? fromPath : `download${ext}`
  const path = join(tmpdir(), `import-${Date.now()}-${name}`)
  await writeFile(path, Buffer.from(await res.arrayBuffer()))
  return { path, temporary: true, name, type, from: ref }
}

const file = await localise(source)
const bytes = (await stat(file.path)).size
const isVideo = VIDEO.test(file.name) || /^video\//.test(file.type ?? '')

const found = { id: flag('id') ?? basename(file.name, extname(file.name)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
const notes = []

if (isVideo) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries',
    'stream=width,height,codec_name:format=duration,tags', '-of', 'json', file.path])
  const probe = JSON.parse(stdout)
  const video = (probe.streams ?? []).find((s) => s.width)
  found.kind = 'video'
  found.width = video?.width
  found.height = video?.height
  found.seconds = Math.round(Number(probe.format?.duration ?? 0))
  const created = probe.format?.tags?.creation_time
  if (created) found.date = created.slice(0, 10)
  notes.push(`${video?.codec_name ?? '?'} ${found.width}x${found.height}, ${found.seconds}s`)
} else {
  const meta = await sharp(file.path).metadata().catch(() => null)
  if (!meta) {
    const head = (await readFile(file.path)).subarray(0, 64 * 1024)
    const size = dimensions(head)
    if (!size) { console.error(`import: ${file.name} is not an image this can read`); process.exit(1) }
    Object.assign(found, { kind: 'photo', ...size })
  } else {
    const exif = readExif(meta.exif)
    found.kind = 'photo'
    found.width = meta.width
    found.height = meta.height
    found.date = exifDate(exif.dateTimeOriginal ?? exif.dateTime)
    if (exif.make || exif.model) notes.push(`taken on ${[exif.make, exif.model].filter(Boolean).join(' ')}`)
    if (exif.geotagged) {
      notes.push('GEOTAGGED — the original carries coordinates. Nothing published will, but know where this was.')
    }
    // Keywords somebody else already wrote, mapped onto our vocabulary.
    if (meta.xmp) {
      const words = [...meta.xmp.toString().matchAll(/<rdf:li[^>]*>([^<]+)<\/rdf:li>/g)].map((m) => m[1].toLowerCase())
      if (words.length) found.keywords = [...new Set(words)]
    }
  }
}

// Suggest tags: anything the file's own keywords already say, matched against
// the vocabulary in all three languages.
const taxonomy = await readFile(new URL('../docs/.vitepress/categories.ts', import.meta.url), 'utf8')
const vocabulary = [...(taxonomy.match(/export const TAGS = \[([\s\S]*?)\] as const/)?.[1] ?? '')
  .matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
const names = new Map(vocabulary.map((t) => [t, new Set([t])]))
for (const m of taxonomy.matchAll(/^\s{4}([a-z-]+): '([^']+)',?$/gm)) {
  if (names.has(m[1])) for (const w of m[2].toLowerCase().split(/[\s-]+/)) if (w.length > 3) names.get(m[1]).add(w)
}
const haystack = [...(found.keywords ?? []), file.name].join(' ').toLowerCase()
const suggested = (flag('tags')?.split(/\s+/) ?? vocabulary.filter((t) => [...names.get(t)].some((w) => haystack.includes(w))))
  .filter((t) => vocabulary.includes(t))

if (file.temporary) await unlink(file.path).catch(() => {})

// ---- the record ------------------------------------------------------------

const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`
const gap = (what) => `'TODO ${what}'`

console.log(`\n${file.from ? 'fetched  ' : 'read     '}${file.from ?? source}`)
console.log(`         ${found.width}x${found.height}, ${Math.round(bytes / 1024)} KB${found.date ? `, ${found.date}` : ''}`)
for (const n of notes) console.log(`  note   ${n}`)
if (!suggested.length) console.log('  note   nothing in the file suggested a tag — pass --tags')

console.log(`
Add to media/make-media.mjs, then run media_derive:

  '${found.id}': ${found.kind === 'video' ? `['${source}', 1]` : `'${basename(file.name)}'`},

Add to FRAMES in docs/.vitepress/media.data.ts:

  {
    id: ${q(found.id)},
    kind: ${q(found.kind)},${found.seconds ? `\n    seconds: ${found.seconds},` : ''}
    tags: [${suggested.map(q).join(', ')}],
    alt: {
      en: ${gap('what someone who cannot see it needs to know')},
      bg: ${gap('the same, in Bulgarian')},
      de: ${gap('the same, in German')}
    },
    caption: {
      en: ${gap('what someone who can see it might not know')},
      bg: ${gap('the same, in Bulgarian')},
      de: ${gap('the same, in German')}
    }
  },

Dimensions are not declared — the loader reads them off the derived file.
Before publishing, media/README.md: only frames Titania appears in alone.`)
