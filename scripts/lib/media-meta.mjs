// The catalogue as the media pipeline needs it, and the XMP packet that goes
// into every published file.
//
// Shared because the packet has to be written at the moment a file is encoded,
// not afterwards. Stamping an existing webp means decoding and re-encoding it,
// and a lossy format does not survive that for free: three passes moved pixels
// by a mean of 1.5 and a maximum of 26 levels, and it compounds. So
// make-media.mjs passes the packet into the one encode it already does, and
// export-media.mjs re-stamps only when the metadata has actually changed.

import { readFile } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Origin, credit and licence, read from where the site already states them. */
export async function context() {
  const seo = await readFile(join(ROOT, 'docs/.vitepress/seo.ts'), 'utf8')
  const config = await readFile(join(ROOT, 'docs/.vitepress/config.mts'), 'utf8')
  const origin = (process.env.SITE_ORIGIN ?? seo.match(/SITE_ORIGIN \?\? '([^']+)'/)?.[1] ?? '').replace(/\/$/, '')
  const credit =
    config.match(/const PHOTOGRAPHERS =\s*\n?\s*'([^']+)'\s*\+\s*\n?\s*'([^']+)'/)?.slice(1).join('') ??
    'Titania Chaos'
  return { origin, credit, rights: `© Tatiana Petkova (Titania Chaos). Photographs by ${credit}.` }
}

/** Every frame in FRAMES, with the fields this needs. */
export async function frames() {
  const source = await readFile(join(ROOT, 'docs/.vitepress/media.data.ts'), 'utf8')
  const out = []
  for (const block of source.matchAll(/\{\s*\n\s{4}id: '([a-z0-9-]+)',[\s\S]*?\n\s{2}\}/g)) {
    const body = block[0]
    const three = (field) => {
      // Up to the closing brace, wherever it is. The old pattern required the
      // brace to be alone on a line indented by four, so a frame written as
      // `alt: { en: '…', bg: '…', de: '…' }` parsed as three undefineds and
      // was exported with no alt text at all, silently, for 75 frames.
      const m = body.match(new RegExp(`${field}: \\{([^}]*)\\}`))?.[1] ?? ''
      const pick = (l) => m.match(new RegExp(`${l}: '((?:[^'\\\\]|\\\\.)*)'`))?.[1]?.replace(/\\'/g, "'")
      return { en: pick('en'), bg: pick('bg'), de: pick('de') }
    }
    out.push({
      id: block[1],
      kind: /kind: 'video'/.test(body) ? 'video' : 'photo',
      tags: [...(body.match(/tags: \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((m) => m[1]),
      seconds: Number(body.match(/seconds: (\d+)/)?.[1]) || undefined,
      draft: /\n\s{4}draft: true,/.test(body),
      focus: body.match(/focus: '([^']+)'/)?.[1],
      creator: body.match(/creator: '([^']+)'/)?.[1],
      permalink: body.match(/permalink: '([^']+)'/)?.[1],
      othersInFrame: body.match(/othersInFrame: '([^']*)'/)?.[1],
      heldBack: body.match(/heldBack: '((?:[^'\\]|\\.)*)'/)?.[1]?.replace(/\\'/g, "'"),
      alt: three('alt'),
      caption: three('caption')
    })
  }
  // Newly imported frames can be published in a compact, reviewed translation
  // table after the generated records. Apply that table here too: this parser
  // intentionally reads source rather than executing the Vite data loader.
  const reviewed = source.match(
    /const AUGUST_2026_MEDIA:[\s\S]*?= \[([\s\S]*?)\n\]\n\nfor \(const \[id, en, bg, de, othersInFrame\]/
  )?.[1] ?? ''
  for (const row of reviewed.matchAll(/\['([^']+)', '((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'(?:, '((?:[^'\\]|\\.)*)')?\]/g)) {
    const frame = out.find((item) => item.id === row[1])
    if (!frame) continue
    // Held back stays held back. media.data.ts keeps this rule at the same
    // point in its own loop; the two must agree, because this parser reads the
    // source rather than running the loader, and a rule kept in one of them is
    // a rule the other quietly breaks. It did: a frame held back as a
    // duplicate was published by this table for the tools that read it here.
    if (frame.heldBack) continue
    frame.draft = false
    frame.alt = frame.caption = { en: row[2], bg: row[3], de: row[4] }
    if (row[5]) frame.othersInFrame = row[5]
  }
  return out
}

/**
 * The closed tag vocabulary, read from the one module that declares it.
 *
 * check-ecosystem and the MCP server each carried their own copy of this
 * regex. Three readers of one list is three chances to disagree with it.
 */
export async function vocabulary() {
  const source = await readFile(join(ROOT, 'docs/.vitepress/categories.ts'), 'utf8')
  const block = /export const TAGS = \[([\s\S]*?)\] as const/.exec(source)?.[1] ?? ''
  return [...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
}

/** Where a frame's derivatives live. The one place that knows the shape. */
export const DERIVED = 'images/media'

/**
 * The files a frame becomes: the prose picture, the square tile, and the film
 * if it is one. Seven files built these paths by hand from the same
 * convention, which is a convention nobody can change.
 */
export function derived(frame) {
  const base = `${DERIVED}/${frame.id}`
  return { wide: `${base}.webp`, tile: `${base}-s.webp`, ...(frame.seconds ? { film: `${base}.mp4` } : {}) }
}

export const xmlEscape = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * A Dublin Core XMP packet. `dc:description` is an `rdf:Alt` with a language
 * for each entry, which is how the format says "the same sentence in three
 * languages" -- so a reader in Vienna and a reader in Sofia both get one they
 * can read, out of one file.
 */
export function xmp(frame, { origin, credit, rights }) {
  const alt = (values) =>
    Object.entries(values)
      .filter(([, v]) => v)
      .map(([lang, v]) => `<rdf:li xml:lang="${lang}">${xmlEscape(v)}</rdf:li>`)
      .join('')
  const url = `${origin}/images/media/${frame.id}.${frame.kind === 'video' ? 'mp4' : 'webp'}`
  return (
    `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/">` +
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"` +
    ` xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/">` +
    `<rdf:Description rdf:about="${xmlEscape(url)}">` +
    `<dc:identifier>${xmlEscape(frame.id)}</dc:identifier>` +
    `<dc:title><rdf:Alt>${alt(frame.caption)}</rdf:Alt></dc:title>` +
    `<dc:description><rdf:Alt>${alt(frame.alt)}</rdf:Alt></dc:description>` +
    `<dc:subject><rdf:Bag>${frame.tags.map((t) => `<rdf:li>${xmlEscape(t)}</rdf:li>`).join('')}</rdf:Bag></dc:subject>` +
    `<dc:creator><rdf:Seq><rdf:li>${xmlEscape(frame.creator ?? credit)}</rdf:li></rdf:Seq></dc:creator>` +
    `<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${xmlEscape(rights)}</rdf:li></rdf:Alt></dc:rights>` +
    `<dc:source>${xmlEscape(frame.permalink ?? url)}</dc:source>` +
    `<xmp:Identifier>${xmlEscape(url)}</xmp:Identifier>` +
    `</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`
  )
}
