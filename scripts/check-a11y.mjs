#!/usr/bin/env node
// Checks the accessibility properties that a diff cannot show.
//
// Contrast is the one that rots silently. The brand red passes AA on white at
// 5.03:1, but the same red on the dark ground is 3.41:1 -- below the 4.5:1
// that body text needs -- which is why the dark theme overrides it. That
// override is a decision held in one line of CSS, and nothing about editing a
// colour tells you which of the two grounds you just broke. So the ratios are
// computed from the tokens themselves, on every build.
//
// Also checked, cheaply: every page declares a language, and carries exactly
// one h1. Headings inside the sidebar are ignored -- VitePress renders group
// titles as h2/h3 inside a nav landmark, which precedes the content h1 in
// document order and is not a defect.
//
// WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text and UI components.
//
// Usage: node scripts/check-a11y.mjs [distDir] [cssFile]

import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const dist = process.argv[2] ?? 'docs/.vitepress/dist'
const cssFile = process.argv[3] ?? 'docs/.vitepress/theme/custom.css'

const AA_TEXT = 4.5
const AA_UI = 3.0
const LIGHT_BG = '#ffffff'
const DARK_BG = '#1b1b1f' // VitePress --vp-c-bg in dark mode

const problems = []

const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
function luminance(hex) {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const css = await readFile(cssFile, 'utf8')
const blockOf = (sel) => new RegExp(`${sel}\\s*\\{([\\s\\S]*?)\\}`).exec(css)?.[1] ?? ''
const tokenIn = (block, name) =>
  new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block)?.[1] ?? null

const light = tokenIn(blockOf(':root'), '--vp-c-brand-1')
const dark = tokenIn(blockOf('\\.dark'), '--vp-c-brand-1') ?? light
const darkButton =
  /\.dark \.contact-button:not\(\.secondary\)\s*\{[^}]*background:\s*(#[0-9a-fA-F]{6})/.exec(css)?.[1]

if (!light) problems.push('custom.css: no --vp-c-brand-1 in :root')

const pairs = [
  ['brand on light ground', light, LIGHT_BG, AA_TEXT],
  ['brand on dark ground', dark, DARK_BG, AA_TEXT],
  ['button text on brand (light)', '#ffffff', light, AA_TEXT]
]
if (darkButton) pairs.push(['button text on brand (dark)', '#ffffff', darkButton, AA_TEXT])
if (darkButton) pairs.push(['button ground against page (dark)', darkButton, DARK_BG, AA_UI])

const rows = []
for (const [name, fg, bg, need] of pairs) {
  if (!fg || !bg) continue
  const r = contrast(fg, bg)
  rows.push([name, fg, bg, r, need])
  if (r < need) problems.push(`contrast: ${name} is ${r.toFixed(2)}:1, needs ${need}:1`)
}

async function htmlFiles(dir) {
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await htmlFiles(p)))
    else if (e.name.endsWith('.html')) out.push(p)
  }
  return out
}

const pages = await htmlFiles(dist)
for (const p of pages) {
  const html = await readFile(p, 'utf8')
  const rel = relative(dist, p)
  if (!/<html[^>]+lang="[^"]+"/.test(html)) problems.push(`${rel}: no lang on <html>`)
  // Count only headings inside the document body, not the sidebar nav.
  const doc = /<main[\s\S]*?<\/main>/.exec(html)?.[0] ?? html
  const h1s = (doc.match(/<h1[\s>]/g) ?? []).length
  if (h1s !== 1 && rel !== '404.html') problems.push(`${rel}: ${h1s} h1 in main`)
}

console.log()
console.log(`  ${'pair'.padEnd(36)}${'ratio'.padStart(7)}   need`)
for (const [name, fg, bg, r, need] of rows) {
  const mark = r >= need ? ' ' : '!'
  console.log(`${mark} ${name.padEnd(36)}${r.toFixed(2).padStart(7)}   ${need}:1  ${fg} on ${bg}`)
}
console.log()

if (problems.length) {
  console.error(`check-a11y: ${problems.length} problem(s)\n`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log(`check-a11y: ${pages.length} pages -- contrast meets AA, every page has a language and one h1`)
