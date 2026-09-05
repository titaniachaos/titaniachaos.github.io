#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { frames as catalogue, vocabulary as readVocabulary } from './lib/media-meta.mjs'

const [config, seo, copy, css, en, bg, de] = await Promise.all([
  readFile('docs/.vitepress/config.mts', 'utf8'),
  readFile('docs/.vitepress/seo.ts', 'utf8'),
  readFile('docs/.vitepress/site-copy.ts', 'utf8'),
  readFile('docs/.vitepress/theme/custom.css', 'utf8'),
  readFile('docs/work-with-titania.md', 'utf8'),
  readFile('docs/bg/work-with-titania.md', 'utf8'),
  readFile('docs/de/work-with-titania.md', 'utf8')
])

const problems = []
const requireText = (source, text, message) => {
  if (!source.includes(text)) problems.push(message)
}

for (const prefix of ["CLOWN_SITE('')", "CLOWN_SITE('/bg')", "CLOWN_SITE('/de')"]) {
  requireText(config, prefix, `missing locale-aware clown navigation: ${prefix}`)
}

// The structured job title moved out of seo.ts into the per-locale copy, so
// this checks where it lives now -- and checks all three, which is the point
// of having moved it. Asserting only the English string is what let the same
// English prose be served as `inLanguage: 'bg'` for as long as it was.
requireText(copy, "jobTitle: 'Clown artist, psychologist and language teacher'", 'structured job title is stale')

const jobTitles = [...copy.matchAll(/jobTitle: '([^']+)'/g)].map((m) => m[1])
if (jobTitles.length !== 3) {
  problems.push(`expected a structured job title in three languages, found ${jobTitles.length}`)
} else if (new Set(jobTitles).size !== 3) {
  problems.push('a structured job title is repeated across locales -- one of them is untranslated')
}

for (const [name, source] of [['English', en], ['Bulgarian', bg], ['German', de]]) {
  // `екип` as well as `тийм`: the Bulgarian for a team is екип, and the page
  // body has used екипна работа since it was written. The check only knew the
  // transliterated loanword, so correct Bulgarian failed it.
  if (!/team|тийм|екип|Team/i.test(source.match(/^description:.*$/m)?.[0] ?? '')) {
    problems.push(`${name} Work with Titania description does not mention team workshops`)
  }
}

for (const token of [
  '--vp-font-family-base: Inter, ui-sans-serif, system-ui, sans-serif',
  '.vp-doc { font-size: 16px; line-height: 1.75; }',
  'max-width: 70ch',
  'text-wrap: balance',
  'hyphens: auto'
]) requireText(css, token, `typography contract missing: ${token}`)

// ---- the pages ask for pictures, and the pictures live somewhere else -----
// `<MediaFigure tags="camera props" />` is a query against the closed
// vocabulary in media.data.ts, written in twelve Markdown files that know
// nothing about it, and `<MediaHero />` shows whatever those queries resolved
// to. Four things can go wrong and none of them show in a diff.

// The vocabulary lives in categories.ts, which the loader and media
// components import. It remains useful even though there is no public gallery.
const taxonomy = await readFile('docs/.vitepress/categories.ts', 'utf8')
const vocabulary = await readVocabulary()

if (vocabulary.length === 0) problems.push('could not read the tag vocabulary from categories.ts')

const frameIds = (await catalogue()).map((f) => f.id)

const pages = new Map() // page name -> locale -> { hero, figures[] }
for (const locale of ['', 'bg', 'de']) {
  const dir = join('docs', locale)
  // Subdirectories too: the journal is twelve posts under blog/, and they
  // carry figures like any other page.
  const walk = async (from, prefix = '') => {
    const out = []
    for (const e of await readdir(from, { withFileTypes: true }).catch(() => [])) {
      if (e.isDirectory()) {
        if (['bg', 'de'].includes(e.name)) continue
        out.push(...(await walk(join(from, e.name), `${prefix}${e.name}/`)))
      } else if (e.name.endsWith('.md')) out.push(`${prefix}${e.name}`)
    }
    return out
  }
  for (const name of await walk(dir)) {
    const source = await readFile(join(dir, name), 'utf8')
    // Both ways of asking: by tags, and by naming a frame outright.
    const figures = [...source.matchAll(/<MediaFigure[^>]*\b(tags|id)="([^"]*)"/g)]
      .map((m) => (m[1] === 'id' ? `id:${m[2].trim()}` : m[2].trim().replace(/\s+/g, ' ')))
    const hero = /<MediaHero[\s/>]/.test(source)
    if (!hero && figures.length === 0) continue
    if (!pages.has(name)) pages.set(name, new Map())
    pages.get(name).set(locale || 'root', { hero, figures })
  }
}

for (const [name, byLocale] of pages) {
  for (const [locale, page] of byLocale) {
    const where = `${locale === 'root' ? '' : locale + '/'}${name}`

    // A tag nothing carries resolves to nothing, and the section quietly
    // loses its picture.
    for (const asked of page.figures) {
      if (asked.startsWith('id:')) {
        const id = asked.slice(3)
        if (!frameIds.includes(id)) problems.push(`${where}: MediaFigure id="${id}" — there is no such frame`)
        continue
      }
      const unknown = asked.split(' ').filter((tag) => !vocabulary.includes(tag))
      if (unknown.length) problems.push(`${where}: MediaFigure asks for ${unknown.join(', ')}, which no frame can carry`)
    }

    // The homepage may preview its selected media in a carousel. Internal
    // editorial pages place each figure beside the claim it supports, so a
    // second carousel would repeat the same material before the page begins.
    const isHome = name === 'index.md'
    if (isHome && page.figures.length > 1 && !page.hero) {
      problems.push(`${where}: homepage has ${page.figures.length} figures and no <MediaHero /> preview`)
    }
    if (!isHome && page.hero) {
      problems.push(`${where}: internal page repeats its figures in a <MediaHero /> carousel`)
    }
    if (page.hero && !page.figures.length) problems.push(`${where}: has a <MediaHero /> but nothing for it to slide`)
  }

  // Three languages, one page. Different figures in different languages is
  // the one thing the whole locale setup exists to prevent.
  if (byLocale.size !== 3) {
    problems.push(`${name}: media in ${[...byLocale.keys()].join(', ')} but not in all three languages`)
    continue
  }
  const shapes = new Set([...byLocale.values()].map((p) => p.figures.join(' | ')))
  if (shapes.size !== 1) {
    problems.push(
      `${name}: the three languages place different figures — ` +
        [...byLocale].map(([l, p]) => `${l}: [${p.figures.join('] [')}]`).join('; ')
    )
  }
}

if (problems.length) {
  console.error(`check-ecosystem: ${problems.length} problem(s)\n`)
  problems.forEach((p) => console.error(`  ${p}`))
  process.exit(1)
}

const figures = [...pages.values()].reduce((n, byLocale) => n + [...byLocale.values()].reduce((m, p) => m + p.figures.length, 0), 0)
console.log(
  'check-ecosystem: locale-aware clown links, professional metadata, typography contract ' +
    `and ${figures} figures on ${pages.size} pages asking the same ${vocabulary.length}-word vocabulary ` +
    'identically across three languages'
)
