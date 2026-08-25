#!/usr/bin/env node
import { readFile } from 'node:fs/promises'

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

if (problems.length) {
  console.error(`check-ecosystem: ${problems.length} problem(s)\n`)
  problems.forEach((p) => console.error(`  ${p}`))
  process.exit(1)
}

console.log('check-ecosystem: locale-aware clown links, professional metadata and typography contract are aligned')
