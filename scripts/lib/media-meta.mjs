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
      const m = body.match(new RegExp(`${field}: \\{([\\s\\S]*?)\\n\\s{4}\\}`))?.[1] ?? ''
      const pick = (l) => m.match(new RegExp(`${l}: '((?:[^'\\\\]|\\\\.)*)'`))?.[1]?.replace(/\\'/g, "'")
      return { en: pick('en'), bg: pick('bg'), de: pick('de') }
    }
    out.push({
      id: block[1],
      kind: /kind: 'video'/.test(body) ? 'video' : 'photo',
      tags: [...(body.match(/tags: \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map((m) => m[1]),
      seconds: Number(body.match(/seconds: (\d+)/)?.[1]) || undefined,
      permalink: body.match(/permalink: '([^']+)'/)?.[1],
      consentOwed: body.match(/consentOwed: '([^']*)'/)?.[1],
      alt: three('alt'),
      caption: three('caption')
    })
  }
  return out
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
    `<dc:creator><rdf:Seq><rdf:li>${xmlEscape(credit)}</rdf:li></rdf:Seq></dc:creator>` +
    `<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${xmlEscape(rights)}</rdf:li></rdf:Alt></dc:rights>` +
    `<dc:source>${xmlEscape(frame.permalink ?? url)}</dc:source>` +
    `<xmp:Identifier>${xmlEscape(url)}</xmp:Identifier>` +
    `</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`
  )
}
