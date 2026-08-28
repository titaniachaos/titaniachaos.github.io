#!/usr/bin/env node
// Checks that the three languages stay the same site.
//
// The language switcher maps a page to its counterpart by swapping the path
// prefix, and every cross-link points at a hand-written section id. Both break
// silently: a missing translation shows up as a 404 only for readers in that
// language, and an id that exists in English but not in German breaks only the
// German links. This is also where a half-translated page gets caught -- the
// German flop gloss sat at 0.64x the English for a day without anyone noticing.
//
// Usage: node scripts/check-locales.mjs [docsDir]   (default docs)

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const docs = process.argv[2] ?? 'docs'
const LOCALES = ['bg', 'de'] // root is the reference

/** Loose bounds: a translation may legitimately run shorter or longer. */
const MIN_RATIO = 0.6
const MAX_RATIO = 1.8

const problems = []
const add = (m) => problems.push(m)

/**
 * Every page in a locale, including the ones in subdirectories. The journal is
 * twelve posts under blog/ and was outside this check entirely -- which meant
 * a post could lose its Bulgarian translation, or drift to half the length of
 * the English, and nothing would say so.
 */
async function markdownIn(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const out = []
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!prefix && LOCALES.includes(e.name)) continue
      out.push(...(await markdownIn(join(dir, e.name), `${prefix}${e.name}/`)))
    } else if (e.name.endsWith('.md')) out.push(`${prefix}${e.name}`)
  }
  return out
}

function parse(source) {
  const fm = source.match(/^---\n([\s\S]*?)\n---\n/)
  const body = fm ? source.slice(fm[0].length) : source
  const frontmatter = fm ? fm[1] : ''
  const headings = [...body.matchAll(/^(#{1,6}) +(.*)$/gm)].map((m) => ({
    level: m[1].length,
    text: m[2].trim()
  }))
  const ids = headings.flatMap((h) => {
    const m = h.text.match(/\{#([\w-]+)\}\s*$/)
    return m ? [m[1]] : []
  })
  const words = (body.match(/[\p{L}\p{N}]+/gu) ?? []).length
  return { frontmatter, headings, ids, words }
}

const rootPages = (await markdownIn(docs)).filter((n) => n !== '404.md')
if (rootPages.length === 0) {
  console.error(`check-locales: no Markdown found in ${docs}`)
  process.exit(1)
}

for (const name of rootPages) {
  const reference = parse(await readFile(join(docs, name), 'utf8'))

  for (const field of ['title', 'description']) {
    if (!new RegExp(`^${field}:`, 'm').test(reference.frontmatter)) {
      add(`${name}: frontmatter has no ${field}`)
    }
  }

  for (const locale of LOCALES) {
    const path = join(docs, locale, name)
    let source
    try {
      source = await readFile(path, 'utf8')
    } catch {
      add(`${locale}/${name}: missing translation`)
      continue
    }
    const page = parse(source)

    for (const field of ['title', 'description']) {
      if (!new RegExp(`^${field}:`, 'm').test(page.frontmatter)) {
        add(`${locale}/${name}: frontmatter has no ${field}`)
      }
    }

    const shape = (p) => p.headings.map((h) => h.level).join(',')
    if (shape(page) !== shape(reference)) {
      add(
        `${locale}/${name}: heading structure differs -- ${page.headings.length} headings ` +
          `(${shape(page)}) against ${reference.headings.length} (${shape(reference)})`
      )
    }

    const missing = reference.ids.filter((id) => !page.ids.includes(id))
    const extra = page.ids.filter((id) => !reference.ids.includes(id))
    if (missing.length) add(`${locale}/${name}: missing section ids ${missing.join(', ')}`)
    if (extra.length) add(`${locale}/${name}: section ids not in the reference: ${extra.join(', ')}`)

    const ratio = page.words / (reference.words || 1)
    if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
      add(
        `${locale}/${name}: ${page.words} words against ${reference.words} ` +
          `(${ratio.toFixed(2)}x) -- likely half-translated or stale`
      )
    }
  }
}

// A translation with no counterpart in the reference language is unreachable
// from the language switcher, which swaps prefixes rather than searching.
for (const locale of LOCALES) {
  for (const name of await markdownIn(join(docs, locale))) {
    if (!rootPages.includes(name)) add(`${locale}/${name}: has no counterpart in the root locale`)
  }
}

if (problems.length) {
  console.error(`check-locales: ${problems.length} problem(s)\n`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log(
  `check-locales: ${rootPages.length} pages x ${LOCALES.length + 1} languages -- ` +
    `same structure, same section ids, comparable length`
)
