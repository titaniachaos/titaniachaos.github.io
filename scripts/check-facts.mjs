#!/usr/bin/env node
// A fact stated twice has to be stated the same way.
//
// This site says several things in two places at once: once in prose, where a
// reader sees it, and once in structured data, where Google does. The price of
// a children's party, the age range, the address, the email, the press
// appearances. Nothing checked that the two agreed, and the failure is silent
// and expensive in exactly one direction — a price changed in the Markdown and
// left alone in the JSON-LD keeps showing the old number in search results,
// where nobody on this side of it ever looks.
//
// The workspace next door had the same shape of problem with its citations:
// three DOIs existed in the prose copy and not in the structured one. This is
// that check, for the facts this site sells on.
//
// It compares numbers and addresses, never phrasing. The page writes "€290
// plus taxi" and the offer says "Up to 10 children, approximately 2-3 hours,
// plus taxi within Vienna"; requiring those to match as strings would only
// force one of them to stop being a sentence.
//
// Usage: node scripts/check-facts.mjs

import { readFile } from 'node:fs/promises'
import { COPY } from '../docs/.vitepress/site-copy.ts'

const LANGS = [
  { lang: 'en', dir: 'docs' },
  { lang: 'bg', dir: 'docs/bg' },
  { lang: 'de', dir: 'docs/de' }
]

const seo = await readFile('docs/.vitepress/seo.ts', 'utf8')
const problems = []
const add = (message) => problems.push(message)

const page = async (dir, name) => readFile(`${dir}/${name}`, 'utf8').catch(() => '')

/** What the structured data claims, read from the source rather than restated. */
const claim = (pattern, what) => {
  const found = pattern.exec(seo)?.[1]
  if (!found) add(`seo.ts no longer states ${what} — this check is out of date`)
  return found
}

const price = claim(/price: (\d+)/, 'a price')
const minAge = claim(/suggestedMinAge: (\d+)/, 'a minimum age')
const maxAge = claim(/suggestedMaxAge: (\d+)/, 'a maximum age')
const street = claim(/streetAddress: '([^']+)'/, 'a street address')
const postcode = claim(/postalCode: '([^']+)'/, 'a postcode')
const email = claim(/email: '([^']+)'/, 'an email address')

const press = [...seo.matchAll(/url: '(https?:\/\/[^']+)'/g)].map((m) => m[1])
if (!press.length) add('seo.ts lists no press items — this check is out of date')

for (const { lang, dir } of LANGS) {
  const events = await page(dir, 'events.md')
  const legal = await page(dir, 'legal-data.md')
  const about = await page(dir, 'about-titania.md')

  // The price and the ages are what a booking turns on.
  if (price && !events.includes(price)) {
    add(`${lang}/events does not state the price the offer claims (${price})`)
  }
  for (const [age, which] of [[minAge, 'minimum'], [maxAge, 'maximum']]) {
    if (age && !new RegExp(`\\b${age}\\b`).test(events)) {
      add(`${lang}/events does not state the ${which} age the audience claims (${age})`)
    }
  }

  // The imprint is a legal document; the address in it and the address in the
  // structured data must be one address.
  for (const [value, what] of [[street, 'street address'], [postcode, 'postcode']]) {
    if (value && !legal.includes(value)) add(`${lang}/legal-data does not carry the ${what} (${value})`)
  }

  // Press: both directions. A story in the structured data and not on the page
  // is a rich result pointing at nothing; a story on the page and not in the
  // structured data is one Google will not show.
  for (const url of press) {
    if (!about.includes(url)) add(`${lang}/about-titania does not link the press item ${url.slice(0, 60)}`)
  }
  const linked = [...about.matchAll(/\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1])
  const outlets = linked.filter((url) => /bnt\.bg|bnr\.bg|24chasa|bulgaren/.test(url))
  for (const url of outlets) {
    if (!press.includes(url)) add(`${lang}/about-titania links ${url.slice(0, 60)}, which seo.ts does not list`)
  }
}

// The email is on every page that invites a booking, so it is worth one check
// rather than four.
if (email) {
  for (const { lang, dir } of LANGS) {
    for (const name of ['events.md', 'work-with-titania.md']) {
      const source = await page(dir, name)
      if (source && !source.includes(email)) {
        add(`${lang}/${name.replace('.md', '')} does not carry the contact address the structured data gives`)
      }
    }
  }
}

// Every service the structured data names must be named in all three
// languages, or one locale is offering something the others are not.
for (const slug of ['/events', '/work-with-titania']) {
  const names = LANGS.map(({ lang }) => COPY[lang].services[slug]?.name)
  if (names.some((name) => !name)) add(`${slug} has no service name in every language`)
  if (new Set(names).size !== names.length) {
    add(`${slug} repeats one service name across locales — one of them is untranslated`)
  }
}

if (problems.length) {
  console.error(`check-facts: ${problems.length} problem(s)\n`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

console.log(
  `check-facts: price, ages, address, contact and ${press.length} press items — ` +
    `the prose and the structured data agree in all ${LANGS.length} languages`
)
