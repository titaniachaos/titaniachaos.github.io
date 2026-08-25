#!/usr/bin/env node
// Pulls the latest Instagram posts into the repository as ordinary files.
//
// Why sync rather than fetch at build: Instagram's CDN URLs are signed and
// expire within days, so a site that stores them serves broken images by the
// end of the week. And a build that needed a token could only be run by
// whoever holds one. Syncing writes real files and a committed manifest, so
// the build stays offline, deterministic and reproducible by anyone.
//
// Nothing here is required for the site to build. With no token this exits 0
// and changes nothing, which is what a fork, a pull request and a first clone
// all need.
//
// Requires a Creator or Business account linked to a Facebook Page: the Basic
// Display API shut down on 4 December 2024 and personal accounts lost access
// with it.
//
// Usage: IG_TOKEN=... node scripts/social-sync.mjs [count]

import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const TOKEN = process.env.IG_TOKEN
// Four, not more. Each tile costs about 33 KB and the homepage carries the
// hero as well; six put it 22 KB under a 500 KB budget, which is one design
// change away from failing. Raising this is one number, and check-page-weight
// will say if it was too many.
const COUNT = Number(process.argv[2] ?? 4)
const MEDIA_DIR = 'docs/public/social'
const MANIFEST = 'docs/.vitepress/social-manifest.json'
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'

if (!TOKEN) {
  console.log('social-sync: no IG_TOKEN, nothing synced (the site builds without it)')
  process.exit(0)
}

/**
 * Instagram returns a signed URL that expires, and a roughly 1080px original.
 * The wall renders tiles at about 150px, so shipping the original is four
 * times the pixels and roughly eight times the bytes for no visible gain --
 * enough to put the homepage over its weight budget on its own.
 */
const EDGE = 480
async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} fetching media`)
  const original = Buffer.from(await res.arrayBuffer())
  const out = await sharp(original)
    .rotate() // honour EXIF orientation before the metadata is dropped
    .resize(EDGE, EDGE, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer()
  await writeFile(dest, out)
  return { bytes: out.length, saved: original.length - out.length }
}

/** First line of the caption, trimmed to something a screen reader can use. */
function altFrom(caption) {
  if (!caption) return ''
  const first = caption.split('\n').find((l) => l.trim() && !l.trim().startsWith('#'))
  if (!first) return ''
  return first.trim().replace(/\s+/g, ' ').slice(0, 160)
}

const api = `https://graph.instagram.com/me/media?fields=${FIELDS}&limit=${COUNT}&access_token=${TOKEN}`
const res = await fetch(api)
if (!res.ok) {
  console.error(`social-sync: Instagram returned ${res.status}`)
  console.error(`  ${(await res.text()).slice(0, 300)}`)
  process.exit(1)
}
const { data = [] } = await res.json()
if (!data.length) {
  console.error('social-sync: the account returned no media — refusing to publish an empty wall')
  process.exit(1)
}

await mkdir(MEDIA_DIR, { recursive: true })

const posts = []
let bytes = 0
let saved = 0
for (const item of data.slice(0, COUNT)) {
  // A video has no still of its own; thumbnail_url is the poster frame.
  const src = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url
  if (!src) continue
  const file = `${item.id}.jpg`
  try {
    const r = await download(src, join(MEDIA_DIR, file))
    bytes += r.bytes
    saved += r.saved
  } catch (err) {
    console.error(`social-sync: skipped ${item.id} — ${err.message}`)
    continue
  }
  posts.push({
    id: item.id,
    file: `/social/${file}`,
    type: item.media_type,
    permalink: item.permalink,
    timestamp: item.timestamp,
    caption: (item.caption ?? '').slice(0, 600),
    alt: altFrom(item.caption)
  })
}

if (!posts.length) {
  console.error('social-sync: every download failed — leaving the previous sync in place')
  process.exit(1)
}

// Drop files from posts that are no longer in the window, so the directory
// does not grow without limit as the account posts.
const keep = new Set(posts.map((p) => p.file.replace('/social/', '')))
for (const name of await readdir(MEDIA_DIR)) {
  if (!keep.has(name)) await unlink(join(MEDIA_DIR, name))
}

await writeFile(
  MANIFEST,
  JSON.stringify({ syncedAt: new Date().toISOString(), account: 'titaniachaos', posts }, null, 2) + '\n',
  'utf-8'
)

console.log(
  `social-sync: ${posts.length} posts, ${(bytes / 1024).toFixed(0)} KB of media ` +
  `(${(saved / 1024 / 1024).toFixed(1)} MB saved by resizing to ${EDGE}px)`
)
for (const p of posts) {
  console.log(`  ${p.timestamp.slice(0, 10)}  ${p.type.toLowerCase().padEnd(11)} ${p.alt.slice(0, 56) || '(no caption)'}`)
}
