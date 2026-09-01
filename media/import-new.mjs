#!/usr/bin/env node
// Imports whatever has been dropped into media/, and refuses what is already
// here.
//
// Adding a photograph used to mean running import-media.mjs by hand with the
// right path, which is fine until somebody just copies files into the folder
// and expects the site to notice. It did not notice: 93 files sat in media/
// referenced by nothing, while the derivation still read the archive folders
// beside the checkout. This closes that — put a file in media/, run this, and
// it is imported, derived and waiting only for its words.
//
// ---- why it compares pictures rather than bytes ---------------------------
//
// Every one of those 93 files is a photograph the archive already holds, and
// not one of them is byte-identical to it: they came back through an export
// that re-encoded them. A checksum sees 93 new pictures. So this compares what
// the picture LOOKS like -- a 64-bit difference hash over an 8x8 greyscale
// reduction, which survives re-encoding, resizing and quality changes -- and
// refuses anything that matches a frame already in the ledger.
//
// That is the check the archive has been missing. Two import batches each
// re-added photographs that were already here under better names, so
// `juggling-pass` is on /juggling three times as itself, a-bf2c4943610a52c9
// and a-img-1275. Nothing was watching for it.
//
// Usage:
//   node media/import-new.mjs            # report what would happen
//   node media/import-new.mjs --write    # import the new ones
//   node media/import-new.mjs --distance 6   # how alike counts as the same

