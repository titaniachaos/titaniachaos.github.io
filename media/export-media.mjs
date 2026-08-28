#!/usr/bin/env node
// Writes the catalogue into the media, so a published file carries its own
// description and can be queried without this repository.
//
// Until now a frame's alt text, caption and tags existed in exactly one place:
// media.data.ts. Save the picture, mail it to a presenter, hand it to a
// journalist, and it arrived as an anonymous webp -- nothing in it said what
// it was, who made it, or what it may be used for. That is a real loss for
// files whose whole job is to be passed around.
//
// So each derived file gets an XMP packet: title, description in all three
// languages, the tags as keywords, the credit, the licence, and the URL it is
// served from. Standard Dublin Core, which every asset manager, Bridge,
// Lightroom, Finder's Get Info and `mdls` already read. Films get the same
// through the mp4 container.
//
// ---- what it does not write ----------------------------------------------
//
// It starts from empty and writes a chosen list. It never copies metadata
// forward from the original, which is the point: the originals are phone
// photographs carrying device identifiers, serial numbers and sometimes
// coordinates. media/import-media.mjs reports those so a person can see them;
// nothing carries them into a file the site serves.
//
// ---- and the index --------------------------------------------------------
//
// It also writes docs/public/media.json: every frame, its tags, its captions,
// its dimensions and its absolute URLs. That makes the media queryable over
// plain HTTP -- another project can read one file instead of running the MCP
// server, and the two agree because they are generated from the same source.
//
// Idempotent. media/make-media.mjs runs it after deriving, because sharp drops
// metadata by default and a re-derive would otherwise strip every file bare.
//
// Usage:  node media/export-media.mjs [--dry]

import { readFile, writeFile, rename, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { context, frames, xmp } from '../scripts/lib/media-meta.mjs'

const run = promisify(execFile)
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MEDIA = join(ROOT, 'docs/public/images/media')
const DRY = process.argv.includes('--dry')

const META = await context()
const { origin: ORIGIN, rights: RIGHTS, credit: CREDIT } = META

const kb = (n) => `${Math.round(n / 1024)} KB`
let stamped = 0
let grew = 0
const index = []

let skipped = 0

let held = 0

for (const frame of await frames()) {
  // A draft is imported, not published: it has no words yet, so it gets no
  // metadata written into it and no line in the public index. Writing "TODO"
  // into a file's description would be worse than leaving it blank.
  if (frame.draft) { held++; continue }

  const packet = xmp(frame, META)

  // Both derivatives: the one prose and the hero use, and the square the
  // category listings use. A file saved from either should say what it is.
  for (const suffix of ['', '-s']) {
    const path = join(MEDIA, `${frame.id}${suffix}.webp`)
    let before
    try { before = (await stat(path)).size } catch { continue }
    // Re-encoding a lossy file costs quality, so only do it when the packet
    // has actually changed. A caption edit costs one pass; running this twice
    // costs nothing.
    const current = (await sharp(path).metadata().catch(() => ({}))).xmp
    if (current && current.toString() === packet) { skipped++; continue }
    if (DRY) { stamped++; continue }
    const out = await sharp(path).withXmp(packet).webp({ quality: suffix ? 60 : 66 }).toBuffer()
    await writeFile(path, out)
    grew += out.length - before
    stamped++
  }

  if (frame.seconds) {
    const path = join(MEDIA, `${frame.id}.mp4`)
    let before
    try { before = (await stat(path)).size } catch { before = null }
    if (before !== null) {
      // `continue` here would skip the index entry below as well, which
      // quietly dropped every film from media.json.
      const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format_tags=title', '-of', 'default=nw=1', path])
      const current = stdout.includes(`title=${frame.caption.en ?? frame.id}`)
      if (current) skipped++
      else if (!DRY) {
        // The extension has to stay .mp4: ffmpeg picks the output format from
        // it, and a temporary name ending in .stamping makes it give up.
        const tmp = join(MEDIA, `${frame.id}.stamping.mp4`)
        // `-c copy` so this is a remux, not a re-encode: the frames are
        // untouched and only the container's metadata changes.
        await run('ffmpeg', ['-v', 'error', '-y', '-i', path, '-c', 'copy', '-movflags', '+faststart',
          '-metadata', `title=${frame.caption.en ?? frame.id}`,
          '-metadata', `description=${frame.alt.en ?? ''}`,
          '-metadata', `comment=${frame.alt.en ?? ''}`,
          '-metadata', `artist=${CREDIT}`,
          '-metadata', `copyright=${RIGHTS}`,
          '-metadata', `keywords=${frame.tags.join(', ')}`,
          tmp])
        await rename(tmp, path)
        grew += (await stat(path)).size - before
        stamped++
      } else stamped++
    }
  }

  const base = `${ORIGIN}/images/media/${frame.id}`
  index.push({
    id: frame.id,
    kind: frame.kind,
    tags: frame.tags,
    seconds: frame.seconds,
    alt: frame.alt,
    caption: frame.caption,
    url: `${base}.webp`,
    tile: `${base}-s.webp`,
    ...(frame.seconds ? { film: `${base}.mp4` } : {}),
    ...(frame.permalink ? { source: frame.permalink } : {}),
    ...(frame.consentOwed ? { consentOwed: frame.consentOwed } : {})
  })
}

if (!DRY) {
  await writeFile(
    join(ROOT, 'docs/public/media.json'),
    JSON.stringify({ origin: ORIGIN, rights: RIGHTS, count: index.length, media: index }, null, 2) + '\n'
  )
}

console.log(
  `export-media: ${stamped} file(s) ${DRY ? 'would be stamped' : 'stamped'}, ${skipped} already current` +
    (held ? `, ${held} draft(s) held back` : '') +
    (DRY ? '' : `, ${grew >= 0 ? '+' : ''}${kb(Math.abs(grew))} total`) +
    `\n  ${index.length} frames in docs/public/media.json` +
    (ORIGIN ? ` at ${ORIGIN}/media.json` : '')
)
