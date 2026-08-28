#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const [config, seo, css, en, bg, de] = await Promise.all([
  readFile('docs/.vitepress/config.mts', 'utf8'),
  readFile('docs/.vitepress/seo.ts', 'utf8'),
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

requireText(seo, "jobTitle: 'Clown artist, psychologist and language teacher'", 'structured job title is stale')

for (const [name, source] of [['English', en], ['Bulgarian', bg], ['German', de]]) {
  if (!/team|тийм|Team/i.test(source.match(/^description:.*$/m)?.[0] ?? '')) {
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

// The vocabulary lives in categories.ts, which the loader, the three
// [category].paths.ts files, the navigation and the components all import.
const taxonomy = await readFile('docs/.vitepress/categories.ts', 'utf8')
const vocabulary = [...(taxonomy.match(/export const TAGS = \[([\s\S]*?)\] as const/)?.[1] ?? '')
  .matchAll(/'([a-z-]+)'/g)].map((m) => m[1])

if (vocabulary.length === 0) problems.push('could not read the tag vocabulary from categories.ts')

const frameIds = [...(await readFile('docs/.vitepress/media.data.ts', 'utf8'))
  .matchAll(/^\s{4}id: '([a-z0-9-]+)',$/gm)].map((m) => m[1])

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

    // The hero slides a page's figures, so a page with several of them needs
    // one -- but a slider of a single slide is not a slider, and a 140-word
    // journal post carrying one picture is complete without a carousel above
    // it. So: two or more figures require a hero, one does not, and a hero
    // with nothing to slide is always wrong.
    if (page.figures.length > 1 && !page.hero) {
      problems.push(`${where}: has ${page.figures.length} figures and no <MediaHero /> to slide them`)
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

// ---- the generated category pages -----------------------------------------
// The three `[category].paths.ts` files each used to carry their own copy of
// the tag names, and a check to stop the three copies drifting. They import
// them now, from the one module that has them. What is worth checking is that
// nobody puts a copy back.

for (const [locale, dir] of [['en', 'docs'], ['bg', 'docs/bg'], ['de', 'docs/de']]) {
  const paths = await readFile(join(dir, '[category].paths.ts'), 'utf8').catch(() => null)
  if (paths === null) {
    problems.push(`${dir}/[category].paths.ts is missing — that locale has no category pages`)
    continue
  }
  if (!/TAG_NAMES/.test(paths) || !/from '\.{1,2}\/\.vitepress\/categories\.ts'/.test(paths)) {
    problems.push(`${dir}/[category].paths.ts does not take its tag names from categories.ts — a second copy will drift`)
  }
  if (!new RegExp(`TAG_NAMES\\['${locale}'\\]`).test(paths)) {
    problems.push(`${dir}/[category].paths.ts does not read the ${locale} names — it will title its pages in another language`)
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
    `and ${figures} figures on ${pages.size} pages asking the same ${vocabulary.length}-word vocabulary, ` +
    `named identically across three languages and ${vocabulary.length * 3} generated category pages`
)
