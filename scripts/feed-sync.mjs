#!/usr/bin/env node
// Pulls photographs from the Instagram and Facebook accounts into the media
// system, so a post can be placed in the text of a page like any other frame.
//
// This is not the social wall. `social-sync.mjs` keeps four recent posts as
// 480px tiles for the feed strip at the bottom of the home page; those are
// posts, shown as posts, in the order they were made. What this writes are
// *frames*: the same size and encoding as the picture archive, tagged against
// the same vocabulary, so `<MediaFigure tags="balloons birthday" />` can
// resolve to an Instagram photograph without the page knowing where it came
// from. The two sync separately because they answer different questions.
//
// ---- what it needs -------------------------------------------------------
//
//   IG_TOKEN                 a long-lived Instagram Graph token. Requires a
//                            Creator or Business account linked to a Facebook
//                            Page: the Basic Display API shut down on
//                            4 December 2024 and personal accounts went with
//                            it. `social-token.mjs` keeps it alive.
//   FB_PAGE_ID, FB_TOKEN     a Page id and a Page access token with
//                            `pages_read_engagement`.
//
// Either, both or neither. With neither this exits 0 and changes nothing,
// which is what a fork, a pull request and a first clone all need — and it is
// also why the manifest is committed rather than fetched at build time.
//
// Neither account can be read without credentials: instagram.com serves a
// login shell to an anonymous request and facebook.com answers 400. There is
// no version of this that works from a clone with no secrets.
//
// ---- how a post gets its tags --------------------------------------------
//
// It does not have any, so they are read out of its caption. Every tag in the
// vocabulary has a name in all three languages already, in media.data.ts, and
// a caption that says "balloons" or "Luftballons" or "балони" is a caption
// about balloons. Anything a caption does not say is not guessed at; what is
// left carries `feed` alone, which is a tag a page can still ask for.
//
// Usage: IG_TOKEN=... FB_PAGE_ID=... FB_TOKEN=... node scripts/feed-sync.mjs [count]

import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const IG = process.env.IG_TOKEN
const FB_ID = process.env.FB_PAGE_ID
const FB = process.env.FB_TOKEN
const COUNT = Number(process.argv[2] ?? 6)

const OUT = 'docs/public/images/media'
const MANIFEST = 'docs/.vitepress/media-manifest.json'
const SOURCE = 'docs/.vitepress/media.data.ts'

// The same numbers as media/make-media.mjs. A frame from the feed is shown in
// the same two slots as a frame from the archive, so it is the same size.
const W = 520
const H = 700
const Q = 66

if (!IG && !FB) {
  console.log('feed-sync: no IG_TOKEN and no FB_TOKEN, nothing synced (the site builds without either)')
  process.exit(0)
}

// ---- the vocabulary, read from the file that owns it ----------------------
// Not a second copy: a tag added to media.data.ts is a word this starts
// matching on the next run, in all three languages, with no edit here.

const source = await readFile(SOURCE, 'utf8')
const tags = [...(source.match(/export const TAGS = \[([\s\S]*?)\] as const/)?.[1] ?? '')
  .matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
if (!tags.length) {
  console.error(`feed-sync: could not read the tag vocabulary from ${SOURCE}`)
  process.exit(1)
}

/** tag -> every word that means it, lowercased, across the three languages. */
const words = new Map(tags.map((tag) => [tag, new Set([tag])]))
for (const block of source.matchAll(/^\s{4}([a-z-]+): '([^']+)',?$/gm)) {
  const [, tag, name] = block
  if (words.has(tag)) for (const word of name.toLowerCase().split(/[\s-]+/)) {
    if (word.length > 3) words.get(tag).add(word)
  }
}

function tagsFor(caption) {
  const text = (caption ?? '').toLowerCase()
  const found = tags.filter((tag) => [...words.get(tag)].some((w) => text.includes(w)))
  return found.length ? [...new Set([...found, 'feed'])] : ['feed']
}

/** First line that is not a hashtag pile, for the alt text and the caption. */
function firstLine(caption) {
  const line = (caption ?? '').split('\n').find((l) => l.trim() && !l.trim().startsWith('#'))
  return (line ?? '').trim().replace(/\s+/g, ' ').slice(0, 180)
}

async function grab(url, id) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} fetching media`)
  const original = Buffer.from(await res.arrayBuffer())
  const out = await sharp(original)
    .rotate() // honour EXIF orientation before the metadata is dropped
    .resize(W, H, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: Q })
    .toBuffer()
  await writeFile(join(OUT, `${id}.webp`), out)
  return out.length
}

await mkdir(OUT, { recursive: true })

const frames = []
let bytes = 0

// ---- Instagram -----------------------------------------------------------

if (IG) {
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp'
  const res = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&limit=${COUNT}&access_token=${IG}`)
  if (!res.ok) {
    console.error(`feed-sync: Instagram returned ${res.status}\n  ${(await res.text()).slice(0, 300)}`)
    process.exit(1)
  }
  const { data = [] } = await res.json()
  for (const item of data.slice(0, COUNT)) {
    const src = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url
    if (!src) continue
    const id = `ig-${item.id}`
    try { bytes += await grab(src, id) } catch (err) {
      console.error(`feed-sync: skipped ${id} — ${err.message}`)
      continue
    }
    frames.push({
      id,
      kind: 'photo',
      source: 'instagram',
      tags: tagsFor(item.caption),
      text: firstLine(item.caption),
      permalink: item.permalink,
      timestamp: item.timestamp
    })
  }
}

// ---- Facebook ------------------------------------------------------------

if (FB && FB_ID) {
  const fields = 'id,name,created_time,permalink_url,images'
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${FB_ID}/photos?type=uploaded&fields=${fields}&limit=${COUNT}&access_token=${FB}`
  )
  if (!res.ok) {
    console.error(`feed-sync: Facebook returned ${res.status}\n  ${(await res.text()).slice(0, 300)}`)
    process.exit(1)
  }
  const { data = [] } = await res.json()
  for (const item of data.slice(0, COUNT)) {
    // `images` comes back largest first; the largest is far more than needed
    // but it is the one that has not already been cropped by somebody else.
    const src = item.images?.[0]?.source
    if (!src) continue
    const id = `fb-${item.id}`
    try { bytes += await grab(src, id) } catch (err) {
      console.error(`feed-sync: skipped ${id} — ${err.message}`)
      continue
    }
    frames.push({
      id,
      kind: 'photo',
      source: 'facebook',
      tags: tagsFor(item.name),
      text: firstLine(item.name),
      permalink: item.permalink_url,
      timestamp: item.created_time
    })
  }
} else if (FB || FB_ID) {
  console.error('feed-sync: Facebook needs both FB_PAGE_ID and FB_TOKEN')
  process.exit(1)
}

if (!frames.length) {
  console.error('feed-sync: nothing came back — leaving the previous manifest in place')
  process.exit(1)
}

frames.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))

await writeFile(
  MANIFEST,
  JSON.stringify({ syncedAt: new Date().toISOString(), frames }, null, 2) + '\n',
  'utf-8'
)

const byTag = frames.flatMap((f) => f.tags).reduce((m, t) => m.set(t, (m.get(t) ?? 0) + 1), new Map())
console.log(
  `feed-sync: ${frames.length} frames, ${(bytes / 1024).toFixed(0)} KB\n  ` +
    [...byTag].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(' · ')
)
console.log(
  '\n  A frame from the feed carries its caption in the language it was written in,\n' +
    '  in all three. media/README.md says why that is a compromise and not a bug.'
)
