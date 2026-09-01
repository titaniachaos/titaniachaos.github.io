#!/usr/bin/env node
// Proves the site can still change domain.
//
// Every canonical URL, hreflang, sitemap entry, schema @id and cross-site link
// is supposed to follow SITE_ORIGIN, so a move is one variable. That property
// is easy to break and impossible to notice: nothing looks wrong until the day
// the domain actually changes, which is the worst day to find out. Thirty
// references once survived a switch because they were literal hosts in Markdown.
//
// So: build against a domain that is deliberately not this one, and fail if the
// old host survives anywhere in the HTML.
//
// citations.atom is exempt and must be. Atom tag: URIs are permanent
// identifiers -- moving them would make every entry look new to every
// subscriber -- so they stay pinned to the original host for good.
//
// Usage: node scripts/check-origin.mjs

import { execFileSync } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const PROBE = 'https://origin-probe.invalid'
const WRITTEN = 'titaniachaos.com'
const dist = 'docs/.vitepress/dist'

console.log(`  building against ${PROBE} …`)
try {
  execFileSync('npx', ['vitepress', 'build', 'docs'], {
    stdio: 'pipe',
    env: { ...process.env, SITE_ORIGIN: PROBE }
  })
} catch (e) {
  console.error('check-origin: the probe build failed\n')
  console.error(String(e.stdout ?? e).slice(-1500))
  process.exit(1)
}

async function html(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await html(p)))
    else if (e.name.endsWith('.html')) out.push(p)
  }
  return out
}

const offenders = []
let pages = 0
for (const f of await html(dist)) {
  pages++
  const text = await readFile(f, 'utf8')
  const n = text.split(WRITTEN).length - 1
  if (n) offenders.push(`${f}: ${n} reference(s) to ${WRITTEN}`)
}

// Restore the real build so the working tree is not left holding the probe.
execFileSync('npx', ['vitepress', 'build', 'docs'], { stdio: 'pipe' })

if (offenders.length) {
  console.error(`\ncheck-origin: ${offenders.length} page(s) would not move domain\n`)
  for (const o of offenders) console.error(`  ${o}`)
  console.error('\n  These are literal hosts that do not follow SITE_ORIGIN.')
  process.exit(1)
}
console.log(`check-origin: ${pages} pages, every URL follows SITE_ORIGIN -- the domain can move`)
