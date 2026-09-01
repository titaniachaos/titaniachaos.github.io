#!/usr/bin/env node
// Checks the built site. VitePress fails the build on a dead page link, but it
// does not check fragments -- and this site navigates almost entirely by
// hand-written section ids (`{#dramaturgy}`), across three languages. A
// mistyped id is invisible until someone clicks it.
//
// Also checks what a screen reader needs and what a duplicate id breaks.
//
// Two classes of link were skipped rather than checked, and both are
// computable from what is on disk:
//
//   Absolute links to this site's own host. 1270 of them across the two
//   builds -- every canonical, every hreflang, every og:url and every link
//   written out in full. `https://titaniachaos.com/evnets` was indistinguish-
//   able from a link to somebody else's site, so nothing looked at it.
//
//   Links to the sibling site on the same domain. The two workspaces share
//   titaniachaos.com and link to each other constantly; each build could only
//   see its own pages, so `/clown/de/blog/typo` was nobody's problem.
//
// The second needs the sibling's build to be checkable, and in CI only one
// repo is built. So it is checked when that build is there and reported as
// unverified when it is not -- never silently passed.
//
// Usage: node scripts/check-build.mjs [distDir] [--sibling <dir> --sibling-base <path>]

import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const argv = process.argv.slice(2)
const flag = (name) => {
  const at = argv.indexOf(`--${name}`)
  return at < 0 ? null : argv[at + 1]
}
const dist = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true) ?? 'docs/.vitepress/dist'
const SIBLING = flag('sibling')

/** Every address this site answers to. Both are us; only one is a URL. */
const HOSTS = ['https://titaniachaos.com', 'https://www.titaniachaos.com']

async function htmlFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)))
    else if (entry.name.endsWith('.html')) out.push(full)
  }
  return out
}

/** `/bg/index.html` -> `/bg/`, `/concept.html` -> `/concept`. */
function urlOf(file) {
  const rel = relative(dist, file).split(sep).join('/')
  const url = `/${rel.slice(0, -'.html'.length)}`
  return url.endsWith('/index') ? url.slice(0, -'index'.length) : url
}

const norm = (u) => u.replace(/\/+$/, '') || '/'

const files = await htmlFiles(dist)
if (files.length === 0) {
  console.error(`No HTML in ${dist} -- run the build first.`)
  process.exit(1)
}

// The base path is whatever prefixes the emitted assets: '/' or '/clown/'.
const home = files.find((f) => urlOf(f) === '/') ?? files[0]
const baseMatch = (await readFile(home, 'utf8')).match(/href="(\/(?:[\w-]+\/)*)assets\//)
const base = baseMatch ? baseMatch[1] : '/'

// The two sites split this domain between them, so each one's base names the
// other's: the main site is '/' and the workspace is '/clown/'. Derived rather
// than passed, so this file is the same file in both repositories.
const SIBLING_BASE = flag('sibling-base') ?? (base === '/' ? '/clown/' : '/')

const pages = new Map() // normalised url -> Set of element ids
for (const file of files) {
  const html = await readFile(file, 'utf8')
  pages.set(norm(urlOf(file)), new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])))
}

/**
 * The sibling site's pages, so a link across the domain can be checked rather
 * than assumed. Absent in CI, where one repo is built on its own -- that is
 * reported, not passed over.
 */
const sibling = new Set()
if (SIBLING) {
  const there = await htmlFiles(SIBLING).catch(() => [])
  for (const file of there) {
    const rel = relative(SIBLING, file).split(sep).join('/')
    const url = `/${rel.slice(0, -'.html'.length)}`
    const clean = url.endsWith('/index') ? url.slice(0, -'index'.length) : url
    sibling.add(norm(`${SIBLING_BASE.replace(/\/$/, '')}${clean}`))
  }
}

const problems = []
const add = (file, message) => problems.push(`${relative(dist, file)}: ${message}`)

const ASSET = /\.(css|js|mjs|woff2?|png|jpe?g|webp|svg|ico|xml|txt|pdf|atom|json)$/i

const unverified = new Set()

/**
 * Resolve a path on this domain against whichever build owns it.
 *
 * Ours if it sits under our base, the sibling's otherwise. A path belonging to
 * the sibling when no sibling build was given is recorded rather than passed:
 * "not checked" and "fine" are different answers.
 */
function checkOurs(file, href, path) {
  const target = norm(path || '/')
  // With base '/' every path looks like ours, including the sibling's -- so
  // the sibling's own prefix has to be subtracted first, or every link to
  // /clown/ is reported dead by the site that correctly links to it.
  const theirs =
    norm(SIBLING_BASE) !== '/' &&
    (target === norm(SIBLING_BASE) || target.startsWith(norm(SIBLING_BASE) + '/'))
  const mine =
    !theirs && (base === '/' || target === norm(base) || target.startsWith(norm(base) + '/'))
  if (mine) {
    const local = norm(base === '/' ? target : `/${target.slice(norm(base).length + 1)}`)
    if (!pages.has(local)) add(file, `dead link ${href} -> ${target} is not a page in this build`)
    return
  }
  // `sibling.size`, not `SIBLING`. The flag says a path was offered; only the
  // set says a build was found there. Treating the offer as the answer made an
  // empty directory mean "the sibling has no pages", so every correct link to
  // it was reported dead -- which is exactly what happened in CI, where only
  // one repository is ever checked out.
  if (!sibling.size) {
    unverified.add(target)
    return
  }
  if (!sibling.has(target)) add(file, `dead cross-site link ${href} -> ${target} is not a page in the sibling build`)
}
const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")

