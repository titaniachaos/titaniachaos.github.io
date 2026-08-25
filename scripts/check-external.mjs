#!/usr/bin/env node
// Resolves every outward link the site publishes, including the DOIs in the
// source ledger. Link rot is silent: a citation that stops resolving still
// looks like a citation, and this documentation is meant to be followed back
// to its sources by people deciding whether to fund it.
//
// Network-dependent, so this runs on a schedule rather than on pull requests.
//
// Usage: node scripts/check-external.mjs [rootDir]

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = process.argv[2] ?? 'docs'
const TIMEOUT_MS = 20000
const CONCURRENCY = 6
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) titaniachaos-link-check'

// Namespace identifiers, not destinations: they name a vocabulary and are not
// meant to be fetched.
const NAMESPACES = [/^https?:\/\/schema\.org/, /^https?:\/\/www\.w3\.org/, /^https?:\/\/purl\.org/]

// Not links, though they read as ones. This scans source, but what it is for is
// what the site publishes -- so a URL that never reaches a page is noise, and a
// checker that cries wolf every Monday is worse than no checker.
//   ${...}  a template literal, still holding its placeholder
//   …       an elided example in a comment
//   example.*  documentation stand-ins, in the spirit of RFC 2606
const NOT_DESTINATIONS = [/\$\{/, /[…]|\.\.\./, /^https?:\/\/example\./]

async function sources(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'dist' || entry.name === 'cache' || entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await sources(full)))
    else if (/\.(md|ts|mts|vue)$/.test(entry.name)) out.push(full)
  }
  return out
}

const found = new Map() // url -> Set of files

for (const file of await sources(root)) {
  const text = await readFile(file, 'utf8')

  for (const match of text.matchAll(/https?:\/\/[^\s"'`)\]<>]+/g)) {
    const clean = match[0].replace(/[.,;:]+$/, '')
    // Source files carry URLs that were never links: template literals like
    // https://doi.org/${w.doi}, and documentation placeholders written with an
    // ellipsis. Reporting those as rot is how a checker teaches people to
    // ignore it, and this one guards the citations.
    if (/\$\{|…|\.\.\.|example\.(at|com|org)$/.test(clean)) continue
    if (NAMESPACES.some((n) => n.test(clean))) continue
    if (NOT_DESTINATIONS.some((n) => n.test(clean))) continue
    if (!found.has(clean)) found.set(clean, new Set())
    found.get(clean).add(relative(process.cwd(), file))
  }

  // Ledger DOIs are stored bare, and are the citations most worth checking.
  for (const [, doi] of text.matchAll(/ref:\s*'(10\.[^']+)'/g)) {
    const url = `https://doi.org/${doi}`
    if (!found.has(url)) found.set(url, new Set())
    found.get(url).add(relative(process.cwd(), file))
  }
}

// Two kinds of not-200 are not link rot, and a job that cannot tell them apart
// gets muted within a month:
//   - publishers and social platforms refuse automated requests (403/429/405)
//   - some hosts serve an incomplete certificate chain, which browsers repair
//     by fetching the intermediate and Node does not (BNR does this today)
// Those are reported as warnings. Failure is reserved for a link that is gone.
const BLOCKED = new Set([401, 403, 405, 406, 429, 999])
const CHAIN_ERRORS = /UNABLE_TO_VERIFY_LEAF_SIGNATURE|SELF_SIGNED_CERT|CERT_HAS_EXPIRED|UNABLE_TO_GET_ISSUER/

async function request(url, method) {
  const control = new AbortController()
  const timer = setTimeout(() => control.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: control.signal,
      headers: { 'user-agent': UA, accept: '*/*' }
    })
    return { status: response.status }
  } catch (error) {
    const code = error.cause?.code ?? (error.name === 'AbortError' ? 'timeout' : error.message)
    return { error: String(code) }
  } finally {
    clearTimeout(timer)
  }
}

async function resolves(url) {
  // A DOI is a registration, not a web page: publishers block the crawler that
  // follows doi.org, so ask the registry whether the DOI is still registered.
  const doi = url.match(/^https?:\/\/(?:dx\.)?doi\.org\/(10\..+)$/)
  if (doi) {
    const result = await request(`https://api.crossref.org/works/${doi[1]}`, 'GET')
    if (result.status === 200) return { verdict: 'ok', detail: 'registered at Crossref' }
    if (result.status === 404) return { verdict: 'fail', detail: 'not registered at Crossref' }
    return { verdict: 'warn', detail: result.error ?? `Crossref returned ${result.status}` }
  }

  let last = await request(url, 'HEAD')
  if (last.status && last.status < 400) return { verdict: 'ok', detail: last.status }
  // Plenty of hosts refuse HEAD but serve GET.
  last = await request(url, 'GET')
  if (last.status && last.status < 400) return { verdict: 'ok', detail: last.status }
  if (last.status && BLOCKED.has(last.status)) return { verdict: 'warn', detail: `refused automated request (${last.status})` }
  if (last.error && CHAIN_ERRORS.test(last.error)) return { verdict: 'warn', detail: `incomplete certificate chain (${last.error})` }
  return { verdict: 'fail', detail: last.error ?? `HTTP ${last.status}` }
}

const urls = [...found.keys()].sort()
const failures = []
const warnings = []
let index = 0

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
    while (index < urls.length) {
      const url = urls[index++]
      const { verdict, detail } = await resolves(url)
      if (verdict === 'fail') failures.push({ url, detail, files: [...found.get(url)] })
      else if (verdict === 'warn') warnings.push({ url, detail })
    }
  })
)

const byUrl = (a, b) => a.url.localeCompare(b.url)

for (const warning of warnings.sort(byUrl)) {
  console.log(`  note  ${warning.url}\n        ${warning.detail}`)
}

if (failures.length) {
  console.error(`\ncheck-external: ${failures.length} of ${urls.length} links are gone\n`)
  for (const failure of failures.sort(byUrl)) {
    console.error(`  ${failure.detail}  ${failure.url}`)
    console.error(`      cited in ${failure.files.join(', ')}`)
  }
  process.exit(1)
}
console.log(
  `check-external: ${urls.length} links resolve` +
    (warnings.length ? `, ${warnings.length} answered without confirming (noted above)` : '')
)
