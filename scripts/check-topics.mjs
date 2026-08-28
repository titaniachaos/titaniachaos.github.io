#!/usr/bin/env node
// Checks that the three languages of a page ask the archive the same question.
//
// A section states what it is about by asking for a picture --
// `<MediaFigure tags="birthday children" />` -- and that statement now does
// three jobs: it chooses the frame, it fills the hero slider, and it decides
// which category pages the page links to and appears on. So a German section
// that asks for `children` where the English asks for `birthday children` is
// not a slightly different picture. It is a page filed under a different
// subject for German readers.
//
// That is not hypothetical: the clown site's blog tags drifted exactly this
// way, in silence, for as long as nothing read them.
//
// The loader already refuses a tag outside the vocabulary. This runs before
// the build, so the failure arrives in a sentence rather than a stack trace,
// and it checks the thing the loader cannot see: whether the languages agree.
//
// Usage: node scripts/check-topics.mjs

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = join(ROOT, 'docs')
const LANGS = ['en', 'bg', 'de']

// Read the vocabulary out of the module rather than restating it here; a check
// with its own copy of the list is a check that can be wrong.
const source = await readFile(join(DOCS, '.vitepress/categories.ts'), 'utf8')
const block = /export const TAGS = \[([\s\S]*?)\] as const/.exec(source)?.[1] ?? ''
const VOCABULARY = [...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
if (VOCABULARY.length === 0) {
  console.error('check-topics: could not read TAGS out of docs/.vitepress/categories.ts')
  process.exit(1)
}

const problems = []
const add = (m) => problems.push(m)

/** Every figure query in one file, in document order. */
function asked(text) {
  return [...text.matchAll(/<MediaFigure[^>]*\btags="([^"]+)"/g)].map((m) => m[1].trim())
}

/** page name -> lang -> queries */
const pages = new Map()
const seen = new Set()

/**
 * The chips are rendered from the `doc-after` slot on every page that has one.
 * The home layout has none -- VPHome renders `<Content />` last -- so index.md
 * writes `<PageTopics />` out by hand. Anywhere else that would be a second
 * copy under the first, and a home page missing it would be one language
 * quietly losing its exit links.
 */
const homes = {}

for (const lang of LANGS) {
  const dir = lang === 'en' ? DOCS : join(DOCS, lang)
  const names = (await readdir(dir).catch(() => []))
    .filter((n) => n.endsWith('.md') && !n.startsWith('['))
  for (const name of names.sort()) {
    const text = await readFile(join(dir, name), 'utf8')
    const queries = asked(text)
    if (!pages.has(name)) pages.set(name, {})
    pages.get(name)[lang] = queries

    const writesChips = /<PageTopics\s*\/>/.test(text)
    if (name === 'index.md') homes[lang] = writesChips
    else if (writesChips) {
      add(`${lang}/${name}: writes <PageTopics /> and the layout renders it too — the chips would appear twice`)
    }

    for (const query of queries) {
      for (const tag of query.split(/\s+/).filter(Boolean)) {
        seen.add(tag)
        if (!VOCABULARY.includes(tag)) {
          add(`${lang}/${name}: "${tag}" is not in the vocabulary — its category page is not built`)
        }
      }
    }
  }
}

for (const lang of LANGS) {
  if (homes[lang] === false) {
    add(`${lang}/index.md: no <PageTopics /> — the home layout has no slot for it, so this page has no chips`)
  }
}

for (const [name, langs] of pages) {
  const reference = langs.en
  if (!reference) {
    add(`${name}: no root-locale page to compare the translations against`)
    continue
  }
  for (const lang of LANGS.slice(1)) {
    const queries = langs[lang]
    if (!queries) continue // check-locales reports a missing translation itself
    if (queries.length !== reference.length) {
      add(
        `${lang}/${name}: ${queries.length} figure(s) against ${reference.length} in the root locale — ` +
          'one language shows a picture the others do not'
      )
      continue
    }
    for (let i = 0; i < reference.length; i++) {
      if (queries[i] !== reference[i]) {
        add(
          `${lang}/${name}: figure ${i + 1} asks for "${queries[i]}", the root locale asks for ` +
            `"${reference[i]}" — the same section is filed under different subjects`
        )
      }
    }
  }
}

// A tag no page asks for still has a category page, reachable from the index
// and from any frame that carries it. Not an error — it is a subject the
// archive has and the prose has not reached yet — but worth saying out loud.
const unasked = VOCABULARY.filter((tag) => tag !== 'feed' && !seen.has(tag))

if (problems.length) {
  console.error(`check-topics: ${problems.length} problem(s)\n`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}

const figures = [...pages.values()].reduce((n, l) => n + (l.en?.length ?? 0), 0)
console.log(
  `check-topics: ${pages.size} pages x ${LANGS.length} languages — ` +
    `${figures} figures asking the same ${seen.size} of ${VOCABULARY.length} words in each`
)
if (unasked.length) console.log(`  no page asks for: ${unasked.join(', ')}`)
