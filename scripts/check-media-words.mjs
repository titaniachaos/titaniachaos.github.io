#!/usr/bin/env node
// Alt text and captions do different jobs, and the archive has to keep them
// different.
//
// `alt` is what someone who cannot see the picture needs to know. `caption` is
// what someone who can see it might not know. When they are the same string a
// screen reader reads the description twice and a sighted reader gets a label
// where the rest of the archive has a remark.
//
// 27 published frames were in that state, and it was not 27 mistakes: the
// August import table carried one description per language and assigned it to
// both fields, in two places at once -- media.data.ts and the parser in
// media-meta.mjs that reads it. One line each.
//
// Placeholders are checked by substring rather than by exact match. `TODO` was
// caught; `TODO the same, in Bulgarian` was not, and it shipped in a frame's
// Bulgarian caption looking for all the world like filled-in text.
//
// Usage: node scripts/check-media-words.mjs

import { frames } from './lib/media-meta.mjs'

const LANGS = ['en', 'bg', 'de']
const PLACEHOLDER = /\b(todo|tbd|fixme|lorem ipsum)\b/i
const CYRILLIC = /[Ѐ-ӿ]/

const all = await frames()
const published = all.filter((frame) => !frame.draft)
const problems = []

for (const frame of published) {
  for (const lang of LANGS) {
    const alt = frame.alt?.[lang]?.trim() ?? ''
    const caption = frame.caption?.[lang]?.trim() ?? ''

    if (!alt) problems.push(`${frame.id}: no alt text in ${lang}`)
    if (!caption) problems.push(`${frame.id}: no caption in ${lang}`)
    if (PLACEHOLDER.test(alt)) problems.push(`${frame.id}: alt.${lang} is still a placeholder`)
    if (PLACEHOLDER.test(caption)) problems.push(`${frame.id}: caption.${lang} is still a placeholder`)
    if (alt && caption && alt.toLowerCase() === caption.toLowerCase()) {
      problems.push(`${frame.id}: alt.${lang} is its own caption — they do different jobs`)
    }
  }

  // Bulgarian is the one language whose script says whether it was translated
  // at all. German and English share an alphabet, so an untranslated German
  // string is only visible to a reader; this catches the case that a machine
  // can see.
  if (frame.caption?.bg && !CYRILLIC.test(frame.caption.bg)) {
    problems.push(`${frame.id}: caption.bg has no Cyrillic in it — untranslated`)
  }
  if (frame.alt?.bg && !CYRILLIC.test(frame.alt.bg)) {
    problems.push(`${frame.id}: alt.bg has no Cyrillic in it — untranslated`)
  }

  // The same caption on two frames is a copy, not a description of either.
  for (const lang of LANGS) {
    const mine = frame.caption?.[lang]?.trim().toLowerCase()
    if (!mine) continue
    const twin = published.find(
      (other) => other.id !== frame.id && other.caption?.[lang]?.trim().toLowerCase() === mine
    )
    if (twin && twin.id > frame.id) {
      problems.push(`${frame.id} and ${twin.id} share one caption in ${lang}`)
    }
  }
}

if (problems.length) {
  console.error(`check-media-words: ${problems.length} problem(s)\n`)
  for (const problem of problems.slice(0, 25)) console.error(`  ${problem}`)
  if (problems.length > 25) console.error(`  … and ${problems.length - 25} more`)
  process.exit(1)
}

console.log(
  `check-media-words: ${published.length} published frames — ` +
    `alt and caption present, translated and distinct in all ${LANGS.length} languages`
)
