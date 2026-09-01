/**
 * A small Atom builder, shaped after `@astrojs/rss`.
 *
 * Astro's rss() takes a declarative object — title, description, site, items —
 * and owns the XML. Same split here: callers describe what is in the feed and
 * never spell Atom, so a second feed costs an items array rather than another
 * pile of string concatenation.
 *
 * Atom rather than RSS because every entry needs a stable, non-URL identity
 * (a work is cited from several records and may have no page of its own), and
 * Atom's `id` is built for exactly that.
 */

export interface FeedLink {
  href: string
  rel?: 'alternate' | 'related' | 'self' | 'via'
  type?: string
}

export interface FeedCategory {
  term: string
  label?: string
  /**
   * The vocabulary the term belongs to (RFC 4287 §4.2.2.2). Item categories
   * leave it out -- their vocabulary is obvious from the label. A feed-level
   * category carrying a fingerprint needs it, so a reader can tell a receipt
   * from a subject keyword without guessing.
   */
  scheme?: string
}

export interface FeedItem {
  /** Stable identity. A tag: URI, not a URL — entries outlive their links. */
  id: string
  title: string
  /** ISO 8601. Defaults to the feed's own timestamp. */
  updated?: string
  authors?: string[]
  links?: FeedLink[]
  categories?: FeedCategory[]
  /** HTML fragment. Escaped here; callers pass markup, not entities. */
  content?: string
}

export interface FeedOptions {
  /** Feed identity, again a tag: URI rather than a URL. */
  id: string
  title: string
  subtitle?: string
  /** Canonical address of the feed itself. */
  self: string
  /** Human-readable page this feed accompanies. */
  alternate?: string
  author?: string
  generator?: { uri: string; text: string }
  /** One timestamp for the build, inherited by items that omit their own. */
  updated: string
  /** XSLT that lets a browser render the feed instead of offering a download. */
  stylesheet?: string
  lang?: string
  /** Categories describing the feed as a whole, not any one entry. */
  categories?: FeedCategory[]
  items: FeedItem[]
}

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const tag = (name: string, value: string) => `  <${name}>${esc(value)}</${name}>`

const renderCategory = (c: FeedCategory, indent: string) =>
  `${indent}<category term="${esc(c.term)}"` +
  `${c.scheme ? ` scheme="${esc(c.scheme)}"` : ''}` +
  `${c.label ? ` label="${esc(c.label)}"` : ''}/>`

function renderItem(item: FeedItem, fallbackStamp: string): string {
  const lines = [
    '  <entry>',
    `    <id>${esc(item.id)}</id>`,
    `    <title>${esc(item.title)}</title>`,
    `    <updated>${esc(item.updated ?? fallbackStamp)}</updated>`,
    ...(item.authors ?? []).map((a) => `    <author><name>${esc(a)}</name></author>`),
    ...(item.links ?? []).map(
      (l) =>
        `    <link rel="${esc(l.rel ?? 'alternate')}"${l.type ? ` type="${esc(l.type)}"` : ''} href="${esc(l.href)}"/>`
    ),
    ...(item.categories ?? []).map((c) => renderCategory(c, '    ')),
    item.content ? `    <content type="html">${esc(item.content)}</content>` : '',
    '  </entry>'
  ]
  return lines.filter(Boolean).join('\n')
}

/** Render a complete Atom document. */
export function atom(o: FeedOptions): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    o.stylesheet ? `<?xml-stylesheet href="${esc(o.stylesheet)}" type="text/xsl"?>` : '',
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${esc(o.lang ?? 'en')}">`,
    tag('id', o.id),
    tag('title', o.title),
    o.subtitle ? tag('subtitle', o.subtitle) : '',
    tag('updated', o.updated),
    `  <link rel="self" type="application/atom+xml" href="${esc(o.self)}"/>`,
    o.alternate ? `  <link rel="alternate" type="text/html" href="${esc(o.alternate)}"/>` : '',
    o.author ? `  <author><name>${esc(o.author)}</name></author>` : '',
    o.generator ? `  <generator uri="${esc(o.generator.uri)}">${esc(o.generator.text)}</generator>` : '',
    ...(o.categories ?? []).map((c) => renderCategory(c, '  ')),
    ...o.items.map((i) => renderItem(i, o.updated)),
    '</feed>',
    ''
  ]
    .filter(Boolean)
    .join('\n')
}