import { readdir, readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { frames as catalogue, derived } from '../scripts/lib/media-meta.mjs'

const run = promisify(execFile)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const INBOX = join(ROOT, 'media')

const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const CHECK = args.includes('--check')
const LIMIT = Number(args[args.indexOf('--distance') + 1]) || 8

const MEDIA = /\.(jpe?g|png|webp|heic|mp4|mov|m4v|webm)$/i
const FILM = /\.(mp4|mov|m4v|webm)$/i

/**
 * A 64-bit difference hash: each bit says whether a pixel is darker than the
 * one to its right. Two encodings of one photograph agree on nearly every bit;
 * two different photographs do not.
 */
async function fingerprint(file) {
  // Through a common 256px intermediate first. Hashing a 2689px original and
  // its 520px derivative directly compares two different resamplings as much
  // as two pictures: the same photograph measured 9, 11 and 9 that way, close
  // enough to the threshold to be luck. Normalised, the same pairs measure 0,
  // 1 and 1 while two different pictures stay 34 apart.
  const even = await sharp(file, { autoOrient: true }).resize(256, 256, { fit: 'fill' }).png().toBuffer()
  const buf = await sharp(even)
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer()
  let bits = ''
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += buf[y * 9 + x] < buf[y * 9 + x + 1] ? '1' : '0'
  return bits
}

const distance = (a, b) => {
  let d = 0
  for (let i = 0; i < 64; i++) if (a[i] !== b[i]) d++
  return d
}

// ---- what the archive already holds ----------------------------------------

/**
 * The source files the derivation already reads, by basename.
 *
 * This is the exact signal and it costs nothing: make-media.mjs names every
 * source it derives from, so a file whose name is already in one of its maps
 * is held whatever it looks like. It is also the only way to recognise a film
 * — `IMG_2246.MOV` is in the archive as `park-dance`, which no rule about
 * names would ever guess.
 */
const derivedFrom = new Set(
  [...(await readFile(join(ROOT, 'media/make-media.mjs'), 'utf8')).matchAll(/'([^']+\.[A-Za-z0-9]{2,5})'/g)]
    .map((m) => m[1].split('/').pop().toLowerCase())
)

const known = []
for (const frame of await catalogue()) {
  const file = join(ROOT, 'docs/public', derived(frame).wide)
  try {
    known.push({ id: frame.id, draft: frame.draft, bits: await fingerprint(file) })
  } catch {
    // A frame whose derivative is missing cannot be compared against. Say so
    // rather than treating it as absent, or the first thing this tool does on
    // a fresh clone is re-import the entire archive.
    console.error(`  ! ${frame.id}: no derived file to compare against — run media/make-media.mjs first`)
  }
}

// Not every published picture is a frame. The home page's hero portrait is
// rendered from the front matter and reaches no tag, and the social cards are
// not photographs of the work at all — but all three are already here, and a
// tool that offered to import them again would be wrong in the same way the
// batches were.
for (const name of await readdir(join(ROOT, 'docs/public/images'))) {
  if (!/\.(webp|jpe?g|png)$/i.test(name)) continue
  const file = join(ROOT, 'docs/public/images', name)
  try {
    known.push({ id: `images/${name}`, bits: await fingerprint(file) })
  } catch {
    /* a directory or an unreadable file is not a picture to compare against */
  }
}

// ---- what is sitting in the folder -----------------------------------------

const candidates = (await readdir(INBOX, { withFileTypes: true }))
  .filter((e) => e.isFile() && MEDIA.test(e.name))
  .map((e) => e.name)
  .sort()

const fresh = []
const already = []
const unreadable = []

for (const name of candidates) {
  const path = join(INBOX, name)
  if (derivedFrom.has(name.toLowerCase())) {
    already.push({ name, id: 'derived from this file', d: 0, bySource: true })
    continue
  }
  let bits
  try {
    bits = await fingerprint(path)
  } catch (err) {
    // A film cannot be hashed without decoding a frame out of it. Its name is
    // enough here: the importer builds an id from the stem, so IMG_3630.mov is
    // already held if any frame ends in `img-3630`. That is weaker than the
    // picture test and it says so — a renamed film will read as new.
    if (FILM.test(name)) {
      const stem = name.replace(FILM, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const held = known.find((k) => k.id.endsWith(stem))
      if (held) already.push({ name, id: held.id, d: 0, byName: true })
      else unreadable.push({ name, why: 'a film with no frame of that name — import it with media/import-media.mjs' })
      continue
    }
    unreadable.push({ name, why: String(err.message).slice(0, 60) })
    continue
  }
  const match = known
    .map((k) => ({ ...k, d: distance(k.bits, bits) }))
    .sort((a, b) => a.d - b.d)[0]
  if (match && match.d <= LIMIT) already.push({ name, id: match.id, d: match.d })
  else fresh.push({ name, path })
}

// ---- report, then act ------------------------------------------------------

console.log(`import-new: ${candidates.length} file(s) in media/, ${known.length} frame(s) in the archive`)
console.log(`  ${already.length} already held — same picture, whatever the encoding`)
console.log(`  ${fresh.length} not in the archive`)
if (unreadable.length) console.log(`  ${unreadable.length} not comparable here`)

for (const u of unreadable) console.log(`    ${u.name}: ${u.why}`)
for (const f of fresh) console.log(`    new: ${f.name}`)

// The near-misses are worth naming: a distance of 1 to 4 is usually the same
// photograph seconds apart, which is a judgement rather than a duplicate.
const close = already.filter((a) => a.d > 0 && !a.bySource && !a.byName)
if (close.length) {
  console.log(`\n  matched but not identical — check these are not a second frame worth keeping:`)
  for (const c of close.slice(0, 10)) console.log(`    ${c.name} ~ ${c.id} (differs in ${c.d} of 64)`)
}

if (!fresh.length) {
  console.log('\nnothing to import.')
  process.exit(0)
}

// `--check` is the guard the build runs: media/ may not hold a picture the
// archive has never seen. Dropping a file in and forgetting is exactly how 93
// of them came to sit here referenced by nothing.
if (CHECK) {
  console.error(`\nimport-new: ${fresh.length} file(s) in media/ are not in the archive:`)
  for (const f of fresh) console.error(`    ${f.name}`)
  console.error('\n  fix: npm run media:import   (imports them as drafts, then write their words)')
  process.exit(1)
}

if (!WRITE) {
  console.log(`\n${fresh.length} would be imported. Run with --write to do it.`)
  process.exit(0)
}

for (const f of fresh) {
  console.log(`\n---- importing ${f.name}`)
  const { stdout, stderr } = await run('node', [join(ROOT, 'media/import-media.mjs'), f.path, '--write'], {
    cwd: ROOT,
    maxBuffer: 1 << 24
  })
  process.stdout.write(stdout)
  if (stderr.trim()) process.stderr.write(stderr)
}

console.log(`\nimported ${fresh.length}. Their alt text and captions are still TODO, and the`)
console.log('loader refuses to build while a TODO is there — which is the point.')
