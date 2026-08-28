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
// It does not decide whether a frame may be published. Even with `--write` it
// only fills in what the file knows; media/README.md says who has to agree
// before a photograph goes on a page, and nothing here can check that. What it
// can do is show you what is in the frame so a person can look at it.
//
// It reports geotagging rather than keeping it. A phone photograph of a
// children's party carries the coordinates of the party, and the person
// deciding whether to publish should be told rather than have to know to ask.
// media/export-media.mjs starts from empty metadata and writes only chosen
// fields, so no coordinate ever reaches a published file.
//
// With `--write` it does the writing too: the source goes into the right map
// in make-media.mjs, the record goes into FRAMES, and the derive runs. What it
// cannot write is the alt text and the caption, so it leaves those marked
// TODO -- and the loader refuses to build while a TODO is still there, so the
// half-finished record cannot reach a page. Import gets you to one step from
// done, and that step is writing the words.
//
// Usage:
//   node media/import-media.mjs <path-or-url> [--id my-frame] [--tags "street performance"] [--write]

import { readFile, writeFile, unlink, stat, mkdir, copyFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join, basename, extname, resolve, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { readExif, exifDate } from '../scripts/lib/exif.mjs'
import { dimensions } from '../scripts/lib/image-size.mjs'

const run = promisify(execFile)

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const source = args.find((a, i) => !a.startsWith('--') && !['--id', '--tags'].includes(args[i - 1]))
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

// A URL has to be kept if it is going to be derived from later; a temporary
// file that make-media.mjs will look for tomorrow is no use to anybody.
const KEEP = join(ROOT, 'media', 'imported')
let kept = null
if (WRITE && file.temporary) {
  await mkdir(KEEP, { recursive: true })
  kept = join(KEEP, basename(file.name))
  await copyFile(file.path, kept)
}
if (file.temporary) await unlink(file.path).catch(() => {})

// ---- the record ------------------------------------------------------------

const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`
const gap = (what) => `'TODO ${what}'`

const record = `  {
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
  }`

// Where make-media.mjs should look for the source, written relative to the
// archive root it already resolves.
const sourceRef = kept
  ? `titaniachaos.github.io/media/imported/${basename(file.name)}`
  : /^https?:/i.test(source)
    ? null
    : relative(resolve(ROOT, '..'), resolve(source))

if (WRITE) {
  if (!sourceRef) {
    console.error('import: --write needs the file kept locally; it was a URL and could not be copied')
    process.exit(1)
  }
  // PHOTOS holds bare filenames under media-archive/originals; anything from
  // anywhere else goes in IMPORTED, which takes a whole path.
  const inArchive = sourceRef.startsWith('media-archive/originals/')
  const mapName = found.kind === 'video' ? 'VIDEOS' : inArchive ? 'PHOTOS' : 'IMPORTED'
  const entry =
    found.kind === 'video'
      ? `  '${found.id}': ['${sourceRef}', 1],\n`
      : `  '${found.id}': '${inArchive ? basename(sourceRef) : sourceRef}',\n`

  const makePath = join(ROOT, 'media/make-media.mjs')
  let make = await readFile(makePath, 'utf8')
  if (make.includes(`'${found.id}':`)) {
    console.error(`import: make-media.mjs already has '${found.id}'`)
    process.exit(1)
  }
  const at = make.indexOf(`const ${mapName} = {`)
  if (at === -1) { console.error(`import: no ${mapName} map in make-media.mjs`); process.exit(1) }
  // The insert goes after the opening brace, so the map has to be written
  // across lines. A single-line `= {}` would put the entry past the closing
  // brace, which is a syntax error rather than a wrong map -- but only after
  // the file has been written, so check first.
  const brace = make.indexOf('{', at) + 1
  if (make[brace] !== '\n') {
    console.error(`import: ${mapName} in make-media.mjs is written on one line; open it across lines first`)
    process.exit(1)
  }
  make = make.slice(0, brace + 1) + entry + make.slice(brace + 1)
  await writeFile(makePath, make)

  const dataPath = join(ROOT, 'docs/.vitepress/media.data.ts')
  let data = await readFile(dataPath, 'utf8')
  if (data.includes(`id: '${found.id}'`)) {
    console.error(`import: media.data.ts already has a frame '${found.id}'`)
    process.exit(1)
  }
  const end = data.indexOf('\n]\n\n// ---- what a reader sees')
  if (end === -1) { console.error('import: could not find the end of FRAMES'); process.exit(1) }
  data = data.slice(0, end) + ',\n' + record + data.slice(end)
  await writeFile(dataPath, data)

  console.log(`\nwrote  media/make-media.mjs        ${mapName}['${found.id}']`)
  console.log(`wrote  docs/.vitepress/media.data.ts  FRAMES '${found.id}'`)
  if (kept) console.log(`kept   media/imported/${basename(file.name)}`)

  // Only the frame just added: a full derive re-encodes every film.
  const { stdout } = await run('node', [join(ROOT, 'media/make-media.mjs'), '--only', found.id], { cwd: ROOT })
  console.log(stdout.split('\n').filter((l) => l.includes(found.id) || l.startsWith('export-media')).join('\n'))

  console.log(
    `\nNow write the words. Until the TODOs in FRAMES['${found.id}'] are replaced\n` +
      'the build fails on purpose — a placeholder that looks filled in is worse\n' +
      'than a gap. Then place it with media_place, or leave it for a page to ask.'
  )
  process.exit(0)
}

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