for (const file of files) {
  const html = await readFile(file, 'utf8')
  // `here` keeps the trailing slash that urlOf leaves on an index page, because
  // that is what a relative link resolves against: `./x` means `/bg/x` from
  // /bg/ and `/x` from /bg.
  const here = urlOf(file)
  const from = norm(here)

  for (const raw of new Set([...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]))) {
    const href = decode(raw)
    if (href === '') continue

    // An absolute link to our own host is a link to a page we just built, so
    // it is checkable -- and it is where the canonical, the hreflang set and
    // every og:url live. A typo in one of those is invisible on the page and
    // wrong in every index that reads it.
    const host = HOSTS.find((h) => href.startsWith(h))
    if (host) {
      const [path] = href.slice(host.length).split('#')
      if (!ASSET.test(path)) checkOurs(file, href, path)
      continue
    }
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(href)) continue

    if (href.startsWith('#')) {
      const id = href.slice(1)
      if (id && !pages.get(from).has(id)) add(file, `dead fragment ${href}`)
      continue
    }
    // Relative links were checked by nothing at all: they start with neither
    // the base nor a slash, so the branch below skipped them. They are
    // base-independent, so resolving against this page's own un-based URL
    // gives the target directly. Ported from the clown site, where moving a
    // directory broke every relative link in it and the suite stayed green.
    if (!href.startsWith('/')) {
      const [path, fragment] = (new URL(href, `http://x${here}`).pathname + (href.includes('#') ? `#${href.split('#')[1]}` : '')).split('#')
      if (ASSET.test(path)) continue
      const target = norm(decodeURI(path))
      if (!pages.has(target)) add(file, `dead relative link ${href} -> ${target}`)
      else if (fragment && !pages.get(target).has(fragment)) add(file, `dead relative anchor ${href}`)
      continue
    }

    // A root-relative link that does not carry the base is normally a link to
    // another site on this domain -- the clown workspace lives at /clown/. But
    // if prefixing the base makes it land on a page in this build, it is one
    // of ours with the base left off: it resolves in `vitepress dev`, which
    // serves from the root, and 404s in production.
    if (!href.startsWith(base)) {
      const [ours] = href.split('#')
      if (base !== '/' && pages.has(norm(ours))) {
        add(file, `link ${href} is missing the base — use withBase(), or it 404s at ${base.slice(0, -1)}${href}`)
        continue
      }
      // Not one of ours with the base missing, so it is a link to the sibling
      // site on this domain. That used to end here, unchecked, which is how a
      // link from /clown/ to a page the main site does not have would have
      // survived every build either repo runs.
      if (!ASSET.test(ours)) checkOurs(file, href, ours)
      continue
    }

    const [path, fragment] = href.split('#')
    if (ASSET.test(path)) continue
    const target = norm(`/${path.slice(base.length)}`)

    if (!pages.has(target)) add(file, `dead link ${href}`)
    else if (fragment && !pages.get(target).has(fragment)) add(file, `dead anchor ${href}`)
  }

  for (const img of html.match(/<img[^>]*>/g) ?? []) {
    if (!/\salt=/.test(img)) add(file, `image without alt: ${img.slice(0, 80)}`)
  }

  // Frontmatter is read before any component runs, so `{{ $params.name }}` in
  // a generated page's title ships as those literal characters -- in the tab,
  // in the search result and in the sitemap. It reads correctly in the body,
  // which is why the category pages carried it in their headings for a while
  // without anybody seeing it.
  for (const [, expression] of html.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    add(file, `un-interpolated template expression in the output: {{ ${expression} }}`)
  }

  const seen = new Set()
  for (const [, id] of html.matchAll(/\sid="([^"]+)"/g)) {
    if (seen.has(id)) add(file, `duplicate id "${id}"`)
    seen.add(id)
  }
}

const label = `${files.length} pages, base ${base}`
if (problems.length) {
  console.error(`check-build: ${problems.length} problem(s) in ${label}\n`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log(`check-build: ${label} -- every link, fragment, alt and id is sound`)
if (unverified.size) {
  // Said out loud rather than passed over. These are real links to a real
  // sibling site; without its build there is nothing here to check them
  // against, and a silent pass would read as "checked".
  console.log(
    `  ${unverified.size} cross-site link target(s) not verified — no sibling build. ` +
      `Pass --sibling <dist> --sibling-base ${SIBLING_BASE} to check them.`
  )
}
